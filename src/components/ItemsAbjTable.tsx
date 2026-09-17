import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  accentDark: '#008B92',
  accentSoft: 'rgba(0, 173, 181, 0.10)',
  violet: '#7C5CFC',
  violetSoft: 'rgba(124, 92, 252, 0.10)',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16, 185, 129, 0.12)',
  rose: '#F43F5E',
  roseSoft: 'rgba(244, 63, 94, 0.10)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  border: '#E6E9ED',
  rowAlt: '#FAFBFC',
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

function sanitizeNumeric(text: string) {
  const digitsOnly = text.replace(/[^0-9]/g, '');
  return digitsOnly.replace(/^0+(?=\d)/, '');
}

// Lebar tetap untuk setiap kolom non-flex, plus minimum yang wajar untuk
// kolom "nama". Dipakai untuk menentukan lebar ScrollView horizontal agar
// header dan body selalu sejajar dan tidak terhimpit di layar sempit.
const COL = {
  no: 34,
  name: 130,
  num: 64,
  action: 40,
};

const ROW_HORIZONTAL_PADDING = 16;
const TABLE_MIN_WIDTH =
  COL.no + COL.name + COL.num * 2 + COL.action + ROW_HORIZONTAL_PADDING;

export default function ItemsAbjTable({ items, onChange, showTitle = true }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [berjentik, setBerjentik] = useState('0');
  const [tidakBerjentik, setTidakBerjentik] = useState('0');
  const [keterangan, setKeterangan] = useState('');
  const [nameError, setNameError] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editKeterangan, setEditKeterangan] = useState('');

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
    setKeterangan('');
    setNameError(false);
    setModalVisible(true);
  };

  const submitModal = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    onChange([...items, {
      ...emptyItem(),
      nama_kepala_keluarga: name.trim(),
      penampungan_berjentik: berjentik || '0',
      penampungan_tidak_berjentik: tidakBerjentik || '0',
      keterangan: keterangan.trim() || undefined,
    }]);
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

  const openEditKeterangan = (index: number) => {
    setEditKeterangan(items[index]?.keterangan ?? '');
    setEditIndex(index);
  };

  const saveKeterangan = () => {
    if (editIndex === null) return;
    const next = [...items];
    next[editIndex] = {
      ...next[editIndex],
      keterangan: editKeterangan.trim() || undefined,
    };
    onChange(next);
    setEditIndex(null);
    setEditKeterangan('');
  };

  const cancelEditKeterangan = () => {
    setEditIndex(null);
    setEditKeterangan('');
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
        <TouchableOpacity style={styles.addButton} onPress={openModal} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color={COLORS.cardBg} />
          <Text style={styles.addButtonText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableCard}>
        {/*
          Header dan body berbagi SATU ScrollView horizontal supaya kolom
          tidak pernah bergeser dan tabel bisa digeser ke samping alih-alih
          terhimpit di layar sempit.
        */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={items.length > 0}
          contentContainerStyle={{ minWidth: TABLE_MIN_WIDTH, width: '100%' }}
        >
          <View style={{ flex: 1 }}>
            {/* Table header */}
            <View style={[styles.row, styles.headerRowTable]}>
              <Text style={[styles.cellNo, styles.headerText]}>No</Text>
              <Text style={[styles.cellName, styles.headerText]}>Nama Kepala Keluarga</Text>
              <Text style={[styles.cellNum, styles.headerText]}>Berjentik</Text>
              <Text style={[styles.cellNum, styles.headerText]}>Bebas</Text>
              <View style={styles.cellAction} />
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconWrapper}>
                  <Ionicons name="people-outline" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.emptyTitle}>Belum ada data</Text>
                <Text style={styles.emptyText}>
                  Tap &quot;Tambah&quot; untuk memasukkan kepala keluarga pertama.
                </Text>
              </View>
            ) : (
              <View>
                {items.map((item, index) => (
                  <View key={index} style={index % 2 === 1 ? styles.rowGroupAlt : undefined}>
                    <View style={styles.row}>
                      <Text style={[styles.cellNo, styles.cellText]}>{index + 1}</Text>
                      <TextInput
                        style={[styles.cellName, styles.cellInput]}
                        placeholder="Nama KK"
                        placeholderTextColor="#9aa0a6"
                        value={item.nama_kepala_keluarga}
                        onChangeText={(text) => updateItem(index, 'nama_kepala_keluarga', text)}
                      />
                      <TextInput
                        style={[styles.cellNum, styles.cellInput, styles.cellInputDanger]}
                        placeholder="0"
                        placeholderTextColor="#9aa0a6"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={item.penampungan_berjentik}
                        onChangeText={(text) => updateNumeric(index, 'penampungan_berjentik', text)}
                      />
                      <TextInput
                        style={[styles.cellNum, styles.cellInput, styles.cellInputSafe]}
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
                        <View style={styles.deleteIconWrapper}>
                          <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.noteRow}>
                      <View style={styles.noteSpacer}>
                        {editIndex === index ? (
                          <View>
                            <TextInput
                              style={styles.noteInput}
                              placeholder="Masukkan keterangan"
                              placeholderTextColor="#9aa0a6"
                              value={editKeterangan}
                              onChangeText={setEditKeterangan}
                              multiline
                              textAlignVertical="top"
                            />
                            <View style={styles.noteActions}>
                              <TouchableOpacity
                                style={styles.noteActionGhost}
                                onPress={cancelEditKeterangan}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.noteActionGhostText}>Batal</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.noteActionPrimary}
                                onPress={saveKeterangan}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="checkmark" size={14} color={COLORS.cardBg} />
                                <Text style={styles.noteActionPrimaryText}>Simpan</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => openEditKeterangan(index)}
                            activeOpacity={0.6}
                            style={styles.noteButton}
                          >
                            {item.keterangan && item.keterangan.trim() ? (
                              <Text style={styles.noteText} numberOfLines={3}>
                                {item.keterangan.trim()}
                              </Text>
                            ) : (
                              <Text style={styles.notePlaceholder}>Tidak ada keterangan</Text>
                            )}
                            <Ionicons name="create-outline" size={13} color={COLORS.accent} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))}

                {/* Total row */}
                <View style={[styles.row, styles.totalRow]}>
                  <View style={styles.cellNo} />
                  <Text style={[styles.cellName, styles.totalText]}>Total</Text>
                  <Text style={[styles.cellNum, styles.totalText, { color: COLORS.rose }]}>
                    {totalBerjentik}
                  </Text>
                  <Text style={[styles.cellNum, styles.totalText, { color: COLORS.emerald }]}>
                    {totalTidakBerjentik}
                  </Text>
                  <View style={styles.cellAction} />
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable style={styles.modalSheet}>
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tambah Kepala Keluarga</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
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
                  {nameError && <Text style={styles.modalErrorText}>Nama wajib diisi.</Text>}

                  <View style={styles.modalNumRow}>
                    <View style={styles.modalNumCol}>
                      <View style={styles.modalLabelRow}>
                        <View style={[styles.dot, { backgroundColor: COLORS.rose }]} />
                        <Text style={styles.modalLabel}>Berjentik</Text>
                      </View>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="0"
                        placeholderTextColor="#9aa0a6"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={berjentik}
                        onChangeText={(text) => setBerjentik(sanitizeNumeric(text))}
                      />
                    </View>
                    <View style={styles.modalNumCol}>
                      <View style={styles.modalLabelRow}>
                        <View style={[styles.dot, { backgroundColor: COLORS.emerald }]} />
                        <Text style={styles.modalLabel}>Tidak Berjentik</Text>
                      </View>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="0"
                        placeholderTextColor="#9aa0a6"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={tidakBerjentik}
                        onChangeText={(text) => setTidakBerjentik(sanitizeNumeric(text))}
                      />
                    </View>
                  </View>

                  <Text style={styles.modalLabel}>Keterangan</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextarea]}
                    placeholder="Masukkan keterangan (opsional)"
                    placeholderTextColor="#9aa0a6"
                    value={keterangan}
                    onChangeText={setKeterangan}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalBtn} onPress={submitModal} activeOpacity={0.85}>
                    <View style={styles.modalBtnIcon}>
                      <Ionicons name="add" size={15} color={COLORS.cardBg} />
                    </View>
                    <Text style={styles.modalBtnText}>Tambahkan</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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

  /* ---------- Tabel ---------- */
  tableCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  rowGroupAlt: { backgroundColor: COLORS.rowAlt },
  headerRowTable: {
    backgroundColor: COLORS.accent,
    paddingVertical: 11,
  },
  headerText: {
    color: COLORS.cardBg,
    fontWeight: '700',
    fontSize: 11.5,
    textAlign: 'center',
  },

  // Setiap kolom membawa textAlign-nya sendiri, dan sel header memakai
  // base style yang SAMA dengan sel data, jadi selalu sejajar kolom demi kolom.
  cellNo: {
    width: COL.no,
    fontSize: 12.5,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  cellName: {
    flex: 1,
    minWidth: COL.name,
    fontSize: 13,
    color: COLORS.textDark,
    textAlign: 'left',
    paddingHorizontal: 4,
  },
  cellNum: {
    width: COL.num,
    fontSize: 13,
    color: COLORS.textDark,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  cellText: { fontWeight: '700' },
  cellInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cellInputDanger: { backgroundColor: COLORS.roseSoft, borderColor: 'transparent', fontWeight: '700' },
  cellInputSafe: { backgroundColor: COLORS.emeraldSoft, borderColor: 'transparent', fontWeight: '700' },
  cellAction: {
    width: COL.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---------- Keterangan ---------- */
  noteRow: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  noteSpacer: { marginLeft: COL.no + 4 },
  noteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  noteInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: COLORS.textDark,
    minHeight: 44,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  noteActionGhost: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.inputBg,
  },
  noteActionGhostText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  noteActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  noteActionPrimaryText: { fontSize: 12, color: COLORS.cardBg, fontWeight: '700' },
  noteText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  notePlaceholder: { flex: 1, fontSize: 12, color: '#b0b8c1', fontStyle: 'italic' },

  /* ---------- Total ---------- */
  totalRow: {
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 12,
  },
  totalText: { fontWeight: '800', color: COLORS.textDark, fontSize: 13 },

  /* ---------- Empty ---------- */
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 24,
    minWidth: TABLE_MIN_WIDTH,
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

  /* ---------- Modal ---------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalSheet: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    width: '100%',
    maxWidth: 480,
    paddingTop: 10,
    paddingBottom: 20,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDE1E6',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  modalBody: { paddingHorizontal: 20, paddingTop: 4 },
  modalLabel: { fontSize: 11.5, color: COLORS.textMuted, marginBottom: 5, marginTop: 10 },
  modalInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textDark,
  },
  modalTextarea: { minHeight: 76, paddingTop: 10 },
  modalInputError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerSoft },
  modalErrorText: { color: COLORS.danger, fontSize: 11.5, marginTop: 5 },
  modalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  modalNumRow: { flexDirection: 'row', gap: 10 },
  modalNumCol: { flex: 1 },
  modalFooter: { paddingHorizontal: 20, paddingTop: 18 },
  modalBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  modalBtnIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { color: COLORS.cardBg, fontWeight: '700', fontSize: 14.5 },
});