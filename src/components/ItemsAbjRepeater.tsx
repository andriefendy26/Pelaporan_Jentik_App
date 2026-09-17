import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ItemAbj } from '../types/abj';

/** Token visual disamakan dengan HomeScreen. */
const COLORS = {
  cardBg: '#FFFFFF',
  bg: '#F4F6F8',
  inputBg: '#F7F9FA',
  textDark: '#222831',
  textSecondary: '#393E46',
  textMuted: '#7A828C',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.10)',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16, 185, 129, 0.12)',
  rose: '#F43F5E',
  roseSoft: 'rgba(244, 63, 94, 0.10)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  border: '#E6E9ED',
};

interface Props {
  items: ItemAbj[];
  onChange: (items: ItemAbj[]) => void;
  /** Set false kalau layar induk sudah punya judul sendiri. */
  showTitle?: boolean;
}

const emptyItem = (): ItemAbj => ({
  nama_kepala_keluarga: '',
  penampungan_berjentik: '0',
  penampungan_tidak_berjentik: '0',
});

/**
 * Hanya izinkan digit 0-9 dan hapus angka nol di depan:
 * "007" -> "7", "01" -> "1", tapi "0" tunggal tetap "0".
 */
function sanitizeNumeric(text: string) {
  const digitsOnly = text.replace(/[^0-9]/g, '');
  return digitsOnly.replace(/^0+(?=\d)/, '');
}

export default function ItemsAbjRepeater({ items, onChange, showTitle = true }: Props) {
  const updateItem = (index: number, field: keyof ItemAbj, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const updateNumericItem = (index: number, field: keyof ItemAbj, value: string) => {
    updateItem(index, field, sanitizeNumeric(value));
  };

  const addItem = () => {
    onChange([...items, emptyItem()]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, !showTitle && styles.headerRowEnd]}>
        {showTitle && (
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Data Kepala Keluarga</Text>
          </View>
        )}
        <TouchableOpacity style={styles.addButton} onPress={addItem} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color={COLORS.cardBg} />
          <Text style={styles.addButtonText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="people-outline" size={24} color={COLORS.accent} />
          </View>
          <Text style={styles.emptyTitle}>Belum ada data</Text>
          <Text style={styles.emptyText}>
            Tap &quot;Tambah&quot; untuk memasukkan kepala keluarga pertama.
          </Text>
        </View>
      )}

      {items.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          <View style={styles.itemHeaderRow}>
            <View style={styles.itemIndexBadge}>
              <Text style={styles.itemIndexText}>{index + 1}</Text>
            </View>
            <Text style={styles.itemHeaderLabel}>Kepala keluarga</Text>
            <TouchableOpacity
              onPress={() => removeItem(index)}
              style={styles.removeButton}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
              <Text style={styles.removeText}>Hapus</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nama Kepala Keluarga</Text>
          <TextInput
            style={styles.input}
            placeholder="Nama kepala keluarga"
            placeholderTextColor="#9aa0a6"
            value={item.nama_kepala_keluarga}
            onChangeText={(text) => updateItem(index, 'nama_kepala_keluarga', text)}
          />

          <View style={styles.numericRow}>
            <View style={styles.numericCol}>
              <View style={styles.labelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.rose }]} />
                <Text style={styles.label}>Berjentik</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputDanger]}
                placeholder="0"
                placeholderTextColor="#9aa0a6"
                keyboardType="number-pad"
                maxLength={5}
                value={item.penampungan_berjentik}
                onChangeText={(text) => updateNumericItem(index, 'penampungan_berjentik', text)}
              />
            </View>

            <View style={styles.numericCol}>
              <View style={styles.labelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.emerald }]} />
                <Text style={styles.label}>Tidak Berjentik</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputSafe]}
                placeholder="0"
                placeholderTextColor="#9aa0a6"
                keyboardType="number-pad"
                maxLength={5}
                value={item.penampungan_tidak_berjentik}
                onChangeText={(text) => updateNumericItem(index, 'penampungan_tidak_berjentik', text)}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },

  /* ---------- Header ---------- */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerRowEnd: { justifyContent: 'flex-end' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.accent },
  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.textDark },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 13 },

  /* ---------- Empty ---------- */
  emptyCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 30,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  emptyIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  emptyText: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },

  /* ---------- Kartu item ---------- */
  itemCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  itemIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIndexText: { fontWeight: '800', color: COLORS.accent, fontSize: 12.5 },
  itemHeaderLabel: { flex: 1, fontSize: 12, color: COLORS.textMuted },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  removeText: { color: COLORS.danger, fontWeight: '700', fontSize: 12 },

  /* ---------- Field ---------- */
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11.5, color: COLORS.textMuted, marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
  },
  inputDanger: { backgroundColor: COLORS.roseSoft, borderColor: 'transparent', fontWeight: '700' },
  inputSafe: { backgroundColor: COLORS.emeraldSoft, borderColor: 'transparent', fontWeight: '700' },
  numericRow: { flexDirection: 'row', gap: 10 },
  numericCol: { flex: 1 },
});