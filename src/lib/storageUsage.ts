/**
 * Penyimpanan browser (localStorage) hanya ±5 juta karakter per situs. Modul ini:
 *  - safeSetItem  : menulis tanpa melempar galat bila penuh (dulu galat di useEffect bisa merobohkan
 *                   seluruh aplikasi / membuat data tidak tersimpan tanpa peringatan)
 *  - ukurPenyimpanan : mengukur pemakaian per kunci untuk indikator & peringatan dini
 */
export const LOCALSTORAGE_LIMIT_CHARS = 5_000_000;
export const STORAGE_FULL_EVENT = 'absensi-storage-full';
export const STORAGE_WARN_EVENT = 'absensi-storage-warn';

export function isQuotaError(e: unknown): boolean {
  const err = e as { name?: string; code?: number } | null;
  return !!err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014);
}

/** Tulis ke localStorage. Mengembalikan false (tidak melempar) bila gagal; kasus penuh memicu event. */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (isQuotaError(e) && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STORAGE_FULL_EVENT, { detail: { key } }));
    }
    return false;
  }
}

export type LevelPenyimpanan = 'aman' | 'waspada' | 'kritis';
export interface PemakaianPenyimpanan {
  totalChars: number;
  limitChars: number;
  persen: number;
  level: LevelPenyimpanan;
  perKunci: { key: string; chars: number }[];
}

export function levelDariPersen(persen: number): LevelPenyimpanan {
  return persen >= 90 ? 'kritis' : persen >= 70 ? 'waspada' : 'aman';
}

export function ukurPenyimpanan(
  storage: Pick<Storage, 'length' | 'key' | 'getItem'> = localStorage,
  limitChars: number = LOCALSTORAGE_LIMIT_CHARS
): PemakaianPenyimpanan {
  const perKunci: { key: string; chars: number }[] = [];
  let total = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    const chars = key.length + (storage.getItem(key)?.length ?? 0);
    perKunci.push({ key, chars });
    total += chars;
  }
  perKunci.sort((a, b) => b.chars - a.chars);
  const persen = Math.min(100, Math.round((total / limitChars) * 1000) / 10);
  return { totalChars: total, limitChars, persen, level: levelDariPersen(persen), perKunci };
}

export function formatUkuran(chars: number): string {
  // 1 karakter ≈ 1 byte untuk data ASCII/JSON kita; ditampilkan sebagai perkiraan.
  if (chars >= 1_000_000) return `${(chars / 1_000_000).toFixed(2)} MB`;
  if (chars >= 1_000) return `${(chars / 1_000).toFixed(1)} KB`;
  return `${chars} B`;
}
