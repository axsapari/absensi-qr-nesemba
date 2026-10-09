/**
 * Batas tanggal penarikan riwayat absensi dari Supabase.
 *
 * Dulu setiap sinkron menarik SELURUH riwayat absensi sepanjang masa (1000 baris per permintaan),
 * sehingga makin lama makin berat. Sekarang hanya menarik jendela terbaru:
 *
 *  - perangkat baru / belum pernah menarik : sejak awal semester berjalan
 *                                            (Semester Ganjil mulai 1 Juli, Genap mulai 1 Januari)
 *  - sinkron berikutnya                    : sejak yang lebih awal antara
 *                                            (tanggal tarik terakhir - 3 hari) dan (hari ini - 14 hari)
 *    sehingga perangkat yang lama mati tetap mengejar semua yang terlewat, dan penghapusan/koreksi
 *    di perangkat lain dalam 2 minggu terakhir ikut terbawa.
 *  - "Tarik seluruh riwayat" (manual)      : tanpa batas (null)
 */
export const HISTORY_PULL_KEY = 'absensi_history_pull_v1';
export const HISTORY_OVERLAP_DAYS = 3;
export const HISTORY_MIN_WINDOW_DAYS = 14;

const pad = (n: number) => String(n).padStart(2, '0');

export function geserTanggal(dateStr: string, hari: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + hari);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function awalSemester(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return m >= 7 ? `${y}-07-01` : `${y}-01-01`;
}

export function hitungBatasTarik(input: { today: string; lastPull: string | null; full?: boolean }): string | null {
  const { today, lastPull, full } = input;
  if (full) return null;
  if (!lastPull || !/^\d{4}-\d{2}-\d{2}$/.test(lastPull)) return awalSemester(today);
  const a = geserTanggal(lastPull, -HISTORY_OVERLAP_DAYS);
  const b = geserTanggal(today, -HISTORY_MIN_WINDOW_DAYS);
  return a < b ? a : b;
}
