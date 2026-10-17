import type { HariInfo, HariKhusus, TipeHariKhusus } from '../types';
import { enumerasiTanggal } from './rekapKehadiran';

/**
 * Logika murni Kalender Akademik (tanpa React / penyimpanan) agar mudah diuji.
 * Tahun ajaran berjalan 1 Juli - 30 Juni. Semester Ganjil = Jul-Des, Genap = Jan-Jun.
 */

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export type JenisKegiatan = 'libur' | 'non_kbm' | 'tetap_efektif' | 'pulang_cepat';

export const JENIS_KEGIATAN: Record<JenisKegiatan, { label: string; deskripsi: string }> = {
  libur: { label: 'Libur sekolah', deskripsi: 'Libur semester, libur awal Ramadhan, dsb. Tidak dihitung hari efektif.' },
  non_kbm: { label: 'Kegiatan non-KBM', deskripsi: 'Class meeting, rapat dewan guru, dsb. Tidak dihitung hari efektif.' },
  tetap_efektif: { label: 'Kegiatan tetap hari efektif', deskripsi: 'PTS/PAS, upacara, dsb. Siswa tetap hadir dan dihitung hari efektif.' },
  pulang_cepat: { label: 'Pulang cepat', deskripsi: 'Hari efektif dengan jam pulang dimajukan.' },
};

export const TEMPLATE_KEGIATAN: { nama: string; jenis: JenisKegiatan }[] = [
  { nama: 'Libur Semester Ganjil', jenis: 'libur' },
  { nama: 'Libur Semester Genap / Kenaikan Kelas', jenis: 'libur' },
  { nama: 'Libur Awal Ramadhan', jenis: 'libur' },
  { nama: 'Libur Hari Raya Idul Fitri', jenis: 'libur' },
  { nama: 'Class Meeting', jenis: 'non_kbm' },
  { nama: 'Pembagian Rapor', jenis: 'non_kbm' },
  { nama: 'Penilaian Tengah Semester (PTS)', jenis: 'tetap_efektif' },
  { nama: 'Penilaian Akhir Semester (PAS)', jenis: 'tetap_efektif' },
];

/** Petakan jenis kegiatan ke bentuk HariKhusus yang dipahami getHariInfo. */
export function kategoriDariJenis(j: JenisKegiatan): { kategori: TipeHariKhusus; isEfektifKBM: boolean } {
  switch (j) {
    case 'libur': return { kategori: 'libur_khusus', isEfektifKBM: false };
    case 'non_kbm': return { kategori: 'libur_khusus', isEfektifKBM: false };
    case 'tetap_efektif': return { kategori: 'kegiatan_khusus', isEfektifKBM: true };
    case 'pulang_cepat': return { kategori: 'pulang_cepat', isEfektifKBM: true };
  }
}

export function labelKategori(h: Pick<HariKhusus, 'kategori' | 'isEfektifKBM'>): string {
  if (h.kategori === 'pulang_cepat') return 'Pulang cepat';
  if (h.kategori === 'kegiatan_khusus') return 'Tetap hari efektif';
  if (h.kategori === 'libur_khusus' || h.isEfektifKBM === false) return 'Tidak efektif';
  return 'Hari khusus';
}

export const rentangTahunAjaran = (tahunMulai: number) => ({
  mulai: `${tahunMulai}-07-01`,
  selesai: `${tahunMulai + 1}-06-30`,
});

export function tahunAjaranDariTanggal(dateStr: string): number {
  const [y, m] = dateStr.split('-').map(Number);
  return m >= 7 ? y : y - 1;
}

/**
 * Tanggal-tanggal yang benar-benar perlu ditandai untuk satu rentang:
 * melewati hari yang sudah bukan hari efektif (akhir pekan / libur nasional / sudah libur sekolah),
 * kecuali untuk kegiatan yang tetap efektif / pulang cepat (hanya berlaku di hari efektif).
 */
export function tanggalUntukDitandai(
  mulai: string,
  selesai: string,
  jenis: JenisKegiatan,
  getInfo: (d: string) => HariInfo
): string[] {
  return enumerasiTanggal(mulai, selesai).filter((d) => {
    const info = getInfo(d);
    if (info.isWeekend || info.isLiburNasional) return false;
    if (jenis === 'libur' || jenis === 'non_kbm') return !info.isLiburKhusus;
    return info.isHariEfektif;
  });
}

export interface RingkasanBulan {
  tahun: number;
  bulan0: number;
  label: string;
  hariKalender: number;
  akhirPekan: number;
  liburNasional: number;
  liburSekolah: number;
  efektif: number;
  pulangCepat: number;
  semester: 'ganjil' | 'genap';
}

