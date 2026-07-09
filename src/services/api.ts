import axios from 'axios';
import Constants from 'expo-constants';

const rawApiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:8000/api';
const API_URL = (rawApiUrl || 'http://10.0.2.2:8000/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
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
