import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string | number;
  accent: string;
  /** warna latar lembut untuk ikon & garis aksen (opsional) */
  tint?: string;
  /** nama ikon Ionicons (opsional) */
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function StatCard({ label, value, accent, tint, icon }: Props) {
  const softTint = tint ?? 'rgba(0,0,0,0.05)';

  return (
    <View style={styles.card}>
      {/* <View style={[styles.accentBar, { backgroundColor: accent }]} /> */}

      <View style={styles.topRow}>
        {icon ? (
          <View style={[styles.iconWrapper, { backgroundColor: softTint }]}>
            <Ionicons name={icon} size={16} color={accent} />
          </View>
        ) : null}
      </View>

      <Text style={[styles.value, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6E9ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  topRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11.5, color: '#7A828C', marginTop: 3, lineHeight: 15 },
});