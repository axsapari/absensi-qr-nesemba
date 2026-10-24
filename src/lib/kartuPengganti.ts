import type { Siswa } from '../types';

export type AlasanKartu = 'hilang' | 'rusak' | 'lainnya';
export const LABEL_ALASAN_KARTU: Record<AlasanKartu, string> = {
  hilang: 'Hilang',
  rusak: 'Rusak / tidak terbaca',
  lainnya: 'Lainnya',
};

/** Perubahan data siswa saat satu kartu pengganti dicetak: jumlah +1, tanggal & alasan terakhir. */
export function catatKartuPengganti(
  s: Pick<Siswa, 'kartu_ganti_jumlah'>,
  alasan: AlasanKartu,
  tanggal: string
): Pick<Siswa, 'kartu_ganti_jumlah' | 'kartu_ganti_terakhir' | 'kartu_ganti_alasan'> {
  return {
    kartu_ganti_jumlah: (s.kartu_ganti_jumlah ?? 0) + 1,
    kartu_ganti_terakhir: tanggal,
    kartu_ganti_alasan: alasan,
  };
}

export function labelKartuPengganti(s: Pick<Siswa, 'kartu_ganti_jumlah' | 'kartu_ganti_terakhir' | 'kartu_ganti_alasan'>): string {
  const n = s.kartu_ganti_jumlah ?? 0;
  if (n <= 0) return '';
  const alasan = s.kartu_ganti_alasan ? `, terakhir ${LABEL_ALASAN_KARTU[s.kartu_ganti_alasan].toLowerCase()}` : '';
  const tgl = s.kartu_ganti_terakhir ? ` pada ${s.kartu_ganti_terakhir}` : '';
  return `Diganti ${n}x${alasan}${tgl}`;
}

/** Siswa yang sering lupa kartu sebaiknya diperiksa: kartu rusak/hilang atau perlu pembinaan. */
export const AMBANG_SARAN_CETAK_ULANG = 3;
