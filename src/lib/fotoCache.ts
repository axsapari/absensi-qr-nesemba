/**
 * Ingatan foto siswa di perangkat (mengurangi permintaan ke Supabase Storage).
 *
 *  - foto yang ADA  : disimpan di Cache Storage browser (tahan tutup-buka aplikasi), lalu dipakai
 *                     lewat blob URL selama TTL_ADA_MS, tanpa permintaan jaringan.
 *  - foto yang TIDAK ADA di Storage: diingat selama TTL_HILANG_MS supaya tidak ditanyakan terus
 *                     (tiap foto hilang dulu memicu 1 + 7 permintaan ekstensi pada setiap tampilan).
 *
 * File ini hanya memegang status; pengambilan fotonya ada di fotoMuat.ts.
 */
export const NAMA_CACHE_FOTO = 'foto-siswa-v1';
export const KUNCI_FOTO_HILANG = 'absensi_foto_hilang_v1';
export const TTL_ADA_MS = 24 * 60 * 60 * 1000;
export const TTL_HILANG_MS = 6 * 60 * 60 * 1000;
export const HEADER_WAKTU = 'x-disimpan-pada';

const dalamMemori = new Map<string, { blobUrl: string; waktu: number }>();
let hilang: Record<string, number> | null = null;

function bacaHilang(): Record<string, number> {
  if (hilang) return hilang;
  try {
    const mentah = localStorage.getItem(KUNCI_FOTO_HILANG);
    hilang = mentah ? (JSON.parse(mentah) as Record<string, number>) : {};
  } catch {
    hilang = {};
  }
  return hilang;
}

function simpanHilang() {
  try {
    localStorage.setItem(KUNCI_FOTO_HILANG, JSON.stringify(hilang ?? {}));
  } catch {
    /* penyimpanan penuh/diblokir: ingatan tetap berlaku selama sesi */
  }
}

export function fotoHilang(url: string, sekarang = Date.now()): boolean {
  const t = bacaHilang()[url];
  if (!t) return false;
  if (sekarang - t > TTL_HILANG_MS) {
    delete bacaHilang()[url];
    return false;
  }
  return true;
}

export function tandaiFotoHilang(url: string, sekarang = Date.now()): void {
  const peta = bacaHilang();
  if (peta[url] && sekarang - peta[url] < 60_000) return; // sudah baru ditandai
  peta[url] = sekarang;
  simpanHilang();
}

export function hapusTandaHilang(url: string): void {
  if (bacaHilang()[url]) {
    delete bacaHilang()[url];
    simpanHilang();
  }
}

/** Blob URL foto yang masih segar di memori, atau null. */
export function fotoDariCache(url: string, sekarang = Date.now()): string | null {
  const e = dalamMemori.get(url);
  if (!e) return null;
  if (sekarang - e.waktu > TTL_ADA_MS) return null;
  return e.blobUrl;
}

export function fotoSegar(url: string, sekarang = Date.now()): boolean {
  return fotoDariCache(url, sekarang) !== null;
}

export function catatFotoCache(url: string, blobUrl: string, waktu = Date.now()): void {
  const lama = dalamMemori.get(url);
  if (lama && lama.blobUrl !== blobUrl) {
    try { URL.revokeObjectURL(lama.blobUrl); } catch { /* abaikan */ }
  }
  dalamMemori.set(url, { blobUrl, waktu });
  hapusTandaHilang(url);
}

/** Buang semua ingatan foto (dipakai saat petugas menekan Sinkron Data / diagnosa foto). */
export async function bersihkanCacheFoto(): Promise<void> {
  for (const e of dalamMemori.values()) {
    try { URL.revokeObjectURL(e.blobUrl); } catch { /* abaikan */ }
  }
  dalamMemori.clear();
  hilang = {};
  simpanHilang();
  try {
    if (typeof caches !== 'undefined') await caches.delete(NAMA_CACHE_FOTO);
  } catch {
    /* abaikan */
  }
}

/** Muat ulang foto yang tersimpan di Cache Storage ke memori (dipanggil sekali saat aplikasi dibuka). */
export async function hidrasiCacheFoto(): Promise<number> {
  try {
    if (typeof caches === 'undefined') return 0;
    const cache = await caches.open(NAMA_CACHE_FOTO);
    const kunci = await cache.keys();
    let n = 0;
    for (const req of kunci) {
      if (dalamMemori.has(req.url)) continue;
      const res = await cache.match(req);
      if (!res) continue;
      const waktu = Number(res.headers.get(HEADER_WAKTU) || '0');
      if (!waktu || Date.now() - waktu > TTL_ADA_MS) {
        await cache.delete(req);
        continue;
      }
      const blob = await res.blob();
      dalamMemori.set(req.url, { blobUrl: URL.createObjectURL(blob), waktu });
      n++;
    }
    return n;
  } catch {
    return 0;
  }
}
