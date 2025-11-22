// apps/mobile/src/config/api.ts

// IMPORTANT:
// On a physical device, replace YOUR-LAN-IP with your computer's LAN IP,
// e.g. "http://192.168.0.42:4000"
export const API_BASE_URL =
  __DEV__
    ? 'http://192.168.50.65:4000'
    : 'https://example.com'; // placeholder for future deployed backend
