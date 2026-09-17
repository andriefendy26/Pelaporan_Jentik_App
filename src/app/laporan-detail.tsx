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
import { FormAbj } from '../types/abj';

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
  border: '#E6E9ED',
};

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

/** ABJ ≥ 95% baik, 80–95% waspada, < 80% rendah — sama seperti dashboard. */
function statusAbj(abj: number) {
  if (abj >= 95) return { label: 'Baik', color: COLORS.emerald, soft: COLORS.emeraldSoft, icon: 'shield-checkmark-outline' as const };
  if (abj >= 80) return { label: 'Waspada', color: COLORS.amber, soft: COLORS.amberSoft, icon: 'alert-circle-outline' as const };
  return { label: 'Rendah', color: COLORS.rose, soft: COLORS.roseSoft, icon: 'warning-outline' as const };
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
  const abjPersen = totalRumah > 0 ? Math.round((totalTidakBerjentik / totalRumah) * 100) : 0;
  const status = statusAbj(abjPersen);

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
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="document-text-outline" size={28} color={COLORS.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Data tidak ditemukan</Text>
        <Text style={styles.emptyText}>Laporan ini mungkin sudah dihapus.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={16} color={COLORS.cardBg} />
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sudahDilaporkan = data.status === 'dilaporkan';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Hero card mengikuti pola HomeScreen */}
        <View style={styles.heroCard}>
          <View style={styles.heroBlobLarge} />
          <View style={styles.heroBlobSmall} />

          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Detail Pemeriksaan</Text>
              <Text style={styles.heroSubtitle}>{formatTanggal(data.tanggal_pemeriksaan)}</Text>
            </View>
            <TouchableOpacity
              style={styles.heroIconButton}
              onPress={() => router.back()}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={19} color={COLORS.cardBg} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroStatRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>Angka Bebas Jentik</Text>
              <Text style={styles.heroStatValue}>{abjPersen}%</Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name={sudahDilaporkan ? 'checkmark-circle-outline' : status.icon} size={13} color={COLORS.cardBg} />
              <Text style={styles.heroBadgeText}>
                {sudahDilaporkan ? 'Tersubmit' : status.label}
              </Text>
            </View>
          </View>

          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={[styles.heroAction, sudahDilaporkan && styles.heroActionDisabled]}
              onPress={() => router.push(`/laporan-form?id=${data.id}`)}
              disabled={sudahDilaporkan}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={15} color={COLORS.cardBg} />
              <Text style={styles.heroActionText}>{sudahDilaporkan ? 'Terkunci' : 'Edit'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.heroAction, styles.heroActionSolid, sudahDilaporkan && styles.heroActionDisabled]}
              onPress={() => handleSingleSubmit(data.id)}
              disabled={submitting || sudahDilaporkan}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <>
                  <Ionicons name="send-outline" size={15} color={COLORS.accentDark} />
                  <Text style={[styles.heroActionText, { color: COLORS.accentDark }]}>
                    {sudahDilaporkan ? 'Tersubmit' : 'Submit'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Ringkasan */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Ringkasan</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrapper, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="home-outline" size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.summaryValue}>{totalRumah}</Text>
            <Text style={styles.summaryLabel}>Rumah Diperiksa</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrapper, { backgroundColor: COLORS.roseSoft }]}>
              <Ionicons name="warning-outline" size={16} color={COLORS.rose} />
            </View>
            <Text style={styles.summaryValue}>{totalBerjentik}</Text>
            <Text style={styles.summaryLabel}>Berjentik</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrapper, { backgroundColor: COLORS.emeraldSoft }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.emerald} />
            </View>
            <Text style={styles.summaryValue}>{totalTidakBerjentik}</Text>
            <Text style={styles.summaryLabel}>Bebas Jentik</Text>
          </View>
        </View>

        {/* Informasi lokasi */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Informasi Laporan</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrapper, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Tanggal Pemeriksaan</Text>
              <Text style={styles.infoValue}>{formatTanggal(data.tanggal_pemeriksaan)}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrapper, { backgroundColor: COLORS.violetSoft }]}>
              <Ionicons name="location-outline" size={16} color={COLORS.violet} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Kelurahan</Text>
              <Text style={styles.infoValue}>{data.kelurahan?.name ?? '-'}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrapper, { backgroundColor: COLORS.amberSoft }]}>
              <Ionicons name="home-outline" size={16} color={COLORS.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>RT</Text>
              <Text style={styles.infoValue}>{data.r_t?.name ?? '-'}</Text>
            </View>
          </View>
        </View>

        {/* Daftar kepala keluarga */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Daftar Kepala Keluarga</Text>
          </View>
          <Text style={styles.sectionCount}>{totalRumah} rumah</Text>
        </View>

        {totalRumah === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="people-outline" size={26} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada data</Text>
            <Text style={styles.emptyText}>Tidak ada kepala keluarga tercatat pada sesi ini.</Text>
          </View>
        ) : (
          (data.items_abj ?? []).map((rumah, idx) => {
            const berjentik = isBerjentik(rumah.penampungan_berjentik);
            return (
              <View key={idx} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <View style={[styles.itemIndex, berjentik ? { backgroundColor: COLORS.roseSoft } : { backgroundColor: COLORS.emeraldSoft }]}>
                    <Text style={[styles.itemIndexText, { color: berjentik ? COLORS.rose : COLORS.emerald }]}>
                      {idx + 1}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {rumah.nama_kepala_keluarga || '-'}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {rumah.penampungan_berjentik || '0'} berjentik · {rumah.penampungan_tidak_berjentik || '0'} bebas
                    </Text>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: berjentik ? COLORS.roseSoft : COLORS.emeraldSoft }]}>
                    <Text style={[styles.statusPillText, { color: berjentik ? COLORS.rose : COLORS.emerald }]}>
                      {berjentik ? 'Berjentik' : 'Bebas'}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemNoteWrapper}>
                  {rumah.keterangan && rumah.keterangan.trim() ? (
                    <Text style={styles.noteText} numberOfLines={3}>{rumah.keterangan.trim()}</Text>
                  ) : (
                    <Text style={styles.notePlaceholder}>Tidak ada keterangan</Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 32,
  },
  content: { padding: 20, paddingBottom: 40 },

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
  heroStatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroStatLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.8)' },
  heroStatValue: { fontSize: 30, fontWeight: '800', color: COLORS.cardBg, marginTop: 2 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: { fontSize: 11.5, fontWeight: '700', color: COLORS.cardBg },
  heroActionRow: { flexDirection: 'row', gap: 10 },
  heroAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingVertical: 11,
    borderRadius: 14,
  },
  heroActionSolid: { backgroundColor: COLORS.cardBg },
  heroActionDisabled: { opacity: 0.55 },
  heroActionText: { fontSize: 13, fontWeight: '700', color: COLORS.cardBg },

  /* ---------- Section ---------- */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.accent },
  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.textDark },
  sectionCount: { fontSize: 12, color: COLORS.textMuted },

  /* ---------- Ringkasan ---------- */
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  /* ---------- Info card ---------- */
  infoCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: COLORS.textMuted },
  infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12, marginLeft: 46 },

  /* ---------- Item kepala keluarga ---------- */
  itemCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIndex: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIndexText: { fontSize: 13, fontWeight: '800' },
  itemName: { fontSize: 14.5, fontWeight: '700', color: COLORS.textDark },
  itemMeta: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  itemNoteWrapper: {
    marginTop: 10,
    marginLeft: 46,
    backgroundColor: '#F7F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  noteText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  notePlaceholder: { fontSize: 12, color: '#b0b8c1', fontStyle: 'italic' },

  /* ---------- Empty ---------- */
  emptyCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  emptyIconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#EDF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginBottom: 5 },
  emptyText: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 19 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  backButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 13.5 },
});