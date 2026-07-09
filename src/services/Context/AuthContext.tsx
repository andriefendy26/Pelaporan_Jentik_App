import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState } from 'react';
import { setAuthToken, clearAuthToken } from '../api';
import { authService } from '../jentikService';

const STORAGE_KEYS = {
  token: 'token',
  userInfo: 'userInfo',
};

const memoryStorage = new Map<string, string>();

const safeStorage = {
  async getItem(key: string) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        memoryStorage.set(key, value);
        return value;
      }

      return memoryStorage.get(key) ?? null;
    } catch (error) {
      console.log('Storage unavailable, using memory fallback', error);
      return memoryStorage.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      await AsyncStorage.setItem(key, value);
      memoryStorage.set(key, value);
    } catch (error) {
      console.log('Storage unavailable, using memory fallback', error);
      memoryStorage.set(key, value);
    }
  },
  async removeItem(key: string) {
    try {
      await AsyncStorage.removeItem(key);
      memoryStorage.delete(key);
    } catch (error) {
      console.log('Storage unavailable, using memory fallback', error);
      memoryStorage.delete(key);
    }
  },
};

type AuthContextType = {
  token: string | null;
  userInfo: any | null;
  loading: boolean;
  login: (token: string, userInfo: any) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  token: null,
  userInfo: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await safeStorage.getItem(STORAGE_KEYS.token);
        const storedUserInfo = await safeStorage.getItem(STORAGE_KEYS.userInfo);

        if (storedToken) {
          setAuthToken(storedToken); // <-- tambahan penting
          setToken(storedToken);
        }

        if (storedUserInfo) {
          setUserInfo(JSON.parse(storedUserInfo));
        }
      } catch (error) {
        console.log('Failed to load auth state', error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, []);

  const login = async (newToken: string, userInfoData: any) => {
    try {
      setAuthToken(newToken); // <-- pindah ke sini, jadi terpusat
      await safeStorage.setItem(STORAGE_KEYS.token, newToken);
      await safeStorage.setItem(STORAGE_KEYS.userInfo, JSON.stringify(userInfoData));
      setToken(newToken);
      setUserInfo(userInfoData);
    } catch (error) {
      console.log('Failed to save auth state', error);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.log('Logout request failed', error);
    }

    try {
      await safeStorage.removeItem(STORAGE_KEYS.token);
      await safeStorage.removeItem(STORAGE_KEYS.userInfo);
    } catch (error) {
      console.log('Failed to clear auth storage', error);
    }

    clearAuthToken(); // <-- tambahan
    setToken(null);
    setUserInfo(null);
  };

  return (
    <AuthContext.Provider value={{ token, userInfo, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
