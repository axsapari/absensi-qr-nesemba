import { CatatanKehadiran } from '../types';
import { enumerasiTanggal } from './rekapKehadiran';

/** Tanggal yang akan diberi dispensasi: hanya hari efektif dalam rentang (akhir pekan/libur dilewati). */
export function tanggalDispensasi(start: string, end: string, isHariEfektif: (d: string) => boolean): string[] {
  return enumerasiTanggal(start, end).filter(isHariEfektif);
}

export interface RencanaDispensasi {
  tanggal: string[];
  jumlahSiswa: number;
  jumlahCatatan: number;
  /** catatan lain (izin/sakit/bolos/alpa/tidak bawa kartu) yang akan tertimpa */
  menimpa: CatatanKehadiran[];
}

export function rencanakanDispensasi(
  siswaIds: string[],
  tanggal: string[],
  catatanList: CatatanKehadiran[]
): RencanaDispensasi {
  const ids = new Set(siswaIds);
  const tgl = new Set(tanggal);
  const menimpa = catatanList.filter(
    (c) => ids.has(c.siswa_id) && tgl.has(c.tanggal) && c.status !== 'dispensasi'
  );
  return { tanggal, jumlahSiswa: ids.size, jumlahCatatan: ids.size * tgl.size, menimpa };
}
