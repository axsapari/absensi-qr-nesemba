import type { Siswa } from '../types';
import { getFotoSiswaUrl } from './fotoHelper';

/**
 * Pemanasan foto untuk layar scan: memuat foto semua siswa aktif ke cache browser sebelum dibutuhkan,
 * sehingga saat kartu di-scan fotonya sudah ada dan tidak bergantung pada sinyal saat itu.
 * Cache bawaan Supabase hanya 1 jam, jadi dipanggil ulang berkala.
 */
export async function panaskanFotoSiswa(
  daftar: Pick<Siswa, 'foto_url' | 'nisn' | 'jenis_kelamin' | 'status_aktif'>[],
  supabaseUrl: string,
  opsi: { konkuren?: number; batalkan?: () => boolean } = {}
): Promise<{ berhasil: number; gagal: number }> {
  const urls = daftar
    .filter((s) => s.status_aktif !== false && s.nisn)
    .map((s) => getFotoSiswaUrl(s, supabaseUrl))
    .filter((u) => /^https?:/i.test(u));
  let i = 0, berhasil = 0, gagal = 0;
  const muat = (url: string) => new Promise<boolean>((res) => {
    const img = new Image();
    img.onload = () => res(true);
    img.onerror = () => res(false);
    img.src = url;
  });
  const pekerja = async () => {
    while (i < urls.length) {
      if (opsi.batalkan?.()) return;
      const url = urls[i++];
      if (await muat(url)) berhasil++; else gagal++;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opsi.konkuren ?? 4) }, pekerja));
  return { berhasil, gagal };
}
