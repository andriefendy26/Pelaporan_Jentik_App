import Constants from 'expo-constants';

export const env = {
  apiUrl: Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:8000/api',
  appName: Constants.expoConfig?.name || 'Pelaporan Jentik App',
};
