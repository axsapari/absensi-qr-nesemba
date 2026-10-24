import type { Absensi, CatatanKehadiran, Kelas, Siswa } from '../types';
import { hitungTanggalEfektif } from './rekapKehadiran';
import {
  daftarPerluTindakan, hitungMetrikTindakan, ringkasKelas,
  type PerluTindakan, type PeringkatKelas, type MetrikTindakan,
} from './rekapTindakan';

/**
 * Ringkasan satu halaman untuk kepala sekolah: kehadiran sekolah satu minggu, kelas terbaik/terlemah,
 * dan siswa yang perlu perhatian. Logika murni; PDF-nya dibuat di laporanMingguanPdf.ts.
 */

const tambahHari = (tgl: string, n: number): string => {
  const [y, m, d] = tgl.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
};

/** Senin–Minggu pekan SEBELUM tanggal yang diberikan (mis. dipanggil Senin pagi → pekan lalu). */
export function rentangMingguLalu(hariIni: string): { start: string; end: string } {
  const [y, m, d] = hariIni.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Min
  const mundurKeSenin = dow === 0 ? 6 : dow - 1;
  const seninIni = tambahHari(hariIni, -mundurKeSenin);
  const start = tambahHari(seninIni, -7);
  return { start, end: tambahHari(start, 6) };
}

export interface RingkasanPekan {
  start: string;
  end: string;
  hariEfektif: number;
  jumlahSiswa: number;
  persen: number;
  hadir: number;
  terlambat: number;
  tanpaKartu: number;
  dispensasi: number;
  izin: number;
  sakit: number;
  alfa: number;
  bolos: number;
  tidakPulang: number;
  kelas: PeringkatKelas[];
  perhatian: PerluTindakan[];
  metrik: MetrikTindakan[];
}

export interface InputLaporan {
  siswaList: Siswa[];
  kelasList: Kelas[];
  absensi: Absensi[];
  catatan: CatatanKehadiran[];
  isHariEfektif: (tanggal: string) => boolean;
  hariIni: string;
}

export function ringkasPekan(i: InputLaporan, start: string, end: string): RingkasanPekan {
  const aktif = i.siswaList.filter((s) => s.status_aktif !== false);
  const ids = new Set(aktif.map((s) => s.id));
  const ada = new Set<string>();
  i.absensi.forEach((a) => { if (ids.has(a.siswa_id)) ada.add(a.tanggal); });
  i.catatan.forEach((c) => { if (ids.has(c.siswa_id)) ada.add(c.tanggal); });
  const tanggal = hitungTanggalEfektif({ start, end, todayStr: i.hariIni, isHariEfektif: i.isHariEfektif, tanggalAdaData: ada });
  const metrik = hitungMetrikTindakan(aktif, i.kelasList, i.absensi, i.catatan, tanggal);
  const sum = (f: (m: MetrikTindakan) => number) => metrik.reduce((n, m) => n + f(m), 0);
  const hari = sum((m) => m.totalDaysRecorded);
  const hadir = sum((m) => m.totalHadir);
  return {
    start, end, hariEfektif: tanggal.length, jumlahSiswa: metrik.length,
    persen: hari > 0 ? Math.round((hadir / hari) * 1000) / 10 : 0,
    hadir,
    terlambat: sum((m) => m.totalTerlambat),
    tanpaKartu: sum((m) => m.totalTanpaKartu),
    dispensasi: sum((m) => m.totalDispensasi),
    izin: sum((m) => m.totalIzin),
    sakit: sum((m) => m.totalSakit),
    alfa: sum((m) => m.totalAlfa),
    bolos: sum((m) => m.totalBolos),
    tidakPulang: sum((m) => m.totalTidakPulang),
    kelas: ringkasKelas(metrik, i.kelasList),
    perhatian: daftarPerluTindakan(metrik),
    metrik,
  };
}

export interface LaporanKepsek {
  pekan: RingkasanPekan;
  sebelumnya: RingkasanPekan;
  /** selisih persen kehadiran dibanding pekan sebelumnya; null bila pekan sebelumnya tidak punya hari efektif */
  selisihPersen: number | null;
  kelasTerbaik: PeringkatKelas[];
  kelasTerlemah: PeringkatKelas[];
  perhatian: PerluTindakan[];
}

export function susunLaporanKepsek(i: InputLaporan, start: string, end: string, topKelas = 3, topSiswa = 8): LaporanKepsek {
  const pekan = ringkasPekan(i, start, end);
  const mulaiLalu = tambahHari(start, -7);
  const sebelumnya = ringkasPekan(i, mulaiLalu, tambahHari(mulaiLalu, 6));
  const urut = [...pekan.kelas]; // sudah menurun menurut persen
  const kelasTerbaik = urut.slice(0, topKelas);
  const kelasTerlemah = urut.length > topKelas ? urut.slice(-topKelas).reverse() : [];
  return {
    pekan, sebelumnya,
    selisihPersen: sebelumnya.hariEfektif > 0 ? Math.round((pekan.persen - sebelumnya.persen) * 10) / 10 : null,
    kelasTerbaik, kelasTerlemah,
    perhatian: pekan.perhatian.slice(0, topSiswa),
  };
}

export const namaBerkasLaporanKepsek = (start: string, end: string) => `Laporan_Kehadiran_Mingguan_${start}_sd_${end}.pdf`;
