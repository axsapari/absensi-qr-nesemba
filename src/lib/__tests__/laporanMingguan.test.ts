import { describe, expect, it } from 'vitest';
import { rentangMingguLalu, susunLaporanKepsek } from '../laporanMingguan';

describe('rentangMingguLalu', () => {
  it('Senin -> Senin-Minggu pekan sebelumnya', () => {
    expect(rentangMingguLalu('2026-10-26')).toEqual({ start: '2026-10-19', end: '2026-10-25' });
  });
  it('Rabu & Minggu tetap pekan sebelumnya dari pekan berjalan', () => {
    expect(rentangMingguLalu('2026-10-28')).toEqual({ start: '2026-10-19', end: '2026-10-25' });
    expect(rentangMingguLalu('2026-10-25')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
  });
  it('melewati pergantian bulan/tahun', () => {
    expect(rentangMingguLalu('2027-01-04')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
  });
});

describe('susunLaporanKepsek', () => {
  const kelas: any[] = [
    { id: 'a', nama_kelas: 'VII-A', tingkat: '7' }, { id: 'b', nama_kelas: 'VII-B', tingkat: '7' },
    { id: 'c', nama_kelas: 'VIII-A', tingkat: '8' }, { id: 'd', nama_kelas: 'VIII-B', tingkat: '8' },
  ];
  const siswa: any[] = kelas.flatMap((k) => ['1', '2'].map((n) => ({ id: `${k.id}${n}`, nama: `S ${k.id}${n}`, nisn: `${k.id}${n}`, kelas_id: k.id, status_aktif: true })));
  const hari = ['2026-10-19', '2026-10-20', '2026-10-21'];
  const masuk = (id: string, t: string): any => ({ id: id + t, siswa_id: id, tanggal: t, jenis: 'masuk', status: 'tepat_waktu', waktu_scan: '06:30:00', timestamp: 1 });
  const pulang = (id: string, t: string): any => ({ ...masuk(id, t), jenis: 'pulang', id: 'p' + id + t });
  // kelas a & b hadir penuh; c separuh; d hanya satu siswa hadir
  const absensi = [
    ...siswa.filter((s) => ['a', 'b'].includes(s.kelas_id)).flatMap((s) => hari.flatMap((t) => [masuk(s.id, t), pulang(s.id, t)])),
    ...hari.flatMap((t) => [masuk('c1', t), pulang('c1', t)]),
    ...hari.flatMap((t) => [masuk('d1', t), pulang('d1', t)]),
  ];
  const lap = susunLaporanKepsek(
    { siswaList: siswa, kelasList: kelas, absensi, catatan: [], isHariEfektif: () => true, hariIni: '2026-10-26' },
    '2026-10-19', '2026-10-25'
  );

  it('menghitung persen sekolah dari hari efektif ber-data', () => {
    expect(lap.pekan.hariEfektif).toBe(3);
    expect(lap.pekan.persen).toBe(75); // 6 + 2 dari 8 siswa penuh? (a1,a2,b1,b2,c1,d1)=6 dari 8
  });
  it('kelas terbaik dan terlemah', () => {
    expect(lap.kelasTerbaik.map((k) => k.kelas.nama_kelas)).toEqual(expect.arrayContaining(['VII-A', 'VII-B']));
    expect(lap.kelasTerlemah.map((k) => k.kelas.nama_kelas)).toContain('VIII-B');
  });
  it('siswa yang alfa tiga hari masuk daftar perhatian', () => {
    expect(lap.perhatian.some((x) => x.metrik.siswa.id === 'c2')).toBe(true);
  });
  it('pekan sebelumnya tanpa hari efektif -> selisih null', () => {
    expect(lap.selisihPersen).toBeNull();
  });
});
