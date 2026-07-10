import NetInfo from '@react-native-community/netinfo';
import { getQueue, PendingLaporan } from '../services/offlineQueue';
import { syncPendingLaporan, getSyncStatus } from '../services/syncService';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import { abjService } from '../services/Jentikservice';
import { FormAbj } from '../types/abj';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  danger: '#dc2626',
  dangerBg: '#fdecea',
  border: '#e2e5e9',
};

type SortOrder = 'newest' | 'oldest';

function formatTanggal(tanggal: string) {
  try {
    const date = new Date(tanggal);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return tanggal;
  }
}

// Validasi sederhana format YYYY-MM-DD
function isValidDateString(value: string) {
  if (!value) return true; // kosong = tidak difilter
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export default function LaporanScreen() {
  const router = useRouter();
  const [data, setData] = useState<FormAbj[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pendingItems, setPendingItems] = useState<PendingLaporan[]>([]);
  const [syncing, setSyncing] = useState(false);
const [needsReauth, setNeedsReauth] = useState(false)
  // --- state filter ---
  const [filterVisible, setFilterVisible] = useState(false);
  const [startDate, setStartDate] = useState(''); // draft di dalam modal
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // filter yang benar-benar diterapkan (setelah tekan "Terapkan")
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [appliedSortOrder, setAppliedSortOrder] = useState<SortOrder>('newest');

  const isFilterActive = !!appliedStartDate || !!appliedEndDate || appliedSortOrder !== 'newest';
  
  const loadPending = async () => {
    const status = await getSyncStatus();
    setPendingItems(await getQueue());
    setNeedsReauth(status.needsReauth);
  };

  const runSync = async () => {
    setSyncing(true);
    await syncPendingLaporan();
    await loadPending(); // ini sekarang juga update needsReauth
    await loadData();
    setSyncing(false);
  };

  const loadData = async () => {
    try {
      const response = await abjService.getAll();
      setData(response?.data?.data ?? []);
    } catch (error: any) {
      Alert.alert('Gagal memuat data', error?.response?.data?.message ?? 'Terjadi kesalahan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadPending();
      runSync();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      if (online) runSync();
    });
    return () => unsubscribe();
  }, []);

  // useFocusEffect(
  //   useCallback(() => {
  //     loadData();
  //     // eslint-disable-next-line react-hooks/exhaustive-deps
  //   }, [])
  // );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = (item: FormAbj) => {
    Alert.alert('Hapus Laporan', 'Yakin ingin menghapus laporan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await abjService.delete(item.id);
            setData((prev) => prev.filter((d) => d.id !== item.id));
          } catch (error: any) {
            Alert.alert('Gagal menghapus', error?.response?.data?.message ?? 'Terjadi kesalahan');
          }
        },
      },
    ]);
  };

  const openFilter = () => {
    // isi draft dengan filter yang sedang aktif
    setStartDate(appliedStartDate);
    setEndDate(appliedEndDate);
    setSortOrder(appliedSortOrder);
    setFilterVisible(true);
  };

  const applyFilter = () => {
    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      Alert.alert('Format tanggal salah', 'Gunakan format YYYY-MM-DD, contoh: 2026-07-11');
      return;
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      Alert.alert('Rentang tanggal salah', 'Tanggal mulai tidak boleh melebihi tanggal akhir');
      return;
    }
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedSortOrder(sortOrder);
    setFilterVisible(false);
  };

  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
    setSortOrder('newest');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAppliedSortOrder('newest');
    setFilterVisible(false);
  };

  const filteredData = useMemo(() => {
    let result = [...data];

    if (appliedStartDate) {
      const start = new Date(appliedStartDate).getTime();
      result = result.filter((item) => new Date(item.tanggal_pemeriksaan).getTime() >= start);
    }
    if (appliedEndDate) {
      // sampai akhir hari agar tanggal akhir ikut termasuk
      const end = new Date(appliedEndDate).getTime() + 24 * 60 * 60 * 1000 - 1;
      result = result.filter((item) => new Date(item.tanggal_pemeriksaan).getTime() <= end);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.tanggal_pemeriksaan).getTime();
      const dateB = new Date(b.tanggal_pemeriksaan).getTime();
      return appliedSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [data, appliedStartDate, appliedEndDate, appliedSortOrder]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Laporan ABJ</Text>
          <Text style={styles.subtitle}>
            {filteredData.length} laporan {isFilterActive ? 'ditemukan' : 'tercatat'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.filterButton, isFilterActive && styles.filterButtonActive]}
            onPress={openFilter}
            activeOpacity={0.85}
          >
            <Ionicons
              name="filter"
              size={18}
              color={isFilterActive ? COLORS.cardBg : COLORS.accent}
            />
            {isFilterActive && <View style={styles.filterDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/laporan-form')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={COLORS.cardBg} />
            <Text style={styles.addButtonText}>Tambah</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isFilterActive && (
        <View style={styles.activeFilterBar}>
          <Ionicons name="funnel-outline" size={14} color={COLORS.accent} />
          <Text style={styles.activeFilterText} numberOfLines={1}>
            {appliedStartDate ? formatTanggal(appliedStartDate) : 'Awal'} —{' '}
            {appliedEndDate ? formatTanggal(appliedEndDate) : 'Sekarang'} ·{' '}
            {appliedSortOrder === 'newest' ? 'Terbaru' : 'Terlama'}
          </Text>
          <TouchableOpacity onPress={resetFilter} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {pendingItems.length > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={runSync} activeOpacity={0.8} disabled={syncing}>
          <Ionicons
            name={needsReauth ? 'lock-closed-outline' : 'cloud-upload-outline'}
            size={16}
            color={needsReauth ? COLORS.danger : COLORS.accent}
          />
          <Text style={styles.pendingBannerText}>
            {syncing
              ? 'Menyinkronkan...'
              : needsReauth
              ? `Sesi login berakhir. Login ulang untuk menyinkronkan ${pendingItems.length} laporan.`
              : `${pendingItems.length} laporan menunggu sinkronisasi. Tap untuk coba sekarang.`}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons
                name={isFilterActive ? 'filter-outline' : 'document-text-outline'}
                size={32}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {isFilterActive ? 'Tidak ada hasil' : 'Belum ada laporan'}
            </Text>
            <Text style={styles.emptyText}>
              {isFilterActive
                ? 'Tidak ada laporan yang cocok dengan filter ini. Coba ubah rentang tanggal.'
                : 'Tap tombol "Tambah" di atas untuk membuat laporan pertamamu.'}
            </Text>
            {isFilterActive && (
              <TouchableOpacity style={styles.resetInlineButton} onPress={resetFilter}>
                <Text style={styles.resetInlineButtonText}>Reset Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardBody}
              onPress={() => router.push(`/laporan-form?id=${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconWrapper}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.cardTextWrapper}>
                <Text style={styles.cardDate}>{formatTanggal(item.tanggal_pemeriksaan)}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.items_abj?.length ?? 0} data kepala keluarga
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#b0b4ba" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal Filter */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Laporan</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tanggal Mulai</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (contoh: 2026-01-01)"
              placeholderTextColor="#9aa0a6"
              value={startDate}
              onChangeText={setStartDate}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Tanggal Akhir</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (contoh: 2026-07-11)"
              placeholderTextColor="#9aa0a6"
              value={endDate}
              onChangeText={setEndDate}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Urutkan</Text>
            <View style={styles.sortRow}>
              <TouchableOpacity
                style={[styles.sortOption, sortOrder === 'newest' && styles.sortOptionActive]}
                onPress={() => setSortOrder('newest')}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortOrder === 'newest' && styles.sortOptionTextActive,
                  ]}
                >
                  Terbaru
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortOption, sortOrder === 'oldest' && styles.sortOptionActive]}
                onPress={() => setSortOrder('oldest')}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortOrder === 'oldest' && styles.sortOptionTextActive,
                  ]}
                >
                  Terlama
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilter}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilter}>
                <Text style={styles.applyButtonText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
    borderRadius: 10,
  },
  pendingBannerText: { flex: 1, fontSize: 12, color: COLORS.textDark, fontWeight: '600' },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.accent,
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  addButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 13 },
  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 173, 181, 0.08)',
    borderRadius: 10,
  },
  activeFilterText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110 },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  resetInlineButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
  },
  resetInlineButtonText: {
    color: COLORS.cardBg,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrapper: { flex: 1 },
  cardDate: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  cardSubtitle: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    backgroundColor: COLORS.dangerBg,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
  },
  sortRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  sortOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  sortOptionActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  sortOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  sortOptionTextActive: { color: COLORS.cardBg },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  resetButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  applyButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.cardBg },
});