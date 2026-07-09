import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Ganti sesuai alamat backend Laravel kamu.
// - Emulator Android  -> gunakan http://10.0.2.2:8000/api
// - Simulator iOS     -> gunakan http://127.0.0.1:8000/api atau http://localhost:8000/api
// - HP fisik (Expo Go)-> gunakan IP LAN komputermu, misal http://192.168.1.10:8000/api
export const API_URL = 'http://10.0.2.2:8000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
  },
});

// Sisipkan token Bearer secara otomatis di setiap request
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Kalau token sudah tidak valid (401), bersihkan sesi yang tersimpan
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    }
    return Promise.reject(error);
  }
);