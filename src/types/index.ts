// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
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

export interface GestureModel {
  id: string;
  userId: string;
  name: string;
  includesDefaultGestures: boolean;
  status: 'CREATED' | 'TRAINING' | 'READY';
  default: boolean;
}

export interface CreateModelRequest {
  name: string;
  basedOnDefault: boolean;
}

// ─── Gestures ─────────────────────────────────────────────────────────────────
export interface SaveGestureRequest {
  label: string;
  rawData: number[][];
}

export interface GestureSummaryItem {
  label: string;
  count: number;
}

// ─── Prediction ───────────────────────────────────────────────────────────────
export interface PredictRequest {
  modelId: string;
  rawData: number[][];
}

export interface PredictResponse {
  predictedLabel: string;
  confidence: number;
}

// ─── Bluetooth ────────────────────────────────────────────────────────────────
export type SensorFrame = number[];

export type BTEventName =
  | 'frame'
  | 'gestureComplete'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface BluetoothDeviceInfo {
  name: string;
  address: string;
  id: string;
  bonded: boolean;
}


//added but need to check if its correct
export type PredictionResult = {
  predictedLabel: string;
  confidence: number;
};