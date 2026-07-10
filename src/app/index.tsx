import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import BottomNav from '../components/BottomNav';
import KelurahanAbjList from '../components/dashboard/KelurahanAbjList';
import StatCard from '../components/dashboard/StatCard';
import { useAuth } from '../services/Context/AuthContext';
import { dashboardService } from '../services/Jentikservice';
import { DashboardSummary, KelurahanAbj, MonthlyAbj, MonthlyRumah } from '../types/dashboard';

const screenWidth = Dimensions.get('window').width;
const BULAN_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
  propsForBackgroundLines: { stroke: '#e2e8f0' },
  style: { borderRadius: 16 },
};

export default function HomeScreen() {
  const { user, logout } = useAuth();

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.title}>Pelaporan Jentik</Text>
        <Text style={styles.subtitle}>Dashboard utama aplikasi</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selamat datang {user?.name ?? user?.username}!</Text>
          <Text style={styles.cardText}>
            Anda dapat melihat data laporan, dashboard, dan analisa dari sini.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={styles.loadingIndicator} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Overview {summary?.tahun ?? ''}</Text>
            <View style={styles.statGrid}>
              <StatCard label="Total Laporan" value={summary?.total_laporan ?? 0} />
              <StatCard label="Rumah Diperiksa" value={summary?.total_rumah_diperiksa ?? 0} accent="#16a34a" />
              <StatCard label="ABJ Keseluruhan" value={`${summary?.abj_persen ?? 0}%`} accent="#f59e0b" />
              <StatCard label="Kelurahan Tercakup" value={summary?.total_kelurahan_tercakup ?? 0} accent="#7c3aed" />
            </View>

            <Text style={styles.sectionTitle}>Rumah Diperiksa per Bulan</Text>
            <View style={styles.chartCard}>
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
                <Text style={styles.emptyText}>Belum ada data rumah diperiksa tahun ini.</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>ABJ per Bulan (%)</Text>
            <View style={styles.chartCard}>
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
                <Text style={styles.emptyText}>Belum ada data ABJ tahun ini.</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>ABJ per Kelurahan</Text>
            <View style={styles.chartCard}>
              <KelurahanAbjList data={abjPerKelurahan} />
            </View>
          </>
        )}

        <Pressable style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#0f172a' },
  cardText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  loadingIndicator: { marginVertical: 30 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12, marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  chart: { borderRadius: 16 },
  emptyText: { color: '#64748b', fontSize: 13, paddingVertical: 20 },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});