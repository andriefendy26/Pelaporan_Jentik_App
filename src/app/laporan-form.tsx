import { useNetworkStatus, checkIsOnline } from '../hooks/useNetworkStatus';
import { enqueueLaporan } from '../services/offlineQueue';
import { syncPendingLaporan } from '../services/syncService';

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  TouchableOpacity,
  View,
} from 'react-native';
import ItemsAbjTable from '../components/ItemsAbjTable';
import { abjService } from '../services/Jentikservice';
import { useAuth } from '../services/Context/AuthContext';
import { FormAbj, ItemAbj } from '../types/abj';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.1)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
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

export default function LaporanFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isOnline = useNetworkStatus();

  const isEdit = !!id;
  const { user } = useAuth();

  const [tanggalPemeriksaan, setTanggalPemeriksaan] = useState<Date | null>(null);
  const [items, setItems] = useState<ItemAbj[]>([]);
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
      const response = await abjService.getById(id as string);
      const form = response?.data?.data;
      const parsed = parseApiDate(form?.tanggal_pemeriksaan);
      setTanggalPemeriksaan(parsed);
      setItems(form?.items_abj ?? []);
    } catch (error: any) {
      Alert.alert('Gagal memuat data', error?.response?.data?.message ?? 'Terjadi kesalahan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const openDatePicker = () => {
    setTempDate(tanggalPemeriksaan ?? today);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: { nativeEvent: { timestamp: number } }, date: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (date) {
        setTanggalPemeriksaan(toDateOnly(date));
      }
      return;
    }
    // iOS: update tanggal sementara, dikonfirmasi lewat tombol "Pilih"
    if (date) setTempDate(date);
  };

  const handleDatePickerDismiss = () => {
    setShowDatePicker(false);
  };

  const confirmIosDate = () => {
    setTanggalPemeriksaan(toDateOnly(tempDate));
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
    if (!tanggalPemeriksaan) {
      Alert.alert('Validasi', 'Tanggal pemeriksaan wajib diisi.');
      return;
    }
    if (tanggalPemeriksaan.getTime() > today.getTime()) {
      Alert.alert('Validasi', 'Tanggal pemeriksaan tidak boleh di masa depan.');
      return;
    }
    if (!items || items.length === 0) {
      Alert.alert('Validasi', 'Minimal harus ada 1 data kepala keluarga yang diisi.');
      return;
    }

    const payload = {
      id_kelurahan: user.id_kelurahan,
      id_rt: user.id_rt,
      tanggal_pemeriksaan: toApiDateString(tanggalPemeriksaan),
      ItemsABJ: items,
    };

    setSubmitting(true);
    try {
      const online = await checkIsOnline();

      if (!online) {
        await enqueueLaporan(payload, isEdit ? 'update' : 'create', isEdit ? (id as string) : undefined);
        Alert.alert(
          'Tersimpan offline',
          'Kamu sedang tidak terhubung ke internet. Laporan disimpan di perangkat dan akan otomatis disinkronkan saat online kembali.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (!isEdit) {
        const existing = await abjService.getAll({
          bulan: tanggalPemeriksaan.getMonth() + 1,
          tahun: tanggalPemeriksaan.getFullYear(),
        });
        const match = (existing?.data?.data ?? []).find(
          (f: FormAbj) => f.tanggal_pemeriksaan === toApiDateString(tanggalPemeriksaan)
        );
        if (match) {
          const existingDetail = await abjService.getById(match.id);
          const existingItems = existingDetail?.data?.data?.items_abj ?? [];
          const mergedItems = [...existingItems, ...items];
          const mergedPayload = {
            id_kelurahan: user.id_kelurahan,
            id_rt: user.id_rt,
            tanggal_pemeriksaan: toApiDateString(tanggalPemeriksaan),
            ItemsABJ: mergedItems,
          };
          await abjService.update(String(match.id), mergedPayload);
          syncPendingLaporan();
          Alert.alert('Berhasil', 'Data berhasil ditambahkan ke form yang sudah ada.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
      }

      if (isEdit) {
        await abjService.update(id as string, payload);
      } else {
        await abjService.create(payload);
      }

      // sekalian sinkronkan laporan offline lain yang masih tertunda
      syncPendingLaporan();

      Alert.alert('Berhasil', isEdit ? 'Data berhasil diperbarui' : 'Data berhasil disimpan', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (!error?.response) {
        // koneksi terputus di tengah proses -> fallback simpan offline
        await enqueueLaporan(payload, isEdit ? 'update' : 'create', isEdit ? (id as string) : undefined);
        Alert.alert(
          'Tersimpan offline',
          'Koneksi terputus. Laporan disimpan di perangkat dan akan disinkronkan otomatis nanti.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        {/* <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity> */}
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Laporan ABJ' : 'Tambah Laporan ABJ'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {!isOnline && (
        <View style={styles.offlineBadge}>
          <Ionicons name="cloud-offline-outline" size={12} color={COLORS.danger} />
          <Text style={styles.offlineBadgeText}>Mode offline</Text>
        </View>
      )}

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
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.accent} />
          <Text style={styles.sectionLabel}>Tanggal Pemeriksaan</Text>
        </View>

        <TouchableOpacity style={styles.dateWrapper} onPress={openDatePicker} activeOpacity={0.7}>
          <View style={styles.dateIconWrapper}>
            <Ionicons name="calendar" size={18} color={COLORS.accent} />
          </View>
          <Text style={[styles.dateText, !tanggalPemeriksaan && styles.datePlaceholder]}>
            {tanggalPemeriksaan ? toDisplayDateString(tanggalPemeriksaan) : 'Pilih tanggal pemeriksaan'}
          </Text>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => setTanggalPemeriksaan(today)}
            hitSlop={8}
          >
            <Text style={styles.todayButtonText}>Hari ini</Text>
          </TouchableOpacity>
        </TouchableOpacity>
        <Text style={styles.helperText}>Tanggal tidak boleh melebihi hari ini.</Text>

        {/* Data pemeriksaan */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="people-outline" size={15} color={COLORS.accent} />
          <Text style={styles.sectionLabel}>Data Kepala Keluarga</Text>
          {items.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{items.length}</Text>
            </View>
          ) : null}
        </View>
        <ItemsAbjTable items={items} onChange={setItems} />

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
              <View style={styles.submitIconWrapper}>
                <Ionicons
                  name={isEdit ? 'checkmark-circle-outline' : 'save-outline'}
                  size={15}
                  color={COLORS.cardBg}
                />
              </View>
              <Text style={styles.submitText}>
                {isEdit ? 'Simpan Perubahan' : 'Simpan Laporan'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date picker: Android tampil native dialog langsung */}
      {showDatePicker && Platform.OS === 'android' && (
      <DateTimePicker
        value={tempDate}
        mode="date"
        display="calendar"
        maximumDate={today}
        onValueChange={handleDateChange}
        onDismiss={handleDatePickerDismiss}
      />
    )}

      {/* Date picker: iOS pakai modal spinner + tombol konfirmasi */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
  },
    offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  offlineBadgeText: { fontSize: 10.5, color: COLORS.danger, fontWeight: '700' },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
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
    backgroundColor: COLORS.accentSoft,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  countBadge: {
    backgroundColor: COLORS.accentSoft,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.accent },
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
  dateIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  datePlaceholder: {
    color: '#9aa0a6',
    fontWeight: '400',
  },
  todayButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.accentSoft,
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
    marginBottom: 22,
    marginLeft: 2,
  },
  repeaterCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
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
    borderTopColor: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.textDark,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  submitIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
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