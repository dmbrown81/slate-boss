import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.slateboss.callsmith',
  appName: 'Callsmith',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
