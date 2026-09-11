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
  isSimulatedOffline: boolean,
  siswaList: Array<{ id: string; nisn: string }> = []
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
  let pendingLogs = logNotifikasiList.filter(
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
  let cleanedOrphanCount = 0;

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

  // IMPORTANT: localStorage may contain old student IDs that no longer match
  // the IDs in Supabase. The absensi.siswa_id column is a real FK, so reconcile
  // student IDs by NISN before uploading any attendance or WA log.
  const localSiswaById = new Map(siswaList.map((s) => [String(s.id), String(s.nisn).trim()]));
  const remoteSiswaByNisn = new Map<string, string>();

  if (pendingAbsensi.length > 0 || pendingLogs.length > 0) {
    const { data: remoteSiswaRows, error: remoteSiswaError } = await supabase
      .from('siswa')
      .select('id,nisn');
    if (remoteSiswaError) {
      return {
        updatedAbsensiList,
        updatedLogNotifikasiList,
        result: {
          success: false,
          syncedCount: 0,
          syncedLogCount: 0,
          message: `Gagal membaca master siswa Supabase: ${remoteSiswaError.message}`,
          timestamp: nowStr,
          error: remoteSiswaError.message,
        },
      };
    }
    for (const row of remoteSiswaRows ?? []) {
      remoteSiswaByNisn.set(String(row.nisn).trim(), String(row.id));
    }
  }

  const canonicalStudentId = (localId: string) => {
    const nisn = localSiswaById.get(String(localId));
    return (nisn && remoteSiswaByNisn.get(nisn)) || String(localId);
  };

  // Older versions could leave attendance rows that point to student IDs which
  // no longer exist locally AND cannot be mapped through the historical alias.
  // Such rows are unrecoverable: there is no safe way to know which Supabase
  // student they belonged to. Do not block the entire sync forever. Remove only
  // these orphan LOCAL attendance/log records; Supabase data is never deleted.
  const unresolvedStudentIds = Array.from(new Set(
    attendanceToSync
      .filter((item) => !remoteSiswaByNisn.has(localSiswaById.get(String(item.siswa_id)) || ''))
      .map((item) => String(item.siswa_id))
  ));

  if (unresolvedStudentIds.length > 0) {
    const unresolvedSet = new Set(unresolvedStudentIds);
    const orphanAttendanceIds = new Set(
      absensiList
        .filter((item) => unresolvedSet.has(String(item.siswa_id)))
        .map((item) => String(item.id))
    );

    updatedAbsensiList = absensiList.filter(
      (item) => !unresolvedSet.has(String(item.siswa_id))
    );
    updatedLogNotifikasiList = logNotifikasiList.filter(
      (log) =>
        !orphanAttendanceIds.has(String(log.absensi_id)) &&
        !unresolvedSet.has(String(log.siswa_id))
    );

    syncedCount = 0;
    cleanedOrphanCount = orphanAttendanceIds.size;

    // Persist the cleanup result in local state returned to AppContext. The
    // caller will write it to localStorage/state. Then continue syncing all
    // remaining valid attendance rows.
    attendanceToSync.splice(
      0,
      attendanceToSync.length,
      ...attendanceToSync.filter((item) => !unresolvedSet.has(String(item.siswa_id)))
    );

    // Recalculate pending logs after removing orphan attendance rows.
    pendingLogs = updatedLogNotifikasiList.filter(
      (log) =>
        log.status_kirim === 'pending' ||
        log.status_kirim === 'terkirim' ||
        log.status_kirim === 'gagal' ||
        log.status_kirim === 'simulasi'
    );

    // Do not return an error here. The unresolved records are explicitly local
    // orphan test/legacy records, while valid records should still synchronize.
    console.warn(
      `Membersihkan ${unresolvedStudentIds.length} siswa/ID lokal orphan dan ` +
      `${orphanAttendanceIds.size} absensi lokal sebelum sinkronisasi.`
    );
  }

  // Collect all attendance business keys referenced by pending attendance AND logs.
  // This is necessary when attendance has already been uploaded but the WA log is
  // still pending: we still need the canonical remote absensi.id for the FK.
  const localAbsensiById = new Map(updatedAbsensiList.map((a) => [String(a.id), a]));
  const attendanceLookupKeys = new Set<string>();
  for (const item of attendanceToSync) {
    attendanceLookupKeys.add(`${canonicalStudentId(item.siswa_id)}|${item.tanggal}|${item.jenis}`);
  }
  for (const log of pendingLogs) {
    const localAttendance = localAbsensiById.get(String(log.absensi_id));
    if (localAttendance) {
      attendanceLookupKeys.add(
        `${canonicalStudentId(localAttendance.siswa_id)}|${localAttendance.tanggal}|${localAttendance.jenis}`
      );
    }
  }

  const canonicalSiswaIds = Array.from(new Set(
    Array.from(attendanceLookupKeys).map((key) => key.split('|')[0]).filter(Boolean)
  ));
  const tanggalValues = Array.from(new Set(
    Array.from(attendanceLookupKeys).map((key) => key.split('|')[1]).filter(Boolean)
  ));
  const remoteAbsensiByBusinessKey = new Map<string, { id: string; siswa_id: string; tanggal: string; jenis: string }>();

  if (canonicalSiswaIds.length > 0 && tanggalValues.length > 0) {
    const { data: remoteRows, error: remoteError } = await supabase
      .from('absensi')
      .select('id,siswa_id,tanggal,jenis')
      .in('siswa_id', canonicalSiswaIds)
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
      remoteAbsensiByBusinessKey.set(`${row.siswa_id}|${row.tanggal}|${row.jenis}`, row);
    }
  }

  // Local attendance ID -> canonical remote attendance ID.
  const absensiIdRemap = new Map<string, string>();
  for (const localAttendance of absensiList) {
    const key = `${canonicalStudentId(localAttendance.siswa_id)}|${localAttendance.tanggal}|${localAttendance.jenis}`;
    const remote = remoteAbsensiByBusinessKey.get(key);
    if (remote) absensiIdRemap.set(localAttendance.id, remote.id);
  }

  // 1) Attendance first because log_notifikasi_wa.absensi_id is an FK.
  if (attendanceToSync.length > 0) {
    const recordsToInsert = attendanceToSync.map((item) => {
      const key = `${canonicalStudentId(item.siswa_id)}|${item.tanggal}|${item.jenis}`;
      const remote = remoteAbsensiByBusinessKey.get(key);
      return {
        // Reuse the existing remote ID when the business key already exists.
        // Otherwise keep the local generated attendance ID. The student ID is
        // always the canonical Supabase FK ID.
        id: remote?.id || item.id,
        siswa_id: canonicalStudentId(item.siswa_id),
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
      attendanceToSync.map((item) => `${canonicalStudentId(item.siswa_id)}|${item.tanggal}|${item.jenis}`)
    );
    updatedAbsensiList = absensiList.map((item) => {
      const key = `${canonicalStudentId(item.siswa_id)}|${item.tanggal}|${item.jenis}`;
      if (!syncedBusinessKeys.has(`${canonicalStudentId(item.siswa_id)}|${item.tanggal}|${item.jenis}`)) return item;
      const remote = remoteAbsensiByBusinessKey.get(key);
      return {
        ...item,
        id: remote?.id || item.id,
        siswa_id: canonicalStudentId(item.siswa_id),
        synced: true,
        synced_at: nowIso,
      };
    });
    syncedCount = pendingAbsensi.length;

    // Repair every local WA log that points at a local/generated attendance ID.
    updatedLogNotifikasiList = updatedLogNotifikasiList.map((log) => ({
      ...log,
      absensi_id: absensiIdRemap.get(log.absensi_id) || log.absensi_id,
      siswa_id: canonicalStudentId(log.siswa_id),
    }));
  }

  // Recalculate logs after FK repair, so logs belonging to older local IDs are
  // uploaded with the real Supabase attendance ID and canonical student FK.
  updatedLogNotifikasiList = updatedLogNotifikasiList.map((log) => ({
    ...log,
    siswa_id: canonicalStudentId(log.siswa_id),
    absensi_id: absensiIdRemap.get(log.absensi_id) || log.absensi_id,
  }));

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
      message: cleanedOrphanCount > 0
        ? `Membersihkan ${cleanedOrphanCount} absensi lokal orphan, lalu menyinkronkan ${syncedCount} presensi dan ${syncedLogCount} log WhatsApp ke database.`
        : `Berhasil menyinkronkan ${syncedCount} presensi dan ${syncedLogCount} log WhatsApp ke database.`,
      timestamp: nowStr,
    },
  };
}
