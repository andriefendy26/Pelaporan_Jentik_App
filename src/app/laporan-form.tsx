import { useNetworkStatus, checkIsOnline } from '../hooks/useNetworkStatus';
import { enqueueLaporan } from '../services/offlineQueue';
import { syncPendingLaporan } from '../services/syncService';

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
  TouchableOpacity,
  View,
} from 'react-native';
import ItemsAbjTable from '../components/ItemsAbjTable';
import { abjService } from '../services/Jentikservice';
import { useAuth } from '../services/Context/AuthContext';
import { FormAbj, ItemAbj } from '../types/abj';
import type { KelurahanItem, RtItem } from '../services/Jentikservice';

/** Token visual disamakan dengan HomeScreen. */
const COLORS = {
  bg: '#F4F6F8',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  textMuted: '#7A828C',
  accent: '#00ADB5',
  accentDark: '#008B92',
  accentSoft: 'rgba(0, 173, 181, 0.10)',
  violet: '#7C5CFC',
  violetSoft: 'rgba(124, 92, 252, 0.10)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245, 158, 11, 0.12)',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16, 185, 129, 0.12)',
  rose: '#F43F5E',
  roseSoft: 'rgba(244, 63, 94, 0.10)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  border: '#E6E9ED',
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
  const [isSuperAdmin] = useState(() => {
    const u = user;
    if (!u) return false;
    const roles = u?.roles ?? u?.role ?? [];
    if (Array.isArray(roles)) return roles.some((r: any) => r?.name === 'super_admin' || r === 'super_admin');
    return roles === 'super_admin';
  });
  const [showKelurahanModal, setShowKelurahanModal] = useState(false);
  const [showRtModal, setShowRtModal] = useState(false);
  const [kelurahanList, setKelurahanList] = useState<KelurahanItem[]>([]);
  const [selectedKelurahanId, setSelectedKelurahanId] = useState<number | null>(() => user?.id_kelurahan ?? null);
  const [selectedKelurahanName, setSelectedKelurahanName] = useState<string>(() => user?.kelurahan?.name ?? (user?.id_kelurahan ? `Kelurahan ${user.id_kelurahan}` : ''));
  const [selectedRtId, setSelectedRtId] = useState<number | null>(() => user?.id_rt ?? null);
  const [selectedRtName, setSelectedRtName] = useState<string>(() => user?.r_t?.name ?? (user?.id_rt ? `RT ${user.id_rt}` : ''));
  const [rtList, setRtList] = useState<RtItem[]>([]);
  const [rtLoading, setRtLoading] = useState(false);
  const [kelurahanLoading, setKelurahanLoading] = useState(false);
  const [kelurahanError, setKelurahanError] = useState<string | null>(null);
  const [rtError, setRtError] = useState<string | null>(null);
  const [fetchRtId, setFetchRtId] = useState<number | null>(null);

  const today = toDateOnly(new Date());

  const loadExisting = async () => {
    try {
      const response = await abjService.getById(id as string);
      const form = response?.data?.data;
      const parsed = parseApiDate(form?.tanggal_pemeriksaan);
      setTanggalPemeriksaan(parsed);
      setItems(form?.items_abj ?? []);
      if (form?.id_kelurahan) {
        setSelectedKelurahanId(form.id_kelurahan);
        setSelectedKelurahanName(form?.kelurahan?.name ?? `Kelurahan ${form.id_kelurahan}`);
      }
      if (form?.id_rt) {
        setSelectedRtId(form.id_rt);
        setSelectedRtName(form?.rt?.name ?? `RT ${form.id_rt}`);
      }
    } catch (error: any) {
      Alert.alert('Gagal memuat data', error?.response?.data?.message ?? 'Terjadi kesalahan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadExisting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const fetchKelurahanList = () => {
    setKelurahanError(null);
    setKelurahanLoading(true);
    abjService.getKelurahan().then((res) => {
      setKelurahanList(res?.data?.data ?? []);
    }).catch(() => {
      setKelurahanError('Gagal memuat daftar kelurahan');
    }).finally(() => {
      setKelurahanLoading(false);
    });
  };

  useEffect(() => {
    if (isSuperAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchKelurahanList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const fetchRtList = async (id_kelurahan: number) => {
    setRtLoading(true);
    setRtList([]);
    setRtError(null);
    setFetchRtId(id_kelurahan);
    try {
      const response = await abjService.getRtByKelurahan(id_kelurahan);
      const rts = response?.data?.data ?? [];
      setRtList(rts);
      if (rts.length === 0) {
        Alert.alert('Tidak ada RT', 'Tidak ada RT ditemukan di kelurahan ini.');
      } else {
        setShowRtModal(true);
      }
    } catch {
      setRtError('Gagal memuat daftar RT');
      Alert.alert('Gagal', 'Tidak dapat mengambil data RT.');
    } finally {
      setRtLoading(false);
    }
  };

  const openRtModal = (id_kelurahan: number) => {
    if (rtList.length > 0 && fetchRtId === id_kelurahan) {
      setShowRtModal(true);
      return;
    }
    fetchRtList(id_kelurahan);
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

    const idKelurahan = isSuperAdmin && selectedKelurahanId ? selectedKelurahanId : user?.id_kelurahan;
    const idRt = isSuperAdmin && selectedRtId ? selectedRtId : user?.id_rt;

    if (!idKelurahan || !idRt) {
      Alert.alert(
        'Data user tidak lengkap',
        'Akun kamu belum memiliki id_kelurahan / id_rt. Hubungi admin untuk melengkapi data akun.'
      );
      return;
    }

    const payload = {
      id_kelurahan: idKelurahan,
      id_rt: idRt,
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
      // Android sebelumnya `behavior={undefined}` -> KeyboardAvoidingView
      // tidak melakukan apa-apa di Android, jadi form tidak pernah naik
      // saat keyboard muncul (termasuk saat mengisi input di dalam
      // ItemsAbjTable). "height" membuat area ScrollView otomatis
      // menyusut ketika keyboard tampil.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* Hero card mengikuti pola HomeScreen */}
        <View style={styles.heroCard}>
          <View style={styles.heroBlobLarge} />
          <View style={styles.heroBlobSmall} />

          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>
                {isEdit ? 'Edit Laporan ABJ' : 'Tambah Laporan ABJ'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isEdit ? 'Perbarui data pemeriksaan jentik' : 'Catat hasil pemeriksaan jentik'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroIconButton}
              onPress={() => router.back()}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color={COLORS.cardBg} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Ionicons name="location-outline" size={13} color={COLORS.cardBg} />
              <Text style={styles.heroChipText} numberOfLines={1}>
                {selectedKelurahanName || 'Kelurahan belum dipilih'}
              </Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="home-outline" size={13} color={COLORS.cardBg} />
              <Text style={styles.heroChipText} numberOfLines={1}>
                {selectedRtName || 'RT belum dipilih'}
              </Text>
            </View>
          </View>

          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline-outline" size={12} color={COLORS.cardBg} />
              <Text style={styles.offlineBadgeText}>Mode offline — tersimpan di perangkat</Text>
            </View>
          )}
        </View>

        {isSuperAdmin && (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionBar} />
                <Text style={styles.sectionTitle}>Wilayah</Text>
              </View>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => setShowKelurahanModal(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.pickerIconWrapper, { backgroundColor: COLORS.violetSoft }]}>
                  <Ionicons name="map-outline" size={16} color={COLORS.violet} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerLabel}>Kelurahan</Text>
                  <Text style={[styles.pickerValue, !selectedKelurahanId && styles.pickerPlaceholder]} numberOfLines={1}>
                    {selectedKelurahanName || 'Pilih kelurahan'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#b0b4ba" />
              </TouchableOpacity>

              <View style={styles.cardDivider} />

              <TouchableOpacity
                style={[styles.pickerRow, !selectedKelurahanId && styles.pickerRowDisabled]}
                onPress={() => {
                  if (selectedKelurahanId) {
                    openRtModal(selectedKelurahanId);
                  } else {
                    Alert.alert('Belum ada kelurahan', 'Pilih kelurahan terlebih dahulu.');
                  }
                }}
                activeOpacity={0.75}
                disabled={!selectedKelurahanId}
              >
                <View style={[styles.pickerIconWrapper, { backgroundColor: COLORS.amberSoft }]}>
                  <Ionicons name="home-outline" size={16} color={COLORS.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerLabel}>RT</Text>
                  <Text style={[styles.pickerValue, !selectedRtId && styles.pickerPlaceholder]} numberOfLines={1}>
                    {selectedRtName || 'Pilih RT'}
                  </Text>
                </View>
                {rtLoading ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#b0b4ba" />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Tanggal pemeriksaan */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Tanggal Pemeriksaan</Text>
          </View>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => setTanggalPemeriksaan(today)}
            hitSlop={8}
            activeOpacity={0.8}
          >
            <Text style={styles.todayButtonText}>Hari ini</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.card} onPress={openDatePicker} activeOpacity={0.75}>
          <View style={styles.pickerRow}>
            <View style={[styles.pickerIconWrapper, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerLabel}>Tanggal</Text>
              <Text style={[styles.pickerValue, !tanggalPemeriksaan && styles.pickerPlaceholder]}>
                {tanggalPemeriksaan ? toDisplayDateString(tanggalPemeriksaan) : 'Pilih tanggal pemeriksaan'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#b0b4ba" />
          </View>
        </TouchableOpacity>
        <Text style={styles.helperText}>Tanggal tidak boleh melebihi hari ini.</Text>

        {/* Data pemeriksaan */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Data Kepala Keluarga</Text>
          </View>
          {items.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{items.length} baris</Text>
            </View>
          ) : null}
        </View>

        <ItemsAbjTable items={items} onChange={setItems} />

        {/* Ruang ekstra supaya baris terakhir tidak ketutupan footer. */}
        <View style={{ height: 24 }} />
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

      {/* Kelurahan modal */}
      <Modal
        visible={showKelurahanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKelurahanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Kelurahan</Text>
              <TouchableOpacity onPress={() => setShowKelurahanModal(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {kelurahanLoading ? (
                <ActivityIndicator size="small" color={COLORS.accent} style={{ paddingVertical: 24 }} />
              ) : kelurahanError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.emptyModalText}>{kelurahanError}</Text>
                  <TouchableOpacity onPress={fetchKelurahanList} style={styles.retryButton} activeOpacity={0.8}>
                    <Ionicons name="refresh" size={14} color={COLORS.accent} />
                    <Text style={styles.retryButtonText}>Coba lagi</Text>
                  </TouchableOpacity>
                </View>
              ) : kelurahanList.length === 0 ? (
                <Text style={styles.emptyModalText}>Tidak ada kelurahan tersedia.</Text>
              ) : (
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
                  {kelurahanList.map((kl) => {
                    const aktif = selectedKelurahanId === kl.id;
                    return (
                      <TouchableOpacity
                        key={kl.id}
                        style={[styles.modalOption, aktif && styles.modalOptionActive]}
                        onPress={() => {
                          setSelectedKelurahanId(kl.id);
                          setSelectedKelurahanName(kl.name);
                          setShowKelurahanModal(false);
                          openRtModal(kl.id);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.modalOptionText, aktif && styles.modalOptionTextActive]}>
                          {kl.name}
                        </Text>
                        {aktif && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* RT modal */}
      <Modal
        visible={showRtModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRtModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih RT</Text>
              <TouchableOpacity onPress={() => setShowRtModal(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {rtLoading ? (
                <ActivityIndicator size="small" color={COLORS.accent} style={{ paddingVertical: 24 }} />
              ) : rtError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.emptyModalText}>{rtError}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setRtError(null);
                      openRtModal(fetchRtId ?? selectedKelurahanId ?? 0);
                    }}
                    style={styles.retryButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={14} color={COLORS.accent} />
                    <Text style={styles.retryButtonText}>Coba lagi</Text>
                  </TouchableOpacity>
                </View>
              ) : rtList.length === 0 ? (
                <Text style={styles.emptyModalText}>Tidak ada RT tersedia.</Text>
              ) : (
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
                  {rtList.map((rt) => {
                    const aktif = selectedRtId === rt.id;
                    return (
                      <TouchableOpacity
                        key={rt.id}
                        style={[styles.modalOption, aktif && styles.modalOptionActive]}
                        onPress={() => {
                          setSelectedRtId(rt.id);
                          setSelectedRtName(rt.name);
                          setShowRtModal(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.modalOptionText, aktif && styles.modalOptionTextActive]}>
                          {rt.name}
                        </Text>
                        {aktif && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

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

      {/* Date picker: iOS pakai bottom sheet + tombol konfirmasi */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
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
  content: {
    padding: 20,
    paddingBottom: 24,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 720,
    minWidth: '100%',
  },

  /* ---------- Hero ---------- */
  heroCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  heroBlobLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -70,
    right: -50,
  },
  heroBlobSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -50,
    left: -20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 20, fontWeight: '700', color: COLORS.cardBg, marginBottom: 2 },
  heroSubtitle: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  heroIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChipRow: { flexDirection: 'row', gap: 8 },
  heroChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  heroChipText: { flex: 1, fontSize: 11.5, fontWeight: '700', color: COLORS.cardBg },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  offlineBadgeText: { fontSize: 11, color: COLORS.cardBg, fontWeight: '700' },

  /* ---------- Section ---------- */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.accent },
  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.textDark },
  countBadge: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.accent },
  todayButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },
  todayButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },

  /* ---------- Kartu form ---------- */
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 46 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  pickerRowDisabled: { opacity: 0.5 },
  pickerIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: { fontSize: 11, color: COLORS.textMuted },
  pickerValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
  pickerPlaceholder: { color: '#9aa0a6', fontWeight: '400' },
  helperText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: -14,
    marginBottom: 22,
    marginLeft: 4,
  },

  /* ---------- Footer ---------- */
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 15 },

  /* ---------- Modal ---------- */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDE1E6',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  modalCancel: { fontSize: 14, color: COLORS.textMuted },
  modalConfirm: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
  modalBody: { paddingHorizontal: 16 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: COLORS.accentSoft },
  modalOptionText: { fontSize: 14.5, color: COLORS.textDark },
  modalOptionTextActive: { color: COLORS.accent, fontWeight: '700' },
  modalErrorBox: { paddingVertical: 20, alignItems: 'center' },
  emptyModalText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryButtonText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },
});