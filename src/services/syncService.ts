import { abjService } from './Jentikservice';
import { getQueue, removeFromQueue, updateQueueItemError } from './offlineQueue';

let isSyncing = false;

type SyncStatus = { pendingCount: number; needsReauth: boolean };
type Listener = (status: SyncStatus) => void;
const listeners: Listener[] = [];

let needsReauth = false;

export function subscribeSync(listener: Listener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

async function notify() {
  const queue = await getQueue();
  listeners.forEach((l) => l({ pendingCount: queue.length, needsReauth }));
}

function isNetworkError(error: any) {
  return !error?.response;
}

function isAuthError(error: any) {
  return error?.response?.status === 401;
}

export async function syncPendingLaporan(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;
  needsReauth = false;

  try {
    const queue = await getQueue();

    for (const item of queue) {
      try {
        if (item.type === 'update' && item.serverId) {
          await abjService.update(item.serverId, item.payload);
        } else {
          await abjService.create(item.payload);
        }
        await removeFromQueue(item.localId);
        synced += 1;
      } catch (error: any) {
        failed += 1;

        if (isAuthError(error)) {
          // sesi habis -> hentikan sync, JANGAN hapus antrean, tunggu login ulang
          needsReauth = true;
          break;
        }
        if (isNetworkError(error)) {
          break; // masih offline, coba lagi nanti
        }
        await updateQueueItemError(
          item.localId,
          error?.response?.data?.message ?? 'Gagal disinkronkan'
        );
      }
    }
  } finally {
    isSyncing = false;
    await notify();
  }

  return { synced, failed };
}

// dipakai layar laporan.tsx untuk baca status terkini tanpa nunggu sync jalan
export async function getSyncStatus(): Promise<SyncStatus> {
  const queue = await getQueue();
  return { pendingCount: queue.length, needsReauth };
}