import { idbSet } from './idbStore';
import type { Absensi } from '../types';

export const ABSENSI_IDB_KEY = 'absensi_records_v1';
/** Salinan kecil di localStorage (dibaca sinkron saat aplikasi dibuka): hari terakhir + semua yang belum tersinkron. */
export const JENDELA_LOKAL_HARI = 45;

function kurangiHari(tanggal: string, hari: number): string {
  const d = new Date(tanggal + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - hari);
  return d.toISOString().slice(0, 10);
}

/** Baris yang cukup disimpan di localStorage: tanggal >= hari ini - N, atau belum tersinkron (tidak boleh hilang). */
export function jendelaLokal(list: Absensi[], today: string, hari = JENDELA_LOKAL_HARI): Absensi[] {
  const batas = kurangiHari(today, hari);
  return list.filter((a) => !a.synced || a.tanggal >= batas);
}

/** Gabungkan riwayat penuh dari IndexedDB ke daftar yang sedang aktif. Data aktif menang untuk id yang sama. */
export function gabungRiwayat(aktif: Absensi[], dariIdb: Absensi[]): Absensi[] {
  const ada = new Set(aktif.map((a) => a.id));
  const tambahan = dariIdb.filter((a) => a && a.id && !ada.has(a.id));
  if (tambahan.length === 0) return aktif;
  return [...aktif, ...tambahan].sort((a, b) => a.timestamp - b.timestamp);
}

/** Penulis IndexedDB yang menggabungkan permintaan beruntun: selalu menulis data TERBARU, tidak menumpuk. */
export function buatPenulisRiwayat(tulis: (v: Absensi[]) => Promise<boolean> = (v) => idbSet(ABSENSI_IDB_KEY, v)) {
  let sedang = false;
  let tertunda: Absensi[] | null = null;
  const jalan = async () => {
    if (sedang) return;
    sedang = true;
    try {
      while (tertunda) {
        const data = tertunda;
        tertunda = null;
        await tulis(data);
      }
    } finally {
      sedang = false;
    }
  };
  return (data: Absensi[]) => { tertunda = data; void jalan(); };
}
