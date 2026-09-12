import { Absensi, DataAuditReport, Kelas, LogNotifikasiWA, Siswa, SupabaseConfig } from '../types';
import { getSupabaseClient } from './supabase';

const keyOf = (siswaId: string, tanggal: string, jenis: string) => `${siswaId}|${tanggal}|${jenis}`;

export async function runDataAudit(
  local: { siswa: Siswa[]; kelas: Kelas[]; absensi: Absensi[]; logs: LogNotifikasiWA[] },
  supabaseConfig: SupabaseConfig,
  pendingMutations: number,
): Promise<DataAuditReport> {
  const timestamp = new Date().toISOString();
  const empty = (): DataAuditReport => ({
    timestamp,
    online: false,
    remote: { siswa: 0, kelas: 0, absensi: 0, logNotifikasiWA: 0, orphanAbsensi: 0, orphanLogWA: 0, duplicateAttendanceKeys: 0 },
    local: { siswa: local.siswa.length, kelas: local.kelas.length, absensi: local.absensi.length, logNotifikasiWA: local.logs.length, pendingMutations, orphanAbsensi: 0, orphanLogWA: 0, duplicateAttendanceKeys: 0, todayLocalOnly: 0, todayRemoteOnly: 0 },
    healthy: false,
    issues: ['Belum dapat terhubung ke Supabase untuk audit.'],
  });

  const report = empty();
  const localStudentIds = new Set(local.siswa.map((s) => String(s.id)));
  const localAttendanceIds = new Set(local.absensi.map((a) => String(a.id)));
  const localAttendanceKeys = new Map<string, number>();
  for (const a of local.absensi) {
    const key = keyOf(String(a.siswa_id), a.tanggal, a.jenis);
    localAttendanceKeys.set(key, (localAttendanceKeys.get(key) || 0) + 1);
  }
  report.local.orphanAbsensi = local.absensi.filter((a) => !localStudentIds.has(String(a.siswa_id))).length;
  report.local.orphanLogWA = local.logs.filter((l) => !localAttendanceIds.has(String(l.absensi_id))).length;
  report.local.duplicateAttendanceKeys = [...localAttendanceKeys.values()].filter((n) => n > 1).length;

  if (!navigator.onLine || !supabaseConfig.url || !supabaseConfig.anonKey) return report;
  const supabase = getSupabaseClient(supabaseConfig);
  if (!supabase) return report;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return report;
  report.online = true;

  const [students, classes, attendance, logs] = await Promise.all([
    supabase.from('siswa').select('id,nisn'),
    supabase.from('kelas').select('id'),
    supabase.from('absensi').select('id,siswa_id,tanggal,jenis'),
    supabase.from('log_notifikasi_wa').select('id,absensi_id,siswa_id'),
  ]);
  const errors = [students.error, classes.error, attendance.error, logs.error].filter(Boolean);
  if (errors.length) {
    report.issues = errors.map((e) => String(e?.message || e));
    return report;
  }

  const remoteStudents = students.data || [];
  const remoteClasses = classes.data || [];
  const remoteAttendance = attendance.data || [];
  const remoteLogs = logs.data || [];
  report.remote.siswa = remoteStudents.length;
  report.remote.kelas = remoteClasses.length;
  report.remote.absensi = remoteAttendance.length;
  report.remote.logNotifikasiWA = remoteLogs.length;

  const remoteStudentIds = new Set(remoteStudents.map((s) => String(s.id)));
  const remoteAttendanceIds = new Set(remoteAttendance.map((a) => String(a.id)));
  report.remote.orphanAbsensi = remoteAttendance.filter((a) => !remoteStudentIds.has(String(a.siswa_id))).length;
  report.remote.orphanLogWA = remoteLogs.filter((l) => !remoteAttendanceIds.has(String(l.absensi_id))).length;
  const remoteKeys = new Map<string, number>();
  for (const a of remoteAttendance) {
    const key = keyOf(String(a.siswa_id), a.tanggal, a.jenis);
    remoteKeys.set(key, (remoteKeys.get(key) || 0) + 1);
  }
  report.remote.duplicateAttendanceKeys = [...remoteKeys.values()].filter((n) => n > 1).length;

  const issues: string[] = [];
  if (report.remote.orphanAbsensi) issues.push(`${report.remote.orphanAbsensi} absensi Supabase tidak memiliki siswa yang valid.`);
  if (report.remote.orphanLogWA) issues.push(`${report.remote.orphanLogWA} log WhatsApp Supabase tidak memiliki absensi yang valid.`);
  if (report.remote.duplicateAttendanceKeys) issues.push(`${report.remote.duplicateAttendanceKeys} kombinasi absensi duplikat ditemukan di Supabase.`);
  if (report.local.orphanAbsensi) issues.push(`${report.local.orphanAbsensi} absensi lokal menunjuk ke siswa yang tidak ada di cache lokal.`);
  if (report.local.orphanLogWA) issues.push(`${report.local.orphanLogWA} log WhatsApp lokal menunjuk ke absensi yang tidak ada.`);
  if (report.local.duplicateAttendanceKeys) issues.push(`${report.local.duplicateAttendanceKeys} kombinasi absensi duplikat ditemukan di lokal.`);
  if (pendingMutations) issues.push(`${pendingMutations} perubahan masih menunggu sinkronisasi.`);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const localToday = new Set(local.absensi.filter((a) => a.tanggal === today && a.synced).map((a) => keyOf(String(a.siswa_id), a.tanggal, a.jenis)));
  const remoteToday = new Set(remoteAttendance.filter((a) => a.tanggal === today).map((a) => keyOf(String(a.siswa_id), a.tanggal, a.jenis)));
  report.local.todayLocalOnly = [...localToday].filter((k) => !remoteToday.has(k)).length;
  report.local.todayRemoteOnly = [...remoteToday].filter((k) => !localToday.has(k)).length;
  if (report.local.todayLocalOnly) issues.push(`${report.local.todayLocalOnly} absensi hari ini tercatat lokal tetapi belum terlihat di Supabase.`);
  if (report.local.todayRemoteOnly) issues.push(`${report.local.todayRemoteOnly} absensi hari ini ada di Supabase tetapi belum terlihat di lokal.`);

  report.issues = issues;
  report.healthy = report.online && issues.length === 0;
  if (report.healthy) report.issues = ['Tidak ditemukan masalah integritas data.'];
  return report;
}
