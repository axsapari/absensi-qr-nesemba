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
  const pendingLogs = logNotifikasiList.filter(
    (log) =>
      log.status_kirim === 'pending' ||
      log.status_kirim === 'terkirim' ||
      log.status_kirim === 'gagal' ||
      log.status_kirim === 'simulasi'
  );

  let updatedAbsensiList = absensiList;
  let syncedCount = 0;
  let updatedLogNotifikasiList = logNotifikasiList;
  let syncedLogCount = 0;

  // The database has UNIQUE (siswa_id, tanggal, jenis). A single upsert request
  // cannot contain two rows that target the same unique key. Older local data can
  // legitimately contain such duplicates, so collapse them before sending.
  const attendanceByBusinessKey = new Map<string, Absensi>();
  for (const item of pendingAbsensi) {
    const key = `${item.siswa_id}|${item.tanggal}|${item.jenis}`;
    const previous = attendanceByBusinessKey.get(key);
    if (!previous || item.timestamp >= previous.timestamp) {
      attendanceByBusinessKey.set(key, item);
    }
  }
  const attendanceToSync = Array.from(attendanceByBusinessKey.values());

  // Reconcile local attendance IDs with existing remote IDs. This is important
  // because an earlier sync/re-import may have created the same attendance row
  // in Supabase with a different TEXT primary key. WA logs must reference the
  // actual remote absensi.id or the FK will fail.
  const siswaIds = Array.from(new Set(attendanceToSync.map((a) => a.siswa_id)));
  const tanggalValues = Array.from(new Set(attendanceToSync.map((a) => a.tanggal)));
  const remoteAbsensiByBusinessKey = new Map<string, { id: string; siswa_id: string; tanggal: string; jenis: string }>();

  if (attendanceToSync.length > 0) {
    const { data: remoteRows, error: remoteError } = await supabase
      .from('absensi')
      .select('id,siswa_id,tanggal,jenis')
      .in('siswa_id', siswaIds)
      .in('tanggal', tanggalValues)
      .in('jenis', ['masuk', 'pulang']);

    if (remoteError) {
      return {
        updatedAbsensiList,
        updatedLogNotifikasiList,
        result: {
          success: false,
          syncedCount: 0,
          syncedLogCount: 0,
          message: `Gagal memeriksa absensi yang sudah ada di Supabase: ${remoteError.message}`,
          timestamp: nowStr,
          error: remoteError.message,
        },
      };
    }

    for (const row of remoteRows ?? []) {
      remoteAbsensiByBusinessKey.set(
        `${row.siswa_id}|${row.tanggal}|${row.jenis}`,
        row
      );
    }
  }

  // Build a local-id -> remote-id map. It is also used to repair WA log FK values.
  const absensiIdRemap = new Map<string, string>();
  for (const item of pendingAbsensi) {
    const key = `${item.siswa_id}|${item.tanggal}|${item.jenis}`;
    const remote = remoteAbsensiByBusinessKey.get(key);
    if (remote && remote.id !== item.id) {
      absensiIdRemap.set(item.id, remote.id);
    }
  }

  // 1) Attendance first because log_notifikasi_wa.absensi_id is an FK.
  if (attendanceToSync.length > 0) {
    const recordsToInsert = attendanceToSync.map((item) => {
      const key = `${item.siswa_id}|${item.tanggal}|${item.jenis}`;
      const remote = remoteAbsensiByBusinessKey.get(key);
      return {
        // Reuse the existing remote ID when the business key already exists.
        // Otherwise keep the local generated ID.
        id: remote?.id || item.id,
        siswa_id: item.siswa_id,
        tanggal: item.tanggal,
        waktu_scan: item.waktu_scan,
        timestamp: item.timestamp,
        jenis: item.jenis,
        status: item.status,
        catatan: item.catatan || null,
      };
    });

    const { error } = await supabase.from('absensi').upsert(recordsToInsert, {
      onConflict: 'siswa_id,tanggal,jenis',
    });

    if (error) {
      return {
        updatedAbsensiList,
        updatedLogNotifikasiList,
        result: {
          success: false,
          syncedCount: 0,
          syncedLogCount: 0,
          message: `Sinkronisasi absensi gagal (${attendanceToSync.length} data): ${error.message}`,
          timestamp: nowStr,
          error: error.message,
        },
      };
    }

    // Every pending local row for a business key is now represented by the one
    // database row allowed by the UNIQUE constraint. Mark all those local rows
    // synced and remap their IDs in local state where needed.
    const nowIso = new Date().toISOString();
    const syncedBusinessKeys = new Set(
      attendanceToSync.map((item) => `${item.siswa_id}|${item.tanggal}|${item.jenis}`)
    );
    updatedAbsensiList = absensiList.map((item) => {
      const key = `${item.siswa_id}|${item.tanggal}|${item.jenis}`;
      if (!syncedBusinessKeys.has(key)) return item;
      const remote = remoteAbsensiByBusinessKey.get(key);
      return {
        ...item,
        id: remote?.id || item.id,
        synced: true,
        synced_at: nowIso,
      };
    });
    syncedCount = pendingAbsensi.length;

    // Repair every local WA log that points at a local/generated attendance ID.
    if (absensiIdRemap.size > 0) {
      updatedLogNotifikasiList = logNotifikasiList.map((log) => ({
        ...log,
        absensi_id: absensiIdRemap.get(log.absensi_id) || log.absensi_id,
      }));
    }
  }

  // Recalculate logs after FK repair, so logs belonging to older local IDs are
  // uploaded with the real Supabase attendance ID.
  const logsForUpload = updatedLogNotifikasiList.filter(
    (log) =>
      log.status_kirim === 'pending' ||
      log.status_kirim === 'terkirim' ||
      log.status_kirim === 'gagal' ||
      log.status_kirim === 'simulasi'
  );

  if (logsForUpload.length > 0) {
    const { error } = await supabase.from('log_notifikasi_wa').upsert(
      logsForUpload.map((log) => ({
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
      return {
        updatedAbsensiList,
        updatedLogNotifikasiList,
        result: {
          success: false,
          syncedCount,
          syncedLogCount: 0,
          message: `Absensi tersinkron, tetapi log WhatsApp gagal disimpan (${logsForUpload.length} log): ${error.message}`,
          timestamp: nowStr,
          error: error.message,
        },
      };
    }

    syncedLogCount = logsForUpload.length;
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
