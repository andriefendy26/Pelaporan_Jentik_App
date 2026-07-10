import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../services/Context/AuthContext';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
};

function getInitial(name?: string, username?: string) {
  const source = name || username || '?';
  return source.trim().charAt(0).toUpperCase();
}

function HeaderUserInfo() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <View style={styles.headerUserWrapper}>
      <View style={styles.headerTextWrapper}>
        <Text style={styles.headerName} numberOfLines={1}>
          {user.name ?? user.username}
        </Text>
        <Text style={styles.headerSub} numberOfLines={1}>
          {user.kelurahan?.name ?? '-'} {user.r_t?.name ? `• ${user.r_t.name}` : ''}
        </Text>
      </View>
      <View style={styles.headerAvatar}>
        <Text style={styles.headerAvatarText}>{getInitial(user.name, user.username)}</Text>
      </View>
    </View>
  );
}

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

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "SI Jumantik",
        headerStyle: { backgroundColor: COLORS.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: COLORS.textDark },
        headerRight: () => <HeaderUserInfo />,
      }}
    >
      <Stack.Screen name="login" options={{ headerRight: () => null }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  headerUserWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
    backgroundColor: COLORS.cardBg,
    paddingVertical: 4,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 24, // bikin pill
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  headerTextWrapper: {
    alignItems: 'flex-end',
    maxWidth: 130,
  },
  headerName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  headerSub: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15, // tetap lingkaran penuh
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: COLORS.cardBg,
    fontSize: 13,
    fontWeight: '700',
  },
});