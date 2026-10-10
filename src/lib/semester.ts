/**
 * Semester sekolah Indonesia:
 *   Ganjil : 1 Juli  - 31 Desember  (tahun ajaran y/y+1)
 *   Genap  : 1 Januari - 30 Juni    (tahun ajaran y-1/y)
 */
export interface Semester {
  id: string;             // mis. "2026-2027-ganjil"
  jenis: 'ganjil' | 'genap';
  tahunAjaran: string;    // "2026/2027"
  mulai: string;          // YYYY-MM-DD
  selesai: string;        // YYYY-MM-DD
  label: string;          // "Semester Ganjil 2026/2027"
}

const buat = (jenis: 'ganjil' | 'genap', tahunMulaiTA: number): Semester => {
  const ta = `${tahunMulaiTA}/${tahunMulaiTA + 1}`;
  return jenis === 'ganjil'
    ? { id: `${tahunMulaiTA}-${tahunMulaiTA + 1}-ganjil`, jenis, tahunAjaran: ta, mulai: `${tahunMulaiTA}-07-01`, selesai: `${tahunMulaiTA}-12-31`, label: `Semester Ganjil ${ta}` }
    : { id: `${tahunMulaiTA}-${tahunMulaiTA + 1}-genap`, jenis, tahunAjaran: ta, mulai: `${tahunMulaiTA + 1}-01-01`, selesai: `${tahunMulaiTA + 1}-06-30`, label: `Semester Genap ${ta}` };
};

export function semesterDari(dateStr: string): Semester {
  const [y, m] = dateStr.split('-').map(Number);
  if (m >= 7) return buat('ganjil', y);
  return buat('genap', y - 1);
}

/** Semester berjalan + (jumlah-1) semester sebelumnya, terbaru dulu. */
export function daftarSemester(today: string, jumlah = 6): Semester[] {
  const out: Semester[] = [];
  let cur = semesterDari(today);
  for (let i = 0; i < jumlah; i++) {
    out.push(cur);
    const awal = cur.mulai;
    const [y, m] = awal.split('-').map(Number);
    // mundur satu hari dari awal semester => masuk semester sebelumnya
    const prev = new Date(y, m - 1, 0);
    cur = semesterDari(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`);
  }
  return out;
}

export const semesterSudahBerakhir = (s: Semester, today: string): boolean => s.selesai < today;
export const tanggalDalam = (t: string, s: { mulai: string; selesai: string }): boolean => t >= s.mulai && t <= s.selesai;
