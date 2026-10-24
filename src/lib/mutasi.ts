import type { Siswa } from '../types';

/**
 * Mutasi siswa bertanggal.
 *
 * Siswa yang keluar (pindah/lulus/berhenti) diberi `tanggal_keluar` = hari TERAKHIR siswa masih
 * dihitung. Rekap periode yang mencakup tanggal sebelum/sama dengan itu tetap menghitung siswa
 * tersebut; tanggal sesudahnya tidak. Siswa nonaktif TANPA tanggal_keluar (data lama) tetap tidak
 * dihitung sama sekali, seperti perilaku sebelumnya.
 */
export type AlasanKeluar = 'pindah' | 'lulus' | 'berhenti' | 'lainnya';

export const LABEL_ALASAN_KELUAR: Record<AlasanKeluar, string> = {
  pindah: 'Pindah sekolah',
  lulus: 'Lulus',
  berhenti: 'Berhenti / putus sekolah',
  lainnya: 'Lainnya',
};

type SiswaMutasi = Pick<Siswa, 'status_aktif' | 'tanggal_keluar'>;

/** Apakah siswa masih terdaftar (dihitung) pada tanggal tertentu. */
export function terdaftarPada(s: SiswaMutasi, tanggal: string): boolean {
  if (s.status_aktif !== false) return true;
  return !!s.tanggal_keluar && tanggal <= s.tanggal_keluar;
}

/** Siswa yang dihitung pada rentang: aktif, atau nonaktif tetapi keluar pada/setelah tanggal mulai. */
export function siswaDalamRentang<T extends SiswaMutasi>(list: T[], start: string, end: string): T[] {
  return list.filter((s) => {
    if (s.status_aktif !== false) return true;
    return !!s.tanggal_keluar && s.tanggal_keluar >= start && start <= end;
  });
}

/** Tanggal efektif yang berlaku untuk siswa ini (dipotong pada tanggal keluar). */
export function tanggalUntukSiswa(s: SiswaMutasi, tanggalEfektif: string[]): string[] {
  if (s.status_aktif !== false) return tanggalEfektif;
  return tanggalEfektif.filter((t) => terdaftarPada(s, t));
}

export function labelKeluar(s: Pick<Siswa, 'alasan_keluar' | 'tanggal_keluar' | 'keterangan_keluar'>): string {
  if (!s.tanggal_keluar && !s.alasan_keluar) return '';
  const alasan = s.alasan_keluar ? LABEL_ALASAN_KELUAR[s.alasan_keluar] : 'Nonaktif';
  const tgl = s.tanggal_keluar ? ` sejak ${s.tanggal_keluar}` : '';
  const ket = s.keterangan_keluar ? ` (${s.keterangan_keluar})` : '';
  return `${alasan}${tgl}${ket}`;
}
