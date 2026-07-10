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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Setting</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Kelurahan</Text>
          <Text style={styles.infoValue}>{user?.kelurahan?.name ?? '-'}</Text>
          <Text style={styles.infoLabel}>RT</Text>
          <Text style={styles.infoValue}>{user?.r_t?.name ?? '-'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Profil</Text>

        <Text style={styles.label}>Nama</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama lengkap" />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.button} onPress={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Simpan Profil</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Ubah Password</Text>

        <Text style={styles.label}>Password Saat Ini</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Password saat ini"
          secureTextEntry
        />

        <Text style={styles.label}>Password Baru</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Minimal 8 karakter"
          secureTextEntry
        />

        <Text style={styles.label}>Konfirmasi Password Baru</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Ulangi password baru"
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={savingPassword}>
          {savingPassword ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ubah Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
{/* 
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Hapus Akun</Text>
        </TouchableOpacity> */}
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  infoBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoLabel: { fontSize: 12, color: '#4338ca', marginTop: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e1b4b' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: '#334155', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutText: { color: '#334155', fontWeight: '700', fontSize: 15 },
  deleteButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#fef2f2',
  },
  deleteText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});