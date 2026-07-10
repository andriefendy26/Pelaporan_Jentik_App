import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { abjService } from '../services/Jentikservice';
import { FormAbj } from '../types/abj';

const COLORS = {
  bg: '#EEEEEE',
  cardBg: '#FFFFFF',
  textDark: '#222831',
  textSecondary: '#393E46',
  accent: '#00ADB5',
  danger: '#dc2626',
  dangerBg: '#fdecea',
};

function formatTanggal(tanggal: string) {
  try {
    const date = new Date(tanggal);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return tanggal;
  }
}

export default function LaporanScreen() {
  const router = useRouter();
  const [data, setData] = useState<FormAbj[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const response = await abjService.getAll();
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
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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
          <Text style={styles.title}>Laporan ABJ</Text>
          <Text style={styles.subtitle}>{data.length} laporan tercatat</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/laporan-form')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={COLORS.cardBg} />
          <Text style={styles.addButtonText}>Tambah</Text>
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
              <Ionicons name="document-text-outline" size={32} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada laporan</Text>
            <Text style={styles.emptyText}>
              Tap tombol &quot;Tambah&quot; di atas untuk membuat laporan pertamamu.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardBody}
              onPress={() => router.push(`/laporan-form?id=${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconWrapper}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.cardTextWrapper}>
                <Text style={styles.cardDate}>{formatTanggal(item.tanggal_pemeriksaan)}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.items_abj?.length ?? 0} data kepala keluarga
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
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110 },
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
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
  cardDate: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  cardSubtitle: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    backgroundColor: COLORS.dangerBg,
  },
});