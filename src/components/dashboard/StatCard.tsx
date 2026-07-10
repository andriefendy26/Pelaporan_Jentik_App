import { StyleSheet, Text, View } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  accent?: string;
}

export default function StatCard({ label, value, accent = '#2563eb' }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 12, color: '#64748b', marginTop: 4 },
});