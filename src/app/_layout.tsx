import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AuthProvider, useAuth } from '../services/Context/AuthContext';

const COLORS = {
  bg: '#F5F6F7',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#4B525A',
  textMuted: '#8A9099',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.10)',
  border: '#E6E9ED',
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  petugas: 'Petugas',
  jumantik: 'Jumantik',
};

/** Ambil huruf awal dari maksimal dua kata: "Budi Santoso" -> "BS". */
function getInitials(name?: string, username?: string) {
  const source = (name || username || '').trim();
  if (!source) return '?';

  const words = source.split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w.charAt(0));
  return letters.join('').toUpperCase();
}

/** roles bisa datang sebagai array objek, array string, atau string tunggal. */
function getRoleName(user: any): string | null {
  const roles = user?.roles ?? user?.role;
  if (!roles) return null;

  const raw = Array.isArray(roles)
    ? typeof roles[0] === 'string'
      ? roles[0]
      : roles[0]?.name
    : typeof roles === 'string'
    ? roles
    : roles?.name;

  if (!raw) return null;
  return ROLE_LABEL[raw] ?? String(raw).replace(/_/g, ' ');
}

function HeaderUserInfo() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Di layar sempit, teks disembunyikan supaya judul header tidak terpotong.
  const showText = width >= 360;

  const { displayName, subtitle, initials } = useMemo(() => {
    const kelurahan = user?.kelurahan?.name;
    const rt = user?.r_t?.name;
    const role = getRoleName(user);

    // Gabung hanya bagian yang ada isinya — hindari "- • " yang menggantung.
    const wilayah = [kelurahan, rt ? `RT ${rt}` : null].filter(Boolean).join(' · ');

    return {
      displayName: user?.name ?? user?.username ?? 'Pengguna',
      subtitle: wilayah || role || 'Wilayah belum diatur',
      initials: getInitials(user?.name, user?.username),
    };
  }, [user]);

  if (!user) return null;

  return (
    <Pressable
      onPress={() => router.push('/setting')}
      accessibilityRole="button"
      accessibilityLabel={`Akun ${displayName}`}
      style={({ pressed }) => [styles.headerUserWrapper, pressed && styles.headerUserPressed]}
      hitSlop={6}
    >
      {showText && (
        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">
            {displayName}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        </View>
      )}

      <View style={styles.headerAvatar}>
        <Text style={styles.headerAvatarText} allowFontScaling={false}>
          {initials}
        </Text>
      </View>
    </Pressable>
  );
}

function AppTitle() {
  return (
    <View style={styles.titleWrapper}>
      <View style={styles.titleMark} />
      <Text style={styles.titleText}>SI Jumantik</Text>
    </View>
  );
}

function RootNavigation() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inLoginPage = segments[0] === 'login';

    if (!isAuthenticated && !inLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && inLoginPage) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.splashText}>Memuat sesi…</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: () => <AppTitle />,
        headerTitleAlign: 'left',
        headerStyle: { backgroundColor: COLORS.cardBg },
        headerShadowVisible: false,
        headerRight: () => <HeaderUserInfo />,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
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
  /* ---------- Splash ---------- */
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.bg,
  },
  splashText: { fontSize: 12.5, color: COLORS.textMuted, fontWeight: '600' },

  /* ---------- Judul ---------- */
  titleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleMark: { width: 4, height: 18, borderRadius: 2, backgroundColor: COLORS.accent },
  titleText: { fontSize: 16.5, fontWeight: '700', color: COLORS.textDark },

  /* ---------- User pill ---------- */
  headerUserWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
    backgroundColor: COLORS.cardBg,
    paddingVertical: 4,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerUserPressed: { backgroundColor: '#F1F3F5' },
  headerTextWrapper: { alignItems: 'flex-end', maxWidth: 140 },
  headerName: { fontSize: 12.5, fontWeight: '700', color: COLORS.textDark },
  headerSub: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 1 },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: COLORS.accent, fontSize: 11.5, fontWeight: '800' },
});