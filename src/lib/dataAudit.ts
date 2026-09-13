import { Absensi, DataAuditDiagnosticItem, DataAuditReport, DataAuditTraceEvent, Kelas, LogNotifikasiWA, Siswa, SupabaseConfig } from '../types';
import { getSupabaseClient } from './supabase';

const keyOf = (siswaId: string, tanggal: string, jenis: string) => `${siswaId}|${tanggal}|${jenis}`;
const normalizeNisn = (value: unknown) => String(value ?? '').trim();
const readTombstones = (): NonNullable<DataAuditReport['diagnosticTarget']>['tombstones'] => {
  try { return JSON.parse(localStorage.getItem('absensi_attendance_tombstones_v1') || '[]'); } catch { return []; }
};
const readTrace = (): DataAuditTraceEvent[] => {
  try {
    const raw = localStorage.getItem('absensi_audit_trace_v1');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export async function runDataAudit(
  local: { siswa: Siswa[]; kelas: Kelas[]; absensi: Absensi[]; logs: LogNotifikasiWA[] },
  supabaseConfig: SupabaseConfig,
  pendingMutations: number,
  diagnosticNisn = '0124203121',
): Promise<DataAuditReport> {
  const timestamp = new Date().toISOString();
  const target = normalizeNisn(diagnosticNisn);
  const empty = (): DataAuditReport => ({
    timestamp,
    online: false,
    diagnosticTarget: {
      nisn: target,
      localStudents: local.siswa.filter(s => normalizeNisn(s.nisn) === target).map(s => ({ id: String(s.id), nama: s.nama, nisn: normalizeNisn(s.nisn) })),
      remoteStudents: [], items: [], pendingMutations: [], localStorageAbsensiBytes: (() => { try { return new Blob([localStorage.getItem('absensi_records_v1') || '']).size; } catch { return 0; } })(), trace: readTrace(), tombstones: readTombstones(),
    },
    remote: { siswa: 0, kelas: 0, absensi: 0, logNotifikasiWA: 0, orphanAbsensi: 0, orphanLogWA: 0, duplicateAttendanceKeys: 0 },
    local: { siswa: local.siswa.length, kelas: local.kelas.length, absensi: local.absensi.length, logNotifikasiWA: local.logs.length, pendingMutations, orphanAbsensi: 0, orphanLogWA: 0, duplicateAttendanceKeys: 0, todayLocalOnly: 0, todayRemoteOnly: 0, tombstones: readTombstones().length },
    healthy: false, issues: ['Belum dapat terhubung ke Supabase untuk audit.'],
  });

  const report = empty();
  const localStudentIds = new Set(local.siswa.map(s => String(s.id)));
  const localAttendanceIds = new Set(local.absensi.map(a => String(a.id)));
  const localAttendanceKeys = new Map<string, number>();
  for (const a of local.absensi) {
    const key = keyOf(String(a.siswa_id), a.tanggal, a.jenis);
    localAttendanceKeys.set(key, (localAttendanceKeys.get(key) || 0) + 1);
  }
  report.local.orphanAbsensi = local.absensi.filter(a => !localStudentIds.has(String(a.siswa_id))).length;
  report.local.orphanLogWA = local.logs.filter(l => !localAttendanceIds.has(String(l.absensi_id))).length;
  report.local.duplicateAttendanceKeys = [...localAttendanceKeys.values()].filter(n => n > 1).length;

  let pendingRows: any[] = [];
  try { pendingRows = JSON.parse(localStorage.getItem('absensi_pending_mutations_v1') || '[]'); } catch {}
  if (report.diagnosticTarget) {
    report.diagnosticTarget.pendingMutations = pendingRows
      .filter(m => JSON.stringify(m).includes(target))
      .map(m => String(m.type || 'mutation'));
    report.diagnosticTarget.tombstones = readTombstones().filter(t => JSON.stringify(t).includes(target));
    const targetLocalIds = new Set(report.diagnosticTarget.localStudents.map(s => s.id));
    let aliasMapLocal: Record<string, string> = {};
    try { aliasMapLocal = JSON.parse(localStorage.getItem('absensi_siswa_id_aliases_v1') || '{}'); } catch {}
    const localTarget = local.absensi.filter(a => normalizeNisn(local.siswa.find(s => String(s.id) === String(a.siswa_id))?.nisn) === target || targetLocalIds.has(String(a.siswa_id)) || normalizeNisn(aliasMapLocal[String(a.siswa_id)]) === target);
    report.diagnosticTarget.items = localTarget.map(a => ({
      id: String(a.id), siswaId: String(a.siswa_id), nisn: target, nama: report.diagnosticTarget!.localStudents.find(s => s.id === String(a.siswa_id))?.nama || '(tidak ditemukan di cache lokal)',
      tanggal: a.tanggal, jenis: a.jenis, waktuScan: a.waktu_scan, timestamp: a.timestamp, synced: !!a.synced, syncedAt: a.synced_at,
      localStudentFound: targetLocalIds.has(String(a.siswa_id)), remoteStudentFound: false, remoteAttendanceFound: false,
      pendingMutationMatches: report.diagnosticTarget!.pendingMutations,
      sourceHints: [!targetLocalIds.has(String(a.siswa_id)) ? 'siswa_id absensi tidak ditemukan di cache lokal' : 'absensi terkait siswa lokal'],
    }));
  }

  if (!navigator.onLine || !supabaseConfig.url || !supabaseConfig.anonKey) return report;
  const supabase = getSupabaseClient(supabaseConfig);
  if (!supabase) return report;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return report;
  report.online = true;

  const [students, classes, attendance, logs] = await Promise.all([
    supabase.from('siswa').select('id,nisn,nama'),
    supabase.from('kelas').select('id'),
    supabase.from('absensi').select('id,siswa_id,tanggal,jenis,waktu_scan,timestamp,status,catatan'),
    supabase.from('log_notifikasi_wa').select('id,absensi_id,siswa_id'),
  ]);
  const errors = [students.error, classes.error, attendance.error, logs.error].filter(Boolean);
  if (errors.length) { report.issues = errors.map(e => String(e?.message || e)); return report; }

  const remoteStudents = students.data || [];
  const remoteClasses = classes.data || [];
  const remoteAttendance = attendance.data || [];
  const remoteLogs = logs.data || [];
  report.remote.siswa = remoteStudents.length; report.remote.kelas = remoteClasses.length; report.remote.absensi = remoteAttendance.length; report.remote.logNotifikasiWA = remoteLogs.length;
  const remoteStudentIds = new Set(remoteStudents.map(s => String(s.id)));
  const remoteAttendanceIds = new Set(remoteAttendance.map(a => String(a.id)));
  report.remote.orphanAbsensi = remoteAttendance.filter(a => !remoteStudentIds.has(String(a.siswa_id))).length;
  report.remote.orphanLogWA = remoteLogs.filter(l => !remoteAttendanceIds.has(String(l.absensi_id))).length;
  const remoteKeys = new Map<string, number>();
  for (const a of remoteAttendance) { const key = keyOf(String(a.siswa_id), a.tanggal, a.jenis); remoteKeys.set(key, (remoteKeys.get(key) || 0) + 1); }
  report.remote.duplicateAttendanceKeys = [...remoteKeys.values()].filter(n => n > 1).length;

  const remoteByNisn = new Map<string, any>();
  remoteStudents.forEach(s => { const n = normalizeNisn(s.nisn); if (n) remoteByNisn.set(n, s); });
  const remoteByKey = new Map<string, any>();
  remoteAttendance.forEach(a => remoteByKey.set(keyOf(String(a.siswa_id), String(a.tanggal), String(a.jenis)), a));
  const localById = new Map(local.siswa.map(s => [String(s.id), s]));
  const aliasMap: Record<string,string> = (() => { try { return JSON.parse(localStorage.getItem('absensi_siswa_id_aliases_v1') || '{}'); } catch { return {}; } })();
  const aliasForNisn = new Map<string,string>();
  Object.entries(aliasMap).forEach(([id, nisn]) => { if (normalizeNisn(nisn)) aliasForNisn.set(normalizeNisn(nisn), id); });

  if (report.diagnosticTarget) {
    report.diagnosticTarget.remoteStudents = (remoteStudents.filter(s => normalizeNisn(s.nisn) === target)).map(s => ({ id: String(s.id), nama: s.nama, nisn: normalizeNisn(s.nisn) }));
    const candidates = local.absensi.filter(a => {
      const student = localById.get(String(a.siswa_id));
      return normalizeNisn(student?.nisn) === target || normalizeNisn(aliasMap[String(a.siswa_id)]) === target || report.diagnosticTarget!.items.some(i => i.id === String(a.id));
    });
    report.diagnosticTarget.items = candidates.map(a => {
      const student = localById.get(String(a.siswa_id));
      const remoteStudent = remoteByNisn.get(target);
      const remoteStudentId = remoteStudent ? String(remoteStudent.id) : undefined;
      const directRemote = remoteByKey.get(keyOf(String(a.siswa_id), a.tanggal, a.jenis));
      const remoteByCanonical = remoteStudentId ? remoteByKey.get(keyOf(remoteStudentId, a.tanggal, a.jenis)) : undefined;
      const remoteRow = directRemote || remoteByCanonical;
      const hints: string[] = [];
      if (!student) hints.push('LOCAL: siswa_id tidak ada di cache siswa');
      if (aliasMap[String(a.siswa_id)]) hints.push(`ALIAS: ${String(a.siswa_id)} → NISN ${normalizeNisn(aliasMap[String(a.siswa_id)])}`);
      if (remoteStudentId && String(a.siswa_id) !== remoteStudentId) hints.push(`ID BERBEDA: lokal ${a.siswa_id} vs Supabase ${remoteStudentId}`);
      if (remoteRow) hints.push(`REMOTE: ditemukan ${String(remoteRow.id)} untuk ${a.tanggal}/${a.jenis}`); else hints.push('REMOTE: tidak ditemukan untuk kombinasi tanggal/jenis');
      return { id: String(a.id), siswaId: String(a.siswa_id), nisn: target, nama: student?.nama || report.diagnosticTarget!.remoteStudents[0]?.nama || '(tidak ditemukan)', tanggal: a.tanggal, jenis: a.jenis, waktuScan: a.waktu_scan, timestamp: a.timestamp, synced: !!a.synced, syncedAt: a.synced_at, localStudentFound: !!student, localStudentId: student?.id, remoteStudentFound: !!remoteStudent, remoteStudentId, remoteAttendanceFound: !!remoteRow, remoteAttendanceId: remoteRow?.id ? String(remoteRow.id) : undefined, remoteAttendanceKey: remoteRow ? keyOf(String(remoteRow.siswa_id), String(remoteRow.tanggal), String(remoteRow.jenis)) : undefined, aliasNisn: aliasMap[String(a.siswa_id)], pendingMutationMatches: pendingRows.filter(m => JSON.stringify(m).includes(target) || JSON.stringify(m).includes(String(a.siswa_id))).map(m => String(m.type || 'mutation')), sourceHints: hints } as DataAuditDiagnosticItem;
    });
  }

  const issues: string[] = [];
  if (report.remote.orphanAbsensi) issues.push(`${report.remote.orphanAbsensi} absensi Supabase tidak memiliki siswa yang valid.`);
  if (report.remote.orphanLogWA) issues.push(`${report.remote.orphanLogWA} log WhatsApp Supabase tidak memiliki absensi yang valid.`);
  if (report.remote.duplicateAttendanceKeys) issues.push(`${report.remote.duplicateAttendanceKeys} kombinasi absensi duplikat ditemukan di Supabase.`);
  if (report.local.orphanAbsensi) issues.push(`${report.local.orphanAbsensi} absensi lokal menunjuk ke siswa yang tidak ada di cache lokal.`);
  if (report.local.orphanLogWA) issues.push(`${report.local.orphanLogWA} log WhatsApp lokal menunjuk ke absensi yang tidak ada.`);
  if (report.local.duplicateAttendanceKeys) issues.push(`${report.local.duplicateAttendanceKeys} kombinasi absensi duplikat ditemukan di lokal.`);
  if (pendingMutations) issues.push(`${pendingMutations} perubahan masih menunggu sinkronisasi.`);

  const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const localToday = new Set(local.absensi.filter(a => a.tanggal === today && a.synced).map(a => keyOf(String(a.siswa_id), a.tanggal, a.jenis)));
  const remoteToday = new Set(remoteAttendance.filter(a => a.tanggal === today).map(a => keyOf(String(a.siswa_id), a.tanggal, a.jenis)));
  report.local.todayLocalOnly = [...localToday].filter(k => !remoteToday.has(k)).length;
  report.local.todayRemoteOnly = [...remoteToday].filter(k => !localToday.has(k)).length;
  if (report.local.todayLocalOnly) issues.push(`${report.local.todayLocalOnly} absensi hari ini tercatat lokal tetapi belum terlihat di Supabase.`);
  if (report.local.todayRemoteOnly) issues.push(`${report.local.todayRemoteOnly} absensi hari ini ada di Supabase tetapi belum terlihat di lokal.`);
  report.issues = issues; report.healthy = report.online && issues.length === 0; if (report.healthy) report.issues = ['Tidak ditemukan masalah integritas data.'];
  return report;
}

