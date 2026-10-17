import type { Absensi, CatatanKehadiran, Siswa } from '../types';

/**
 * Logika murni untuk rekap kehadiran periodik (bulanan / rentang), supaya mudah diuji
 * dan dipakai bersama oleh dashboard, matriks, cetak, ekspor, dan arsip.
 *
 * Aturan:
 *  - Hanya siswa aktif (status_aktif !== false) yang dihitung.
 *  - Hari efektif = hari yang menurut kalender sekolah efektif (bukan Sabtu/Minggu/libur)
 *    DAN sudah ada data (scan/catatan) pada hari itu, dan tidak melewati hari ini.
 *    Scan di hari non-efektif (mis. Minggu) diabaikan.
 *  - Prioritas status per siswa per hari:
 *    bolos > scan masuk (tepat/terlambat) > tidak bawa kartu (dihitung hadir)
 *    > izin / sakit / alpa > tanpa keterangan.
 */

export type StatusHari =
  | 'tepat_waktu'
  | 'terlambat'
  | 'tidak_bawa_kartu'
  | 'izin'
  | 'sakit'
  | 'bolos'
  | 'alpa'
  | 'kosong';

export const siswaAktif = <T extends Pick<Siswa, 'status_aktif'>>(list: T[]): T[] =>
  list.filter((s) => s.status_aktif !== false);

/** Daftar tanggal YYYY-MM-DD dari start s/d end (inklusif), aman terhadap zona waktu. */
export function enumerasiTanggal(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start || !end || start > end) return out;
  const [y, m, d] = start.split('-').map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  const last = end;
  for (let i = 0; i < 800; i++) {
    const s = cur.toISOString().slice(0, 10);
    if (s > last) break;
    out.push(s);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function rentangBulan(tahun: number, bulan0: number): { start: string; end: string } {
  const mm = String(bulan0 + 1).padStart(2, '0');
  const lastDay = new Date(Date.UTC(tahun, bulan0 + 1, 0)).getUTCDate();
  return { start: `${tahun}-${mm}-01`, end: `${tahun}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

export interface OpsiHariEfektif {
  start: string;
  end: string;
  todayStr: string;
  isHariEfektif: (dateStr: string) => boolean;
  /** tanggal yang punya minimal satu scan/catatan */
  tanggalAdaData: ReadonlySet<string>;
}

export function hitungTanggalEfektif(o: OpsiHariEfektif): string[] {
  return enumerasiTanggal(o.start, o.end).filter(
    (d) => d <= o.todayStr && o.tanggalAdaData.has(d) && o.isHariEfektif(d)
  );
}

export function statusHari(
  scanMasuk: Pick<Absensi, 'status'> | undefined,
  catatan: Pick<CatatanKehadiran, 'status'> | undefined
): StatusHari {
  if (catatan?.status === 'bolos') return 'bolos';
  if (scanMasuk) return scanMasuk.status === 'terlambat' ? 'terlambat' : 'tepat_waktu';
  if (catatan?.status === 'tidak_bawa_kartu') return 'tidak_bawa_kartu';
  if (catatan?.status === 'izin') return 'izin';
  if (catatan?.status === 'sakit') return 'sakit';
  if (catatan?.status === 'alpa') return 'alpa';
  return 'kosong';
}

export interface HitunganSiswa {
  perTanggal: Record<string, StatusHari>;
  totalHadir: number;
  totalTepatWaktu: number;
  totalTerlambat: number;
  totalTanpaKartu: number;
  totalIzin: number;
  totalSakit: number;
  totalBolos: number;
  /** alpa yang tercatat eksplisit */
  totalAlpa: number;
  /** hari efektif tanpa scan maupun catatan */
  totalTanpaKeterangan: number;
  /** alpa tercatat + tanpa keterangan (yang tampil sebagai "A") */
  totalAlfa: number;
  totalPulang: number;
  totalDaysRecorded: number;
  persentase: number;
}

export function hitungSiswa(
  siswaId: string,
  tanggalEfektif: string[],
  absensiList: Absensi[],
  catatanList: CatatanKehadiran[]
): HitunganSiswa {
  const efektif = new Set(tanggalEfektif);
  const masuk = new Map<string, Absensi>();
  let totalPulang = 0;
  for (const a of absensiList) {
    if (a.siswa_id !== siswaId || !efektif.has(a.tanggal)) continue;
    if (a.jenis === 'masuk') {
      if (!masuk.has(a.tanggal)) masuk.set(a.tanggal, a);
    } else totalPulang++;
  }
  const catatan = new Map<string, CatatanKehadiran>();
  for (const c of catatanList) {
    if (c.siswa_id !== siswaId || !efektif.has(c.tanggal)) continue;
    const prev = catatan.get(c.tanggal);
    // bila ada beberapa catatan di hari yang sama, bolos menang
    if (!prev || c.status === 'bolos') catatan.set(c.tanggal, c);
  }

  const h: HitunganSiswa = {
    perTanggal: {},
    totalHadir: 0, totalTepatWaktu: 0, totalTerlambat: 0, totalTanpaKartu: 0,
    totalIzin: 0, totalSakit: 0, totalBolos: 0, totalAlpa: 0, totalTanpaKeterangan: 0,
    totalAlfa: 0, totalPulang, totalDaysRecorded: tanggalEfektif.length, persentase: 0,
  };
  for (const d of tanggalEfektif) {
    const st = statusHari(masuk.get(d), catatan.get(d));
    h.perTanggal[d] = st;
    switch (st) {
      case 'tepat_waktu': h.totalTepatWaktu++; h.totalHadir++; break;
      case 'terlambat': h.totalTerlambat++; h.totalHadir++; break;
      case 'tidak_bawa_kartu': h.totalTanpaKartu++; h.totalHadir++; break;
      case 'izin': h.totalIzin++; break;
      case 'sakit': h.totalSakit++; break;
      case 'bolos': h.totalBolos++; break;
      case 'alpa': h.totalAlpa++; break;
      default: h.totalTanpaKeterangan++;
    }
  }
  h.totalAlfa = h.totalAlpa + h.totalTanpaKeterangan;
  h.persentase = tanggalEfektif.length > 0 ? Math.round((h.totalHadir / tanggalEfektif.length) * 100) : 0;
  return h;
}
