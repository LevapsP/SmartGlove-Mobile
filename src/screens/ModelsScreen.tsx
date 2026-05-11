/**
 * ModelsScreen.tsx — no logic bugs found in original.
 * Changes: typed imports, minor style cleanup.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, Switch
} from 'react-native';
import { Plus, Target, ChevronRight, Activity, LogOutIcon, Trash2, Cpu } from 'lucide-react-native';
import { modelApi } from '../services/api';
import { useStore } from '../store/useStore';
import { GestureModel } from '../types';


export default function ModelsScreen() {
  const [models, setModels] = useState<GestureModel[]>([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName]         = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [creating, setCreating]       = useState(false);

  const { selectedModelId, setSelectedModelId, logout } = useStore();

  const [basedOnDefault, setBasedOnDefault] = useState(false);

  const fetchModels = async () => {
  setRefreshing(true);
  try {
    const { data } = await modelApi.getAllModels();
    setModels(data);
  } catch (err) {
    console.error('[Models] fetch failed', err);
  } finally {
    setRefreshing(false);
  }
};

  // в ModelsScreen.tsx
useEffect(() => {
  // Якщо є хоч одна модель в статусі TRAINING — опитуємо кожні 5 секунд
  const hasTraining = models.some(m => m.status === 'TRAINING');
  if (!hasTraining) return;

  const interval = setInterval(() => {
    fetchModels();
  }, 5000);

  return () => clearInterval(interval);
}, [models]);

  const handleDelete = (modelId: string, modelName: string) => {
  Alert.alert(
    'Видалити модель',
    `Ви впевнені що хочете видалити "${modelName}"?`,
    [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          try {
            await modelApi.deleteModel(modelId);
            if (selectedModelId === modelId) setSelectedModelId(null);
            fetchModels();
          } catch {
            Alert.alert('Помилка', 'Не вдалося видалити модель');
          }
        },
      },
    ],
  );
};



  const createModel = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await modelApi.createModel({ name: newName.trim(), basedOnDefault });
      setBasedOnDefault(false);
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

  

  const handleTrain = async (modelId: string) => {
    try {
      await modelApi.trainModel(modelId);
      Alert.alert('Training started', 'Model is being trained. Check status in a moment.');
      fetchModels(); // оновить статус
    } catch {
      Alert.alert('Error', 'Failed to start training');
    }
  };

  const renderModel = ({ item }: { item: GestureModel }) => {
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
          <Text style={styles.modelDesc}>
            {item.default ? 'Default model' : 'Custom model'}
          </Text>
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
        <Text style={styles.statText}>{item.status}</Text>
      </View>
      {/* кнопки тільки для не-дефолтних */}
      {!item.default && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {item.status !== 'READY' && (
            <TouchableOpacity onPress={() => handleTrain(item.id)}>
              <Cpu color="#3B82F6" size={18} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
            <Trash2 color="#EF4444" size={18} />
          </TouchableOpacity>
        </View>
      )}
    </View>
    </TouchableOpacity>
  );
};


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Models</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Plus color="#fff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: '#EF4444' }]}
            onPress={logout}
          >
            <LogOutIcon color="#fff" size={24} />
          </TouchableOpacity>
        </View>

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
              <Text style={{ color: '#F8FAFC', fontSize: 15 }}>Include default gestures</Text>
              <Switch
                value={basedOnDefault}
                onValueChange={setBasedOnDefault}
                trackColor={{ false: '#334155', true: '#3B82F6' }}
                thumbColor="#fff"
              />
          </View>
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
