/**
 * RecordingScreen.tsx
 *
 * FIX 1 (memory leak): useEffect now uses specific on/off with named callbacks,
 *   NOT removeAllListeners() which wiped TranslatorScreen's listeners too.
 *
 * FIX 2 (closure bug): `isRecording` state inside the 'frame' callback always
 *   captured the initial `false` value. Fixed with useRef that stays current.
 *
 * FIX 3: Dependency array was [isRecording, selectedModelId] — this caused
 *   the effect to re-run and re-register listeners on every state change,
 *   creating duplicate listeners. Now it runs once ([]).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Save, Trash2, Info, Fingerprint } from 'lucide-react-native';
import BluetoothService from '../services/BluetoothService';
import { modelApi } from '../services/api';
import { useStore } from '../store/useStore';
import { SensorFrame } from '../types';

export default function RecordingScreen() {
  const { selectedModelId } = useStore();

  const [gestureLabel, setGestureLabel] = useState('');

  const [isRecording, setIsRecording]           = useState(false);
  const [framesCollected, setFramesCollected]   = useState(0);
  const [capturedFrames, setCapturedFrames]     = useState<SensorFrame[]>([]);
  const [saving, setSaving]                     = useState(false);
  const [summary, setSummary]                   = useState<{ totalGestures: number; labelsCount: number } | null>(null);

  // FIX 2: useRef holds the live value of isRecording for use inside callbacks.
  // Without this, the 'frame' callback always sees the initial false.
  // Analogy to ESP32: like a volatile flag that the ISR can read correctly.
  const isRecordingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // FIX 1 + FIX 3: Register listeners ONCE on mount. Use named functions so
  // we can unsubscribe exactly these callbacks — not all listeners globally.
  useEffect(() => {
    const onFrame = (_frame: SensorFrame) => {
      // FIX 2: read from ref, not from closed-over state
      if (isRecordingRef.current) {
        setFramesCollected(prev => prev + 1);
      }
    };

    const onGestureComplete = (frames: SensorFrame[]) => {
      // Only store the gesture if we were recording
      if (isRecordingRef.current) {
        setCapturedFrames(frames);
        setIsRecording(false);
        // ref will be updated via the useEffect above on next render
      }
    };

    BluetoothService.on('frame', onFrame);
    BluetoothService.on('gestureComplete', onGestureComplete);

    // FIX 1: Clean up ONLY our specific callbacks
    return () => {
      BluetoothService.off('frame', onFrame);
      BluetoothService.off('gestureComplete', onGestureComplete);
    };
  }, []); // ← empty: run once on mount, once on unmount

  useEffect(() => {
    fetchSummary();
  }, [selectedModelId]);

  const fetchSummary = async () => {
  if (!selectedModelId) return;

  try {
    const { data } = await modelApi.getGestureSummary(selectedModelId);

    // FIX: convert array → object
    const summary = {
      totalGestures: data.length,
      labelsCount: new Set(data.map((x: any) => x.label)).size,
    };

    setSummary(summary);
  } catch {}
};

  const handleStartRecording = useCallback(async () => {
    setFramesCollected(0);
    setCapturedFrames([]);
    setIsRecording(true);
    await BluetoothService.sendCommand('START');
    // isRecordingRef.current will be updated by the useEffect watcher above
  }, []);

  const handleStopRecording = useCallback(async () => {
  await BluetoothService.sendCommand('STOP'); // 👈 ESP32 переходить в SENDING
  // gestureComplete прийде автоматично після END
  }, []);

  const handleDiscard = useCallback(() => {
    setCapturedFrames([]);
    setFramesCollected(0);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedModelId || capturedFrames.length === 0) return;
    setSaving(true);
    try {
      await modelApi.addGesture(selectedModelId, gestureLabel, capturedFrames);
      Alert.alert('Saved ✓', `Gesture saved: ${capturedFrames.length} frames`);
      setCapturedFrames([]);
      setFramesCollected(0);
      fetchSummary();
    } catch {
      Alert.alert('Error', 'Failed to save gesture. Check your connection.');
    } finally {
      setSaving(false);
    }
  }, [selectedModelId, capturedFrames]);

  // ─── No model selected ───────────────────────────────────────────────────────
  if (!selectedModelId) {
    return (
      <View style={styles.emptyContainer}>
        <Info color="#94A3B8" size={48} />
        <Text style={styles.emptyTitle}>No Model Selected</Text>
        <Text style={styles.emptySub}>
          Please select or create a model in the Models tab first.
        </Text>
      </View>
    );
  }

  const hasCapture = capturedFrames.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Record Gesture</Text>
        <View style={styles.modelBadge}>
          <Text style={styles.modelBadgeText}>Model: {selectedModelId.slice(0, 8)}</Text>
        </View>
      </View>

      {/* Visual indicator */}
      <View style={styles.visualizer}>
        <View style={[styles.pulseCircle, isRecording && styles.pulseActive]}>
          <Fingerprint color={isRecording ? '#4ADE80' : hasCapture ? '#3B82F6' : '#334155'} size={64} />
        </View>
        <Text style={styles.statusText}>
          {isRecording
            ? 'Recording... (waiting for END from ESP32)'
            : hasCapture
              ? `Captured ${capturedFrames.length} frames`
              : 'Ready to record'}
        </Text>
        <Text style={styles.frameCount}>{framesCollected} frames received</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRecording && !hasCapture && (
          <TouchableOpacity style={styles.recordBtn} onPress={handleStartRecording}>
            <Text style={styles.recordBtnText}>Start Recording</Text>
          </TouchableOpacity>
        )}

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <ActivityIndicator color="#4ADE80" />
            <Text style={styles.recordingText}>Recording... {framesCollected} frames</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#EF4444', padding: 10, borderRadius: 10, marginTop: 10 }}
              onPress={handleStopRecording}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Stop</Text>
            </TouchableOpacity>
          </View>
          )}

        {hasCapture && !isRecording && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
              <Trash2 color="#F87171" size={20} />
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <><Save color="#fff" size={20} /><Text style={styles.saveText}>Save Gesture</Text></>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>CURRENT MODEL SUMMARY</Text>
        <View style={styles.summaryCard}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{summary?.totalGestures ?? 0}</Text>
            <Text style={styles.statLab}>Gestures</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{summary?.labelsCount ?? 0}</Text>
            <Text style={styles.statLab}>Classes</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  header:             { marginTop: 40, marginBottom: 30 },
  title:              { color: '#F8FAFC', fontSize: 28, fontWeight: '800' },
  modelBadge:         { backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  modelBadgeText:     { color: '#94A3B8', fontSize: 12, fontFamily: 'monospace' },
  visualizer:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pulseCircle:        { width: 160, height: 160, borderRadius: 80, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#334155' },
  pulseActive:        { borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.05)' },
  statusText:         { color: '#F8FAFC', fontSize: 16, fontWeight: '600', marginTop: 20, textAlign: 'center', paddingHorizontal: 20 },
  frameCount:         { color: '#64748B', fontSize: 14, marginTop: 6 },
  controls:           { paddingVertical: 20 },
  recordBtn:          { backgroundColor: '#3B82F6', padding: 18, borderRadius: 16, alignItems: 'center' },
  recordBtnText:      { color: '#fff', fontSize: 18, fontWeight: '700' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  recordingText:      { color: '#64748B', fontSize: 14, flex: 1 },
  actionRow:          { flexDirection: 'row', gap: 15 },
  discardBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#ef444433', backgroundColor: '#ef444411', gap: 8 },
  discardText:        { color: '#F87171', fontWeight: '600' },
  saveBtn:            { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: '#10B981', gap: 8 },
  saveBtnDisabled:    { opacity: 0.5 },
  saveText:           { color: '#fff', fontWeight: '700' },
  summarySection:     { marginTop: 20 },
  sectionTitle:       { color: '#64748B', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  summaryCard:        { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center' },
  statItem:           { flex: 1, alignItems: 'center' },
  statVal:            { color: '#F8FAFC', fontSize: 24, fontWeight: '700' },
  statLab:            { color: '#94A3B8', fontSize: 12 },
  divider:            { width: 1, height: 30, backgroundColor: '#334155' },
  emptyContainer:     { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle:         { color: '#F8FAFC', fontSize: 20, fontWeight: '700', marginTop: 20 },
  emptySub:           { color: '#64748B', textAlign: 'center', marginTop: 10, lineHeight: 20 },
});
