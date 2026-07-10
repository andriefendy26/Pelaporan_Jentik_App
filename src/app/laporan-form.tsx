import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import ItemsAbjRepeater from '../components/ItemsAbjRepeater';
import { abjService } from '../services/Jentikservice';
import { useAuth } from '../services/Context/AuthContext';
import { ItemAbj } from '../types/abj';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
};

function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function LaporanFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const { user } = useAuth();

  const [tanggalPemeriksaan, setTanggalPemeriksaan] = useState('');
  const [items, setItems] = useState<ItemAbj[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [dateFocused, setDateFocused] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadExisting();
    }
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

    if (!DATE_REGEX.test(tanggalPemeriksaan)) {
      Alert.alert('Validasi', 'Format tanggal harus YYYY-MM-DD, contoh: 2026-07-10.');
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
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Laporan ABJ' : 'Tambah Laporan ABJ'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info akun */}
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

        {/* Tanggal pemeriksaan */}
        <Text style={styles.sectionLabel}>Tanggal Pemeriksaan</Text>
        <View style={[styles.inputWrapper, dateFocused && styles.inputWrapperFocused]}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD, contoh: 2026-07-10"
            placeholderTextColor="#9aa0a6"
            value={tanggalPemeriksaan}
            onChangeText={setTanggalPemeriksaan}
            onFocus={() => setDateFocused(true)}
            onBlur={() => setDateFocused(false)}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => setTanggalPemeriksaan(todayString())}
          >
            <Text style={styles.todayButtonText}>Hari ini</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>Format: tahun-bulan-tanggal (YYYY-MM-DD)</Text>

        {/* Data pemeriksaan */}
        <Text style={styles.sectionLabel}>Data Kepala Keluarga</Text>
        <View style={styles.repeaterCard}>
          <ItemsAbjRepeater items={items} onChange={setItems} />
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Sticky submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.cardBg} />
          ) : (
            <>
              <Ionicons
                name={isEdit ? 'checkmark-circle-outline' : 'save-outline'}
                size={18}
                color={COLORS.cardBg}
              />
              <Text style={styles.submitText}>
                {isEdit ? 'Simpan Perubahan' : 'Simpan Laporan'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  headerSpacer: { width: 38 },
  content: { padding: 20, paddingTop: 4, paddingBottom: 24 },
  infoBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  infoDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
    marginLeft: 44,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  inputWrapperFocused: {
    borderColor: COLORS.accent,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
  },
  todayButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  helperText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 6,
    marginBottom: 20,
    marginLeft: 2,
  },
  repeaterCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 15 },
});