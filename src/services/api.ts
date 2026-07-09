import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = (Constants.expoConfig?.extra?.apiUrl || 'https://<domain-anda>/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common.Authorization;
};

export default api;
