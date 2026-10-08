import { Absensi, CatatanKehadiran, Kelas, Siswa } from '../types';
import { sortKelas } from './classUtils';

/**
 * Hitung porsi makan siang per kelas untuk satu tanggal.
 *
 * Prioritas penentuan status tiap siswa aktif:
 *   1. Catatan bolos                       -> mengurangi porsi (walau sudah scan pagi)
 *   2. Ada scan masuk                      -> hadir
 *   3. Catatan tidak_bawa_kartu            -> hadir (hanya informasi)
 *   4. Catatan sakit / izin / alpa         -> mengurangi porsi
 *   5. Tanpa scan & tanpa catatan          -> "belum scan" (dikurangi bila kurangiBelumScan = true)
 *
 * porsi = total - sakit - izin - alpa - bolos (- belumScan bila kurangiBelumScan)
 */
export interface RekapKelasMakan {
  kelasId: string;
  namaKelas: string;
  total: number;
  sakit: number;
  izin: number;
  alpa: number;
  bolos: number;
  tanpaKartu: number;
  belumScan: number;
  porsi: number;
}

export function hitungRekapMakanSiang(input: {
  siswaList: Siswa[];
  kelasList: Kelas[];
  absensiList: Absensi[];
  catatanList: CatatanKehadiran[];
  tanggal: string;
  kurangiBelumScan: boolean;
}): RekapKelasMakan[] {
  const { siswaList, kelasList, absensiList, catatanList, tanggal, kurangiBelumScan } = input;
  const scanMasukIds = new Set(
    absensiList.filter((a) => a.tanggal === tanggal && a.jenis === 'masuk').map((a) => a.siswa_id)
  );
  const catatanMap = new Map(
    catatanList.filter((c) => c.tanggal === tanggal).map((c) => [c.siswa_id, c.status])
  );

  return sortKelas(kelasList).map((kelas) => {
    const siswaKelas = siswaList.filter((s) => s.kelas_id === kelas.id && s.status_aktif !== false);
    let sakit = 0, izin = 0, alpa = 0, bolos = 0, tanpaKartu = 0, belumScan = 0;

    for (const s of siswaKelas) {
      const catatan = catatanMap.get(s.id);
      if (catatan === 'bolos') { bolos++; continue; }
      if (scanMasukIds.has(s.id)) continue;
      if (catatan === 'sakit') sakit++;
      else if (catatan === 'izin') izin++;
      else if (catatan === 'alpa') alpa++;
      else if (catatan === 'tidak_bawa_kartu') tanpaKartu++;
      else belumScan++;
    }

    const total = siswaKelas.length;
    const pengurang = sakit + izin + alpa + bolos + (kurangiBelumScan ? belumScan : 0);
    return {
      kelasId: kelas.id,
      namaKelas: kelas.nama_kelas,
      total, sakit, izin, alpa, bolos, tanpaKartu, belumScan,
      porsi: Math.max(0, total - pengurang),
    };
  });
}

export function jumlahkanRekap(rows: RekapKelasMakan[]) {
  return rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      sakit: acc.sakit + r.sakit,
      izin: acc.izin + r.izin,
      alpa: acc.alpa + r.alpa,
      bolos: acc.bolos + (r.bolos ?? 0),
      tanpaKartu: acc.tanpaKartu + r.tanpaKartu,
      belumScan: acc.belumScan + r.belumScan,
      porsi: acc.porsi + r.porsi,
    }),
    { total: 0, sakit: 0, izin: 0, alpa: 0, bolos: 0, tanpaKartu: 0, belumScan: 0, porsi: 0 }
  );
}
