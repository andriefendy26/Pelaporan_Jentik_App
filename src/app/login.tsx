import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StatusBarStyle,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../services/Context/AuthContext';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  accentDark: '#0C7489',
  accentDeep: '#075364',
  ripple: 'rgba(255,255,255,0.10)',
  rippleSoft: 'rgba(255,255,255,0.06)',
  danger: '#dc2626',
};

const STYLES = ['default', 'dark-content', 'light-content'] as const;
const TRANSITIONS = ['fade', 'slide', 'none'] as const;

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);

  async function handleLogin() {
    if (!username || !password) {
      setErrorMsg('Username dan password wajib diisi');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    const result = await login(username, password);

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.message);
    }
  }

    const [hidden, setHidden] = useState(false);
  const [statusBarStyle, setStatusBarStyle] = useState<StatusBarStyle>(
    STYLES[0],
  );
  const [statusBarTransition, setStatusBarTransition] = useState<
    'fade' | 'slide' | 'none'
  >(TRANSITIONS[0]);

  const changeStatusBarVisibility = () => setHidden(!hidden);

  const changeStatusBarStyle = () => {
    const styleId = STYLES.indexOf(statusBarStyle) + 1;
    if (styleId === STYLES.length) {
      setStatusBarStyle(STYLES[0]);
    } else {
      setStatusBarStyle(STYLES[styleId]);
    }
  };

  const changeStatusBarTransition = () => {
    const transition = TRANSITIONS.indexOf(statusBarTransition) + 1;
    if (transition === TRANSITIONS.length) {
      setStatusBarTransition(TRANSITIONS[0]);
    } else {
      setStatusBarTransition(TRANSITIONS[transition]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar
          animated={true}
          backgroundColor="#61dafb"
          barStyle={statusBarStyle}
          showHideTransition={statusBarTransition}
          hidden={hidden}
        />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
    
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            {/* Ilustrasi riak air — representasi jentik/penampungan air */}
            <View style={styles.rippleWrapper} pointerEvents="none">
              <View style={[styles.rippleRing, styles.rippleRingOuter]} />
              <View style={[styles.rippleRing, styles.rippleRingMid]} />
              <View style={[styles.rippleRing, styles.rippleRingInner]} />
            </View>

            <View style={styles.heroIconWrapper}>
              <Ionicons name="water" size={30} color={COLORS.accentDeep} />
            </View>

            <Text style={styles.heroEyebrow}>Pelaporan Jentik</Text>
            <Text style={styles.heroTitle}>SI Jumantik</Text>
            <Text style={styles.heroSubtitle}>Masuk untuk mulai memeriksa & melapor</Text>
          </View>

          {/* Card login, menumpuk di atas hero */}
          <View style={styles.card}>
            <Text style={styles.label}>Username</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'username' && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={focusedField === 'username' ? COLORS.accent : '#9aa0a6'}
              />
              <TextInput
                style={styles.input}
                placeholder="Masukkan username"
                placeholderTextColor="#9aa0a6"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'password' && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focusedField === 'password' ? COLORS.accent : '#9aa0a6'}
              />
              <TextInput
                style={styles.input}
                placeholder="Masukkan password"
                placeholderTextColor="#9aa0a6"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#9aa0a6"
                />
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
                <Text style={styles.error}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.cardBg} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Masuk</Text>
                  <Ionicons name="arrow-forward" size={17} color={COLORS.cardBg} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            Akses khusus petugas Puskesmas & kader pemantau jentik
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
        <StatusBar/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  hero: {
    backgroundColor: COLORS.accentDark,
    paddingTop: 64,
    paddingBottom: 72,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  rippleWrapper: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.accentDark, // samakan dengan warna hero, biar area status bar nyambung mulus
  },
  rippleRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  rippleRingOuter: {
    width: 260,
    height: 260,
    borderColor: COLORS.rippleSoft,
  },
  rippleRingMid: {
    width: 190,
    height: 190,
    borderColor: COLORS.ripple,
  },
  rippleRingInner: {
    width: 130,
    height: 130,
    backgroundColor: COLORS.ripple,
    borderColor: 'transparent',
  },
  heroIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroTitle: {
    color: COLORS.cardBg,
    fontSize: 24,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 22,
    marginHorizontal: 22,
    marginTop: -40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },
  label: {
    color: COLORS.textDark,
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputWrapperFocused: {
    borderColor: COLORS.accent,
    backgroundColor: '#F0FBFC',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textDark,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  error: {
    color: COLORS.danger,
    fontSize: 12.5,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.cardBg,
    fontSize: 15.5,
    fontWeight: '700',
  },

  footerNote: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 11.5,
    marginTop: 20,
    paddingHorizontal: 40,
  },
});