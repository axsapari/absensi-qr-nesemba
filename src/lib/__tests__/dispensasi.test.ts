import { describe, expect, it } from 'vitest';
import { hitungSiswa, statusHari } from '../rekapKehadiran';
import { hitungRekapMakanSiang, jumlahkanRekap } from '../lunchRecap';
import { rencanakanDispensasi, tanggalDispensasi } from '../dispensasi';

const masuk = (id: string, t: string): any => ({ siswa_id: id, tanggal: t, jenis: 'masuk', status: 'tepat_waktu', timestamp: 1 });
const catatan = (id: string, t: string, status: string): any => ({ id: `${id}-${t}`, siswa_id: id, tanggal: t, status });

describe('dispensasi di rekap kehadiran', () => {
  it('dihitung hadir, bukan alpa/izin/sakit, dan terpisah dari tanpa kartu', () => {
    const ef = ['2026-10-05', '2026-10-06'];
    const h = hitungSiswa('a', ef, [], [catatan('a', '2026-10-05', 'dispensasi'), catatan('a', '2026-10-06', 'tidak_bawa_kartu')]);
    expect(h).toMatchObject({ totalHadir: 2, totalDispensasi: 1, totalTanpaKartu: 1, totalAlfa: 0, totalIzin: 0, totalSakit: 0, persentase: 100 });
    expect(h.perTanggal['2026-10-05']).toBe('dispensasi');
  });
  it('dispensasi mengalahkan scan masuk, bolos mengalahkan dispensasi', () => {
    expect(statusHari({ status: 'tepat_waktu' }, { status: 'dispensasi' })).toBe('dispensasi');
    expect(statusHari(undefined, { status: 'bolos' })).toBe('bolos');
  });
});

describe('dispensasi di rekap makan siang', () => {
  const kelas: any[] = [{ id: 'k1', nama_kelas: 'VII-A' }];
  const siswa: any[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, nama: id, kelas_id: 'k1', status_aktif: true }));
  const tgl = '2026-10-05';
  const absensi = [masuk('a', tgl), masuk('b', tgl), masuk('c', tgl)]; // c scan pagi lalu berangkat lomba
  const cat = [catatan('c', tgl, 'dispensasi'), catatan('d', tgl, 'sakit')];

  it('dispensasi tidak masuk porsi (walau sudah scan pagi) dan dihitung terpisah', () => {
    const [r] = hitungRekapMakanSiang({ siswaList: siswa, kelasList: kelas, absensiList: absensi, catatanList: cat, tanggal: tgl, kurangiBelumScan: false });
    expect(r).toMatchObject({ total: 5, dispensasi: 1, sakit: 1, belumScan: 1, porsi: 3 });
  });
  it('total keseluruhan menjumlahkan dispensasi', () => {
    const rows = hitungRekapMakanSiang({ siswaList: siswa, kelasList: kelas, absensiList: absensi, catatanList: cat, tanggal: tgl, kurangiBelumScan: true });
    expect(jumlahkanRekap(rows)).toMatchObject({ dispensasi: 1, porsi: 2 });
  });
});

describe('perencanaan dispensasi', () => {
  const efektif = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay() % 6 !== 0;
  it('hanya hari efektif dalam rentang', () => {
    expect(tanggalDispensasi('2026-10-02', '2026-10-06', efektif)).toEqual(['2026-10-02', '2026-10-05', '2026-10-06']);
  });
  it('memberi tahu catatan lain yang akan ditimpa, bukan dispensasi sebelumnya', () => {
    const r = rencanakanDispensasi(['a', 'b'], ['2026-10-05'], [catatan('a', '2026-10-05', 'sakit'), catatan('b', '2026-10-05', 'dispensasi')]);
    expect(r.jumlahCatatan).toBe(2);
    expect(r.menimpa).toHaveLength(1);
  });
});
