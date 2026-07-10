import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { User, LoginResponse, ApiMessageResponse } from '../../types/auth';
import { syncPendingLaporan } from '../syncService';

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('auth_user'),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Gagal memuat sesi tersimpan:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    try {
      const response = await apiClient.post<LoginResponse>('/login', {
        username,
        password,
      });

      const { token: authToken, user: authUser } = response.data;

      await AsyncStorage.setItem('auth_token', authToken);
      await AsyncStorage.setItem('auth_user', JSON.stringify(authUser));

      setToken(authToken);
      setUser(authUser);

      syncPendingLaporan();

      return { success: true, message: response.data.message };
    } catch (error: any) {
      const message =
        error.response?.data?.message ?? 'Tidak dapat terhubung ke server, coba lagi nanti';
      return { success: false, message };
    }
  }

  async function logout() {
    try {
      await apiClient.post<ApiMessageResponse>('/logout');
    } catch (error) {
      // Tetap lanjut hapus sesi lokal walau request logout ke server gagal
      console.error('Gagal logout di server:', error);
    } finally {
      await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
      setToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  }
  return context;
}