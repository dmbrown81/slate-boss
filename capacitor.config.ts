import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.slateboss.gridiron',
  appName: 'Gridiron',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
