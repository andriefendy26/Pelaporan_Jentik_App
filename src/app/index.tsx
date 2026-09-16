import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import KelurahanAbjList from '../components/dashboard/KelurahanAbjList';
import StatCard from '../components/dashboard/StatCard';
import { useAuth } from '../services/Context/AuthContext';
import { dashboardService } from '../services/Jentikservice';
import { DashboardSummary, KelurahanAbj, MonthlyAbj, MonthlyRumah } from '../types/dashboard';

const screenWidth = Dimensions.get('window').width;
const BULAN_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const JUMLAH_TAHUN_KE_BELAKANG = 5;

/**
 * Palet dasar tetap dipertahankan (#222831 / #393E46 / #00ADB5 / #EEEEEE),
 * ditambah warna aksen sekunder supaya kartu & grafik tidak monoton.
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

// warna berputar untuk batang grafik supaya lebih hidup
const BAR_COLORS = ['#00ADB5', '#7C5CFC', '#F59E0B', '#10B981', '#F43F5E', '#3B82F6'];

const chartWidth = screenWidth - 64;

function getInitial(name?: string, username?: string) {
  const source = name || username || '?';
  return source.trim().charAt(0).toUpperCase();
}

/** ABJ ≥ 95% dianggap baik, 80–95% waspada, < 80% rendah. */
function statusAbj(abj: number) {
  if (abj >= 95) return { label: 'Baik', color: COLORS.emerald, soft: COLORS.emeraldSoft, icon: 'shield-checkmark-outline' as const };
  if (abj >= 80) return { label: 'Waspada', color: COLORS.amber, soft: COLORS.amberSoft, icon: 'alert-circle-outline' as const };
  return { label: 'Rendah', color: COLORS.rose, soft: COLORS.roseSoft, icon: 'warning-outline' as const };
}

