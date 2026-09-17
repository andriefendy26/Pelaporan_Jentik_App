import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../services/Context/AuthContext';
import { kasusService } from '../services/Jentikservice';
import { Kasus } from '../types/kasus';

/**
 * Palet & token visual disamakan dengan HomeScreen supaya seluruh aplikasi
 * memakai bahasa desain yang sama (kartu putih berborder, hero beraksen,
 * section header bergaris, bottom sheet untuk pemilihan periode).
 */
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

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

const JUMLAH_TAHUN_KE_BELAKANG = 5;

function formatTanggal(tanggal: string) {
  try {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return tanggal;
  }
}

function getInitial(name?: string, username?: string) {
  const source = name || username || '?';
  return source.trim().charAt(0).toUpperCase();
}

export default function KasusScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [periodeModalVisible, setPeriodeModalVisible] = useState(false);

  const [data, setData] = useState<Kasus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const daftarTahun = useMemo(
    () => Array.from({ length: JUMLAH_TAHUN_KE_BELAKANG }, (_, i) => now.getFullYear() - i),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const isFuturePeriod =
    tahun > now.getFullYear() || (tahun === now.getFullYear() && bulan > now.getMonth() + 1);

  const isBulanFuture = (b: number, t: number) =>
    t > now.getFullYear() || (t === now.getFullYear() && b > now.getMonth() + 1);

  const loadData = async () => {
    try {
      const response = await kasusService.getAll({ bulan, tahun });
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

  const pilihPeriode = (b: number, t: number) => {
    setBulan(b);
    setTahun(t);
    setPeriodeModalVisible(false);
  };

  const handleDelete = (item: Kasus) => {
    Alert.alert('Hapus Kasus', `Yakin ingin menghapus data ${item.nama_penderita}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await kasusService.delete(item.id);
            setData((prev) => prev.filter((d) => d.id !== item.id));
          } catch (error: any) {
            Alert.alert('Gagal menghapus', error?.response?.data?.message ?? 'Terjadi kesalahan');
          }
        },
      },
    ]);
  };

  const listHeader = (
    <>
      {/* Hero card mengikuti pola HomeScreen */}
      <View style={styles.heroCard}>
        <View style={styles.heroBlobLarge} />
        <View style={styles.heroBlobSmall} />

        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Kasus DBD</Text>
            <Text style={styles.heroSubtitle}>Pencatatan kasus per periode</Text>
          </View>
          <Pressable
            style={styles.heroIconButton}
            onPress={() => router.push('/kasus-form')}
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color={COLORS.cardBg} />
          </Pressable>
        </View>

        <View style={styles.heroUserRow}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{getInitial(user?.name, user?.username)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreeting}>Periode aktif</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {BULAN_NAMA[bulan - 1]} {tahun}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="medkit-outline" size={13} color={COLORS.cardBg} />
            <Text style={styles.heroBadgeText}>{data.length} kasus</Text>
          </View>
        </View>
      </View>

      {/* Navigasi periode */}
      <View style={styles.periodBar}>
        <TouchableOpacity style={styles.periodArrow} onPress={() => gantiBulan(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color={COLORS.textDark} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.periodSelect}
          onPress={() => setPeriodeModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
          <Text style={styles.periodSelectText}>{BULAN_NAMA[bulan - 1]} {tahun}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodArrow, isFuturePeriod && styles.periodArrowDisabled]}
          onPress={() => !isFuturePeriod && gantiBulan(1)}
          disabled={isFuturePeriod}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={18} color={isFuturePeriod ? '#c2c7cc' : COLORS.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionBar} />
          <Text style={styles.sectionTitle}>Daftar Kasus</Text>
        </View>
        <Text style={styles.sectionCount}>{data.length} data</Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="medkit-outline" size={28} color={COLORS.rose} />
              </View>
              <Text style={styles.emptyTitle}>Belum ada kasus</Text>
              <Text style={styles.emptyText}>
                Belum ada kasus DBD tercatat untuk {BULAN_NAMA[bulan - 1]} {tahun}.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/kasus-form')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={COLORS.cardBg} />
                <Text style={styles.emptyButtonText}>Tambah kasus</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardBody}
                onPress={() => router.push(`/kasus-form?id=${item.id}`)}
                activeOpacity={0.75}
              >
                <View style={styles.cardIconWrapper}>
                  <Ionicons name="person-outline" size={19} color={COLORS.rose} />
                </View>

                <View style={styles.cardTextWrapper}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.nama_penderita}</Text>

                  <View style={styles.cardMetaRow}>
                    <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.cardMetaText} numberOfLines={1}>
                      {formatTanggal(item.tanggal_penderita)}
                    </Text>
                  </View>

                  <View style={styles.cardMetaRow}>
                    <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.cardMetaText} numberOfLines={1}>
                      {item.rt?.name ?? '-'}, {item.kelurahan?.name ?? '-'}
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#b0b4ba" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <BottomNav />

      <Modal
        visible={periodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPeriodeModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Pilih Periode</Text>

            <View style={styles.yearRow}>
              {daftarTahun.map((t) => {
                const aktif = t === tahun;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.yearChip, aktif && styles.yearChipActive]}
                    onPress={() => setTahun(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yearChipText, aktif && styles.yearChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.monthGrid}>
              {BULAN_SINGKAT.map((label, index) => {
                const b = index + 1;
                const aktif = b === bulan;
                const nonaktif = isBulanFuture(b, tahun);
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.monthChip,
                      aktif && styles.monthChipActive,
                      nonaktif && styles.monthChipDisabled,
                    ]}
                    disabled={nonaktif}
                    onPress={() => pilihPeriode(b, tahun)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.monthChipText,
                        aktif && styles.monthChipTextActive,
                        nonaktif && styles.monthChipTextDisabled,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },

  /* ---------- Hero ---------- */
  heroCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
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
    marginBottom: 18,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: COLORS.cardBg, marginBottom: 2 },
  heroSubtitle: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  heroIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: { color: COLORS.cardBg, fontSize: 19, fontWeight: '700' },
  heroGreeting: { fontSize: 11.5, color: 'rgba(255,255,255,0.8)' },
  heroName: { fontSize: 16.5, fontWeight: '700', color: COLORS.cardBg, marginTop: 1 },
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

  /* ---------- Periode ---------- */
  periodBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  periodArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodArrowDisabled: { opacity: 0.45 },
  periodSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  periodSelectText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },

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

  /* ---------- Kartu kasus ---------- */
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
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
    borderRadius: 14,
    backgroundColor: COLORS.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrapper: { flex: 1 },
  cardName: { fontSize: 14.5, fontWeight: '700', color: COLORS.textDark },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  cardMetaText: { flex: 1, fontSize: 11.5, color: COLORS.textMuted },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    backgroundColor: COLORS.roseSoft,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },

  /* ---------- Empty state ---------- */
  emptyCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginBottom: 5 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12.5, lineHeight: 19 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
  },
  emptyButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 13 },

  /* ---------- Modal ---------- */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
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
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, marginBottom: 16 },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yearChipActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  yearChipText: { fontSize: 13, color: COLORS.textSecondary },
  yearChipTextActive: { color: COLORS.accent, fontWeight: '700' },

  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  monthChip: {
    width: '22.4%',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  monthChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  monthChipDisabled: { opacity: 0.4 },
  monthChipText: { fontSize: 13, color: COLORS.textDark },
  monthChipTextActive: { color: COLORS.cardBg, fontWeight: '700' },
  monthChipTextDisabled: { color: COLORS.textMuted },
});