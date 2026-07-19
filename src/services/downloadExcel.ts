import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Terima ArrayBuffer hasil response axios (responseType: 'arraybuffer'), tulis
 * langsung ke file di cache directory pakai API expo-file-system v18 (File + Paths),
 * lalu buka share sheet supaya user bisa simpan/kirim filenya.
 *
 * Catatan: XMLHttpRequest di React Native TIDAK mendukung responseType 'blob',
 * jadi kita pakai 'arraybuffer' dan tulis sebagai Uint8Array (bukan base64).
 */
export async function downloadAndShareExcel(data: ArrayBuffer, filename: string) {
  try {
    const file = new File(Paths.cache, filename);

    file.write(new Uint8Array(data));

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: filename,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      Alert.alert('Berhasil diunduh', `File tersimpan di:\n${file.uri}`);
    }
  } catch (error) {
    console.error('Gagal download excel:', error);
    Alert.alert('Gagal', 'Tidak bisa mengunduh file Excel. Coba lagi.');
  }
}
