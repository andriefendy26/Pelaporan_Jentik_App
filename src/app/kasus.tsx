import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useEffect} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import { kasusService } from '../services/Jentikservice';
import { Kasus } from '../types/kasus';
import { useAuth } from '../services/Context/AuthContext';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.1)',
  danger: '#dc2626',
  dangerBg: '#fdecea',
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

export default function KasusScreen() {
  const router = useRouter();

  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const { user } = useAuth();

  useEffect(() => {
    console.log(user);
}, [])

  const [data, setData] = useState<Kasus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isFuturePeriod =
    tahun > now.getFullYear() || (tahun === now.getFullYear() && bulan > now.getMonth() + 1);

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
          <Text style={styles.title}>Kasus DBD</Text>
          <Text style={styles.subtitle}>{data.length} kasus tercatat</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/kasus-form')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={COLORS.cardBg} />
          <Text style={styles.addButtonText}>Tambah</Text>
        </TouchableOpacity>
      </View>

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

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="medkit-outline" size={32} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada kasus</Text>
            <Text style={styles.emptyText}>
              Belum ada kasus DBD tercatat untuk {BULAN_NAMA[bulan - 1]} {tahun}.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardBody}
              onPress={() => router.push(`/kasus-form?id=${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.cardTextWrapper}>
                <Text style={styles.cardName}>{item.nama_penderita}</Text>
                <Text style={styles.cardSubtitle}>{formatTanggal(item.tanggal_penderita)}</Text>
                <Text style={styles.cardLocation}>
                  {item.rt?.name ?? '-'}, {item.kelurahan?.name ?? '-'}
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

  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
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

  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 110 },
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
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },

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
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  cardSubtitle: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  cardLocation: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 1 },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    backgroundColor: COLORS.dangerBg,
  },
});