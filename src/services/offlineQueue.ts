import AsyncStorage from '@react-native-async-storage/async-storage';
import { ItemAbj } from '../types/abj';
import { abjService } from './Jentikservice';
type CreateArgs = Parameters<typeof abjService.create>;
export type PendingLaporanPayload = CreateArgs[0];

const QUEUE_KEY = 'pending_laporan_queue';

// export interface PendingLaporanPayload {
//   id_kelurahan: number | string;
//   id_rt: number | string;
//   tanggal_pemeriksaan: string;
//   ItemsABJ: ItemAbj[];
// }

export interface PendingLaporan {
  localId: string;
  type: 'create' | 'update';
  serverId?: string; // hanya untuk edit laporan yang sudah ada di server
  payload: PendingLaporanPayload;
  createdAt: string;
  lastError?: string;
}

function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function getQueue(): Promise<PendingLaporan[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingLaporan[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueLaporan(
  payload: PendingLaporanPayload,
  type: 'create' | 'update' = 'create',
  serverId?: string
): Promise<PendingLaporan> {
  const queue = await getQueue();
  const item: PendingLaporan = {
    localId: generateLocalId(),
    type,
    serverId,
    payload,
    createdAt: new Date().toISOString(),
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

export async function removeFromQueue(localId: string) {
  const queue = await getQueue();
  await saveQueue(queue.filter((item) => item.localId !== localId));
}

export async function updateQueueItemError(localId: string, message: string) {
  const queue = await getQueue();
  const next = queue.map((item) =>
    item.localId === localId ? { ...item, lastError: message } : item
  );
  await saveQueue(next);
}