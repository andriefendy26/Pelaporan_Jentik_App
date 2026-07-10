import { useLocalSearchParams, useRouter } from 'expo-router';
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
import ItemsAbjRepeater from '../components/ItemsAbjRepeater';
import { abjService } from '../services/Jentikservice';
import { useAuth } from '../services/Context/AuthContext';
import { ItemAbj } from '../types/abj';

export default function LaporanFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const { user } = useAuth();

  const [tanggalPemeriksaan, setTanggalPemeriksaan] = useState('');
  const [items, setItems] = useState<ItemAbj[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadExisting();
    }
    console.log(user)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadExisting = async () => {
    try {
      const response = await abjService.getById(id as string);
      const form = response?.data?.data;
      setTanggalPemeriksaan(form?.tanggal_pemeriksaan?.slice(0, 10) ?? '');
      setItems(form?.items_abj ?? []);
    } catch (error: any) {
      Alert.alert('Gagal memuat data', error?.response?.data?.message ?? 'Terjadi kesalahan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id_kelurahan || !user?.id_rt) {
      Alert.alert(
        'Data user tidak lengkap',
        'Akun kamu belum memiliki id_kelurahan / id_rt. Hubungi admin untuk melengkapi data akun.'
      );
      return;
    }

    if (!tanggalPemeriksaan) {
      Alert.alert('Validasi', 'Tanggal pemeriksaan wajib diisi (format YYYY-MM-DD).');
      return;
    }

    const payload = {
      id_kelurahan: user.id_kelurahan,
      id_rt: user.id_rt,
      tanggal_pemeriksaan: tanggalPemeriksaan,
      ItemsABJ: items,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await abjService.update(id as string, payload);
      } else {
        await abjService.create(payload);
      }
      Alert.alert('Berhasil', isEdit ? 'Data berhasil diperbarui' : 'Data berhasil disimpan', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? 'Gagal menyimpan data, periksa koneksi kamu.';
      Alert.alert('Gagal', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEdit ? 'Edit Laporan ABJ' : 'Tambah Laporan ABJ'}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Kelurahan (otomatis dari akun)</Text>
        <Text style={styles.infoValue}>Kelurahan : {user?.kelurahan.name ?? '-'}</Text>
        <Text style={styles.infoLabel}>RT (otomatis dari akun)</Text>
        <Text style={styles.infoValue}>RT : {user?.r_t.name ?? '-'}</Text>
      </View>

      <Text style={styles.label}>Tanggal Pemeriksaan (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="2026-07-10"
        value={tanggalPemeriksaan}
        onChangeText={setTanggalPemeriksaan}
      />

      <ItemsAbjRepeater items={items} onChange={setItems} />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{isEdit ? 'Simpan Perubahan' : 'Simpan Laporan'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  infoBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoLabel: { fontSize: 12, color: '#4338ca', marginTop: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e1b4b' },
  label: { fontSize: 13, color: '#334155', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});