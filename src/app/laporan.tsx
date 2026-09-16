import NetInfo from '@react-native-community/netinfo';
import { getQueue, PendingLaporan } from '../services/offlineQueue';
import { syncPendingLaporan, getSyncStatus } from '../services/syncService';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { abjService, laporanBulananService } from '../services/Jentikservice';
import { downloadAndShareExcel } from '../services/downloadExcel';
import { FormAbjList } from '../types/abj';
import { useAuth } from '../services/Context/AuthContext';
import type { KelurahanItem, RtItem } from '../services/Jentikservice';

/** Palet disamakan dengan dashboard: base #00ADB5 + aksen sekunder. */
const COLORS = {
  bg: '#F4F6F8',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  textMuted: '#7A828C',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.10)',
  violet: '#7C5CFC',
  violetSoft: 'rgba(124, 92, 252, 0.10)',
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.12)',
  danger: '#F43F5E',
  dangerSoft: 'rgba(244, 63, 94, 0.10)',
  dangerBg: '#fdecea',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  border: '#E6E9ED',
  muted: '#9aa0a6',
};

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const JUMLAH_TAHUN_KE_BELAKANG = 4; // rentang tahun yang bisa dipilih (termasuk tahun berjalan)

function batasWaktu(bulan: number, tahun: number) {
  return new Date(tahun, bulan, 5, 23, 59, 59);
}

function formatTanggal(tanggal: string) {
  try {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return tanggal;
  }
}

