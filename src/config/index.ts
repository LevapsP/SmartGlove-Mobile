// ─── Single place to change server IP ────────────────────────────────────────
// 10.0.2.2 = localhost from Android Emulator
// For real device: use your machine's local IP (e.g. 192.168.1.100)
const DEV_HOST = '192.168.0.104'; // ← change this to your machine's IP

export const CONFIG = {
  API_BASE_URL: `http://${DEV_HOST}:8080/api/v1`,
  BT_DEVICE_NAME: 'SmartGlove_ESP32',
  // Safety limit: if ESP32 never sends END, stop buffering after this many frames
  MAX_FRAMES_PER_GESTURE: 500,
  // Show extra logs in Metro console
  DEBUG: __DEV__,
} as const;
