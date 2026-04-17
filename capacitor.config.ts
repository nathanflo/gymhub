import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nathanflorsheim.floform',
  appName: 'FloForm',
  webDir: 'public',
  server: {
    url: 'https://gymhub-inky.vercel.app/',
    cleartext: false,
  },
};

export default config;
