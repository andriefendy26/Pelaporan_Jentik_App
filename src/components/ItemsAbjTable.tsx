import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ItemAbj } from '../types/abj';

const COLORS = {
  cardBg: '#FFFFFF',
  bg: '#F7F8F9',
  headerBg: '#00ADB5',
  textDark: '#222831',
  textSecondary: '#64748b',
  accent: '#00ADB5',
  accentSoft: 'rgba(0, 173, 181, 0.1)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  rowAlt: '#f9fafb',
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

function sanitizeNumeric(text: string) {
  const digitsOnly = text.replace(/[^0-9]/g, '');
  return digitsOnly.replace(/^0+(?=\d)/, '');
}

const COL = {
  no: 34,
  name: 0, // flex
  num: 64,
  action: 40,
};

export default function ItemsAbjTable({ items, onChange }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [berjentik, setBerjentik] = useState('0');
  const [tidakBerjentik, setTidakBerjentik] = useState('0');
  const [nameError, setNameError] = useState(false);

  const totalBerjentik = items.reduce(
    (sum, i) => sum + (Number(i.penampungan_berjentik) || 0),
    0
  );
  const totalTidakBerjentik = items.reduce(
    (sum, i) => sum + (Number(i.penampungan_tidak_berjentik) || 0),
    0
  );

  const openModal = () => {
    setName('');
    setBerjentik('0');
    setTidakBerjentik('0');
    setNameError(false);
    setModalVisible(true);
  };

  const submitModal = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    onChange([...items, { ...emptyItem(), nama_kepala_keluarga: name.trim(), penampungan_berjentik: berjentik || '0', penampungan_tidak_berjentik: tidakBerjentik || '0' }]);
    setModalVisible(false);
  };

  const updateItem = (index: number, field: keyof ItemAbj, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const updateNumeric = (index: number, field: keyof ItemAbj, value: string) => {
    updateItem(index, field, sanitizeNumeric(value));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Data Kepala Keluarga</Text>
        <TouchableOpacity style={styles.addButton} onPress={openModal} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color={COLORS.cardBg} />
          <Text style={styles.addButtonText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableCard}>
        {/* Table header */}
        <View style={[styles.row, styles.headerRowTable]}>
          <Text style={[styles.cellNo, styles.headerText]}>No</Text>
          <Text style={[styles.cellName, styles.headerText]}>Nama Kepala Keluarga</Text>
          <Text style={[styles.cellNum, styles.headerText]}>Berjentik</Text>
          <Text style={[styles.cellNum, styles.headerText]}>Tdk</Text>
          <View style={styles.cellAction} />
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="grid-outline" size={22} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              Belum ada data. Tap &quot;Tambah&quot; untuk menambahkan kepala keluarga.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {items.map((item, index) => (
              <View
                key={index}
                style={[styles.row, index % 2 === 1 && styles.rowAlt]}
              >
                <Text style={[styles.cellNo, styles.cellText]}>{index + 1}</Text>
                <TextInput
                  style={[styles.cellName, styles.cellInput]}
                  placeholder="Nama KK"
                  placeholderTextColor="#9aa0a6"
                  value={item.nama_kepala_keluarga}
                  onChangeText={(text) => updateItem(index, 'nama_kepala_keluarga', text)}
                />
                <TextInput
                  style={[styles.cellNum, styles.cellInput, styles.cellCenter]}
                  placeholder="0"
                  placeholderTextColor="#9aa0a6"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={item.penampungan_berjentik}
                  onChangeText={(text) => updateNumeric(index, 'penampungan_berjentik', text)}
                />
                <TextInput
                  style={[styles.cellNum, styles.cellInput, styles.cellCenter]}
                  placeholder="0"
                  placeholderTextColor="#9aa0a6"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={item.penampungan_tidak_berjentik}
                  onChangeText={(text) => updateNumeric(index, 'penampungan_tidak_berjentik', text)}
                />
                <TouchableOpacity
                  style={styles.cellAction}
                  onPress={() => removeItem(index)}
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Total row */}
            <View style={[styles.row, styles.totalRow]}>
              <Text style={[styles.cellNo, styles.totalText]}>Σ</Text>
              <Text style={[styles.cellName, styles.totalText]}>Total</Text>
              <Text style={[styles.cellNum, styles.cellCenter, styles.totalText]}>
                {totalBerjentik}
              </Text>
              <Text style={[styles.cellNum, styles.cellCenter, styles.totalText]}>
                {totalTidakBerjentik}
              </Text>
              <View style={styles.cellAction} />
            </View>
          </ScrollView>
        )}
      </View>

      {/* Modal tambah kepala keluarga */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancel}>Batal</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Tambah Kepala Keluarga</Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Nama Kepala Keluarga</Text>
              <TextInput
                style={[styles.modalInput, nameError && styles.modalInputError]}
                placeholder="Masukkan nama"
                placeholderTextColor="#9aa0a6"
                value={name}
                autoFocus
                onChangeText={(text) => {
                  setName(text);
                  if (text.trim()) setNameError(false);
                }}
              />
              {nameError && (
                <Text style={styles.modalErrorText}>Nama wajib diisi.</Text>
              )}

              <View style={styles.modalNumRow}>
                <View style={styles.modalNumCol}>
                  <View style={styles.modalLabelRow}>
                    <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
                    <Text style={styles.modalLabel}>Berjentik</Text>
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0"
                    placeholderTextColor="#9aa0a6"
                    keyboardType="number-pad"
                    maxLength={5}
                    value={berjentik}
                    onChangeText={setBerjentik}
                  />
                </View>
                <View style={styles.modalNumCol}>
                  <View style={styles.modalLabelRow}>
                    <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
                    <Text style={styles.modalLabel}>Tidak Berjentik</Text>
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0"
                    placeholderTextColor="#9aa0a6"
                    keyboardType="number-pad"
                    maxLength={5}
                    value={tidakBerjentik}
                    onChangeText={setTidakBerjentik}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={submitModal}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={COLORS.cardBg} />
                <Text style={styles.modalBtnText}>Tambahkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  tableCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  scroll: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowAlt: { backgroundColor: COLORS.rowAlt },
  headerRowTable: {
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 0,
    paddingVertical: 10,
  },
  headerText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 11.5 },

  cellNo: { width: COL.no, fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'center' },
  cellName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    paddingHorizontal: 4,
  },
  cellNum: {
    width: COL.num,
    fontSize: 13,
    color: COLORS.textDark,
    paddingHorizontal: 2,
  },
  cellCenter: { textAlign: 'center' },
  cellText: { fontWeight: '600' },
  cellInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  cellAction: {
    width: COL.action,
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalRow: {
    backgroundColor: COLORS.accentSoft,
    borderBottomWidth: 0,
    paddingVertical: 10,
  },
  totalText: { fontWeight: '700', color: COLORS.textDark, fontSize: 12.5 },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 12.5, textAlign: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  modalCancel: { fontSize: 14, color: COLORS.textSecondary, width: 44 },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  modalLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, marginTop: 8 },
  modalInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textDark,
  },
  modalInputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
  },
  modalErrorText: { color: COLORS.danger, fontSize: 11.5, marginTop: 4 },
  modalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  modalNumRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  modalNumCol: { flex: 1 },
  modalFooter: { paddingHorizontal: 20, paddingTop: 16 },
  modalBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 13,
  },
  modalBtnPrimary: { width: '100%' },
  modalBtnText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 14 },
});
