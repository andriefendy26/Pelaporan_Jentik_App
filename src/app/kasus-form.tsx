import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { kasusService } from '../services/Jentikservice';
import { useAuth } from '../services/Context/AuthContext';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.1)',
  border: '#e0e0e0',
};

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function toDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toApiDateString(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDisplayDateString(date: Date) {
  return `${date.getDate()} ${BULAN_NAMA[date.getMonth()]} ${date.getFullYear()}`;
}

function parseApiDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateOnly(parsed);
}

export default function KasusFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const { user } = useAuth();

  const [namaPenderita, setNamaPenderita] = useState('');
  const [nik, setNik] = useState('');
const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | null>(null);
const [usia, setUsia] = useState('');
const [alamat, setAlamat] = useState('');
const [noTelepon, setNoTelepon] = useState('');
  const [tanggalPenderita, setTanggalPenderita] = useState<Date | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const today = toDateOnly(new Date());

  useEffect(() => {
    if (isEdit) {
      loadExisting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadExisting = async () => {
    try {
      const response = await kasusService.getById(id as string);
      const data = response?.data?.data;
      setNamaPenderita(data?.nama_penderita ?? '');
      setNik(data?.nik ?? '');
    setJenisKelamin(data?.jenis_kelamin ?? null);
    setUsia(data?.usia ? String(data.usia) : '');
    setAlamat(data?.alamat ?? '');
    setNoTelepon(data?.no_telepon ?? '');
      setTanggalPenderita(parseApiDate(data?.tanggal_penderita));
    } catch (error: any) {
      Alert.alert('Gagal memuat data', error?.response?.data?.message ?? 'Terjadi kesalahan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const openDatePicker = () => {
    setTempDate(tanggalPenderita ?? today);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: { nativeEvent: { timestamp: number } }, date: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (date) setTanggalPenderita(toDateOnly(date));
      return;
    }
    if (date) setTempDate(date);
  };

  const confirmIosDate = () => {
    setTanggalPenderita(toDateOnly(tempDate));
    setShowDatePicker(false);
  };

  const handleSubmit = async () => {
    if (!user?.id_kelurahan || !user?.id_rt) {
      Alert.alert(
        'Data user tidak lengkap',
        'Akun kamu belum memiliki id_kelurahan / id_rt. Hubungi admin untuk melengkapi data akun.'
      );
      return;
    }
    if (!namaPenderita.trim()) {
      Alert.alert('Validasi', 'Nama penderita wajib diisi.');
      return;
    }
    if (nik.trim() && nik.trim().length !== 16) {
        Alert.alert('Validasi', 'NIK harus 16 digit.');
        return;
    }
    if (!tanggalPenderita) {
      Alert.alert('Validasi', 'Tanggal wajib diisi.');
      return;
    }
    if (tanggalPenderita.getTime() > today.getTime()) {
      Alert.alert('Validasi', 'Tanggal tidak boleh di masa depan.');
      return;
    }

    const payload = {
        id_kelurahan: user.id_kelurahan,
        id_rt: user.id_rt,
        nama_penderita: namaPenderita.trim(),
        nik: nik.trim() || undefined,
        jenis_kelamin: jenisKelamin ?? undefined,
        usia: usia ? Number(usia) : undefined,
        alamat: alamat.trim() || undefined,
        no_telepon: noTelepon.trim() || undefined,
        tanggal_penderita: toApiDateString(tanggalPenderita),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await kasusService.update(id as string, payload);
      } else {
        await kasusService.create(payload);
      }
      Alert.alert('Berhasil', isEdit ? 'Data berhasil diperbarui' : 'Data berhasil disimpan', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Gagal menyimpan data, periksa koneksi kamu.';
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Kasus DBD' : 'Tambah Kasus DBD'}</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person-outline" size={15} color={COLORS.accent} />
          <Text style={styles.sectionLabel}>Nama Penderita</Text>
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="Nama lengkap penderita"
          placeholderTextColor="#9aa0a6"
          value={namaPenderita}
          onChangeText={setNamaPenderita}
        />
        <View style={styles.sectionHeaderRow}>
  <Ionicons name="card-outline" size={15} color={COLORS.accent} />
  <Text style={styles.sectionLabel}>NIK (opsional)</Text>
</View>
<TextInput
  style={styles.textInput}
  placeholder="16 digit NIK"
  placeholderTextColor="#9aa0a6"
  value={nik}
  onChangeText={setNik}
  keyboardType="number-pad"
  maxLength={16}
/>

<View style={styles.rowTwo}>
  <View style={{ flex: 1 }}>
    <View style={styles.sectionHeaderRow}>
      <Ionicons name="male-female-outline" size={15} color={COLORS.accent} />
      <Text style={styles.sectionLabel}>Jenis Kelamin</Text>
    </View>
    <View style={styles.genderRow}>
      <TouchableOpacity
        style={[styles.genderOption, jenisKelamin === 'L' && styles.genderOptionActive]}
        onPress={() => setJenisKelamin('L')}
      >
        <Text style={[styles.genderOptionText, jenisKelamin === 'L' && styles.genderOptionTextActive]}>
          Laki-laki
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.genderOption, jenisKelamin === 'P' && styles.genderOptionActive]}
        onPress={() => setJenisKelamin('P')}
      >
        <Text style={[styles.genderOptionText, jenisKelamin === 'P' && styles.genderOptionTextActive]}>
          Perempuan
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</View>

<View style={styles.sectionHeaderRow}>
  <Ionicons name="body-outline" size={15} color={COLORS.accent} />
  <Text style={styles.sectionLabel}>Usia (tahun, opsional)</Text>
</View>
<TextInput
  style={styles.textInput}
  placeholder="Contoh: 8"
  placeholderTextColor="#9aa0a6"
  value={usia}
  onChangeText={setUsia}
  keyboardType="number-pad"
  maxLength={3}
/>

<View style={styles.sectionHeaderRow}>
  <Ionicons name="home-outline" size={15} color={COLORS.accent} />
  <Text style={styles.sectionLabel}>Alamat (opsional)</Text>
</View>
<TextInput
  style={[styles.textInput, styles.textArea]}
  placeholder="Alamat lengkap penderita"
  placeholderTextColor="#9aa0a6"
  value={alamat}
  onChangeText={setAlamat}
  multiline
  numberOfLines={3}
/>

<View style={styles.sectionHeaderRow}>
  <Ionicons name="call-outline" size={15} color={COLORS.accent} />
  <Text style={styles.sectionLabel}>No. Telepon (opsional)</Text>
</View>
<TextInput
  style={styles.textInput}
  placeholder="Contoh: 081234567890"
  placeholderTextColor="#9aa0a6"
  value={noTelepon}
  onChangeText={setNoTelepon}
  keyboardType="phone-pad"
/>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.accent} />
          <Text style={styles.sectionLabel}>Tanggal</Text>
        </View>
        <TouchableOpacity style={styles.dateWrapper} onPress={openDatePicker} activeOpacity={0.7}>
          <View style={styles.dateIconWrapper}>
            <Ionicons name="calendar" size={18} color={COLORS.accent} />
          </View>
          <Text style={[styles.dateText, !tanggalPenderita && styles.datePlaceholder]}>
            {tanggalPenderita ? toDisplayDateString(tanggalPenderita) : 'Pilih tanggal'}
          </Text>
          <TouchableOpacity style={styles.todayButton} onPress={() => setTanggalPenderita(today)} hitSlop={8}>
            <Text style={styles.todayButtonText}>Hari ini</Text>
          </TouchableOpacity>
        </TouchableOpacity>
        <Text style={styles.helperText}>Tanggal tidak boleh melebihi hari ini.</Text>

        <View style={{ height: 8 }} />
      </ScrollView>

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
              <Ionicons name={isEdit ? 'checkmark-circle-outline' : 'save-outline'} size={18} color={COLORS.cardBg} />
              <Text style={styles.submitText}>{isEdit ? 'Simpan Perubahan' : 'Simpan Kasus'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="calendar"
          maximumDate={today}
          onValueChange={handleDateChange}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancel}>Batal</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Pilih Tanggal</Text>
                <TouchableOpacity onPress={confirmIosDate}>
                  <Text style={styles.modalConfirm}>Pilih</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                maximumDate={today}
                onValueChange={handleDateChange}
                style={{ alignSelf: 'center' }}
              />
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textDark },
  content: { padding: 20, paddingTop: 4, paddingBottom: 24 },
  infoBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
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
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 1 },
  infoDivider: { height: 1, backgroundColor: '#eee', marginVertical: 12, marginLeft: 44 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  textInput: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 22,
  },
  dateWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  textArea: {
  textAlignVertical: 'top',
  minHeight: 80,
},
rowTwo: {
  marginBottom: 22,
},
genderRow: {
  flexDirection: 'row',
  gap: 10,
},
genderOption: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: COLORS.border,
  alignItems: 'center',
  backgroundColor: COLORS.cardBg,
},
genderOptionActive: {
  backgroundColor: COLORS.accent,
  borderColor: COLORS.accent,
},
genderOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
genderOptionTextActive: { color: COLORS.cardBg },
  dateIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  datePlaceholder: { color: '#9aa0a6', fontWeight: '400' },
  todayButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: COLORS.accentSoft },
  todayButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  helperText: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 6, marginBottom: 22, marginLeft: 2 },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  modalCancel: { fontSize: 14, color: COLORS.textSecondary },
  modalConfirm: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
});