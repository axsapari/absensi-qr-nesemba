import { describe, expect, it } from 'vitest';
import { hitungSiswa, hitungTanggalEfektif, rentangBulan, siswaAktif, statusHari } from '../rekapKehadiran';

const dow = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay();
const efektifSenJum = (d: string) => dow(d) !== 0 && dow(d) !== 6;
const masuk = (id: string, t: string, status: 'tepat_waktu' | 'terlambat'): any => ({ siswa_id: id, tanggal: t, jenis: 'masuk', status, timestamp: 1 });
const catatan = (id: string, t: string, status: string): any => ({ siswa_id: id, tanggal: t, status });

describe('hari efektif', () => {
  const ada = new Set(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07']);
  const opsi = { ...rentangBulan(2026, 9), todayStr: '2026-10-07', isHariEfektif: efektifSenJum, tanggalAdaData: ada };

  it('tidak menghitung Minggu 4 Oktober meski ada scan', () => {
    const ef = hitungTanggalEfektif(opsi);
    expect(ef).not.toContain('2026-10-04');
    expect(ef).toHaveLength(5);
  });
  it('tidak menghitung hari setelah hari ini', () => {
    expect(hitungTanggalEfektif({ ...opsi, todayStr: '2026-10-02' })).toEqual(['2026-10-01', '2026-10-02']);
  });
  it('tidak menghitung hari tanpa data (mis. libur belum didaftarkan)', () => {
    expect(hitungTanggalEfektif({ ...opsi, tanggalAdaData: new Set(['2026-10-01']) })).toEqual(['2026-10-01']);
  });
});

describe('status & hitungan siswa', () => {
  const ef = ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'];
  const absensi = [masuk('a', '2026-10-01', 'tepat_waktu'), masuk('a', '2026-10-04', 'tepat_waktu'), masuk('a', '2026-10-05', 'terlambat')];
  const cat = [catatan('a', '2026-10-02', 'sakit'), catatan('a', '2026-10-06', 'tidak_bawa_kartu'), catatan('a', '2026-10-07', 'izin')];

  it('sakit, izin, tidak bawa kartu tidak dihitung alpa', () => {
    const h = hitungSiswa('a', ef, absensi, cat);
    expect(h).toMatchObject({ totalHadir: 3, totalSakit: 1, totalIzin: 1, totalTanpaKartu: 1, totalAlfa: 0, persentase: 60 });
    expect(h.perTanggal['2026-10-06']).toBe('tidak_bawa_kartu');
  });
  it('scan di hari non-efektif diabaikan', () => {
    expect(hitungSiswa('a', ef, absensi, cat).totalTepatWaktu).toBe(1);
  });
  it('siswa tanpa data dihitung alfa semua', () => {
    expect(hitungSiswa('b', ef, absensi, cat)).toMatchObject({ totalAlfa: 5, persentase: 0 });
  });
  it('prioritas: bolos > scan > tidak bawa kartu > izin/sakit/alpa', () => {
    expect(statusHari({ status: 'tepat_waktu' }, { status: 'bolos' })).toBe('bolos');
    expect(statusHari({ status: 'terlambat' }, { status: 'izin' })).toBe('terlambat');
    expect(statusHari(undefined, { status: 'tidak_bawa_kartu' })).toBe('tidak_bawa_kartu');
    expect(statusHari(undefined, undefined)).toBe('kosong');
  });
  it('tanpa hari efektif, persentase 0 tanpa error', () => {
    expect(hitungSiswa('a', [], absensi, cat).persentase).toBe(0);
  });
});

describe('siswa aktif', () => {
  it('membuang siswa nonaktif', () => {
    expect(siswaAktif([{ status_aktif: true }, { status_aktif: false }, {}] as any)).toHaveLength(2);
  });
});
