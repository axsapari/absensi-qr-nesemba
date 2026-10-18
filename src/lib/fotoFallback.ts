/**
 * Cadangan pemuatan foto siswa.
 *
 * Foto diambil dari URL berakhiran ekstensi (mis. .../foto-siswa/0123456789.jpg). Bila file di
 * Storage ternyata bernama lain (.jpeg / .png / .webp, atau huruf besar), gambar gagal dimuat dan
 * sebelumnya langsung diganti gambar kartun. Fungsi ini mencoba ekstensi lain terlebih dahulu.
 *
 * Dipakai di handler onError <img>:
 *     if (nextFotoCandidate(e.target as HTMLImageElement)) return;
 *     ...(kode lama: pasang placeholder)
 */
export const FOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP'];

const EXT_RE = /\.(jpe?g|png|webp)(\?[^#]*)?(#.*)?$/i;

/** URL yang sama dengan parameter anti-cache agar browser tidak memakai hasil gagal sebelumnya. */
export function urlCobaUlang(url: string): string {
  const [tanpaHash, hash = ''] = url.split('#');
  const sambung = tanpaHash.includes('?') ? '&' : '?';
  return `${tanpaHash}${sambung}coba=${Date.now()}${hash ? '#' + hash : ''}`;
}

/** Daftar URL alternatif (tanpa URL awal) untuk satu URL foto. Kosong bila bukan URL berekstensi gambar. */
export function fotoAlternatives(url: string): string[] {
  const m = EXT_RE.exec(url);
  if (!m || url.startsWith('data:')) return [];
  const base = url.slice(0, m.index);
  const tail = (m[2] || '') + (m[3] || '');
  const current = m[1];
  return FOTO_EXTENSIONS.filter((ext) => ext !== current).map((ext) => `${base}.${ext}${tail}`);
}

/**
 * Pasang URL alternatif berikutnya pada <img> yang gagal dimuat.
 * Mengembalikan true bila masih ada kandidat (pemanggil cukup `return`), false bila sudah habis
 * (pemanggil lanjut memasang gambar placeholder).
 */
export function nextFotoCandidate(img: HTMLImageElement): boolean {
  const original = img.dataset.fotoAsal || img.src;
  if (!img.dataset.fotoAsal) img.dataset.fotoAsal = original;
  // Gangguan jaringan sesaat sering terbaca sebagai "foto tidak ada". Coba ulang URL yang sama
  // sekali (dengan penanda anti-cache) sebelum menjajal ekstensi lain / memasang placeholder.
  if (!img.dataset.fotoUlang && /^https?:/i.test(original)) {
    img.dataset.fotoUlang = '1';
    img.src = urlCobaUlang(original);
    return true;
  }
  const alts = fotoAlternatives(original);
  const tried = Number(img.dataset.fotoCoba || '0');
  if (tried >= alts.length) return false;
  img.dataset.fotoCoba = String(tried + 1);
  img.src = alts[tried];
  return true;
}
