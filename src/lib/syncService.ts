import { Absensi, LogNotifikasiWA, SupabaseConfig } from '../types';
import { getSupabaseClient } from './supabase';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  syncedLogCount: number;
  message: string;
  timestamp: string;
  error?: string;
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' WIB';
}

/**
 * Sync all pending attendance and WhatsApp log records.
 * IMPORTANT: `synced=true` is only assigned after Supabase confirms success.
 */
export async function processSyncToDatabase(
  absensiList: Absensi[],
  logNotifikasiList: LogNotifikasiWA[],
  supabaseConfig: SupabaseConfig,
  isSimulatedOffline: boolean
): Promise<{
  updatedAbsensiList: Absensi[];
  updatedLogNotifikasiList: LogNotifikasiWA[];
  result: SyncResult;
}> {
  const nowStr = nowTimeLabel();

  if (isSimulatedOffline) {
    return {
      updatedAbsensiList: absensiList,
      updatedLogNotifikasiList: logNotifikasiList,
      result: {
        success: false,
        syncedCount: 0,
        syncedLogCount: 0,
        message: 'Mode Simulasi Offline aktif. Sinkronisasi ditangguhkan.',
        timestamp: nowStr,
        error: 'Offline simulation active',
      },
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      updatedAbsensiList: absensiList,
      updatedLogNotifikasiList: logNotifikasiList,
      result: {
        success: false,
        syncedCount: 0,
        syncedLogCount: 0,
        message: 'Koneksi internet tidak tersedia. Data tetap tersimpan aman di perangkat.',
        timestamp: nowStr,
        error: 'Internet disconnected',
      },
    };
  }

  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    return {
      updatedAbsensiList: absensiList,
      updatedLogNotifikasiList: logNotifikasiList,
      result: {
        success: false,
        syncedCount: 0,
        syncedLogCount: 0,
        message: 'Supabase belum dikonfigurasi. Data tetap tersimpan lokal.',
        timestamp: nowStr,
        error: 'Supabase not configured',
      },
    };
  }

  const supabase = getSupabaseClient(supabaseConfig);
  if (!supabase) {
    return {
      updatedAbsensiList: absensiList,
      updatedLogNotifikasiList: logNotifikasiList,
      result: {
        success: false,
        syncedCount: 0,
        syncedLogCount: 0,
        message: 'Supabase client tidak dapat diinisialisasi.',
        timestamp: nowStr,
        error: 'Supabase client unavailable',
      },
    };
  }

  // Browser online does not guarantee an authenticated Supabase session.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    const errorMessage = sessionError?.message || 'Session Supabase tidak ditemukan.';
    return {
      updatedAbsensiList: absensiList,
      updatedLogNotifikasiList: logNotifikasiList,
      result: {
        success: false,
        syncedCount: 0,
        syncedLogCount: 0,
        message: `Belum dapat sinkron: ${errorMessage}`,
        timestamp: nowStr,
        error: errorMessage,
      },
    };
  }

  const pendingAbsensi = absensiList.filter((a) => !a.synced);
  const pendingLogs = logNotifikasiList.filter((log) => log.status_kirim === 'pending' || log.status_kirim === 'terkirim' || log.status_kirim === 'gagal');

  let updatedAbsensiList = absensiList;
  let syncedCount = 0;

  // 1) Attendance first because log_notifikasi_wa.absensi_id is an FK.
  if (pendingAbsensi.length > 0) {
    const recordsToInsert = pendingAbsensi.map((item) => ({
      id: item.id,
      siswa_id: item.siswa_id,
      tanggal: item.tanggal,
      waktu_scan: item.waktu_scan,
      timestamp: item.timestamp,
      jenis: item.jenis,
      status: item.status,
      catatan: item.catatan || null,
    }));

    const { error } = await supabase.from('absensi').upsert(recordsToInsert, {
      onConflict: 'siswa_id,tanggal,jenis',
    });

    if (error) {
      return {
        updatedAbsensiList: absensiList,
        updatedLogNotifikasiList: logNotifikasiList,
        result: {
          success: false,
          syncedCount: 0,
          syncedLogCount: 0,
          message: `Sinkronisasi absensi gagal (${pendingAbsensi.length} data): ${error.message}`,
          timestamp: nowStr,
          error: error.message,
        },
      };
    }

    const syncedIds = new Set(pendingAbsensi.map((item) => item.id));
    const nowIso = new Date().toISOString();
    updatedAbsensiList = absensiList.map((item) =>
      syncedIds.has(item.id) ? { ...item, synced: true, synced_at: nowIso } : item
    );
    syncedCount = pendingAbsensi.length;
  }

  // 2) Persist WhatsApp logs. Never change a local log's status merely because
  // internet returned. Its status must reflect the actual gateway result.
  let updatedLogNotifikasiList = logNotifikasiList;
  let syncedLogCount = 0;

  if (pendingLogs.length > 0) {
    const { error } = await supabase.from('log_notifikasi_wa').upsert(
      pendingLogs.map((log) => ({
        id: log.id,
        absensi_id: log.absensi_id || null,
        siswa_id: log.siswa_id || null,
        nomor_tujuan: log.nomor_tujuan,
        jenis_pesan: log.jenis_pesan,
        pesan: log.pesan,
        status_kirim: log.status_kirim,
        waktu_kirim: log.waktu_kirim,
        response_payload: log.response_payload || null,
      })),
      { onConflict: 'id' }
    );

    if (error) {
      // Attendance may already be safely synced; do not roll it back locally.
      return {
        updatedAbsensiList,
        updatedLogNotifikasiList: logNotifikasiList,
        result: {
          success: false,
          syncedCount,
          syncedLogCount: 0,
          message: `Absensi tersinkron, tetapi log WhatsApp gagal disimpan (${pendingLogs.length} log): ${error.message}`,
          timestamp: nowStr,
          error: error.message,
        },
      };
    }

    syncedLogCount = pendingLogs.length;
    const syncedLogIds = new Set(pendingLogs.map((log) => log.id));
    updatedLogNotifikasiList = logNotifikasiList.map((log) =>
      syncedLogIds.has(log.id) ? { ...log } : log
    );
  }

  const totalPendingBefore = pendingAbsensi.length + pendingLogs.length;
  if (totalPendingBefore === 0) {
    return {
      updatedAbsensiList,
      updatedLogNotifikasiList,
      result: {
        success: true,
        syncedCount: 0,
        syncedLogCount: 0,
        message: 'Tidak ada data lokal yang menunggu sinkronisasi.',
        timestamp: nowStr,
      },
    };
  }

  return {
    updatedAbsensiList,
    updatedLogNotifikasiList,
    result: {
      success: true,
      syncedCount,
      syncedLogCount,
      message: `Berhasil menyinkronkan ${syncedCount} presensi dan ${syncedLogCount} log WhatsApp ke database.`,
      timestamp: nowStr,
    },
  };
}
