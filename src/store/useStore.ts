import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothDeviceInfo, PredictResponse } from '../types';

interface StoreState {
  // Auth — бекенд повертає тільки token, без user об'єкта
  token: string | null;
  setAuth: (token: string) => void;
  logout: () => void;

  // Bluetooth
  connectedDevice: BluetoothDeviceInfo | null;
  isConnecting: boolean;
  setConnectedDevice: (device: BluetoothDeviceInfo | null) => void;
  setIsConnecting: (v: boolean) => void;

  // App
  selectedModelId: string | null;
  prediction: PredictResponse | null;
  setSelectedModelId: (id: string | null) => void;
  setPrediction: (res: PredictResponse | null) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      token: null,
      setAuth: (token) => set({ token }),
      logout: () => set({ token: null, selectedModelId: null, prediction: null }),

      connectedDevice: null,
      isConnecting: false,
      setConnectedDevice: (device) => set({ connectedDevice: device }),
      setIsConnecting: (v) => set({ isConnecting: v }),

      selectedModelId: null,
      prediction: null,
      setSelectedModelId: (id) => set({ selectedModelId: id }),
      setPrediction: (res) => set({ prediction: res }),
    }),
    {
      name: 'smartglove-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ token: state.token }),
    },
  ),
);