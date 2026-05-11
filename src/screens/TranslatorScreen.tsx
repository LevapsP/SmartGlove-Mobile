import React, { useEffect, useState, useRef, useCallback } from 'react';
import Svg, {Rect, Ellipse} from 'react-native-svg';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, AppState,
} from 'react-native';
import { Bluetooth, Activity, Cpu, CheckCircle2, AlertCircle } from 'lucide-react-native';
import BluetoothService from '../services/BluetoothService';
import { predictApi } from '../services/api';
import { useStore } from '../store/useStore';
import { SensorFrame } from '../types';
import { requestBluetoothPermissions } from '../utils/permissions';
import HandSvg from '../components/HandIcon.svg';

interface Props {
  connected: boolean;
  size?: number;
}

export function HandIcon({ connected, size = 120 }: Props) {
  const color = connected ? '#4ADE80' : '#EF4444';
  const scale = size / 160;

  return (
    <Svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 160 200"
    >
      {/* Пальці */}
      <Rect x="30" y="30" width="18" height="55" rx="9" fill={color} />
      <Rect x="52" y="15" width="18" height="70" rx="9" fill={color} />
      <Rect x="74" y="10" width="18" height="75" rx="9" fill={color} />
      <Rect x="96" y="18" width="18" height="67" rx="9" fill={color} />
      <Rect x="116" y="35" width="16" height="52" rx="8" fill={color} />
      {/* Долоня */}
      <Rect x="28" y="75" width="108" height="85" rx="18" fill={color} />
      {/* Зап'ястя */}
      <Rect x="44" y="148" width="76" height="40" rx="12" fill={color} />
      {/* Блик */}
      <Ellipse cx="70" cy="100" rx="18" ry="10" fill="rgba(255,255,255,0.08)" />
    </Svg>
  );
}

