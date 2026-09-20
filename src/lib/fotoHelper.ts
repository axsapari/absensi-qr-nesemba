import { Siswa } from '../types';

// Nama bucket Supabase Storage tempat menyimpan foto siswa.
// Buat bucket ini di Supabase Dashboard > Storage, dan set sebagai PUBLIC bucket.
export const FOTO_SISWA_BUCKET = 'foto-siswa';

/**
 * Menentukan URL foto siswa yang dipakai di seluruh aplikasi.
 *
 * Prioritas:
 * 1. Kalau siswa punya `foto_url` yang diisi manual (link custom), pakai itu.
 * 2. Kalau tidak, dan Supabase sudah dikonfigurasi, otomatis susun URL dari
 *    Supabase Storage berdasarkan NISN siswa -- SYARAT: nama file foto yang
 *    diupload ke bucket "foto-siswa" harus persis <NISN>.jpg (contoh: 0012345678.jpg).
 *    Dengan begini, cukup upload 300 file foto sekaligus (nama = NISN masing-masing),
 *    TANPA perlu mengetik URL satu-satu untuk tiap siswa.
 * 3. Kalau Supabase belum dikonfigurasi, pakai foto placeholder generik.
 *
 * Kalau foto belum diupload untuk NISN tertentu, browser akan gagal memuat gambar
 * ini -- pasang `onError` di <img> pemanggil untuk otomatis jatuh ke placeholder.
 */
export function getFotoSiswaUrl(
  siswa: Pick<Siswa, 'foto_url' | 'nisn' | 'jenis_kelamin'>,
  supabaseUrl: string
): string {
  if (siswa.foto_url && siswa.foto_url.trim()) {
    const customUrl = siswa.foto_url.trim();
    if (!/images\.unsplash\.com/i.test(customUrl)) return customUrl;
    // Legacy demo data used stock portraits. Replace those with the local cartoon placeholder.
    return getFotoPlaceholder(siswa.jenis_kelamin);
  }

  if (supabaseUrl && supabaseUrl.trim()) {
    const base = supabaseUrl.trim().replace(/\/$/, '');
    return `${base}/storage/v1/object/public/${FOTO_SISWA_BUCKET}/${siswa.nisn}.jpg`;
  }

  return getFotoPlaceholder(siswa.jenis_kelamin);
}

export function getFotoPlaceholder(jenisKelamin: 'L' | 'P'): string {
  // Placeholder lokal berbentuk ilustrasi kartun siswa/siswi SMP.
  // Tidak menggunakan foto orang nyata atau layanan gambar eksternal.
  const isFemale = jenisKelamin === 'P';
  const hair = isFemale
    ? '<path d="M34 92c0-39 18-61 56-61s56 22 56 61v17H34z" fill="#2f2a26"/><path d="M36 87c4-20 19-33 54-33s50 13 54 33" fill="#3b312b"/>'
    : '<path d="M37 78c3-30 22-47 53-47s50 17 53 47c-18-10-37-14-53-14S55 68 37 78z" fill="#2f2a26"/>';
  const ribbon = isFemale ? '<path d="M45 65c-10-10-23-4-25 7 11-2 19 3 25 10z" fill="#f59e0b"/><path d="M135 65c10-10 23-4 25 7-11-2-19 3-25 10z" fill="#f59e0b"/>' : '';
  const shirt = isFemale ? '#ec4899' : '#3b82f6';
  const label = isFemale ? 'SISWI SMP' : 'SISWA SMP';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 240"><rect width="180" height="240" rx="18" fill="#eef2ff"/><circle cx="90" cy="104" r="58" fill="#f8c9a9"/>${hair}${ribbon}<circle cx="68" cy="105" r="5" fill="#1f2937"/><circle cx="112" cy="105" r="5" fill="#1f2937"/><path d="M73 132c10 8 24 8 34 0" fill="none" stroke="#9a3412" stroke-width="4" stroke-linecap="round"/><path d="M35 236c4-52 25-74 55-74s51 22 55 74" fill="${shirt}"/><path d="M70 163l20 28 20-28" fill="#fff" opacity=".8"/><text x="90" y="220" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#fff">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
