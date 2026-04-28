/**
 * TranslatorScreen.tsx
 *
 * FIX 1 (memory leak): Same issue as RecordingScreen — now uses named
 *   callbacks with off() instead of removeAllListeners().
 *
 * FIX 2 (predict without init): Added `isModelInitialized` state.
 *   gestureComplete listener checks it before calling predict.
 *   Previously, gestures were sent to /predict/gesture even when the
 *   backend model wasn't loaded, causing server errors.
 *
 * FIX 3: Dependency array was [] but selectedModelId was used inside
 *   the callback — stale closure. Now uses useRef for selectedModelId too.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { Bluetooth, Activity, Cpu, CheckCircle2, AlertCircle } from 'lucide-react-native';
import BluetoothService from '../services/BluetoothService';
import { predictApi } from '../services/api';
import { useStore } from '../store/useStore';
import { SensorFrame, PredictionResult } from '../types';
import { requestBluetoothPermissions } from '../utils/permissions';

export default function TranslatorScreen() {
  const {
    selectedModelId,
    prediction, setPrediction,
    connectedDevice, setConnectedDevice,
    isConnecting, setIsConnecting,
  } = useStore();

  const [frameHistory, setFrameHistory]       = useState<SensorFrame[]>([]);
  const [isInitializing, setIsInitializing]   = useState(false);
  // FIX 2: track whether backend model has been initialized
  const [isModelInitialized, setIsModelInitialized] = useState(false);

  // FIX 3: refs so callbacks always see current values without re-registering
  const selectedModelIdRef    = useRef(selectedModelId);
  const isModelInitializedRef = useRef(isModelInitialized);

  useEffect(() => { selectedModelIdRef.current = selectedModelId; }, [selectedModelId]);
  useEffect(() => { isModelInitializedRef.current = isModelInitialized; }, [isModelInitialized]);

  // FIX 1 + FIX 3: register listeners once, read state via refs inside callbacks
  useEffect(() => {
    const onFrame = (frame: SensorFrame) => {
      // Keep last 5 frames for the debug stream view
      setFrameHistory(prev => [frame, ...prev].slice(0, 5));
    };

    const onGestureComplete = async (frames: SensorFrame[]) => {
      // FIX 2: don't call predict if model isn't initialized
      if (!isModelInitializedRef.current) {
        console.warn('[Translator] gestureComplete received but model not initialized — skipping predict');
        return;
      }
      if (!selectedModelIdRef.current) {
        return;
      }

      try {
        const { data } = await predictApi.predict(frames);
        setPrediction(data);
      } catch (err) {
        console.error('[Translator] predict failed', err);
        setPrediction(null);
      }
    };

    BluetoothService.on('frame', onFrame);
    BluetoothService.on('gestureComplete', onGestureComplete);

    // FIX 1: remove only OUR callbacks
    return () => {
      BluetoothService.off('frame', onFrame);
      BluetoothService.off('gestureComplete', onGestureComplete);
    };
  }, []); // ← runs once; state read via refs

  const handleConnect = useCallback(async () => {
    const granted = await requestBluetoothPermissions();
    if (!granted) {
      Alert.alert('Permission Denied', 'Bluetooth permission is required to connect.');
      return;
    }
    setIsConnecting(true);
    try {
      const device = await BluetoothService.scanAndConnect();
      setConnectedDevice({
        name:    device.name ?? 'ESP32',
        address: device.address,
        id:      device.address,
        bonded:  true,
      });
    } catch (err: any) {
      Alert.alert('Connection Error', err.message ?? 'Could not connect to SmartGlove_ESP32');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    await BluetoothService.disconnect();
    setConnectedDevice(null);
    setIsModelInitialized(false); // model needs re-init after reconnect
  }, []);

  const handleInitModel = useCallback(async () => {
    if (!selectedModelId) {
      Alert.alert('No Model', 'Please select a model in the Models tab first.');
      return;
    }
    setIsInitializing(true);
    try {
      await predictApi.init(selectedModelId);
      setIsModelInitialized(true);
      Alert.alert('Ready ✓', 'Model initialized. Perform a gesture to translate.');
    } catch {
      Alert.alert('Error', 'Failed to initialize backend model. Is the server running?');
    } finally {
      setIsInitializing(false);
    }
  }, [selectedModelId]);

  const isConnected = !!connectedDevice;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SmartGlove AI</Text>
          <Text style={styles.headerSub}>Real-time Translation Hub</Text>
        </View>
        <TouchableOpacity
          onPress={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
        >
          {isConnecting
            ? <ActivityIndicator color="#3B82F6" />
            : <Bluetooth color={isConnected ? '#4ADE80' : '#94A3B8'} size={28} />
          }
        </TouchableOpacity>
      </View>

      {/* Prediction result card */}
      <View style={styles.predictionCard}>
        <Text style={styles.predictionLabel}>PREDICTED GESTURE</Text>
        <Text style={styles.predictionText}>
          {prediction ? prediction.label : '—'}
        </Text>
        {prediction && (
          <View style={styles.confidenceBadge}>
            <CheckCircle2 color="#4ADE80" size={16} />
            <Text style={styles.confidenceText}>
              {(prediction.confidence * 100).toFixed(1)}% Confidence
            </Text>
          </View>
        )}
        {!isModelInitialized && (
          <Text style={styles.initHint}>Initialize model below to start translating</Text>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.btn, (!selectedModelId || isInitializing) && styles.btnDisabled]}
          onPress={handleInitModel}
          disabled={!selectedModelId || isInitializing}
        >
          {isInitializing
            ? <ActivityIndicator color="#fff" />
            : <>
                <Cpu color="#fff" size={20} />
                <Text style={styles.btnText}>
                  {isModelInitialized ? 'Re-sync Model' : 'Initialize Model'}
                </Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Live stream debugger */}
      <View style={styles.debugSection}>
        <View style={styles.debugHeader}>
          <Activity color="#94A3B8" size={16} />
          <Text style={styles.debugTitle}>LIVE MPU6050 DATA STREAM</Text>
          {isModelInitialized && (
            <View style={styles.readyDot} />
          )}
        </View>
        <ScrollView style={styles.streamLog}>
          {frameHistory.map((frame, i) => (
            <Text key={i} style={styles.streamItem} numberOfLines={1}>
              {`[${new Date().toLocaleTimeString()}] `}
              {frame.map(v => v.toFixed(2)).join(', ')}
            </Text>
          ))}
          {frameHistory.length === 0 && (
            <Text style={styles.emptyText}>
              {isConnected
                ? 'Waiting for gesture data...'
                : 'No data — tap Bluetooth icon to connect'}
            </Text>
          )}
        </ScrollView>
      </View>

      {/* Warnings */}
      {!selectedModelId && (
        <View style={styles.warning}>
          <AlertCircle color="#F87171" size={18} />
          <Text style={styles.warningText}>No model selected. Go to Models tab first.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  headerTitle:     { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  headerSub:       { color: '#94A3B8', fontSize: 14 },
  predictionCard:  { backgroundColor: '#1E293B', borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#334155', elevation: 8 },
  predictionLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 8 },
  predictionText:  { color: '#F8FAFC', fontSize: 52, fontWeight: '800' },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginTop: 16 },
  confidenceText:  { color: '#4ADE80', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  initHint:        { color: '#475569', fontSize: 12, marginTop: 12 },
  controls:        { marginVertical: 20 },
  btn:             { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 10 },
  btnDisabled:     { backgroundColor: '#334155', opacity: 0.5 },
  btnText:         { color: '#fff', fontSize: 16, fontWeight: '600' },
  debugSection:    { flex: 1, backgroundColor: '#020617', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1E293B' },
  debugHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  debugTitle:      { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 1, flex: 1 },
  readyDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  streamLog:       { flex: 1 },
  streamItem:      { color: '#CBD5E1', fontFamily: 'monospace', fontSize: 10, marginBottom: 3, opacity: 0.7 },
  emptyText:       { color: '#475569', textAlign: 'center', marginTop: 20, fontStyle: 'italic', fontSize: 13 },
  warning:         { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248,113,113,0.1)', padding: 14, borderRadius: 12, marginTop: 16, gap: 10 },
  warningText:     { color: '#F87171', fontSize: 13, flex: 1 },
});
