/**
 * ModelsScreen.tsx — no logic bugs found in original.
 * Changes: typed imports, minor style cleanup.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { Plus, Target, ChevronRight, Activity } from 'lucide-react-native';
import { modelApi } from '../services/api';
import { useStore } from '../store/useStore';
import { Model } from '../types';

export default function ModelsScreen() {
  const [models, setModels]           = useState<Model[]>([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName]         = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [creating, setCreating]       = useState(false);

  const { selectedModelId, setSelectedModelId } = useStore();

  const fetchModels = async () => {
    setRefreshing(true);
    try {
      const { data } = await modelApi.getModels();
      setModels(data);
    } catch (err) {
      console.error('[Models] fetch failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchModels(); }, []);

  const createModel = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await modelApi.createModel({ name: newName.trim(), description: newDesc.trim() });
      setModalVisible(false);
      setNewName('');
      setNewDesc('');
      fetchModels();
    } catch (err) {
      Alert.alert('Error', 'Failed to create model');
    } finally {
      setCreating(false);
    }
  };

  const renderModel = ({ item }: { item: Model }) => {
    const isSelected = selectedModelId === item.id;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => setSelectedModelId(item.id)}
      >
        <View style={styles.cardMain}>
          <View style={[styles.iconContainer, isSelected && styles.iconActive]}>
            <Target color={isSelected ? '#3B82F6' : '#64748B'} size={24} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.modelName}>{item.name}</Text>
            <Text style={styles.modelDesc}>{item.description || 'No description'}</Text>
          </View>
          {isSelected && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeLabel}>ACTIVE</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.statLine}>
            <Activity color="#94A3B8" size={14} />
            <Text style={styles.statText}>{item.gestureCount} Gestures Recorded</Text>
          </View>
          <ChevronRight color="#334155" size={20} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Models</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={models}
        renderItem={renderModel}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchModels} tintColor="#3B82F6" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No models yet. Create your first one!</Text>
          </View>
        }
      />

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Model</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Model Name"
              placeholderTextColor="#64748B"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={[styles.modalInput, styles.areaInput]}
              placeholder="Description (optional)"
              placeholderTextColor="#64748B"
              multiline
              value={newDesc}
              onChangeText={setNewDesc}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={createModel} disabled={creating}>
                <Text style={styles.createText}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  title:        { color: '#F8FAFC', fontSize: 28, fontWeight: '800' },
  addBtn:       { backgroundColor: '#3B82F6', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  list:         { paddingBottom: 20 },
  card:         { backgroundColor: '#1E293B', borderRadius: 20, marginBottom: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  cardSelected: { borderColor: '#3B82F6' },
  cardMain:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconContainer:{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  iconActive:   { backgroundColor: 'rgba(59,130,246,0.1)' },
  cardText:     { flex: 1, marginLeft: 15 },
  modelName:    { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  modelDesc:    { color: '#64748B', fontSize: 13, marginTop: 2 },
  activeBadge:  { backgroundColor: '#3B82F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeLabel:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12 },
  statLine:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText:     { color: '#94A3B8', fontSize: 13 },
  empty:        { marginTop: 100, alignItems: 'center' },
  emptyText:    { color: '#64748B', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, paddingBottom: 50 },
  modalTitle:   { color: '#F8FAFC', fontSize: 24, fontWeight: '700', marginBottom: 20 },
  modalInput:   { backgroundColor: '#0F172A', borderRadius: 12, height: 50, paddingHorizontal: 15, color: '#F8FAFC', marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  areaInput:    { height: 100, textAlignVertical: 'top', paddingTop: 15 },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
  cancelBtn:    { flex: 1, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelText:   { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  createBtn:    { flex: 2, height: 56, borderRadius: 12, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  createText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
});
