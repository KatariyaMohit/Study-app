import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mohit.examcrush',
  appName: 'ExamCrush',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  // Add this section below:
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000, // Stay for 2 seconds
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;