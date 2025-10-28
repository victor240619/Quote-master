import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quotemaster.app',
  appName: 'QuoteMaster Pro',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
};

export default config;