const makeChartConfig = (rgb: string) => ({
  backgroundColor: COLORS.cardBg,
  backgroundGradientFrom: COLORS.cardBg,
  backgroundGradientTo: COLORS.cardBg,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(${rgb}, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(122, 130, 140, ${opacity})`,
  propsForBackgroundLines: { stroke: '#EDF0F3', strokeDasharray: '4 6' },
  propsForLabels: { fontSize: 10 },
  barPercentage: 0.55,
  style: { borderRadius: 16 },
});

const barChartConfig = {
  ...makeChartConfig('0, 173, 181'),
  fillShadowGradientOpacity: 1,
};

const lineChartConfig = {
  ...makeChartConfig('124, 92, 252'),
  fillShadowGradient: '#7C5CFC',
  fillShadowGradientOpacity: 0.18,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#FFFFFF' },
};

const pieChartConfig = makeChartConfig('0, 173, 181');

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [rumahPerBulan, setRumahPerBulan] = useState<MonthlyRumah[]>([]);
  const [abjPerBulan, setAbjPerBulan] = useState<MonthlyAbj[]>([]);
  const [abjPerKelurahan, setAbjPerKelurahan] = useState<KelurahanAbj[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [tahunModalVisible, setTahunModalVisible] = useState(false);

  const daftarTahun = Array.from(
    { length: JUMLAH_TAHUN_KE_BELAKANG },
    (_, i) => new Date().getFullYear() - i
  );

  const pilihTahun = (t: number) => {
    setTahun(t);
    setTahunModalVisible(false);
  };

  const loadDashboard = async () => {
    try {
      const [summaryRes, rumahRes, abjBulanRes, abjKelurahanRes] = await Promise.all([
        dashboardService.getSummary({ tahun }),
        dashboardService.getRumahDiperiksaPerBulan({ tahun }),
        dashboardService.getAbjPerBulan({ tahun }),
        dashboardService.getAbjPerKelurahan({ tahun }),
      ]);

      setSummary(summaryRes?.data?.data ?? null);
      setRumahPerBulan(rumahRes?.data?.data ?? []);
      setAbjPerBulan(abjBulanRes?.data?.data ?? []);
      setAbjPerKelurahan(abjKelurahanRes?.data?.data ?? []);
    } catch (error) {
      // biarkan diam; UI akan tampil dengan state kosong kalau fetch gagal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tahun])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const rumahChartData = {
    labels: rumahPerBulan.map((item) => BULAN_LABEL[item.bulan - 1]),
    datasets: [
      {
        data: rumahPerBulan.map((item) => item.total_rumah),
        colors: rumahPerBulan.map((_, i) => () => BAR_COLORS[i % BAR_COLORS.length]),
      },
    ],
  };

  const abjChartData = {
    labels: abjPerBulan.map((item) => BULAN_LABEL[item.bulan - 1]),
    datasets: [{ data: abjPerBulan.map((item) => item.abj_persen), strokeWidth: 3 }],
  };

  const abjPersen = Number(summary?.abj_persen ?? 0);
  const totalRumah = Number(summary?.total_rumah_diperiksa ?? 0);
  const status = statusAbj(abjPersen);

  // Komposisi rumah: bebas jentik vs ditemukan jentik (diturunkan dari ABJ)
  const { rumahBebas, rumahPositif, pieData } = useMemo(() => {
    const bebas = Math.round((totalRumah * abjPersen) / 100);
    const positif = Math.max(totalRumah - bebas, 0);
    return {
      rumahBebas: bebas,
      rumahPositif: positif,
      pieData: [
        { name: 'Bebas Jentik', population: bebas, color: COLORS.emerald },
        { name: 'Ada Jentik', population: positif, color: COLORS.rose },
      ].filter((slice) => slice.population > 0),
    };
  }, [totalRumah, abjPersen]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Header + Greeting hero card (versi berwarna) */}
        <View style={styles.heroCard}>
          <View style={styles.heroBlobLarge} />
          <View style={styles.heroBlobSmall} />

          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Pelaporan Jentik</Text>
              <Text style={styles.heroSubtitle}>Dashboard utama aplikasi</Text>
            </View>
            <Pressable style={styles.logoutIconButton} onPress={logout} hitSlop={8}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.cardBg} />
            </Pressable>
          </View>

          <View style={styles.heroUserRow}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{getInitial(user?.name, user?.username)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>Selamat datang,</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {user?.name ?? user?.username}
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name={status.icon} size={13} color={COLORS.cardBg} />
              <Text style={styles.heroBadgeText}>ABJ {abjPersen}%</Text>
            </View>
          </View>
        </View>

        {/* CTA Buku Petunjuk & Informasi DBD */}
        <View style={styles.infoCtaRow}>
          <TouchableOpacity
            style={styles.infoCtaCard}
            onPress={() => Linking.openURL('https://sijumantik.my.id/storage/panduan/panduan-pengguna.pdf')}
            activeOpacity={0.85}
          >
            <View style={[styles.infoCtaIconWrapper, { backgroundColor: COLORS.violetSoft }]}>
              <Ionicons name="book-outline" size={20} color={COLORS.violet} />
            </View>
            <Text style={styles.infoCtaTitle}>Buku Petunjuk</Text>
            <Text style={styles.infoCtaSubtitle}>Panduan pemeriksaan jentik</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoCtaCard}
            onPress={() => Linking.openURL('https://sijumantik.my.id/storage/informasi/informasi.png')}
            activeOpacity={0.85}
          >
            <View style={[styles.infoCtaIconWrapper, { backgroundColor: COLORS.roseSoft }]}>
              <Ionicons name="medkit-outline" size={20} color={COLORS.rose} />
            </View>
            <Text style={styles.infoCtaTitle}>Informasi DBD</Text>
            <Text style={styles.infoCtaSubtitle}>Kenali gejala & pencegahan</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />
        ) : (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionBar} />
                <Text style={styles.sectionTitle}>Overview</Text>
              </View>
              <TouchableOpacity
                style={styles.periodSelect}
                onPress={() => setTahunModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={13} color={COLORS.accent} />
                <Text style={styles.periodSelectText}>{tahun}</Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.statGrid}>
              <StatCard
                label="Total Laporan"
                value={summary?.total_laporan ?? 0}
                accent={COLORS.accent}
                tint={COLORS.accentSoft}
                icon="document-text-outline"
              />
              <StatCard
                label="Rumah Diperiksa"
                value={summary?.total_rumah_diperiksa ?? 0}
                accent={COLORS.violet}
                tint={COLORS.violetSoft}
                icon="home-outline"
              />
              <StatCard
                label="ABJ Keseluruhan"
                value={`${abjPersen}%`}
                accent={status.color}
                tint={status.soft}
                icon="pulse-outline"
              />
              <StatCard
                label="Kelurahan Tercakup"
                value={summary?.total_kelurahan_tercakup ?? 0}
                accent={COLORS.amber}
                tint={COLORS.amberSoft}
                icon="location-outline"
              />
            </View>

            {/* Donut: komposisi rumah bebas jentik vs ada jentik */}
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <View style={[styles.chartIconWrapper, { backgroundColor: COLORS.emeraldSoft }]}>
                  <Ionicons name="pie-chart-outline" size={15} color={COLORS.emerald} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartCardTitle}>Komposisi Rumah Diperiksa</Text>
                  <Text style={styles.chartCardCaption}>Berdasarkan hasil pemeriksaan {tahun}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: status.soft }]}>
                  <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              {pieData.length > 0 ? (
                <>
                  <View style={styles.donutWrapper}>
                    <PieChart
                      data={pieData.map((slice) => ({
                        ...slice,
                        legendFontColor: COLORS.textSecondary,
                        legendFontSize: 12,
                      }))}
                      width={chartWidth}
                      height={200}
                      chartConfig={pieChartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft={`${chartWidth / 4}`}
                      hasLegend={false}
                      absolute
                    />
                    <View style={styles.donutHole} pointerEvents="none">
                      <Text style={styles.donutValue}>{abjPersen}%</Text>
                      <Text style={styles.donutLabel}>ABJ</Text>
                    </View>
                  </View>

                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: COLORS.emerald }]} />
                      <View>
                        <Text style={styles.legendLabel}>Bebas Jentik</Text>
                        <Text style={styles.legendValue}>{rumahBebas} rumah</Text>
                      </View>
                    </View>
                    <View style={styles.legendDivider} />
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: COLORS.rose }]} />
                      <View>
                        <Text style={styles.legendLabel}>Ada Jentik</Text>
                        <Text style={styles.legendValue}>{rumahPositif} rumah</Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyWrapper}>
                  <Ionicons name="pie-chart-outline" size={26} color="#c2c7cc" />
                  <Text style={styles.emptyText}>Belum ada rumah yang diperiksa tahun ini.</Text>
                </View>
              )}
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <View style={[styles.chartIconWrapper, { backgroundColor: COLORS.accentSoft }]}>
                  <Ionicons name="home-outline" size={15} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartCardTitle}>Rumah Diperiksa per Bulan</Text>
                  <Text style={styles.chartCardCaption}>Total {totalRumah} rumah sepanjang {tahun}</Text>
                </View>
              </View>
              {rumahPerBulan.some((item) => item.total_rumah > 0) ? (
                <BarChart
                  data={rumahChartData}
                  width={chartWidth}
                  height={210}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={barChartConfig}
                  fromZero
                  flatColor
                  withCustomBarColorFromData
                  showValuesOnTopOfBars
                  withInnerLines
                  style={styles.chart}
                />
              ) : (
                <View style={styles.emptyWrapper}>
                  <Ionicons name="bar-chart-outline" size={26} color="#c2c7cc" />
                  <Text style={styles.emptyText}>Belum ada data rumah diperiksa tahun ini.</Text>
                </View>
              )}
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <View style={[styles.chartIconWrapper, { backgroundColor: COLORS.violetSoft }]}>
                  <Ionicons name="trending-up-outline" size={15} color={COLORS.violet} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartCardTitle}>Tren ABJ per Bulan</Text>
                  <Text style={styles.chartCardCaption}>Target nasional ≥ 95%</Text>
                </View>
              </View>
              {abjPerBulan.some((item) => item.abj_persen > 0) ? (
                <LineChart
                  data={abjChartData}
                  width={chartWidth}
                  height={210}
                  yAxisSuffix="%"
                  fromZero
                  chartConfig={lineChartConfig}
                  bezier
                  withShadow
                  style={styles.chart}
                />
              ) : (
                <View style={styles.emptyWrapper}>
                  <Ionicons name="analytics-outline" size={26} color="#c2c7cc" />
                  <Text style={styles.emptyText}>Belum ada data ABJ tahun ini.</Text>
                </View>
              )}
            </View>

            {/* <View style={[styles.chartCard, { paddingBottom: 4 }]}>
              <View style={styles.chartCardHeader}>
                <View style={styles.chartIconWrapper}>
                  <Ionicons name="location-outline" size={15} color={COLORS.accent} />
                </View>
                <Text style={styles.chartCardTitle}>ABJ per Kelurahan</Text>
              </View>
              <KelurahanAbjList data={abjPerKelurahan} />
            </View> */}
          </>
        )}
      </ScrollView>

      <BottomNav />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
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
    marginBottom: 18,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: COLORS.cardBg, marginBottom: 2 },
  heroSubtitle: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  logoutIconButton: {
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

  /* ---------- CTA ---------- */
  infoCtaRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCtaCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  infoCtaIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  infoCtaTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  infoCtaSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  loadingIndicator: { marginVertical: 40 },

  /* ---------- Section ---------- */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.accent },
  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.textDark },
  periodSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  periodSelectText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textDark },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  /* ---------- Chart card ---------- */
  chartCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    marginBottom: 14,
  },
  chartIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCardTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textDark },
  chartCardCaption: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  chart: { borderRadius: 16, marginLeft: -8 },

  /* ---------- Donut ---------- */
  donutWrapper: {
    width: chartWidth,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutHole: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  donutLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, letterSpacing: 1 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#F7F9FA',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  legendItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  legendDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: COLORS.textMuted },
  legendValue: { fontSize: 13.5, fontWeight: '700', color: COLORS.textDark, marginTop: 1 },

  emptyWrapper: { alignItems: 'center', justifyContent: 'center', paddingVertical: 26, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center' },

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
    marginBottom: 8,
    paddingHorizontal: 4,
  },
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
});