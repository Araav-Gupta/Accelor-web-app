require('dotenv').config();

export default {
  expo: {
    name: 'hrmsApp',
    slug: 'hrmsApp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.yourcompany.hrmsapp',
      versionCode: 1
    },
  
    plugins: [
      // [
      //   'expo-build-properties',
      //   {
      //     android: {
      //       compileSdkVersion: 33,
      //       targetSdkVersion: 33,
      //       buildToolsVersion: '33.0.0'
      //     },
      //     ios: {
      //       useFrameworks: 'static'
      //     }
      //   }
      // ]
    ],
    extra: {
      eas: {
        projectId: 'your-project-id'
      }
    }
  }
};
