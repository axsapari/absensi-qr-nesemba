import { Kelas, Siswa } from '../types';

/**
 * Urutan kelas sekolah: tingkat 7 -> 8 -> 9, lalu rombel A -> B -> C ...
 * Tidak bergantung pada urutan data dari Supabase/localStorage.
 */
export function sortKelas<T extends Kelas>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tingkatA = Number(a.tingkat) || 99;
    const tingkatB = Number(b.tingkat) || 99;
    if (tingkatA !== tingkatB) return tingkatA - tingkatB;

    const suffixA = (a.nama_kelas.match(/[- ]([A-Z])$/i)?.[1] || a.nama_kelas).toUpperCase();
    const suffixB = (b.nama_kelas.match(/[- ]([A-Z])$/i)?.[1] || b.nama_kelas).toUpperCase();
    return suffixA.localeCompare(suffixB, 'id');
  });
}

/** Urutkan siswa berdasarkan kelas sekolah, kemudian nama siswa. */
export function sortSiswaByKelas<T extends Siswa>(items: T[], kelasList: Kelas[]): T[] {
  const rank = new Map(sortKelas(kelasList).map((k, index) => [k.id, index]));
  return [...items].sort((a, b) => {
    const classDiff = (rank.get(a.kelas_id) ?? 9999) - (rank.get(b.kelas_id) ?? 9999);
    if (classDiff !== 0) return classDiff;
    return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
  });
}
