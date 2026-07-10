import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ItemAbj } from '../types/abj';

const COLORS = {
  cardBg: '#FFFFFF',
  bg: '#F7F8F9',
  textDark: '#222831',
  textSecondary: '#64748b',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.1)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  border: '#e2e8f0',
};

interface Props {
  items: ItemAbj[];
  onChange: (items: ItemAbj[]) => void;
}

const emptyItem = (): ItemAbj => ({
  nama_kepala_keluarga: '',
  penampungan_berjentik: '0',
  penampungan_tidak_berjentik: '0',
});

// Hanya izinkan digit 0-9
function sanitizeNumeric(text: string) {
  return text.replace(/[^0-9]/g, '');
}

export default function ItemsAbjRepeater({ items, onChange }: Props) {
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
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Data Kepala Keluarga</Text>
        <TouchableOpacity style={styles.addButton} onPress={addItem} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color={COLORS.cardBg} />
          <Text style={styles.addButtonText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 && (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={22} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            Belum ada data, tap &quot;Tambah&quot; untuk menambahkan.
          </Text>
        </View>
      )}

      {items.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          <View style={styles.itemHeaderRow}>
            <View style={styles.itemIndexBadge}>
              <Text style={styles.itemIndexText}>#{index + 1}</Text>
            </View>
            <TouchableOpacity
              onPress={() => removeItem(index)}
              style={styles.removeButton}
              hitSlop={8}
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
                <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.label}>Berjentik</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#9aa0a6"
                keyboardType="number-pad"
                maxLength={5}
                value={item.penampungan_berjentik}
                onChangeText={(text) =>
                  updateNumericItem(index, 'penampungan_berjentik', text)
                }
              />
            </View>

            <View style={styles.numericCol}>
              <View style={styles.labelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
                <Text style={styles.label}>Tidak Berjentik</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#9aa0a6"
                keyboardType="number-pad"
                maxLength={5}
                value={item.penampungan_tidak_berjentik}
                onChangeText={(text) =>
                  updateNumericItem(index, 'penampungan_tidak_berjentik', text)
                }
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addButtonText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 13 },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  itemCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemIndexBadge: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  itemIndexText: { fontWeight: '700', color: COLORS.accent, fontSize: 12 },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  removeText: { color: COLORS.danger, fontWeight: '600', fontSize: 12 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textDark,
  },
  numericRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  numericCol: {
    flex: 1,
  },
});