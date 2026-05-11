import axios from 'axios';
import { CONFIG } from '../config';
import { useStore } from '../store/useStore';
import { logger } from '../utils/logger';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  GestureModel,
  CreateModelRequest,
  GestureSummaryItem,
  SensorFrame,
  PredictResponse,
} from '../types';

const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── JWT interceptor ─────────────────────────────────────────────────────────
api.interceptors.request.use(
  config => {
  const token = useStore.getState().token;
  console.log('FULL TOKEN:', token);

  if (token && !config.url?.startsWith('/auth')) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('AUTH HEADER SET'); // 👈
  } else {
    console.log('AUTH HEADER SKIPPED, url:', config.url); // 👈
  }

  logger.debug('API', `→ ${config.method?.toUpperCase()} ${config.url}`);
  return config;
},
  error => Promise.reject(error),
);

api.interceptors.response.use(
  response => {
    logger.debug('API', `← ${response.status} ${response.config.url}`);
    return response;
  },
  error => {
    const status = error.response?.status;
    const url = error.config?.url;
    const message =
      error.response?.data?.message ??
      error.message ??
      'Network error';

    logger.error('API', `← ${status ?? 'NO_RESPONSE'} ${url} — ${message}`);

    if (status === 401) {
      useStore.getState().logout();
    }

    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data),
};



// ─── Models ───────────────────────────────────────────────────────────────────
export const modelApi = {
  getModels: () =>
    api.get<GestureModel[]>('/models'),

  getAllModels: () =>
    api.get<GestureModel[]>('/models/all'),

  getModel: (modelId: string) =>
    api.get<GestureModel>(`/models/${modelId}`),

  deleteModel: (modelId: string) =>
  api.delete(`/models/${modelId}`),

  createModel: (data: CreateModelRequest) =>
    api.post<GestureModel>('/models', data),

  trainModel: (modelId: string) =>
    api.post(`/models/${modelId}/train`),

  getGestureSummary: (modelId: string) =>
    api.get<GestureSummaryItem[]>(`/v1/models/${modelId}/gestures/summary`),

  addGesture: (modelId: string, label: string, rawData: SensorFrame[]) =>
    api.post(`/v1/models/${modelId}/gestures`, { label, rawData }),
};

// ─── Prediction ───────────────────────────────────────────────────────────────
export const predictApi = {
  init: (modelId: string) =>
    api.post(`/predict/init/${modelId}`),

  unload: (modelId: string) =>       // 👈 ДОДАЙ
    api.post(`/predict/unload/${modelId}`),

  predict: (modelId: string, rawData: SensorFrame[]) =>
    api.post<PredictResponse>('/predict/gesture', { modelId, rawData }),
};

export default api;