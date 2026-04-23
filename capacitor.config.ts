import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nathanflorsheim.floform',
  appName: 'FloForm',
  webDir: 'out',
  server: {
    // Removed server.url — app now loads from local bundled assets (out/)
    // instead of the remote Vercel deployment.
    cleartext: false,
    errorPath: 'index.html', // SPA fallback for deep link cold launch
  },
};

export default config;
