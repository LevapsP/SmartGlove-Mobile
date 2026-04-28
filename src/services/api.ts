/**
 * api.ts
 *
 * FIX 1: BASE_URL moved to config/index.ts — one place to change IP.
 * FIX 2: gesture field renamed from `frames` to `gesture_data` to match
 *         the Python backend contract (server.py / main.py).
 *         Verify with your Java colleague what field name Spring Boot expects.
 */

import axios from 'axios';
import { CONFIG } from '../config';
import { useStore } from '../store/useStore';
import { logger } from '../utils/logger';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Model,
  CreateModelRequest,
  GestureSummary,
  SensorFrame,
  PredictionResult,
} from '../types';

// ─── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  config => {
    const token = useStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug('API', `→ ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => Promise.reject(error),
);

// ─── Response interceptor: logging + auto-logout on 401 ───────────────────────
api.interceptors.response.use(
  response => {
    logger.debug('API', `← ${response.status} ${response.config.url}`);
    return response;
  },
  error => {
    const status  = error.response?.status;
    const url     = error.config?.url;
    const message = error.response?.data?.message ?? error.message ?? 'Network error';

    logger.error('API', `← ${status ?? 'NO_RESPONSE'} ${url} — ${message}`);

    // Token expired or invalid → logout
    if (status === 401) {
      logger.warn('API', 'Got 401 — logging out');
      useStore.getState().logout();
    }

    return Promise.reject(error);
  },
);

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (data: LoginRequest)    => api.post<AuthResponse>('/auth/login',    data),
  register: (data: RegisterRequest) => api.post<AuthResponse>('/auth/register', data),
};

// ─── Models ────────────────────────────────────────────────────────────────────
export const modelApi = {
  getModels: () =>
    api.get<Model[]>('/models'),

  createModel: (data: CreateModelRequest) =>
    api.post<Model>('/models', data),

  getGestureSummary: (modelId: string) =>
    api.get<GestureSummary>(`/models/${modelId}/gestures/summary`),

  // FIX: field name is `gesture_data` (matches Python backend).
  // If Java Spring Boot expects a different field — change it here only.
  addGesture: (modelId: string, frames: SensorFrame[]) =>
    api.post(`/models/${modelId}/gestures`, { gesture_data: frames }),
};

// ─── Prediction ────────────────────────────────────────────────────────────────
export const predictApi = {
  // Initialize model on backend before prediction
  init: (modelId: string) =>
    api.post(`/predict/init/${modelId}`),

  // Send gesture frames and get label + confidence back
  predict: (frames: SensorFrame[]) =>
    api.post<PredictionResult>('/predict/gesture', { gesture_data: frames }),
};

export default api;
