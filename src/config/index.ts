// ─── Single place to change server IP ────────────────────────────────────────
// 10.0.2.2 = localhost from Android Emulator
// For real device: use your machine's local IP (e.g. 192.168.1.100)
const DEV_HOST = '10.212.22.241';

export const CONFIG = {
  API_BASE_URL: `http://${DEV_HOST}:8080/api`,
  BT_DEVICE_NAME: 'SmartGlove_ESP32',
  MAX_FRAMES_PER_GESTURE: 500,
  DEBUG: __DEV__,
} as const;