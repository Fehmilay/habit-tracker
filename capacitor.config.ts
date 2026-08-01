import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fehmilay.flighthabit',
  appName: 'Flight Habit',
  webDir: 'out',
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scrollEnabled: false,
    backgroundColor: '#050a16',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 350,
      backgroundColor: '#050a16',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050a16',
      overlaysWebView: true,
    },
    LocalNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
}

export default config
