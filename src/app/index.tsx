import { useFocusEffect,useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import KelurahanAbjList from '../components/dashboard/KelurahanAbjList';
import StatCard from '../components/dashboard/StatCard';
import { useAuth } from '../services/Context/AuthContext';
import { dashboardService } from '../services/Jentikservice';
import { DashboardSummary, KelurahanAbj, MonthlyAbj, MonthlyRumah } from '../types/dashboard';

const screenWidth = Dimensions.get('window').width;
const BULAN_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.1)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
};

const chartConfig = {
  backgroundColor: COLORS.cardBg,
  backgroundGradientFrom: COLORS.cardBg,
  backgroundGradientTo: COLORS.cardBg,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 173, 181, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(57, 62, 70, ${opacity})`,
  propsForBackgroundLines: { stroke: '#e0e0e0' },
  style: { borderRadius: 16 },
};

function getInitial(name?: string, username?: string) {
  const source = name || username || '?';
  return source.trim().charAt(0).toUpperCase();
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [rumahPerBulan, setRumahPerBulan] = useState<MonthlyRumah[]>([]);
  const [abjPerBulan, setAbjPerBulan] = useState<MonthlyAbj[]>([]);
  const [abjPerKelurahan, setAbjPerKelurahan] = useState<KelurahanAbj[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const [summaryRes, rumahRes, abjBulanRes, abjKelurahanRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getRumahDiperiksaPerBulan(),
        dashboardService.getAbjPerBulan(),
        dashboardService.getAbjPerKelurahan(),
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
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const rumahChartData = {
    labels: rumahPerBulan.map((item) => BULAN_LABEL[item.bulan - 1]),
    datasets: [{ data: rumahPerBulan.map((item) => item.total_rumah) }],
  };

  const abjChartData = {
    labels: abjPerBulan.map((item) => BULAN_LABEL[item.bulan - 1]),
    datasets: [{ data: abjPerBulan.map((item) => item.abj_persen) }],
  };

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
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pelaporan Jentik</Text>
            <Text style={styles.subtitle}>Dashboard utama aplikasi</Text>
          </View>
          <Pressable style={styles.logoutIconButton} onPress={logout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        {/* Greeting hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{getInitial(user?.name, user?.username)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreeting}>Selamat datang,</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {user?.name ?? user?.username}
            </Text>
            <Text style={styles.heroText}>
              Lihat data laporan, dashboard, dan analisa dari sini.
            </Text>
          </View>
        </View>

        {/* CTA Submit Laporan */}
      {/* <TouchableOpacity
        style={styles.submitCta}
        onPress={() => router.push('/submit-laporan')}
        activeOpacity={0.85}
      >
        <View style={styles.submitCtaIconWrapper}>
          <Ionicons name="paper-plane-outline" size={20} color={COLORS.cardBg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.submitCtaTitle}>Submit Laporan Bulanan</Text>
          <Text style={styles.submitCtaSubtitle}>Kirim laporan pemeriksaan jentik bulan ini</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.cardBg} />
      </TouchableOpacity> */}

      {/* CTA Buku Petunjuk & Informasi DBD */}
      <View style={styles.infoCtaRow}>
        <TouchableOpacity
          style={styles.infoCtaCard}
          onPress={() => Linking.openURL('https://contoh-link-buku-petunjuk.pdf')}
          activeOpacity={0.85}
        >
          <View style={[styles.infoCtaIconWrapper, { backgroundColor: 'rgba(0, 173, 181, 0.12)' }]}>
            <Ionicons name="book-outline" size={20} color={COLORS.accent} />
          </View>
          <Text style={styles.infoCtaTitle}>Buku Petunjuk</Text>
          <Text style={styles.infoCtaSubtitle}>Panduan pemeriksaan jentik</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoCtaCard}
          onPress={() => Linking.openURL('https://contoh-link-informasi-dbd.com')}
          activeOpacity={0.85}
        >
          <View style={[styles.infoCtaIconWrapper, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
            <Ionicons name="medkit-outline" size={20} color={COLORS.danger} />
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
              <Text style={styles.sectionTitle}>Overview</Text>
              {summary?.tahun ? (
                <View style={styles.yearBadge}>
                  <Text style={styles.yearBadgeText}>{summary.tahun}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.statGrid}>
              <StatCard label="Total Laporan" value={summary?.total_laporan ?? 0} accent={COLORS.accent} />
              <StatCard label="Rumah Diperiksa" value={summary?.total_rumah_diperiksa ?? 0} accent={COLORS.textDark} />
              <StatCard label="ABJ Keseluruhan" value={`${summary?.abj_persen ?? 0}%`} accent={COLORS.accent} />
              <StatCard label="Kelurahan Tercakup" value={summary?.total_kelurahan_tercakup ?? 0} accent={COLORS.textSecondary} />
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <View style={styles.chartIconWrapper}>
                  <Ionicons name="home-outline" size={15} color={COLORS.accent} />
                </View>
                <Text style={styles.chartCardTitle}>Rumah Diperiksa per Bulan</Text>
              </View>
              {rumahPerBulan.some((item) => item.total_rumah > 0) ? (
                <BarChart
                  data={rumahChartData}
                  width={screenWidth - 64}
                  height={200}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  fromZero
                  showValuesOnTopOfBars
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
                <View style={styles.chartIconWrapper}>
                  <Ionicons name="trending-up-outline" size={15} color={COLORS.accent} />
                </View>
                <Text style={styles.chartCardTitle}>ABJ per Bulan (%)</Text>
              </View>
              {abjPerBulan.some((item) => item.abj_persen > 0) ? (
                <LineChart
                  data={abjChartData}
                  width={screenWidth - 64}
                  height={200}
                  yAxisSuffix="%"
                  fromZero
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              ) : (
                <View style={styles.emptyWrapper}>
                  <Ionicons name="analytics-outline" size={26} color="#c2c7cc" />
                  <Text style={styles.emptyText}>Belum ada data ABJ tahun ini.</Text>
                </View>
              )}
            </View>

            <View style={[styles.chartCard, { paddingBottom: 4 }]}>
              <View style={styles.chartCardHeader}>
                <View style={styles.chartIconWrapper}>
                  <Ionicons name="location-outline" size={15} color={COLORS.accent} />
                </View>
                <Text style={styles.chartCardTitle}>ABJ per Kelurahan</Text>
              </View>
              <KelurahanAbjList data={abjPerKelurahan} />
            </View>
          </>
        )}
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  logoutIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  submitCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  submitCtaIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitCtaTitle: { color: COLORS.cardBg, fontSize: 14.5, fontWeight: '700' },
  submitCtaSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 2 },
  infoCtaRow: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 24,
},
infoCtaCard: {
  flex: 1,
  backgroundColor: COLORS.cardBg,
  borderRadius: 16,
  padding: 14,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 1,
},
infoCtaIconWrapper: {
  width: 34,
  height: 34,
  borderRadius: 17,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
},
infoCtaTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
infoCtaSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: { color: COLORS.cardBg, fontSize: 20, fontWeight: '700' },
  heroGreeting: { fontSize: 12, color: COLORS.textSecondary },
  heroName: { fontSize: 17, fontWeight: '700', color: COLORS.textDark, marginTop: 1 },
  heroText: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 4, lineHeight: 17 },

  loadingIndicator: { marginVertical: 40 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  yearBadge: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  yearBadgeText: { fontSize: 11.5, fontWeight: '700', color: COLORS.accent },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  chartCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  chartIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCardTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textDark },
  chart: { borderRadius: 16 },

  emptyWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    gap: 8,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 12.5, textAlign: 'center' },
});