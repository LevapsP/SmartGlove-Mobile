/**
 * useStore.ts
 *
 * FIX 1: Token is now persisted via AsyncStorage (zustand/middleware persist).
 *         Previously the token was lost on every app restart — user had to
 *         log in again every time.
 *
 * FIX 2: Split into logical slices inside one store to reduce unnecessary
 *         re-renders. Components should select only what they need:
 *         const token = useStore(state => state.token);  ← only re-renders on token change
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  BluetoothDeviceInfo,
  PredictionResult,
} from '../types';

interface StoreState {
  // ── Auth ────────────────────────────────────────────────────────────────────
  user:    User | null;
  token:   string | null;
  setAuth: (user: User, token: string) => void;
  logout:  () => void;

  // ── Bluetooth ───────────────────────────────────────────────────────────────
  connectedDevice: BluetoothDeviceInfo | null;
  isConnecting:    boolean;
  setConnectedDevice: (device: BluetoothDeviceInfo | null) => void;
  setIsConnecting:    (v: boolean) => void;

  // ── App logic ───────────────────────────────────────────────────────────────
  selectedModelId: string | null;
  prediction:      PredictionResult | null;

  setSelectedModelId: (id: string | null) => void;
  setPrediction:      (res: PredictionResult | null) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      user:    null,
      token:   null,
      setAuth: (user, token) => set({ user, token }),
      logout:  () => set({ user: null, token: null, selectedModelId: null, prediction: null }),

      // ── Bluetooth ─────────────────────────────────────────────────────────
      connectedDevice: null,
      isConnecting:    false,
      setConnectedDevice: device   => set({ connectedDevice: device }),
      setIsConnecting:    v        => set({ isConnecting: v }),

      // ── App logic ─────────────────────────────────────────────────────────
      selectedModelId: null,
      prediction:      null,
      setSelectedModelId: id  => set({ selectedModelId: id }),
      setPrediction:      res => set({ prediction: res }),
    }),
    {
      name: 'smartglove-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist auth data — BT state and prediction are transient
      partialize: state => ({
        user:  state.user,
        token: state.token,
      }),
    },
  ),
);
