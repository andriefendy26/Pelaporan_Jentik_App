import { Stack, useRouter, useSegments } from "expo-router";
import { useContext, useEffect } from "react";
import { AuthContext, AuthProvider } from "../services/Context/AuthContext";

function RootNavigation() {
  const { token, loading } = useContext(AuthContext);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inLoginPage = segments[0] === "login";

    if (!token && !inLoginPage) {
      router.replace("/login");
    } else if (token && inLoginPage) {
      router.replace("/");
    }
  }, [token, loading, segments]);

  if (loading) {
    return null; // bisa diganti splash screen
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