export interface RingkasanTahunAjaran {
  bulan: RingkasanBulan[];
  totalGanjil: number;
  totalGenap: number;
  totalSetahun: number;
}

export function ringkasanTahunAjaran(tahunMulai: number, getInfo: (d: string) => HariInfo): RingkasanTahunAjaran {
  const bulan: RingkasanBulan[] = [];
  for (let i = 0; i < 12; i++) {
    const m0 = (6 + i) % 12; // Juli = 6
    const tahun = i < 6 ? tahunMulai : tahunMulai + 1;
    const mm = String(m0 + 1).padStart(2, '0');
    const akhir = new Date(Date.UTC(tahun, m0 + 1, 0)).getUTCDate();
    const r: RingkasanBulan = {
      tahun, bulan0: m0, label: `${NAMA_BULAN[m0]} ${tahun}`,
      hariKalender: akhir, akhirPekan: 0, liburNasional: 0, liburSekolah: 0, efektif: 0, pulangCepat: 0,
      semester: i < 6 ? 'ganjil' : 'genap',
    };
    for (const d of enumerasiTanggal(`${tahun}-${mm}-01`, `${tahun}-${mm}-${String(akhir).padStart(2, '0')}`)) {
      const info = getInfo(d);
      if (info.isWeekend) r.akhirPekan++;
      else if (info.isLiburNasional) r.liburNasional++;
      else if (info.isLiburKhusus) r.liburSekolah++;
      else {
        r.efektif++;
        if (info.isPulangCepat) r.pulangCepat++;
      }
    }
    bulan.push(r);
  }
  const totalGanjil = bulan.filter((b) => b.semester === 'ganjil').reduce((n, b) => n + b.efektif, 0);
  const totalGenap = bulan.filter((b) => b.semester === 'genap').reduce((n, b) => n + b.efektif, 0);
  return { bulan, totalGanjil, totalGenap, totalSetahun: totalGanjil + totalGenap };
}

export interface KelompokKegiatan {
  nama: string;
  label: string;
  kategori: TipeHariKhusus;
  mulai: string;
  selesai: string;
  jumlahHari: number;
  ids: string[];
  keterangan?: string;
  jamPulangKustom?: string;
}

const hariBerikut = (d: string): string => {
  const [y, m, dd] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd + 1));
  return t.toISOString().slice(0, 10);
};

/** Gabungkan tanggal berurutan dengan nama & kategori sama menjadi satu baris rentang. */
export function kelompokkanKegiatan(items: HariKhusus[], getInfo?: (d: string) => HariInfo): KelompokKegiatan[] {
  const sorted = [...items].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const out: KelompokKegiatan[] = [];
  for (const h of sorted) {
    const last = out[out.length - 1];
    if (last && last.nama === h.nama && last.kategori === h.kategori && last.label === labelKategori(h) &&
        (h.tanggal === hariBerikut(last.selesai) || sambungOlehHariLibur(last.selesai, h.tanggal, getInfo))) {
      last.selesai = h.tanggal; last.jumlahHari++; last.ids.push(h.id);
    } else {
      out.push({
        nama: h.nama, label: labelKategori(h), kategori: h.kategori, mulai: h.tanggal, selesai: h.tanggal,
        jumlahHari: 1, ids: [h.id], keterangan: h.keterangan, jamPulangKustom: h.jamPulangKustom,
      });
    }
  }
  return out;
}

// Akhir pekan dan libur nasional tidak ditandai, jadi dua tanggal yang hanya dipisah hari-hari itu tetap satu rentang.
function sambungOlehHariLibur(a: string, b: string, getInfo?: (d: string) => HariInfo): boolean {
  let cur = hariBerikut(a);
  let guard = 0;
  while (cur < b && guard++ < 14) {
    const dow = new Date(cur + 'T00:00:00Z').getUTCDay();
    const libur = dow === 0 || dow === 6 || (getInfo ? getInfo(cur).isWeekend || getInfo(cur).isLiburNasional : false);
    if (!libur) return false;
    cur = hariBerikut(cur);
  }
  return cur === b;
}

export const formatTanggalId = (d: string): string => {
  const [y, m, dd] = d.split('-').map(Number);
  return `${dd} ${NAMA_BULAN[m - 1]} ${y}`;
};

export const formatRentangId = (a: string, b: string): string =>
  a === b ? formatTanggalId(a) : `${formatTanggalId(a)} – ${formatTanggalId(b)}`;