export default function TranslatorScreen() {
  const {
    selectedModelId,
    prediction, setPrediction,
    connectedDevice, setConnectedDevice,
    isConnecting, setIsConnecting,
  } = useStore();

  const [isInitializing, setIsInitializing]     = useState(false);
  const [isModelInitialized, setIsModelInitialized] = useState(false);
  const [isRecording, setIsRecording]           = useState(false);

  const selectedModelIdRef    = useRef(selectedModelId);
  const isModelInitializedRef = useRef(isModelInitialized);
  const initializedModelIdRef = useRef<string | null>(null);

  useEffect(() => { selectedModelIdRef.current = selectedModelId; }, [selectedModelId]);
  useEffect(() => { isModelInitializedRef.current = isModelInitialized; }, [isModelInitialized]);

  // ── Unload хелпер ──────────────────────────────────────────────────────────
  const unloadIfNeeded = useCallback(async () => {
    if (!initializedModelIdRef.current) return;
    try {
      await predictApi.unload(initializedModelIdRef.current);
    } catch {}
    initializedModelIdRef.current = null;
    setIsModelInitialized(false);
  }, []);

  // ── Unmount → unload ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { unloadIfNeeded(); };
  }, []);

  // ── AppState → unload при згортанні ────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        unloadIfNeeded();
      }
    });
    return () => sub.remove();
  }, []);

  // ── BT listeners ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onGestureComplete = async (frames: SensorFrame[]) => {
      if (!isModelInitializedRef.current || !selectedModelIdRef.current) return;
      setIsRecording(false);
      try {
        const { data } = await predictApi.predict(selectedModelIdRef.current, frames);
        setPrediction(data);
      } catch {
        setPrediction(null);
      }
    };

    BluetoothService.on('gestureComplete', onGestureComplete);
    return () => { BluetoothService.off('gestureComplete', onGestureComplete); };
  }, []);

  // ── Дії ────────────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    const granted = await requestBluetoothPermissions();
    if (!granted) {
      Alert.alert('Permission Denied', 'Bluetooth permission is required.');
      return;
    }
    setIsConnecting(true);
    try {
      const device = await BluetoothService.scanAndConnect();
      setConnectedDevice({ name: device.name ?? 'ESP32', address: device.address, id: device.address, bonded: true });
    } catch (err: any) {
      Alert.alert('Connection Error', err.message ?? 'Could not connect');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    await unloadIfNeeded();
    await BluetoothService.disconnect();
    setConnectedDevice(null);
  }, []);

  // ── handleInitModel — ОДНА версія ──────────────────────────────────────────
  const handleInitModel = useCallback(async () => {
    if (!selectedModelId) {
      Alert.alert('No Model', 'Select a model in the Models tab first.');
      return;
    }
    setIsInitializing(true);
    try {
      await predictApi.init(selectedModelId);
      initializedModelIdRef.current = selectedModelId;
      setIsModelInitialized(true);
      Alert.alert('Ready ✓', 'Model initialized. Perform a gesture to translate.');
    } catch {
      Alert.alert('Error', 'Failed to initialize model.');
    } finally {
      setIsInitializing(false);
    }
  }, [selectedModelId]);

  const handleStartGesture = useCallback(async () => {
    setIsRecording(true);
    await BluetoothService.sendCommand('START');
  }, []);

  const handleStopGesture = useCallback(async () => {
    await BluetoothService.sendCommand('STOP');
    // isRecording стане false після gestureComplete
  }, []);

  const isConnected = !!connectedDevice;

  

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SmartGlove AI</Text>
          <Text style={styles.headerSub}>Real-time Translation Hub</Text>
        </View>
        <TouchableOpacity onPress={isConnected ? handleDisconnect : handleConnect} disabled={isConnecting}>
          {isConnecting
            ? <ActivityIndicator color="#3B82F6" />
            : <Bluetooth color={isConnected ? '#4ADE80' : '#94A3B8'} size={28} />
          }
        </TouchableOpacity>
      </View>

      {/* Prediction card */}
      <View style={styles.predictionCard}>
        <Text style={styles.predictionLabel}>PREDICTED GESTURE</Text>
        <Text style={styles.predictionText}>{prediction ? prediction.predictedLabel : '—'}</Text>
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


        <View style={{ alignItems: 'center', marginVertical: 16 }}>
      <HandIcon connected={isConnected} size={100} />
        <Text style={{
          color: isConnected ? '#4ADE80' : '#EF4444',
          fontSize: 12,
          marginTop: 8,
          fontWeight: '600',
          letterSpacing: 1,
        }}>
          {isConnected ? 'CONNECTED' : 'NOT CONNECTED'}
        </Text>
      </View>
      {/* Initialize кнопка */}
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

        {/* Start/Stop запис жесту */}
        {isConnected && isModelInitialized && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: isRecording ? '#EF4444' : '#10B981', marginTop: 12 }]}
            onPress={isRecording ? handleStopGesture : handleStartGesture}
          >
            <Activity color="#fff" size={20} />
            <Text style={styles.btnText}>
              {isRecording ? 'Stop — Send Gesture' : 'Start Gesture'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Warnings */}
      {!selectedModelId && (
        <View style={styles.warning}>
          <AlertCircle color="#F87171" size={18} />
          <Text style={styles.warningText}>No model selected. Go to Models tab first.</Text>
        </View>
      )}

      {!isConnected && (
        <View style={styles.warning}>
          <AlertCircle color="#F59E0B" size={18} />
          <Text style={[styles.warningText, { color: '#F59E0B' }]}>
            Bluetooth not connected. Tap the icon above.
          </Text>
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
  predictionCard:  { backgroundColor: '#1E293B', borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  predictionLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 8 },
  predictionText:  { color: '#F8FAFC', fontSize: 52, fontWeight: '800' },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginTop: 16 },
  confidenceText:  { color: '#4ADE80', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  initHint:        { color: '#475569', fontSize: 12, marginTop: 12 },
  controls:        { marginVertical: 20 },
  btn:             { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 10 },
  btnDisabled:     { backgroundColor: '#334155', opacity: 0.5 },
  btnText:         { color: '#fff', fontSize: 16, fontWeight: '600' },
  warning:         { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248,113,113,0.1)', padding: 14, borderRadius: 12, marginTop: 12, gap: 10 },
  warningText:     { color: '#F87171', fontSize: 13, flex: 1 },
});