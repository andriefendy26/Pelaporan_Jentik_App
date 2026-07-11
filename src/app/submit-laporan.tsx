import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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
  warning: '#d97706',
  warningSoft: 'rgba(217, 119, 6, 0.08)',
  border: '#e2e5e9',
};

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function batasWaktu(bulan: number, tahun: number) {
  // tanggal 5, bulan setelah bulan laporan
  const next = new Date(tahun, bulan, 5, 23, 59, 59); // bulan (0-indexed) sudah = bulan+1 - 1
  return next;
}

function formatTanggalWaktu(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function SubmitLaporanScreen() {
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

  const totalRumah = items.reduce((sum, f) => sum + (f.items_abj?.length ?? 0), 0);
  const isFuturePeriod =
    tahun > now.getFullYear() || (tahun === now.getFullYear() && bulan > now.getMonth() + 1);

    const [expandedId, setExpandedId] = useState<number | null>(null);

    const toggleExpand = (id: number) => {
        setExpandedId((prev) => (prev === id ? null : id));
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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bulan, tahun])
  );

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
      const res = await laporanBulananService.submit({ bulan, tahun });
      Alert.alert('Berhasil', res?.data?.message ?? 'Laporan berhasil disubmit');
      await loadData();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Gagal submit laporan, coba lagi.';
      Alert.alert('Gagal', message);
    } finally {
      setSubmitting(false);
    }
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
        <Text style={styles.title}>Submit Laporan Bulanan</Text>
        <Text style={styles.subtitle}>Konfirmasi laporan pemeriksaan jentik untuk dikirim ke Puskesmas</Text>

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

        {/* Daftar sesi */}
        <Text style={styles.sectionLabel}>Data yang akan dilaporkan</Text>
        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={26} color="#c2c7cc" />
            <Text style={styles.emptyText}>Belum ada data pemeriksaan untuk periode ini.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/laporan-form')}>
              <Text style={styles.emptyButtonText}>Tambah Laporan Sekarang</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemIconWrapper}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDate}>
                  {new Date(item.tanggal_pemeriksaan).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </Text>
                <Text style={styles.itemSubtitle}>{item.items_abj?.length ?? 0} rumah diperiksa</Text>
              </View>
            </View>
          ))
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
              <Ionicons name="paper-plane-outline" size={18} color={COLORS.cardBg} />
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
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 18 },

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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
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

  footer: {
    padding: 16,
    paddingBottom: 24,
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
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 15 },
});