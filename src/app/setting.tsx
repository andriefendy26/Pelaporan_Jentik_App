import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  danger: '#dc2626',
  dangerBg: '#fdecea',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pengaturan</Text>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitial(name, username)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{name || username || 'Pengguna'}</Text>
            <Text style={styles.profileSub}>{email || 'Belum ada email'}</Text>
          </View>
        </View>

        {/* Wilayah info */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="location-outline" size={16} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Kelurahan</Text>
              <Text style={styles.infoValue}>{user?.kelurahan?.name ?? '-'}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="home-outline" size={16} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.infoLabel}>RT</Text>
              <Text style={styles.infoValue}>{user?.r_t?.name ?? '-'}</Text>
            </View>
          </View>
        </View>

        {/* Profil section */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person-outline" size={17} color={COLORS.textDark} />
          <Text style={styles.sectionTitle}>Profil</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nama</Text>
          <View style={[styles.inputWrapper, focusedField === 'name' && styles.inputWrapperFocused]}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nama lengkap"
              placeholderTextColor="#9aa0a6"
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#9aa0a6"
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <Text style={styles.label}>Username</Text>
          <View style={[styles.inputWrapper, focusedField === 'username' && styles.inputWrapperFocused]}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="#9aa0a6"
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
              <Text style={styles.buttonText}>Simpan Profil</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Password section */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="lock-closed-outline" size={17} color={COLORS.textDark} />
          <Text style={styles.sectionTitle}>Ubah Password</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Password Saat Ini</Text>
          <View style={[styles.inputWrapper, focusedField === 'current' && styles.inputWrapperFocused]}>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Password saat ini"
              placeholderTextColor="#9aa0a6"
              secureTextEntry={!showCurrent}
              onFocus={() => setFocusedField('current')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
              <Ionicons
                name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Password Baru</Text>
          <View style={[styles.inputWrapper, focusedField === 'new' && styles.inputWrapperFocused]}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimal 8 karakter"
              placeholderTextColor="#9aa0a6"
              secureTextEntry={!showNew}
              onFocus={() => setFocusedField('new')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={8}>
              <Ionicons
                name={showNew ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Konfirmasi Password Baru</Text>
          <View style={[styles.inputWrapper, focusedField === 'confirm' && styles.inputWrapperFocused]}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Ulangi password baru"
              placeholderTextColor="#9aa0a6"
              secureTextEntry={!showConfirm}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
              <Ionicons
                name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, savingPassword && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={savingPassword}
            activeOpacity={0.85}
          >
            {savingPassword ? (
              <ActivityIndicator color={COLORS.cardBg} />
            ) : (
              <Text style={styles.buttonText}>Ubah Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Zona akun */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="settings-outline" size={17} color={COLORS.textDark} />
          <Text style={styles.sectionTitle}>Akun</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.textDark} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Hapus akun dinonaktifkan sementara, tinggal uncomment kalau sudah siap dipakai */}
          {/* <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <Text style={styles.deleteText}>Hapus Akun</Text>
          </TouchableOpacity> */}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 110 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textDark, marginBottom: 16 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.cardBg, fontSize: 22, fontWeight: '700' },
  profileName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  profileSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  infoBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 1 },
  infoDivider: { height: 1, backgroundColor: '#eee', marginVertical: 12, marginLeft: 44 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  label: { fontSize: 12.5, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  inputWrapperFocused: { borderColor: COLORS.accent },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.textDark },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 15 },
  logoutButton: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: COLORS.textDark, fontWeight: '700', fontSize: 15 },
  deleteButton: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: COLORS.dangerBg,
  },
  deleteText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
});