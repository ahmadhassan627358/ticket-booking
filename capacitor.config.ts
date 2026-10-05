import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safarexpress.app',
  appName: 'Safar Express',
  webDir: 'public',
  server: {
    // For Android Emulator, 10.0.2.2 points to localhost of your PC.
    // For Physical Device, replace with your PC local IP (e.g. http://192.168.1.X:3000)
    // For Production, replace with your live hosted URL (e.g. https://your-domain.com)
    url: 'http://10.0.2.2:3000',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
