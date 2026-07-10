import { StyleSheet, Text, View } from 'react-native';
import { KelurahanAbj } from '../../types/dashboard';

export default function KelurahanAbjList({ data }: { data: KelurahanAbj[] }) {
  if (!data || data.length === 0) {
    return <Text style={styles.emptyText}>Belum ada data ABJ per kelurahan.</Text>;
  }

  return (
    <View>
      {data.map((item) => (
        <View key={item.id_kelurahan} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowLabel}>{item.nama_kelurahan}</Text>
            <Text style={styles.rowValue}>{item.abj_persen}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.min(item.abj_persen, 100)}%` }]} />
          </View>
          <Text style={styles.rowCaption}>{item.total_rumah} rumah diperiksa</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 16 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowLabel: { fontSize: 13, color: '#334155', fontWeight: '600' },
  rowValue: { fontSize: 13, color: '#2563eb', fontWeight: '700' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  rowCaption: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});