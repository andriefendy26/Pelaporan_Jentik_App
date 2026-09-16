import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../services/Context/AuthContext';
import { profileService } from '../services/Profileservice';

/** Palet disamakan dengan dashboard & laporan. */
const COLORS = {
  bg: '#F4F6F8',
  cardBg: '#FFFFFF',
  fieldBg: '#F7F9FA',
  textDark: '#222831',
  textSecondary: '#393E46',
  textMuted: '#7A828C',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.10)',
  violet: '#7C5CFC',
  violetSoft: 'rgba(124, 92, 252, 0.10)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245, 158, 11, 0.12)',
  danger: '#F43F5E',
  dangerSoft: 'rgba(244, 63, 94, 0.10)',
  dangerBg: '#fdecea',
  border: '#E6E9ED',
  muted: '#9aa0a6',
};

function getInitial(name?: string, username?: string) {
  const source = name || username || '?';
  return source.trim().charAt(0).toUpperCase();
}

export default function SettingScreen() {
  const { user, logout } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();

  }, []);

  const loadProfile = async () => {
    try {
      const response = await profileService.getProfile();
      const profile = response?.data?.data;
      if (profile) {
        setName(profile.name ?? '');
        setEmail(profile.email ?? '');
        setUsername(profile.username ?? '');
      }
    } catch (error) {
      // kalau gagal fetch ulang, tetap pakai data yang sudah ada dari AuthContext
    }
  };

  const handleSaveProfile = async () => {
    if (!name || !email || !username) {
      Alert.alert('Validasi', 'Nama, email, dan username wajib diisi.');
      return;
    }

    setSavingProfile(true);
    try {
      await profileService.updateProfile({ name, email, username });
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Gagal memperbarui profil';
      Alert.alert('Gagal', message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validasi', 'Semua field password wajib diisi.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Validasi', 'Password baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validasi', 'Konfirmasi password tidak cocok.');
      return;
    }

    setSavingPassword(true);
    try {
      await profileService.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      Alert.alert('Berhasil', 'Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Gagal mengubah password';
      Alert.alert('Gagal', message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hapus Akun',
      'Tindakan ini tidak bisa dibatalkan. Yakin ingin menghapus akun kamu?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Akun',
          style: 'destructive',
          onPress: async () => {
            try {
              await profileService.deleteAccount();
              await logout();
            } catch (error: any) {
              const message = error?.response?.data?.message ?? 'Gagal menghapus akun';
              Alert.alert('Gagal', message);
            }
          },
        },
      ]
    );
  };

  // indikator kekuatan password baru (visual saja, aturan validasi tidak berubah)
  const passwordHint = (() => {
    if (!newPassword) return null;
    if (newPassword.length < 8) {
      return { label: 'Terlalu pendek (min. 8 karakter)', color: COLORS.danger };
    }
    if (newPassword.length < 12) {
      return { label: 'Cukup kuat', color: COLORS.amber };
    }
    return { label: 'Kuat', color: COLORS.accent };
  })();

  const cocok = confirmPassword.length > 0 && newPassword === confirmPassword;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header profil berwarna */}
          <View style={styles.headerCard}>
            <View style={styles.headerBlobLarge} />
            <View style={styles.headerBlobSmall} />

            <View style={styles.headerTopRow}>
              <Text style={styles.title}>Pengaturan</Text>
              <TouchableOpacity style={styles.headerLogout} onPress={handleLogout} hitSlop={8}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.cardBg} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitial(name, username)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {name || username || 'Pengguna'}
                </Text>
                <Text style={styles.profileSub} numberOfLines={1}>
                  {email || 'Belum ada email'}
                </Text>
                {username ? (
                  <View style={styles.usernameChip}>
                    <Ionicons name="at-outline" size={11} color={COLORS.cardBg} />
                    <Text style={styles.usernameChipText}>{username}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Wilayah info */}
          <View style={styles.infoRowWrapper}>
            <View style={styles.infoCard}>
              <View style={[styles.infoIconWrapper, { backgroundColor: COLORS.accentSoft }]}>
                <Ionicons name="location-outline" size={16} color={COLORS.accent} />
              </View>
              <Text style={styles.infoLabel}>Kelurahan</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.kelurahan?.name ?? '-'}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoIconWrapper, { backgroundColor: COLORS.violetSoft }]}>
                <Ionicons name="home-outline" size={16} color={COLORS.violet} />
              </View>
              <Text style={styles.infoLabel}>RT</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.r_t?.name ?? '-'}
              </Text>
            </View>
          </View>

          {/* Profil section */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionBar} />
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="person-outline" size={14} color={COLORS.accent} />
            </View>
            <Text style={styles.sectionTitle}>Profil</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nama</Text>
            <View style={[styles.inputWrapper, focusedField === 'name' && styles.inputWrapperFocused]}>
              <Ionicons name="person-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nama lengkap"
                placeholderTextColor={COLORS.muted}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Text style={styles.label}>Username</Text>
            <View style={[styles.inputWrapper, focusedField === 'username' && styles.inputWrapperFocused]}>
              <Ionicons name="at-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, savingProfile && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              {savingProfile ? (
                <ActivityIndicator color={COLORS.cardBg} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={17} color={COLORS.cardBg} />
                  <Text style={styles.buttonText}>Simpan Profil</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Password section */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionBar, { backgroundColor: COLORS.violet }]} />
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.violetSoft }]}>
              <Ionicons name="lock-closed-outline" size={14} color={COLORS.violet} />
            </View>
            <Text style={styles.sectionTitle}>Ubah Password</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Password Saat Ini</Text>
            <View style={[styles.inputWrapper, focusedField === 'current' && styles.inputWrapperFocusedViolet]}>
              <Ionicons name="key-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Password saat ini"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showCurrent}
                onFocus={() => setFocusedField('current')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
                <Ionicons
                  name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Password Baru</Text>
            <View style={[styles.inputWrapper, focusedField === 'new' && styles.inputWrapperFocusedViolet]}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimal 8 karakter"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showNew}
                onFocus={() => setFocusedField('new')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={8}>
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {passwordHint && (
              <View style={styles.hintRow}>
                <View style={[styles.hintDot, { backgroundColor: passwordHint.color }]} />
                <Text style={[styles.hintText, { color: passwordHint.color }]}>{passwordHint.label}</Text>
              </View>
            )}

            <Text style={styles.label}>Konfirmasi Password Baru</Text>
            <View style={[styles.inputWrapper, focusedField === 'confirm' && styles.inputWrapperFocusedViolet]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Ulangi password baru"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showConfirm}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && (
              <View style={styles.hintRow}>
                <Ionicons
                  name={cocok ? 'checkmark-circle' : 'close-circle'}
                  size={13}
                  color={cocok ? COLORS.accent : COLORS.danger}
                />
                <Text style={[styles.hintText, { color: cocok ? COLORS.accent : COLORS.danger }]}>
                  {cocok ? 'Password cocok' : 'Password belum cocok'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.buttonViolet, savingPassword && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={savingPassword}
              activeOpacity={0.85}
            >
              {savingPassword ? (
                <ActivityIndicator color={COLORS.cardBg} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={17} color={COLORS.cardBg} />
                  <Text style={styles.buttonText}>Ubah Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Zona akun */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionBar, { backgroundColor: COLORS.danger }]} />
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.dangerSoft }]}>
              <Ionicons name="settings-outline" size={14} color={COLORS.danger} />
            </View>
            <Text style={styles.sectionTitle}>Akun</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
              <View style={styles.logoutIconWrapper}>
                <Ionicons name="log-out-outline" size={17} color={COLORS.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logoutText}>Logout</Text>
                <Text style={styles.logoutSub}>Keluar dari akun di perangkat ini</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={COLORS.muted} />
            </TouchableOpacity>

            {/* Hapus akun dinonaktifkan sementara, tinggal uncomment kalau sudah siap dipakai */}
            {/* <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              <Text style={styles.deleteText}>Hapus Akun</Text>
            </TouchableOpacity> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 110 },

  /* ---------- Header ---------- */
  headerCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  headerBlobLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -70,
    right: -45,
  },
  headerBlobSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -45,
    left: -15,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.cardBg },
  headerLogout: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.cardBg, fontSize: 22, fontWeight: '700' },
  profileName: { fontSize: 16.5, fontWeight: '700', color: COLORS.cardBg },
  profileSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  usernameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 7,
  },
  usernameChipText: { fontSize: 10.5, fontWeight: '700', color: COLORS.cardBg },

  /* ---------- Info wilayah ---------- */
  infoRowWrapper: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  infoIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  infoLabel: { fontSize: 11, color: COLORS.textMuted },
  infoValue: { fontSize: 14.5, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },

  /* ---------- Section ---------- */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.accent },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },

  /* ---------- Card & form ---------- */
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  label: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 9,
  },
  inputWrapperFocused: { borderColor: COLORS.accent, backgroundColor: COLORS.cardBg },
  inputWrapperFocusedViolet: { borderColor: COLORS.violet, backgroundColor: COLORS.cardBg },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.textDark },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  hintDot: { width: 7, height: 7, borderRadius: 4 },
  hintText: { fontSize: 11.5, fontWeight: '600' },

  button: {
    flexDirection: 'row',
    gap: 7,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonViolet: {
    flexDirection: 'row',
    gap: 7,
    backgroundColor: COLORS.violet,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: COLORS.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.6, shadowOpacity: 0 },
  buttonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 14.5 },

  /* ---------- Akun ---------- */
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.fieldBg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  logoutIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: COLORS.textDark, fontWeight: '700', fontSize: 14 },
  logoutSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  deleteButton: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: COLORS.dangerSoft,
  },
  deleteText: { color: COLORS.danger, fontWeight: '700', fontSize: 14.5 },
});