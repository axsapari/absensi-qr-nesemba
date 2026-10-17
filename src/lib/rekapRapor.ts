import * as XLSX from 'xlsx';
import type { Kelas, Siswa } from '../types';
import type { HasilArsip, BarisSiswa } from './arsipSemester';
import type { Semester } from './semester';
import { sortKelas } from './classUtils';

/**
 * Rekap kehadiran untuk isian rapor: Sakit, Izin, Tanpa Keterangan per siswa per semester.
 *  - Tanpa Keterangan = alpa tercatat + bolos + hari efektif tanpa scan/catatan
 *  - "Tidak bawa kartu" dihitung hadir (siswa datang ke sekolah)
 *  - Hanya siswa aktif yang dimuat (siswa pindah/lulus tidak perlu rapor)
 */
export interface BarisRapor {
  nisn: string; nama: string; kelas: string; kelasId: string;
  sakit: number; izin: number; tanpaKeterangan: number; hadir: number; hariEfektif: number; persen: number;
}

export function bangunBarisRapor(hasil: Pick<HasilArsip, 'perSiswa'>, siswaList: Siswa[]): BarisRapor[] {
  const aktif = new Set(siswaList.filter((s) => s.status_aktif !== false).map((s) => String(s.nisn).trim()));
  return hasil.perSiswa
    .filter((r: BarisSiswa) => aktif.has(r.nisn))
    .map((r) => ({
      nisn: r.nisn, nama: r.nama, kelas: r.kelas, kelasId: r.kelasId,
      sakit: r.sakit, izin: r.izin,
      tanpaKeterangan: r.alpa + r.bolos + r.tanpaKeterangan,
      hadir: r.hadir, hariEfektif: r.hariEfektif, persen: r.persen,
    }));
}

const namaSheet = (s: string, dipakai: Set<string>): string => {
  let base = s.replace(/[\\/?*[\]:]/g, '-').slice(0, 28) || 'Kelas';
  let n = base, i = 2;
  while (dipakai.has(n)) n = `${base.slice(0, 25)}_${i++}`;
  dipakai.add(n);
  return n;
};

export function bangunWorkbookRapor(input: {
  semester: Semester; sekolah: string; baris: BarisRapor[]; kelasList: Kelas[]; hariEfektif: number;
}): XLSX.WorkBook {
  const { semester, sekolah, baris, kelasList, hariEfektif } = input;
  const wb = XLSX.utils.book_new();
  const dipakai = new Set<string>();
  const kop = ['No', 'NISN', 'Nama Siswa', 'Sakit', 'Izin', 'Tanpa Keterangan', 'Hadir', '% Hadir'];

  const ringkasan: (string | number)[][] = [
    [`REKAP KEHADIRAN UNTUK RAPOR - ${sekolah}`.trim()],
    [semester.label],
    [`Hari efektif semester (berdasarkan kalender sekolah & data kehadiran): ${hariEfektif} hari`],
    [],
    ['Kelas', 'Wali Kelas', 'Jumlah Siswa', 'Sakit', 'Izin', 'Tanpa Keterangan', '% Hadir Rata-rata'],
  ];

  for (const k of sortKelas(kelasList)) {
    const rows = baris.filter((b) => b.kelasId === k.id).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    if (rows.length === 0) continue;
    const aoa: (string | number)[][] = [
      [`REKAP KEHADIRAN SEMESTER - KELAS ${k.nama_kelas}`],
      [semester.label],
      [`Wali Kelas: ${k.wali_kelas || '-'}`],
      [`Jumlah hari efektif: ${hariEfektif}`],
      [],
      kop,
      ...rows.map((r, i) => [i + 1, r.nisn, r.nama, r.sakit, r.izin, r.tanpaKeterangan, r.hadir, `${r.persen}%`]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 34 }, { wch: 8 }, { wch: 8 }, { wch: 17 }, { wch: 8 }, { wch: 9 }];
    XLSX.utils.book_append_sheet(wb, ws, namaSheet(k.nama_kelas, dipakai));
    const sum = (f: (r: BarisRapor) => number) => rows.reduce((n, r) => n + f(r), 0);
    const rata = Math.round((sum((r) => r.persen) / rows.length) * 10) / 10;
    ringkasan.push([k.nama_kelas, k.wali_kelas || '-', rows.length, sum((r) => r.sakit), sum((r) => r.izin), sum((r) => r.tanpaKeterangan), `${rata}%`]);
  }

  ringkasan.push([], [
    'Catatan: "Tanpa Keterangan" = alpa + bolos + hari efektif tanpa scan/catatan. Siswa tidak bawa kartu dihitung hadir. Siswa nonaktif tidak disertakan.',
  ]);
  const wsRing = XLSX.utils.aoa_to_sheet(ringkasan);
  wsRing['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 17 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsRing, 'Ringkasan');
  // pindahkan Ringkasan ke posisi pertama
  wb.SheetNames = ['Ringkasan', ...wb.SheetNames.filter((n) => n !== 'Ringkasan')];
  return wb;
}

export const namaBerkasRapor = (s: Semester) =>
  `Rekap_Rapor_${s.jenis === 'ganjil' ? 'Ganjil' : 'Genap'}_${s.tahunAjaran.replace('/', '-')}.xlsx`;
