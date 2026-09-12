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

  // IMPORTANT: unresolved local student IDs are NEVER deleted automatically.
  // A background sync must be non-destructive: a temporary NISN/ID mismatch,
  // stale master cache, or formatting difference must not make attendance
  // disappear from the kiosk. Keep such rows local and report them as pending.
  const unresolvedStudentIds = Array.from(new Set(
    attendanceToSync
      .filter((item) => !remoteSiswaByNisn.has(localSiswaById.get(String(item.siswa_id)) || ''))
      .map((item) => String(item.siswa_id))
  ));

  if (unresolvedStudentIds.length > 0) {
    const unresolvedSet = new Set(unresolvedStudentIds);
    const validAttendanceToSync = attendanceToSync.filter(
      (item) => !unresolvedSet.has(String(item.siswa_id))
    );
    attendanceToSync.splice(0, attendanceToSync.length, ...validAttendanceToSync);

    // Do not discard unresolved attendance/log records. They remain in localStorage
    // and can be retried after the master student mapping is corrected.
    pendingLogs = pendingLogs.filter((log) => {
      const localAttendance = absensiList.find((a) => String(a.id) === String(log.absensi_id));
      if (!localAttendance) return true;
      return !unresolvedSet.has(String(localAttendance.siswa_id));
    });

    console.warn(
      `Menunda ${unresolvedStudentIds.length} ID siswa lokal yang belum dapat dipetakan ke Supabase. ` +
      'Data lokal dipertahankan dan tidak dihapus.'
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
  const remoteAbsensiByBusinessKey = new Map<string, { id: string; siswa_id: string; tanggal: string; jenis: string; waktu_scan?: string; timestamp?: number; status?: string; catatan?: string | null }>();

  if (canonicalSiswaIds.length > 0 && tanggalValues.length > 0) {
    const { data: remoteRows, error: remoteError } = await supabase
      .from('absensi')
      .select('id,siswa_id,tanggal,jenis,waktu_scan,timestamp,status,catatan')
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
  // CONCURRENCY RULE: the UNIQUE(siswa_id,tanggal,jenis) constraint is the
  // authoritative gate. Never use UPSERT here because a second kiosk scanning
  // the same student at nearly the same time could overwrite the first scan.
  // We INSERT only rows that do not already exist. If another kiosk wins the
  // race, the unique violation is resolved as a duplicate instead of replacing
  // the winner.
  if (attendanceToSync.length > 0) {
    const existingAtStart = new Set<string>();
    for (const item of attendanceToSync) {
      const key = `${canonicalStudentId(item.siswa_id)}|${item.tanggal}|${item.jenis}`;
      if (remoteAbsensiByBusinessKey.has(key)) existingAtStart.add(key);
    }

    const candidateItems = attendanceToSync.filter((item) => {
      const key = `${canonicalStudentId(item.siswa_id)}|${item.tanggal}|${item.jenis}`;
      return !existingAtStart.has(key);
    });

    let insertError: any = null;
    if (candidateItems.length > 0) {
      const recordsToInsert = candidateItems.map((item) => ({
        id: item.id,
        siswa_id: canonicalStudentId(item.siswa_id),
        tanggal: item.tanggal,
        waktu_scan: item.waktu_scan,
        timestamp: item.timestamp,
        jenis: item.jenis,
        status: item.status,
        catatan: item.catatan || null,
      }));
      const { error } = await supabase.from('absensi').insert(recordsToInsert);
      insertError = error;
    }

    // A concurrent kiosk may have inserted one of the same business keys after
    // our initial SELECT. A 23505 is therefore not a generic sync failure: refresh
    // the affected keys and resolve them as duplicates without overwriting data.
    if (insertError) {
      const duplicateRace = String(insertError.code || '') === '23505' || /duplicate|unique/i.test(String(insertError.message || ''));
      if (!duplicateRace) {
        return {
          updatedAbsensiList,
          updatedLogNotifikasiList,
          result: {
            success: false,
            syncedCount: 0,
            syncedLogCount: 0,
            message: `Sinkronisasi absensi gagal (${attendanceToSync.length} data): ${insertError.message}`,
            timestamp: nowStr,
            error: insertError.message,
          },
        };
      }
    }

    // Refresh all affected remote rows after INSERT. This is required both for
    // normal inserts and for the race case, so the local state gets the canonical
    // remote ID/time and never invents a second attendance row.
    const affectedStudentIds = Array.from(new Set(
      attendanceToSync.map((item) => canonicalStudentId(item.siswa_id))
    ));
    const affectedDates = Array.from(new Set(attendanceToSync.map((item) => item.tanggal)));
    const { data: refreshedRows, error: refreshError } = await supabase
      .from('absensi')
      .select('id,siswa_id,tanggal,jenis,waktu_scan,timestamp,status,catatan')
      .in('siswa_id', affectedStudentIds)
      .in('tanggal', affectedDates)
      .in('jenis', ['masuk', 'pulang']);
    if (refreshError) {
      return {
        updatedAbsensiList,
        updatedLogNotifikasiList,
        result: {
          success: false,
          syncedCount: 0,
          syncedLogCount: 0,
          message: `Gagal memverifikasi absensi setelah sinkronisasi: ${refreshError.message}`,
          timestamp: nowStr,
          error: refreshError.message,
        },
      };
    }
    for (const row of refreshedRows ?? []) {
      remoteAbsensiByBusinessKey.set(`${row.siswa_id}|${row.tanggal}|${row.jenis}`, row);
    }

    const nowIso = new Date().toISOString();
    const duplicateLocalIds = new Set<string>();
    const successfulBusinessKeys = new Set<string>();
    const sameIdBusinessKeys = new Set<string>();

    for (const item of attendanceToSync) {
      const canonicalId = canonicalStudentId(item.siswa_id);
      const key = `${canonicalId}|${item.tanggal}|${item.jenis}`;
      const remote = remoteAbsensiByBusinessKey.get(key);
      if (!remote) continue;
      successfulBusinessKeys.add(key);
      if (String(remote.id) === String(item.id)) {
        sameIdBusinessKeys.add(key);
      } else if (existingAtStart.has(key) || insertError) {
        duplicateLocalIds.add(String(item.id));
      }
    }

    // A collision means another kiosk already owns this attendance slot. Remove
    // only the local duplicate and its pending WA log; do not send a second
    // notification for the same attendance.
    if (duplicateLocalIds.size > 0) {
      updatedAbsensiList = updatedAbsensiList.filter((item) => !duplicateLocalIds.has(String(item.id)));
      updatedLogNotifikasiList = updatedLogNotifikasiList.filter((log) => !duplicateLocalIds.has(String(log.absensi_id)));
    }

    updatedAbsensiList = updatedAbsensiList.map((item) => {
      const key = `${canonicalStudentId(item.siswa_id)}|${item.tanggal}|${item.jenis}`;
      if (!successfulBusinessKeys.has(key)) return item;
      const remote = remoteAbsensiByBusinessKey.get(key);
      if (!remote) return item;
      return {
        ...item,
        id: remote.id,
        siswa_id: canonicalStudentId(item.siswa_id),
        tanggal: remote.tanggal,
        waktu_scan: remote.waktu_scan || item.waktu_scan,
        timestamp: Number(remote.timestamp ?? item.timestamp),
        jenis: remote.jenis as Absensi['jenis'],
        status: (remote.status || item.status) as Absensi['status'],
        catatan: remote.catatan ?? item.catatan,
        synced: true,
        synced_at: nowIso,
      };
    });

    // Remap logs only for attendance rows that actually belong to this local
    // device's successful insert. Collision logs were removed above.
    const remoteIdByKey = new Map<string, string>();
    for (const key of sameIdBusinessKeys) {
      const remote = remoteAbsensiByBusinessKey.get(key);
      if (remote) remoteIdByKey.set(key, String(remote.id));
    }
    updatedLogNotifikasiList = updatedLogNotifikasiList.map((log) => {
      const localAttendance = absensiList.find((a) => String(a.id) === String(log.absensi_id));
      if (!localAttendance) return log;
      const key = `${canonicalStudentId(localAttendance.siswa_id)}|${localAttendance.tanggal}|${localAttendance.jenis}`;
      return {
        ...log,
        absensi_id: remoteIdByKey.get(key) || absensiIdRemap.get(log.absensi_id) || log.absensi_id,
        siswa_id: canonicalStudentId(log.siswa_id),
      };
    });
    syncedCount = attendanceToSync.length;
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

  // A previous version could leave WA logs in localStorage after their attendance
  // was deleted. Such a log carries a now-nonexistent absensi_id and will always
  // fail the FK constraint when upserted. Validate the referenced attendance IDs
  // before uploading logs and discard only these stale LOCAL log records.
  // This also makes the sync self-healing for data produced by older versions.
  let validatedLogsForUpload = logsForUpload;
  if (logsForUpload.length > 0) {
    const referencedAttendanceIds = Array.from(new Set(
      logsForUpload
        .map((log) => log.absensi_id ? String(log.absensi_id) : '')
        .filter(Boolean)
    ));

    if (referencedAttendanceIds.length > 0) {
      const { data: existingAttendanceRows, error: attendanceCheckError } = await supabase
        .from('absensi')
        .select('id')
        .in('id', referencedAttendanceIds);

      if (attendanceCheckError) {
        return {
          updatedAbsensiList,
          updatedLogNotifikasiList,
          result: {
            success: false,
            syncedCount,
            syncedLogCount: 0,
            message: `Gagal memvalidasi relasi log WhatsApp: ${attendanceCheckError.message}`,
            timestamp: nowStr,
            error: attendanceCheckError.message,
          },
        };
      }

      const existingAttendanceIdSet = new Set(
        (existingAttendanceRows ?? []).map((row) => String(row.id))
      );
      const staleLogIds = logsForUpload
        .filter((log) => log.absensi_id && !existingAttendanceIdSet.has(String(log.absensi_id)))
        .map((log) => String(log.id));

      if (staleLogIds.length > 0) {
        // If a stale local log already exists remotely under the same primary key,
        // remove it too. It cannot be a valid FK-linked notification anymore.
        const { error: staleRemoteDeleteError } = await supabase
          .from('log_notifikasi_wa')
          .delete()
          .in('id', staleLogIds);

        if (staleRemoteDeleteError) {
          return {
            updatedAbsensiList,
            updatedLogNotifikasiList,
            result: {
              success: false,
              syncedCount,
              syncedLogCount: 0,
              message: `Log WhatsApp lama gagal dibersihkan: ${staleRemoteDeleteError.message}`,
              timestamp: nowStr,
              error: staleRemoteDeleteError.message,
            },
          };
        }

        const staleSet = new Set(staleLogIds);
        updatedLogNotifikasiList = updatedLogNotifikasiList.filter(
          (log) => !staleSet.has(String(log.id))
        );
        validatedLogsForUpload = logsForUpload.filter(
          (log) => !staleSet.has(String(log.id))
        );
        cleanedOrphanCount += staleLogIds.length;
        console.warn(
          `Membersihkan ${staleLogIds.length} log WhatsApp lokal yang menunjuk ke absensi yang sudah tidak ada.`
        );
      }
    }
  }

  if (validatedLogsForUpload.length > 0) {
    const { error } = await supabase.from('log_notifikasi_wa').upsert(
      validatedLogsForUpload.map((log) => ({
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
          message: `Absensi tersinkron, tetapi log WhatsApp gagal disimpan (${validatedLogsForUpload.length} log): ${error.message}`,
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
        success: unresolvedStudentIds.length === 0,
        syncedCount: 0,
        syncedLogCount: 0,
        message: unresolvedStudentIds.length > 0
          ? `Sinkronisasi ditunda: ${unresolvedStudentIds.length} ID siswa belum dapat dipetakan ke Supabase. Data lokal dipertahankan.`
          : 'Tidak ada data lokal yang menunggu sinkronisasi.',
        timestamp: nowStr,
      },
    };
  }

  return {
    updatedAbsensiList,
    updatedLogNotifikasiList,
    result: {
      success: unresolvedStudentIds.length === 0,
      syncedCount,
      syncedLogCount,
      message: unresolvedStudentIds.length > 0
        ? `Sebagian tersinkron. ${syncedCount} presensi dan ${syncedLogCount} log WhatsApp berhasil dikirim; ${unresolvedStudentIds.length} ID siswa belum dapat dipetakan dan tetap disimpan lokal untuk dicoba lagi.`
        : `Berhasil menyinkronkan ${syncedCount} presensi dan ${syncedLogCount} log WhatsApp ke database.`,
      timestamp: nowStr,
    },
  };
}
