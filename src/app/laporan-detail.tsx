import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { abjService } from '../services/Jentikservice';
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
  success: '#16a34a',
  successSoft: 'rgba(22, 163, 74, 0.08)',
  border: '#e2e5e9',
};

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatTanggal(tanggal: string) {
  try {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return tanggal;
  }
}

function isBerjentik(value: string | number): boolean {
  return Number(value) > 0;
}

export default function LaporanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<FormAbj | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const response = await abjService.getById(id);
      setData(response?.data?.data ?? null);
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
    }, [id])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSingleSubmit = async (formId: number) => {
    if (submitting) return;
    Alert.alert(
      'Submit Form',
      'Submit form ini ke puskesmas?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await abjService.submitSingle(formId);
              Alert.alert('Berhasil', res?.data?.message ?? 'Form berhasil disubmit');
              await loadData();
            } catch (error: any) {
              const message = error?.response?.data?.message ?? 'Gagal submit form, coba lagi.';
              Alert.alert('Gagal', message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const totalRumah = data?.items_abj?.length ?? 0;
  const totalBerjentik = (data?.items_abj ?? []).filter((i) => isBerjentik(i.penampungan_berjentik)).length;
  const totalTidakBerjentik = totalRumah - totalBerjentik;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Data tidak ditemukan.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
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
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.title}>Detail Pemeriksaan</Text>
            <Text style={styles.subtitle}>{formatTanggal(data.tanggal_pemeriksaan)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.editButton, data.status === 'dilaporkan' && styles.editButtonDisabled]}
            onPress={() => router.push(`/laporan-form?id=${data.id}`)}
            disabled={data.status === 'dilaporkan'}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={16} color={data.status === 'dilaporkan' ? 'rgba(255,255,255,0.6)' : COLORS.cardBg} />
            <Text style={[styles.editButtonText, data.status === 'dilaporkan' && { color: 'rgba(255,255,255,0.8)' }]}>
              {data.status === 'dilaporkan' ? 'Tersubmit' : 'Edit'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: COLORS.success }, data.status === 'dilaporkan' && styles.editButtonDisabled]}
            onPress={() => handleSingleSubmit(data.id)}
            disabled={submitting || data.status === 'dilaporkan'}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size={14} color={COLORS.cardBg} />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color={data.status === 'dilaporkan' ? 'rgba(255,255,255,0.6)' : COLORS.cardBg} />
                <Text style={[styles.editButtonText, data.status === 'dilaporkan' && { color: 'rgba(255,255,255,0.8)' }]}>
                  {data.status === 'dilaporkan' ? 'Tersubmit' : 'Submit'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Tanggal Pemeriksaan</Text>
              <Text style={styles.infoValue}>{formatTanggal(data.tanggal_pemeriksaan)}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="location-outline" size={16} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Kelurahan</Text>
              <Text style={styles.infoValue}>{data.kelurahan?.name ?? '-'}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="home-outline" size={16} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.infoLabel}>RT</Text>
              <Text style={styles.infoValue}>{data.rt?.name ?? '-'}</Text>
            </View>
          </View>
        </View>

        {/* Ringkasan */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalRumah}</Text>
            <Text style={styles.summaryLabel}>Rumah Diperiksa</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.dangerSoft }]}>
            <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{totalBerjentik}</Text>
            <Text style={styles.summaryLabel}>Berjentik</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.successSoft }]}>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>{totalTidakBerjentik}</Text>
            <Text style={styles.summaryLabel}>Tidak Berjentik</Text>
          </View>
        </View>

        {/* Tabel items */}
        <Text style={styles.sectionLabel}>Daftar Kepala Keluarga</Text>

        <View style={styles.tableCard}>
          <View style={[styles.row, styles.headerRowTable]}>
            <Text style={[styles.cellNo, styles.headerText]}>No</Text>
            <Text style={[styles.cellName, styles.headerText]}>Nama Kepala Keluarga</Text>
            <Text style={[styles.cellNum, styles.headerText, styles.cellCenter]}>Berjentik</Text>
            <Text style={[styles.cellNum, styles.headerText, styles.cellCenter]}>Tdk</Text>
          </View>

          {(data.items_abj?.length ?? 0) === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={22} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Tidak ada data kepala keluarga pada sesi ini.</Text>
            </View>
          ) : (
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {(data.items_abj ?? []).map((rumah, idx) => (
                <View
                  key={idx}
                  style={[styles.row, idx % 2 === 1 && styles.rowAlt]}
                >
                  <Text style={[styles.cellNo, styles.cellText]}>{idx + 1}</Text>
                  <Text style={[styles.cellName, styles.cellText]} numberOfLines={2}>
                    {rumah.nama_kepala_keluarga || '-'}
                  </Text>
                  <Text style={[styles.cellNum, styles.cellCenter, styles.cellText]}>
                    {rumah.penampungan_berjentik || '0'}
                  </Text>
                  <Text style={[styles.cellNum, styles.cellCenter, styles.cellText]}>
                    {rumah.penampungan_tidak_berjentik || '0'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 13 },
  editButtonDisabled: { opacity: 0.6 },

  infoCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
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
    backgroundColor: COLORS.border,
    marginVertical: 12,
    marginLeft: 44,
  },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
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

  tableCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowAlt: { backgroundColor: COLORS.accentSoft },
  headerRowTable: {
    backgroundColor: COLORS.accent,
    borderBottomWidth: 0,
    paddingVertical: 10,
  },
  headerText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 11.5 },
  cellNo: { width: 32, fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'center' },
  cellName: { flex: 1, fontSize: 13, color: COLORS.textDark, paddingHorizontal: 4 },
  cellNum: { width: 64, fontSize: 13, color: COLORS.textDark, paddingHorizontal: 2 },
  cellCenter: { textAlign: 'center' },
  cellText: { fontWeight: '600' },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 12.5, textAlign: 'center' },

  backButton: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 14 },
});
