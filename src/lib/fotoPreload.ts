import type { Siswa } from '../types';
import { getFotoSiswaUrl } from './fotoHelper';
import { hidrasiCacheFoto } from './fotoCache';
import { muatFotoKeCache } from './fotoMuat';

/**
 * Pemanasan foto: memastikan foto semua siswa aktif ada di ingatan perangkat (Cache Storage) sebelum
 * dibutuhkan, sehingga layar scan dan tabel tidak bergantung sinyal dan tidak membebani server.
 * Foto yang sudah tersimpan segar (24 jam) dan foto yang diketahui tidak ada (6 jam) dilewati,
 * jadi pemanggilan berulang hampir tanpa permintaan jaringan.
 */
export async function panaskanFotoSiswa(
  daftar: Pick<Siswa, 'foto_url' | 'nisn' | 'jenis_kelamin' | 'status_aktif'>[],
  supabaseUrl: string,
  opsi: { konkuren?: number; batalkan?: () => boolean } = {}
): Promise<{ berhasil: number; gagal: number; hilang: number }> {
  await hidrasiCacheFoto();
  const urls = daftar
    .filter((s) => s.status_aktif !== false && s.nisn)
    .map((s) => getFotoSiswaUrl(s, supabaseUrl, { abaikanCache: true }))
    .filter((u) => /^https?:/i.test(u));
  let i = 0, berhasil = 0, gagal = 0, hilang = 0;
  const pekerja = async () => {
    while (i < urls.length) {
      if (opsi.batalkan?.()) return;
      const hasil = await muatFotoKeCache(urls[i++]);
      if (hasil === 'ada') berhasil++; else if (hasil === 'hilang') hilang++; else gagal++;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opsi.konkuren ?? 4) }, pekerja));
  return { berhasil, gagal, hilang };
}
