import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ItemAbj } from '../types/abj';

interface Props {
  items: ItemAbj[];
  onChange: (items: ItemAbj[]) => void;
}

const emptyItem = (): ItemAbj => ({
  nama_kepala_keluarga: '',
  penampungan_berjentik: '0',
  penampungan_tidak_berjentik: '0',
});

export default function ItemsAbjRepeater({ items, onChange }: Props) {
  const updateItem = (index: number, field: keyof ItemAbj, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
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
        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <Text style={styles.addButtonText}>+ Tambah</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 && (
        <Text style={styles.emptyText}>
          Belum ada data, tap &quot;+ Tambah&quot; untuk menambahkan.
        </Text>
      )}

      {items.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          <View style={styles.itemHeaderRow}>
            <Text style={styles.itemIndex}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => removeItem(index)}>
              <Text style={styles.removeText}>Hapus</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nama Kepala Keluarga</Text>
          <TextInput
            style={styles.input}
            placeholder="Nama kepala keluarga"
            value={item.nama_kepala_keluarga}
            onChangeText={(text) => updateItem(index, 'nama_kepala_keluarga', text)}
          />

          <Text style={styles.label}>Penampungan Berjentik</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={item.penampungan_berjentik}
            onChangeText={(text) => updateItem(index, 'penampungan_berjentik', text)}
          />

          <Text style={styles.label}>Penampungan Tidak Berjentik</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={item.penampungan_tidak_berjentik}
            onChangeText={(text) => updateItem(index, 'penampungan_tidak_berjentik', text)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyText: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemIndex: { fontWeight: '700', color: '#334155' },
  removeText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  label: { fontSize: 12, color: '#64748b', marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
});