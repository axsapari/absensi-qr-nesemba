import { Absensi, Siswa, Kelas, LogNotifikasiWA, SupabaseConfig, SyncStatusInfo } from '../types';
import { getSupabaseClient } from './supabase';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  message: string;
  timestamp: string;
  error?: string;
}

// Lightweight ping to check real internet connectivity
export async function checkInternetConnectivity(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    // Quick head/get check with strict 3 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(window.location.origin + '/favicon.ico?_t=' + Date.now(), {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return response.ok || response.status === 304 || response.status < 500;
  } catch {
    // If the local fetch failed, fallback to navigator.onLine
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}

// Main sync processor
export async function processSyncToDatabase(
  absensiList: Absensi[],
  supabaseConfig: SupabaseConfig,
  isSimulatedOffline: boolean
): Promise<{
  updatedAbsensiList: Absensi[];
  result: SyncResult;
}> {
  const nowStr = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' WIB';

  // If in simulated offline mode or device is offline
  if (isSimulatedOffline) {
    return {
      updatedAbsensiList: absensiList,
      result: {
        success: false,
        syncedCount: 0,
        message: 'Mode Simulasi Offline aktif. Sinkronisasi ditangguhkan.',
        timestamp: nowStr,
        error: 'Offline simulation active',
      },
    };
  }

  const isTrulyOnline = await checkInternetConnectivity();
  if (!isTrulyOnline) {
    return {
      updatedAbsensiList: absensiList,
      result: {
        success: false,
        syncedCount: 0,
        message: 'Koneksi internet tidak tersedia. Data tetap tersimpan aman di perangkat.',
        timestamp: nowStr,
        error: 'Internet disconnected',
      },
    };
  }

  // Find all absensi that have not been marked as synced
  const pendingItems = absensiList.filter((a) => !a.synced);

  if (pendingItems.length === 0) {
    return {
      updatedAbsensiList: absensiList,
      result: {
        success: true,
        syncedCount: 0,
        message: 'Semua data sudah tersinkron penuh dengan database.',
        timestamp: nowStr,
      },
    };
  }

  // Check if remote Supabase database is configured
  const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  if (!isSupabaseConfigured) {
    return {
      updatedAbsensiList: absensiList,
      result: {
        success: true,
        syncedCount: 0,
        message: 'Supabase belum dikonfigurasi. Data tersimpan lokal saja di perangkat ini.',
        timestamp: nowStr,
      },
    };
  }

  const supabase = getSupabaseClient(supabaseConfig);

  if (!supabase) {
    return {
      updatedAbsensiList: absensiList,
      result: {
        success: false,
        syncedCount: 0,
        message: `Gagal terhubung ke Supabase. ${pendingItems.length} data tetap aman di perangkat, akan dicoba lagi otomatis.`,
        timestamp: nowStr,
        error: 'Supabase client tidak dapat diinisialisasi',
      },
    };
  }

  // Map pending absensi to Supabase schema columns
  const recordsToInsert = pendingItems.map((item) => ({
    id: item.id.startsWith('abs_') ? undefined : item.id, // let supabase generate uuid or retain if valid
    siswa_id: item.siswa_id,
    tanggal: item.tanggal,
    waktu_scan: item.waktu_scan,
    timestamp: item.timestamp,
    jenis: item.jenis,
    status: item.status,
    catatan: item.catatan || null,
  }));

  try {
    const { error } = await supabase.from('absensi').upsert(recordsToInsert, {
      onConflict: 'siswa_id,tanggal,jenis',
    });

    if (error) {
      // GAGAL SUNGGUHAN -- item TETAP ditandai belum synced supaya dicoba lagi di percobaan berikutnya,
      // dan pesan errornya ditampilkan APA ADANYA supaya bisa didiagnosis (bukan disembunyikan)
      return {
        updatedAbsensiList: absensiList,
        result: {
          success: false,
          syncedCount: 0,
          message: `Sinkronisasi gagal, ${pendingItems.length} data belum tersimpan ke server: ${error.message}`,
          timestamp: nowStr,
          error: error.message,
        },
      };
    }

    // BERHASIL SUNGGUHAN -- baru sekarang tandai item yang barusan terkirim sebagai synced
    const syncedIds = new Set(pendingItems.map((item) => item.id));
    const nowIso = new Date().toISOString();
    const updatedAbsensiList = absensiList.map((item) =>
      syncedIds.has(item.id) ? { ...item, synced: true, synced_at: nowIso } : item
    );

    return {
      updatedAbsensiList,
      result: {
        success: true,
        syncedCount: pendingItems.length,
        message: `Berhasil menyinkronkan ${pendingItems.length} data presensi ke database.`,
        timestamp: nowStr,
      },
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Kesalahan tak terduga saat menyinkronkan data';
    return {
      updatedAbsensiList: absensiList,
      result: {
        success: false,
        syncedCount: 0,
        message: `Sinkronisasi gagal, ${pendingItems.length} data belum tersimpan ke server: ${errMsg}`,
        timestamp: nowStr,
        error: errMsg,
      },
    };
  }
}
