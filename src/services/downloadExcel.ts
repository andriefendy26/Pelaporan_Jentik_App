import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Terima response axios dengan responseType: 'blob', simpan ke file system,
 * lalu buka share sheet supaya user bisa simpan/kirim filenya.
 */
export async function downloadAndShareExcel(blob: Blob, filename: string) {
  try {
    const base64Data: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // buang prefix "data:...;base64,"
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const fileUri = FileSystem.cacheDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: filename,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      Alert.alert('Berhasil diunduh', `File tersimpan di:\n${fileUri}`);
    }
  } catch (error) {
    console.error('Gagal download excel:', error);
    Alert.alert('Gagal', 'Tidak bisa mengunduh file Excel. Coba lagi.');
  }
}