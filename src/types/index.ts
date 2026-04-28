// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ─── Models ───────────────────────────────────────────────────────────────────
export interface Model {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'TRAINING' | 'READY';
  gestureCount: number;
}

export interface CreateModelRequest {
  name: string;
  description: string;
}

export interface GestureSummary {
  totalGestures: number;
  labelsCount: number;
}

// ─── Gestures ─────────────────────────────────────────────────────────────────

// One frame = 18 float values from 3x MPU6050
export type SensorFrame = number[];

// What we send to backend when saving a gesture
export interface SaveGestureRequest {
  gesture_data: SensorFrame[];
}

// ─── Prediction ───────────────────────────────────────────────────────────────
export interface PredictionResult {
  label: string;
  confidence: number;
}

export interface PredictRequest {
  gesture_data: SensorFrame[];
}

// ─── Bluetooth ────────────────────────────────────────────────────────────────
export interface BluetoothDeviceInfo {
  name: string;
  address: string;
  id: string;
  bonded: boolean;
}

// Bluetooth event names — typed so we can't typo them
export type BTEventName = 'frame' | 'gestureComplete' | 'connected' | 'disconnected' | 'error';
