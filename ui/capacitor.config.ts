import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.luxorhomes.app',
  appName: 'Luxor Homes',
  webDir: 'out',
  server: {
    url: 'https://luxor-homes-api-production.up.railway.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0a0f1e',
  },
};

export default config;
