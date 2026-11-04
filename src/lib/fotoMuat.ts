import { fotoAlternatives } from './fotoFallback';
import {
  HEADER_WAKTU, NAMA_CACHE_FOTO, catatFotoCache, fotoHilang, fotoSegar, tandaiFotoHilang,
} from './fotoCache';

export type HasilMuatFoto = 'ada' | 'hilang' | 'galat';

export type AmbilFn = (url: string) => Promise<{ ok: boolean; status: number; blob: () => Promise<Blob> }>;

/**
 * Pastikan satu foto ada di ingatan perangkat. Hanya bertanya ke server bila fotonya belum
 * tersimpan/kedaluwarsa dan belum diketahui hilang. Bila .jpg tidak ada, ekstensi lain dicoba SEKALI
 * (hasilnya diingat, jadi tampilan berikutnya tidak mengulang).
 */
export async function muatFotoKeCache(url: string, ambil: AmbilFn = (u) => fetch(u)): Promise<HasilMuatFoto> {
  if (fotoSegar(url)) return 'ada';
  if (fotoHilang(url)) return 'hilang';
  const kandidat = [url, ...fotoAlternatives(url)];
  let adaGalat = false;
  for (const u of kandidat) {
    try {
      const res = await ambil(u);
      if (res.ok) {
        const blob = await res.blob();
        try {
          if (typeof caches !== 'undefined') {
            const cache = await caches.open(NAMA_CACHE_FOTO);
            await cache.put(url, new Response(blob, { headers: { 'content-type': blob.type || 'image/jpeg', [HEADER_WAKTU]: String(Date.now()) } }));
          }
        } catch { /* cache storage tak tersedia: cukup memori */ }
        catatFotoCache(url, URL.createObjectURL(blob));
        return 'ada';
      }
      if (res.status !== 400 && res.status !== 404) adaGalat = true; // 5xx dsb: bukan berarti fotonya tidak ada
    } catch {
      adaGalat = true; // jaringan/CORS
    }
  }
  if (adaGalat) return 'galat';
  tandaiFotoHilang(url);
  return 'hilang';
}
