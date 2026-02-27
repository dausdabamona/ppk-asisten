import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.go.kkp.ppk',
  appName: 'PPK Assistant',
  webDir: 'dist/renderer',

  // Server configuration for live reload during development
  server: {
    // In production, this will be served from the app bundle
    // In development, you can set androidScheme to http for local testing
    androidScheme: 'https',
    // Allow navigation to external URLs
    allowNavigation: ['*']
  },

  // Android specific configuration
  android: {
    // Allow mixed content (http + https) for development
    allowMixedContent: true,
    // Capture external links
    captureLinks: [],
    // Use legacy bridge for better compatibility
    useLegacyBridge: false,
    // Build flavor
    flavor: 'ppk',
    // Min SDK version
    minWebViewVersion: 60
  },

  // Plugins configuration
  plugins: {
    // Network plugin - for detecting online/offline
    CapacitorNetwork: {
      // Automatically track connection
    },

    // Preferences plugin - for local storage
    Preferences: {
      // Group name for iOS (not needed for Android)
    },

    // App plugin - for app state
    App: {
      // Enable background mode detection
    },

    // SQLite plugin (will be added)
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
      electronIsEncryption: false,
      electronWindowsLocation: 'C:\\ProgramData\\CapacitorDatabases',
      electronMacLocation: '/Users/user/CapacitorDatabases',
      electronLinuxLocation: 'Databases'
    }
  },

  // Logging
  loggingBehavior: 'debug'
};

export default config;