function formatTanggalWaktu(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function isBerjentik(value: string | number): boolean {
  return Number(value) > 0;
}

export default function LaporanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isOnline = useNetworkStatus();

  const isSuperAdmin = (() => {
    if (!user) return false;
    const roles = user?.roles ?? user?.role ?? [];
    if (Array.isArray(roles)) return roles.some((r: any) => r?.name === 'super_admin' || r === 'super_admin');
    return roles === 'super_admin';
  })();

  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const [items, setItems] = useState<FormAbjList[]>([]);
  const [status, setStatus] = useState<string>('belum_ada_data');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [submittingSingleId, setSubmittingSingleId] = useState<number | null>(null);

  const [pendingItems, setPendingItems] = useState<PendingLaporan[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);

  const [bulanModalVisible, setBulanModalVisible] = useState(false);
  const [tahunModalVisible, setTahunModalVisible] = useState(false);

  const [showKelurahanFilterModal, setShowKelurahanFilterModal] = useState(false);
  const [showRtFilterModal, setShowRtFilterModal] = useState(false);
  const [kelurahanFilterList, setKelurahanFilterList] = useState<KelurahanItem[]>([]);
  const [rtFilterList, setRtFilterList] = useState<RtItem[]>([]);
  const [selectedFilterKelurahanId, setSelectedFilterKelurahanId] = useState<number | null>(null);
  const [selectedFilterKelurahanName, setSelectedFilterKelurahanName] = useState<string>('');
  const [selectedFilterRtId, setSelectedFilterRtId] = useState<number | null>(null);
  const [selectedFilterRtName, setSelectedFilterRtName] = useState<string>('');
  const [kelurahanFilterLoading, setKelurahanFilterLoading] = useState(false);
  const [rtFilterLoading, setRtFilterLoading] = useState(false);

  const totalRumah = items.reduce((sum, f) => sum + (f.items_abj?.length ?? 0), 0);
  const totalBerjentik = items.reduce(
    (sum, f) => sum + (f.items_abj?.filter((i) => isBerjentik(i.penampungan_berjentik)).length ?? 0),
    0
  );
  const isFuturePeriod =
    tahun > now.getFullYear() || (tahun === now.getFullYear() && bulan > now.getMonth() + 1);

  const daftarTahun = Array.from({ length: JUMLAH_TAHUN_KE_BELAKANG }, (_, i) => now.getFullYear() - i);

  const loadPending = async () => {
    const s = await getSyncStatus();
    setPendingItems(await getQueue());
    setNeedsReauth(s.needsReauth);
  };

  // FIX: `loadData` sebelumnya selalu membaca `selectedFilterKelurahanId` /
  // `selectedFilterRtId` langsung dari state. Karena setState() itu
  // asinkron, memanggil `loadData()` tepat setelah `setSelectedFilter...()`
  // (seperti di handler pilih RT / hapus filter di bawah) membuat request
  // masih terkirim dengan nilai LAMA — filter kelihatan seperti tidak
  // berfungsi. `overrides` di sini memungkinkan pemanggil mengirim nilai
  // filter yang baru secara eksplisit, tanpa harus menunggu re-render.
  const loadData = async (overrides?: { id_kelurahan?: number | null; id_rt?: number | null }) => {
    try {
      const idKelurahan = overrides && 'id_kelurahan' in overrides
        ? overrides.id_kelurahan
        : selectedFilterKelurahanId;
      const idRt = overrides && 'id_rt' in overrides ? overrides.id_rt : selectedFilterRtId;

      const params: { bulan?: number; tahun?: number; id_kelurahan?: number; id_rt?: number } = {
        bulan,
        tahun,
      };
      if (isSuperAdmin && idKelurahan) {
        params.id_kelurahan = idKelurahan;
      }
      if (isSuperAdmin && idRt) {
        params.id_rt = idRt;
      }
      const [formRes, statusRes] = await Promise.all([
        abjService.getAll(params),
        laporanBulananService.getStatus({ bulan, tahun }),
      ]);
      setItems(formRes?.data?.data ?? []);
      setStatus(statusRes?.data?.status ?? 'belum_ada_data');
      setSubmittedAt(statusRes?.data?.submitted_at ?? null);
    } catch (error: any) {
      Alert.alert('Gagal memuat data', error?.response?.data?.message ?? 'Terjadi kesalahan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchKelurahanFilter = async () => {
    setKelurahanFilterLoading(true);
    try {
      const res = await abjService.getKelurahan();
      setKelurahanFilterList(res?.data?.data ?? []);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat memuat daftar kelurahan.');
    } finally {
      setKelurahanFilterLoading(false);
    }
  };

  const fetchRtFilter = async (id_kelurahan: number) => {
    setRtFilterLoading(true);
    try {
      const res = await abjService.getRtByKelurahan(id_kelurahan);
      setRtFilterList(res?.data?.data ?? []);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat memuat daftar RT.');
    } finally {
      setRtFilterLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchKelurahanFilter();
    }
  }, [isSuperAdmin]);

  const runSync = async () => {
    setSyncing(true);
    await syncPendingLaporan();
    await loadPending();
    await loadData();
    setSyncing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setSelectedFilterKelurahanId(null);
      setSelectedFilterKelurahanName('');
      setSelectedFilterRtId(null);
      setSelectedFilterRtName('');
      setRtFilterList([]);
      setLoading(true);
      loadData({ id_kelurahan: null, id_rt: null });
      loadPending();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bulan, tahun])
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      if (online) runSync();
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan, tahun]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const pilihBulan = (b: number) => {
    const melewatiMasaDepan = tahun === now.getFullYear() && b > now.getMonth() + 1;
    if (melewatiMasaDepan) return;
    setBulan(b);
    setBulanModalVisible(false);
  };

  const pilihTahun = (t: number) => {
    if (t > now.getFullYear()) return;
    setTahun(t);
    // kalau tahun berjalan dipilih dan bulan yang sedang aktif ada di masa depan, sesuaikan ke bulan berjalan
    if (t === now.getFullYear() && bulan > now.getMonth() + 1) {
      setBulan(now.getMonth() + 1);
    }
    setTahunModalVisible(false);
  };

  const handleDelete = (item: FormAbjList) => {
    Alert.alert('Hapus Laporan', 'Yakin ingin menghapus laporan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await abjService.delete(item.id);
            setItems((prev) => prev.filter((d) => d.id !== item.id));
          } catch (error: any) {
            Alert.alert('Gagal menghapus', error?.response?.data?.message ?? 'Terjadi kesalahan');
          }
        },
      },
    ]);
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      Alert.alert('Belum bisa submit', 'Belum ada data pemeriksaan untuk periode ini.');
      return;
    }
    if (!isOnline) {
      Alert.alert('Tidak ada koneksi', 'Submit laporan membutuhkan koneksi internet.');
      return;
    }

    const sudahPernahSubmit = status === 'submitted';

    Alert.alert(
      sudahPernahSubmit ? 'Submit Ulang Laporan?' : 'Submit Laporan?',
      `Laporan ${BULAN_NAMA[bulan - 1]} ${tahun} dengan ${totalRumah} rumah akan disubmit ke Puskesmas.`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Submit', onPress: doSubmit },
      ]
    );
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const formIds = items.map((i) => i.id).filter(Boolean);
      if (formIds.length === 0) {
        Alert.alert('Validasi', 'Tidak ada form yang bisa disubmit.');
        setSubmitting(false);
        return;
      }
      const res = await abjService.submitReport({ form_abj_ids: formIds });
      Alert.alert('Berhasil', res?.data?.message ?? 'Laporan berhasil disubmit');
      await loadData();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Gagal submit laporan, coba lagi.';
      Alert.alert('Gagal', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleSubmit = async (formId: number) => {
    if (submittingSingleId !== null) return;
    if (!isOnline) {
      Alert.alert('Tidak ada koneksi', 'Submit membutuhkan koneksi internet.');
      return;
    }

    Alert.alert(
      'Submit Form',
      'Submit form ini ke puskesmas?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Submit',
          onPress: async () => {
            setSubmittingSingleId(formId);
            try {
              const res = await abjService.submitSingle(formId);
              Alert.alert('Berhasil', res?.data?.message ?? 'Form berhasil disubmit');
              await loadData();
            } catch (error: any) {
              const message = error?.response?.data?.message ?? 'Gagal submit form, coba lagi.';
              Alert.alert('Gagal', message);
            } finally {
              setSubmittingSingleId(null);
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    if (exporting) return;
    if (!isOnline) {
      Alert.alert('Tidak ada koneksi', 'Export Excel membutuhkan koneksi internet.');
      return;
    }

    const doExport = async (withPeriode: boolean) => {
      setExporting(true);
      try {
        const params: { bulan?: number; tahun?: number; id_kelurahan?: number; id_rt?: number } = {};

        if (withPeriode) {
          params.bulan = bulan;
          params.tahun = tahun;
        }
        // Filter wilayah (super admin) tetap ikut diterapkan di kedua mode.
        if (isSuperAdmin && selectedFilterKelurahanId) {
          params.id_kelurahan = selectedFilterKelurahanId;
        }
        if (isSuperAdmin && selectedFilterRtId) {
          params.id_rt = selectedFilterRtId;
        }

        const res = await abjService.export(params);
        const contentDisposition = res.headers['content-disposition'];
        const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
        const defaultFilename = withPeriode
          ? `abj-${bulan}-${tahun}.xlsx`
          : 'abj-semua-data.xlsx';
        const filename = filenameMatch?.[1] ?? defaultFilename;
        await downloadAndShareExcel(res.data as ArrayBuffer, filename);
      } catch (error: any) {
        Alert.alert(
          'Gagal export',
          error?.response?.data?.message ?? 'Tidak bisa mengunduh file Excel.'
        );
      } finally {
        setExporting(false);
      }
    };

    Alert.alert(
      'Export Excel',
      'Pilih data yang ingin diunduh',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: `${BULAN_NAMA[bulan - 1]} ${tahun}`,
          onPress: () => doExport(true),
        },
        {
          text: 'Semua Bulan & Tahun',
          onPress: () => doExport(false),
        },
      ]
    );
  };

  const statusInfo = (() => {
    const submittedCount = items.filter((i) => i.status === 'dilaporkan').length;

    if (submittedCount > 0) {
      return {
        icon: 'checkmark-circle' as const,
        color: COLORS.success,
        bg: COLORS.successSoft,
        title: `${submittedCount} form disubmit`,
        subtitle: `${formatTanggalWaktu(submittedAt!)} · ${status === 'submitted' ? 'Tepat waktu' : 'Terlambat'}`,
      };
    }
    if (items.length === 0) {
      return {
        icon: 'document-outline' as const,
        color: COLORS.textSecondary,
        bg: COLORS.accentSoft,
        title: 'Belum Ada Data',
        subtitle: 'Belum ada laporan pemeriksaan untuk periode ini',
      };
    }
    return {
      icon: 'time-outline' as const,
      color: COLORS.warning,
      bg: COLORS.warningSoft,
      title: 'Belum Disubmit',
      subtitle: `Batas waktu: ${batasWaktu(bulan, tahun).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    };
  })();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Header berwarna */}
        <View style={styles.headerCard}>
          <View style={styles.headerBlobLarge} />
          <View style={styles.headerBlobSmall} />

          <Text style={styles.title}>Laporan ABJ</Text>
          <Text style={styles.headerSubtitle}>
            Periode {BULAN_NAMA[bulan - 1]} {tahun}
          </Text>

          <View style={styles.periodRow}>
            <TouchableOpacity
              style={styles.periodSelect}
              onPress={() => setBulanModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={13} color={COLORS.cardBg} />
              <Text style={styles.periodSelectText}>{BULAN_NAMA[bulan - 1]}</Text>
              <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.periodSelect}
              onPress={() => setTahunModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.periodSelectText}>{tahun}</Text>
              <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Aksi */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/laporan-form')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={17} color={COLORS.cardBg} />
            <Text style={styles.addButtonText}>Tambah Laporan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.85}
          >
            {exporting ? (
              <ActivityIndicator size={13} color={COLORS.violet} />
            ) : (
              <Ionicons name="download-outline" size={15} color={COLORS.violet} />
            )}
            <Text style={styles.exportButtonText}>{exporting ? 'Export...' : 'Export'}</Text>
          </TouchableOpacity>
        </View>

        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline-outline" size={13} color={COLORS.danger} />
            <Text style={styles.offlineBadgeText}>Mode offline — submit membutuhkan koneksi internet</Text>
          </View>
        )}

        {pendingItems.length > 0 && (
          <TouchableOpacity style={styles.pendingBanner} onPress={runSync} activeOpacity={0.8} disabled={syncing}>
            <View style={[styles.bannerIcon, { backgroundColor: needsReauth ? COLORS.dangerSoft : COLORS.accentSoft }]}>
              <Ionicons
                name={needsReauth ? 'lock-closed-outline' : 'cloud-upload-outline'}
                size={16}
                color={needsReauth ? COLORS.danger : COLORS.accent}
              />
            </View>
            <Text style={styles.pendingBannerText}>
              {syncing
                ? 'Menyinkronkan...'
                : needsReauth
                ? `Sesi login berakhir. Login ulang untuk menyinkronkan ${pendingItems.length} laporan.`
                : `${pendingItems.length} laporan menunggu sinkronisasi. Tap untuk coba sekarang.`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.bg }]}>
          <View style={[styles.statusIconWrapper, { backgroundColor: COLORS.cardBg }]}>
            <Ionicons name={statusInfo.icon} size={22} color={statusInfo.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.title}</Text>
            <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>
          </View>
        </View>

        {isSuperAdmin && (
          <View style={styles.filterBox}>
            <View style={styles.filterHeader}>
              <View style={styles.filterHeaderIcon}>
                <Ionicons name="filter-outline" size={14} color={COLORS.violet} />
              </View>
              <Text style={styles.sectionLabelInline}>Filter Wilayah</Text>
            </View>
            <TouchableOpacity
              style={styles.filterRow}
              onPress={() => setShowKelurahanFilterModal(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterValue, !selectedFilterKelurahanId && styles.filterPlaceholder]}>
                Kelurahan: {selectedFilterKelurahanName || 'Semua Kelurahan'}
              </Text>
              <Text style={styles.editIcon}>Ubah</Text>
            </TouchableOpacity>
            <View style={styles.filterDivider} />
            <TouchableOpacity
              style={[styles.filterRow, !selectedFilterKelurahanId && styles.filterRowDisabled]}
              onPress={() => {
                if (selectedFilterKelurahanId) {
                  setShowRtFilterModal(true);
                } else {
                  Alert.alert('Belum ada kelurahan', 'Pilih kelurahan terlebih dahulu.');
                }
              }}
              activeOpacity={0.7}
              disabled={!selectedFilterKelurahanId}
            >
              <Text style={[styles.filterValue, !selectedFilterRtId && styles.filterPlaceholder]}>
                RT: {selectedFilterRtName || 'Semua RT'}
              </Text>
              <Text style={styles.editIcon}>Ubah</Text>
            </TouchableOpacity>
            {(selectedFilterKelurahanId || selectedFilterRtId) && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => {
                  setSelectedFilterKelurahanId(null);
                  setSelectedFilterKelurahanName('');
                  setSelectedFilterRtId(null);
                  setSelectedFilterRtName('');
                  setRtFilterList([]);
                  // FIX: kirim override eksplisit null/null, jangan andalkan
                  // state yang baru saja di-set (masih async saat ini).
                  loadData({ id_kelurahan: null, id_rt: null });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={13} color={COLORS.danger} />
                <Text style={styles.clearFilterText}>Hapus Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Ringkasan */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryAccentBar, { backgroundColor: COLORS.accent }]} />
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="clipboard-outline" size={15} color={COLORS.accent} />
            </View>
            <Text style={[styles.summaryValue, { color: COLORS.accent }]}>{items.length}</Text>
            <Text style={styles.summaryLabel}>Sesi Pemeriksaan</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryAccentBar, { backgroundColor: COLORS.violet }]} />
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.violetSoft }]}>
              <Ionicons name="home-outline" size={15} color={COLORS.violet} />
            </View>
            <Text style={[styles.summaryValue, { color: COLORS.violet }]}>{totalRumah}</Text>
            <Text style={styles.summaryLabel}>Rumah Diperiksa</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryAccentBar, { backgroundColor: COLORS.danger }]} />
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.dangerSoft }]}>
              <Ionicons name="bug-outline" size={15} color={COLORS.danger} />
            </View>
            <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{totalBerjentik}</Text>
            <Text style={styles.summaryLabel}>Rumah Berjentik</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionBar} />
          <Text style={styles.sectionLabel}>Data pemeriksaan</Text>
          {items.length > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{items.length}</Text>
            </View>
          )}
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="document-text-outline" size={26} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyText}>Belum ada data pemeriksaan untuk periode ini.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/laporan-form')}>
              <Text style={styles.emptyButtonText}>Tambah Laporan Sekarang</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((item) => {
            const jumlahBerjentik =
              item.items_abj?.filter((i) => isBerjentik(i.penampungan_berjentik)).length ?? 0;
            const tersubmit = item.status === 'dilaporkan';

            return (
              <View key={item.id} style={styles.itemCard}>
                <View
                  style={[
                    styles.itemAccentBar,
                    { backgroundColor: tersubmit ? COLORS.success : COLORS.warning },
                  ]}
                />

                <View style={styles.itemCardHeader}>
                  <View
                    style={[
                      styles.itemIconWrapper,
                      { backgroundColor: tersubmit ? COLORS.successSoft : COLORS.warningSoft },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={tersubmit ? COLORS.success : COLORS.warning}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemDate}>{formatTanggal(item.tanggal_pemeriksaan)}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: tersubmit ? COLORS.successSoft : COLORS.warningSoft },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: tersubmit ? COLORS.success : COLORS.warning },
                          ]}
                        >
                          {tersubmit ? 'Tersubmit' : 'Draft'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemMetaRow}>
                      <View style={styles.metaChip}>
                        <Ionicons name="home-outline" size={11} color={COLORS.textMuted} />
                        <Text style={styles.metaChipText}>{item.items_abj?.length ?? 0} rumah</Text>
                      </View>
                      {jumlahBerjentik > 0 && (
                        <View style={[styles.metaChip, { backgroundColor: COLORS.dangerSoft }]}>
                          <Ionicons name="bug-outline" size={11} color={COLORS.danger} />
                          <Text style={[styles.metaChipText, { color: COLORS.danger }]}>
                            {jumlahBerjentik} berjentik
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.itemWilayah}>
                      {item.kelurahan?.name ?? '-'} · RT {item.rt?.name ?? '-'}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemDetailWrapper}>
                  <View style={styles.itemActionsRow}>
                    <TouchableOpacity
                      style={[styles.itemActionButton, { backgroundColor: '#F2F4F6' }]}
                      onPress={() => router.push(`/laporan-detail?id=${item.id}`)}
                    >
                      <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.itemActionTextNeutral}>Lihat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.itemActionButton,
                        { backgroundColor: COLORS.successSoft },
                        tersubmit && styles.itemActionButtonDisabled,
                      ]}
                      onPress={() => handleSingleSubmit(item.id)}
                      disabled={submittingSingleId !== null || tersubmit}
                    >
                      {submittingSingleId === item.id ? (
                        <ActivityIndicator size={12} color={COLORS.success} />
                      ) : (
                        <>
                          <Ionicons
                            name="send-outline"
                            size={14}
                            color={tersubmit ? COLORS.muted : COLORS.success}
                          />
                          <Text
                            style={[
                              styles.itemActionTextSuccess,
                              tersubmit && { color: COLORS.muted },
                            ]}
                          >
                            {tersubmit ? 'Terkirim' : 'Submit'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.itemActionButton,
                        { backgroundColor: COLORS.accentSoft },
                        tersubmit && styles.itemActionButtonDisabled,
                      ]}
                      onPress={() => router.push(`/laporan-form?id=${item.id}`)}
                      disabled={tersubmit}
                    >
                      <Ionicons
                        name="create-outline"
                        size={14}
                        color={tersubmit ? COLORS.muted : COLORS.accent}
                      />
                      <Text style={[styles.itemActionTextAccent, tersubmit && { color: COLORS.muted }]}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.itemActionButton,
                        { backgroundColor: COLORS.dangerSoft },
                        tersubmit && styles.itemActionButtonDisabled,
                      ]}
                      onPress={() => handleDelete(item)}
                      disabled={tersubmit}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color={tersubmit ? COLORS.muted : COLORS.danger}
                      />
                      <Text style={[styles.itemActionTextDanger, tersubmit && { color: COLORS.muted }]}>
                        Hapus
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Sticky submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (submitting || items.length === 0 || !isOnline) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || items.length === 0 || !isOnline}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.cardBg} />
          ) : (
            <>
              <View style={styles.submitIconWrapper}>
                <Ionicons name="send" size={15} color={COLORS.cardBg} />
              </View>
              <Text style={styles.submitText}>
                {status === 'submitted' ? 'Submit Ulang Laporan' : 'Submit Laporan'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <BottomNav />

      {/* Modal pilih bulan */}
      <Modal
        visible={bulanModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulanModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBulanModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Pilih Bulan</Text>
            <FlatList
              data={BULAN_NAMA}
              keyExtractor={(_, idx) => String(idx)}
              style={{ maxHeight: 340 }}
              renderItem={({ item, index }) => {
                const nomorBulan = index + 1;
                const disabled = tahun === now.getFullYear() && nomorBulan > now.getMonth() + 1;
                const aktif = nomorBulan === bulan;
                return (
                  <TouchableOpacity
                    style={[styles.modalOption, aktif && styles.modalOptionActive]}
                    onPress={() => pilihBulan(nomorBulan)}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        aktif && styles.modalOptionTextActive,
                        disabled && styles.modalOptionTextDisabled,
                      ]}
                    >
                      {item}
                    </Text>
                    {aktif && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal pilih tahun */}
      <Modal
        visible={tahunModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTahunModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTahunModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Pilih Tahun</Text>
            <FlatList
              data={daftarTahun}
              keyExtractor={(t) => String(t)}
              style={{ maxHeight: 340 }}
              renderItem={({ item: t }) => {
                const aktif = t === tahun;
                return (
                  <TouchableOpacity
                    style={[styles.modalOption, aktif && styles.modalOptionActive]}
                    onPress={() => pilihTahun(t)}
                  >
                    <Text style={[styles.modalOptionText, aktif && styles.modalOptionTextActive]}>
                      {t}
                    </Text>
                    {aktif && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal filter kelurahan */}
      <Modal
        visible={showKelurahanFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKelurahanFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowKelurahanFilterModal(false)}>
                <Text style={styles.modalCancel}>Batal</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Pilih Kelurahan</Text>
              <View style={{ width: 44 }} />
            </View>
            <View style={styles.modalBody}>
              {kelurahanFilterLoading ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : kelurahanFilterList.length === 0 ? (
                <Text style={styles.emptyModalText}>Tidak ada kelurahan tersedia.</Text>
              ) : (
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {kelurahanFilterList.map((kl) => (
                    <TouchableOpacity
                      key={kl.id}
                      style={[styles.rtItem, selectedFilterKelurahanId === kl.id && styles.rtItemSelected]}
                      onPress={() => {
                        setSelectedFilterKelurahanId(kl.id);
                        setSelectedFilterKelurahanName(kl.name);
                        // FIX: RT yang sebelumnya dipilih (milik kelurahan
                        // LAMA) direset di sini. Sebelumnya nilai ini
                        // dibiarkan menempel, jadi kalau user ganti
                        // kelurahan tanpa memilih RT baru, filter id_rt
                        // yang salah (dari kelurahan lain) tetap terkirim.
                        setSelectedFilterRtId(null);
                        setSelectedFilterRtName('');
                        setRtFilterList([]);
                        setShowKelurahanFilterModal(false);
                        setShowRtFilterModal(true);
                        fetchRtFilter(kl.id);
                        // FIX: langsung terapkan filter kelurahan (dengan
                        // id_rt di-null-kan) tanpa menunggu RT dipilih,
                        // dan tanpa bergantung pada state yang belum
                        // ter-update.
                        loadData({ id_kelurahan: kl.id, id_rt: null });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rtItemText}>{kl.name}</Text>
                      {selectedFilterKelurahanId === kl.id && (
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal filter RT */}
      <Modal
        visible={showRtFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRtFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowRtFilterModal(false)}>
                <Text style={styles.modalCancel}>Batal</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Pilih RT</Text>
              <View style={{ width: 44 }} />
            </View>
            <View style={styles.modalBody}>
              {rtFilterLoading ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : rtFilterList.length === 0 ? (
                <Text style={styles.emptyModalText}>Tidak ada RT tersedia.</Text>
              ) : (
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {rtFilterList.map((rt) => (
                    <TouchableOpacity
                      key={rt.id}
                      style={[styles.rtItem, selectedFilterRtId === rt.id && styles.rtItemSelected]}
                      onPress={() => {
                        setSelectedFilterRtId(rt.id);
                        setSelectedFilterRtName(rt.name);
                        setShowRtFilterModal(false);
                        // FIX: sebelumnya loadData() dipanggil di sini
                        // tanpa override, jadi masih pakai
                        // selectedFilterRtId versi lama (sebelum
                        // setSelectedFilterRtId di atas benar-benar
                        // diterapkan React) — filter RT nggak pernah
                        // beneran nyampe ke request.
                        loadData({ id_kelurahan: selectedFilterKelurahanId, id_rt: rt.id });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rtItemText}>{rt.name}</Text>
                      {selectedFilterRtId === rt.id && (
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 24 },

  /* ---------- Header ---------- */
  headerCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
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
  title: { fontSize: 22, fontWeight: '700', color: COLORS.cardBg },
  headerSubtitle: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  periodRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  periodSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  periodSelectText: { fontSize: 12.5, fontWeight: '700', color: COLORS.cardBg },

  /* ---------- Aksi ---------- */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.textDark,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  addButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 12.5 },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.violetSoft,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  exportButtonDisabled: { opacity: 0.5 },
  exportButtonText: { color: COLORS.violet, fontWeight: '700', fontSize: 12.5 },

  /* ---------- Banner ---------- */
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  offlineBadgeText: { fontSize: 11.5, color: COLORS.danger, fontWeight: '600', flex: 1 },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
  },
  bannerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBannerText: { flex: 1, fontSize: 12, color: COLORS.textDark, fontWeight: '600' },

  /* ---------- Status ---------- */
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  statusIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 14.5, fontWeight: '700' },
  statusSubtitle: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 3 },

  /* ---------- Ringkasan ---------- */
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  /* ---------- Section ---------- */
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.accent },
  sectionLabel: { fontSize: 14.5, fontWeight: '700', color: COLORS.textDark },
  sectionLabelInline: { fontSize: 13.5, fontWeight: '700', color: COLORS.textDark },
  countPill: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: { fontSize: 11, fontWeight: '700', color: COLORS.accent },

  /* ---------- Filter ---------- */
  filterBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  filterHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: COLORS.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  filterRowDisabled: { opacity: 0.5 },
  filterDivider: { height: 1, backgroundColor: '#F0F2F4', marginVertical: 2 },
  filterValue: { fontSize: 13.5, fontWeight: '600', color: COLORS.textDark, flex: 1 },
  filterPlaceholder: { color: COLORS.muted, fontWeight: '400' },
  editIcon: { fontSize: 12, color: COLORS.accent, fontWeight: '700', paddingLeft: 8 },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  clearFilterText: { fontSize: 12, color: COLORS.danger, fontWeight: '700' },

  /* ---------- Modal filter ---------- */
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  emptyModalText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  rtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F4F6F8',
    marginBottom: 8,
  },
  rtItemSelected: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  rtItemText: { fontSize: 14, color: COLORS.textDark, fontWeight: '600' },

  /* ---------- Empty ---------- */
  emptyBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 12.5, color: COLORS.textMuted, textAlign: 'center' },
  emptyButton: {
    marginTop: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 12.5 },

  /* ---------- Item ---------- */
  itemCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  itemAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingLeft: 16,
    gap: 12,
  },
  itemIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemDate: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, flex: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  itemMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaChipText: { fontSize: 10.5, color: COLORS.textMuted, fontWeight: '600' },
  itemWilayah: { fontSize: 11, color: COLORS.accent, fontWeight: '700', marginTop: 6 },

  itemDetailWrapper: { borderTopWidth: 1, borderTopColor: '#F0F2F4' },
  itemActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingLeft: 16,
    paddingVertical: 12,
  },
  itemActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  itemActionButtonDisabled: { opacity: 0.45 },
  itemActionTextAccent: { fontSize: 11.5, fontWeight: '700', color: COLORS.accent },
  itemActionTextDanger: { fontSize: 11.5, fontWeight: '700', color: COLORS.danger },
  itemActionTextNeutral: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary },
  itemActionTextSuccess: { fontSize: 11.5, fontWeight: '700', color: COLORS.success },

  /* ---------- Footer ---------- */
  footer: {
    padding: 16,
    paddingBottom: 20,
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
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.45, shadowOpacity: 0 },
  submitText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 15 },

  /* ---------- Modal ---------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
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
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F4',
  },
  modalCancel: { fontSize: 14, color: COLORS.textSecondary },
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
  modalOptionTextDisabled: { color: '#c2c7cc' },
});