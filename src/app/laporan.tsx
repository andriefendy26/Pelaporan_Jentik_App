import NetInfo from '@react-native-community/netinfo';
import { getQueue, PendingLaporan } from '../services/offlineQueue';
import { syncPendingLaporan, getSyncStatus } from '../services/syncService';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { FormAbj } from '../types/abj';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.1)',
  success: '#16a34a',
  successSoft: 'rgba(22, 163, 74, 0.08)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  dangerBg: '#fdecea',
  warning: '#d97706',
  warningSoft: 'rgba(217, 119, 6, 0.08)',
  border: '#e2e5e9',
};

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

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
  const isOnline = useNetworkStatus();

  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const [items, setItems] = useState<FormAbj[]>([]);
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

  const totalRumah = items.reduce((sum, f) => sum + (f.items_abj?.length ?? 0), 0);
  const isFuturePeriod =
    tahun > now.getFullYear() || (tahun === now.getFullYear() && bulan > now.getMonth() + 1);


  const loadPending = async () => {
    const s = await getSyncStatus();
    setPendingItems(await getQueue());
    setNeedsReauth(s.needsReauth);
  };

  const loadData = async () => {
    try {
      const [formRes, statusRes] = await Promise.all([
        abjService.getAll({ bulan, tahun }),
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

  const runSync = async () => {
    setSyncing(true);
    await syncPendingLaporan();
    await loadPending();
    await loadData();
    setSyncing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
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

  const gantiBulan = (delta: number) => {
    let b = bulan + delta;
    let t = tahun;
    if (b > 12) { b = 1; t += 1; }
    if (b < 1) { b = 12; t -= 1; }
    setBulan(b);
    setTahun(t);
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

    Alert.alert(
      'Export Excel',
      'Unduh seluruh data ABJ untuk wilayah kamu?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Export',
          onPress: async () => {
            setExporting(true);
            try {
              const res = await abjService.export();
              const contentDisposition = res.headers['content-disposition'];
              const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
              const filename = filenameMatch?.[1] ?? `abj-${bulan}-${tahun}.xlsx`;
              await downloadAndShareExcel(res.data as ArrayBuffer, filename);
            } catch (error: any) {
              Alert.alert(
                'Gagal export',
                error?.response?.data?.message ?? 'Tidak bisa mengunduh file Excel.'
              );
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  };

  const statusInfo = (() => {
    if (status === 'submitted' && submittedAt) {
      const tepatWaktu = new Date(submittedAt) <= batasWaktu(bulan, tahun);
      return {
        icon: 'checkmark-circle' as const,
        color: COLORS.success,
        bg: COLORS.successSoft,
        title: 'Sudah Disubmit',
        subtitle: `${formatTanggalWaktu(submittedAt)} · ${tepatWaktu ? 'Tepat waktu' : 'Terlambat'}`,
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
        <View style={styles.header}>
          <Text style={styles.title}>Laporan ABJ</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/laporan-form')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={COLORS.cardBg} />
            <Text style={styles.addButtonText}>Tambah</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.85}
          >
            {exporting ? (
              <ActivityIndicator size={14} color={COLORS.accent} />
            ) : (
              <Ionicons name="download-outline" size={16} color={COLORS.accent} />
            )}
            <Text style={styles.exportButtonText}>
              {exporting ? 'Export...' : 'Export Excel'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Periode selector */}
        <View style={styles.periodRow}>
          <TouchableOpacity style={styles.periodArrow} onPress={() => gantiBulan(-1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.periodText}>{BULAN_NAMA[bulan - 1]} {tahun}</Text>
          <TouchableOpacity
            style={[styles.periodArrow, isFuturePeriod && styles.periodArrowDisabled]}
            onPress={() => !isFuturePeriod && gantiBulan(1)}
            disabled={isFuturePeriod}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={isFuturePeriod ? '#c2c7cc' : COLORS.textDark} />
          </TouchableOpacity>
        </View>

        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline-outline" size={12} color={COLORS.danger} />
            <Text style={styles.offlineBadgeText}>Mode offline — submit membutuhkan koneksi internet</Text>
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

        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.bg }]}>
          <Ionicons name={statusInfo.icon} size={28} color={statusInfo.color} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.title}</Text>
            <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>
          </View>
        </View>

        {/* Ringkasan */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{items.length}</Text>
            <Text style={styles.summaryLabel}>Sesi Pemeriksaan</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalRumah}</Text>
            <Text style={styles.summaryLabel}>Rumah Diperiksa</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Data pemeriksaan</Text>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={26} color="#c2c7cc" />
            <Text style={styles.emptyText}>Belum ada data pemeriksaan untuk periode ini.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/laporan-form')}>
              <Text style={styles.emptyButtonText}>Tambah Laporan Sekarang</Text>
            </TouchableOpacity>
          </View>
        ) : 
        (
          items.map((item) => {
            const jumlahBerjentik =
            item.items_abj?.filter((i) => isBerjentik(i.penampungan_berjentik)).length ?? 0;

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <View style={styles.itemIconWrapper}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemDate}>{formatTanggal(item.tanggal_pemeriksaan)}</Text>
                    <Text style={styles.itemSubtitle}>
                      {item.items_abj?.length ?? 0} rumah diperiksa
                      {jumlahBerjentik > 0 ? ` · ${jumlahBerjentik} berjentik` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemDetailWrapper}>
                  <View style={styles.itemActionsRow}>

                    <TouchableOpacity
                      style={styles.itemActionButton}
                      onPress={() => router.push(`/laporan-detail?id=${item.id}`)}
                    >
                      <Ionicons name="eye-outline" size={15} color={COLORS.textDark} />
                      <Text style={styles.itemActionTextNeutral}>Lihat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.itemActionButton}
                      onPress={() => handleSingleSubmit(item.id)}
                      disabled={submittingSingleId !== null}
                    >
                      {submittingSingleId === item.id ? (
                        <ActivityIndicator size={12} color={COLORS.success} />
                      ) : (
                        <>
                          <Ionicons name="send-outline" size={15} color={COLORS.success} />
                          <Text style={styles.itemActionTextSuccess}>Submit</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.itemActionButton}
                      onPress={() => router.push(`/laporan-form?id=${item.id}`)}
                    >
                      <Ionicons name="create-outline" size={15} color={COLORS.accent} />
                      <Text style={styles.itemActionTextAccent}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.itemActionButton}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                      <Text style={styles.itemActionTextDanger}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* <View style={styles.itemDetailWrapper}>
                  {(item.items_abj ?? []).length === 0 ? (
                    <Text style={styles.itemDetailEmpty}>Tidak ada data rumah pada sesi ini.</Text>
                  ) : (
                    (item.items_abj ?? []).map((rumah, idx) => (
                      <View key={idx} style={styles.rumahRow}>
                        <Text style={styles.rumahName} numberOfLines={1}>
                          {rumah.nama_kepala_keluarga}
                        </Text>
                        {isBerjentik(rumah.penampungan_berjentik) ? (
                          <View style={styles.rumahBadgeDanger}>
                            <Text style={styles.rumahBadgeDangerText}>Berjentik</Text>
                          </View>
                        ) : (
                          <View style={styles.rumahBadgeSuccess}>
                            <Text style={styles.rumahBadgeSuccessText}>Bebas Jentik</Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}

                  <View style={styles.itemActionsRow}>
                    <TouchableOpacity
                      style={styles.itemActionButton}
                      onPress={() => setViewItem(item)}
                    >
                      <Ionicons name="eye-outline" size={15} color={COLORS.textDark} />
                      <Text style={styles.itemActionTextNeutral}>Lihat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.itemActionButton}
                      onPress={() => router.push(`/laporan-form?id=${item.id}`)}
                    >
                      <Ionicons name="create-outline" size={15} color={COLORS.accent} />
                      <Text style={styles.itemActionTextAccent}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.itemActionButton}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                      <Text style={styles.itemActionTextDanger}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                </View> */}
              </View>
            );
          })
        )
        }

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 24 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textDark },
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  exportButtonDisabled: { opacity: 0.5 },
  exportButtonText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },

  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  periodArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  periodArrowDisabled: { opacity: 0.4 },
  periodText: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, minWidth: 140, textAlign: 'center' },

  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  offlineBadgeText: { fontSize: 11.5, color: COLORS.danger, fontWeight: '600', flex: 1 },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
    borderRadius: 10,
  },
  pendingBannerText: { flex: 1, fontSize: 12, color: COLORS.textDark, fontWeight: '600' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusTitle: { fontSize: 15, fontWeight: '700' },
  statusSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryValue: { fontSize: 22, fontWeight: '700', color: COLORS.textDark },
  summaryLabel: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 10 },

  emptyBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 26,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'center' },
  emptyButton: {
    marginTop: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 12.5 },

  itemCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  itemIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDate: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  itemSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  itemDetailWrapper: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  // itemDetailEmpty: {
  //   fontSize: 12,
  //   color: COLORS.textSecondary,
  //   paddingVertical: 6,
  // },
  rumahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rumahName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    marginRight: 10,
  },
  rumahBadgeDanger: {
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rumahBadgeDangerText: { fontSize: 10.5, fontWeight: '700', color: COLORS.danger },
  rumahBadgeSuccess: {
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rumahBadgeSuccessText: { fontSize: 10.5, fontWeight: '700', color: COLORS.success },

  itemActionsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemActionTextAccent: { fontSize: 12.5, fontWeight: '700', color: COLORS.accent },
  itemActionTextDanger: { fontSize: 12.5, fontWeight: '700', color: COLORS.danger },
  itemActionTextNeutral: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  itemActionTextSuccess: { fontSize: 12.5, fontWeight: '700', color: COLORS.success },



  footer: {
    padding: 16,
    paddingBottom: 24,
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
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 15 },
});