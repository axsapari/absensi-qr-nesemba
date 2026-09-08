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
    return siswa.foto_url.trim();
  }

  if (supabaseUrl && supabaseUrl.trim()) {
    const base = supabaseUrl.trim().replace(/\/$/, '');
    return `${base}/storage/v1/object/public/${FOTO_SISWA_BUCKET}/${siswa.nisn}.jpg`;
  }

  return getFotoPlaceholder(siswa.jenis_kelamin);
}

export function getFotoPlaceholder(jenisKelamin: 'L' | 'P'): string {
  return jenisKelamin === 'P'
    ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80';
}
