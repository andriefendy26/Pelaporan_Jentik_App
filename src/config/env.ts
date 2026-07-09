import Constants from 'expo-constants';

export const env = {
  apiUrl: Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000/api',
  appName: Constants.expoConfig?.name || 'Pelaporan Jentik App',
};
