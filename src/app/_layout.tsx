import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../services/Context/AuthContext';
 
function RootNavigation() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
 
  useEffect(() => {
    if (isLoading) return;

    const inLoginPage = segments[0] === "login";

  if (!isAuthenticated && !inLoginPage) {
        // Belum login -> arahkan ke halaman login
        router.replace('/login');
      } else if (isAuthenticated && inLoginPage) {
        // Sudah login tapi masih di halaman auth -> arahkan ke halaman utama
        router.replace('/');
      }
  }, [isAuthenticated, isLoading, segments]);
 
  if (isLoading) {
    // Bisa diganti dengan splash screen / spinner
    return null;
  }
 
  return <Stack screenOptions={{ headerShown: false }} />;
}
 
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}