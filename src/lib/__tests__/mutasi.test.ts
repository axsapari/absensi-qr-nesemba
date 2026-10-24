import { describe, expect, it } from 'vitest';
import { siswaDalamRentang, tanggalUntukSiswa, terdaftarPada, labelKeluar } from '../mutasi';
import { hitungArsip } from '../arsipSemester';
import { rencanakanNaikKelas, perubahanUrungkan, buatDataUrungkan } from '../naikKelas';

const aktif: any = { status_aktif: true };
const pindah: any = { status_aktif: false, tanggal_keluar: '2026-10-10' };
const lama: any = { status_aktif: false };

describe('mutasi siswa bertanggal', () => {
  it('terdaftarPada', () => {
    expect(terdaftarPada(aktif, '2026-12-01')).toBe(true);
    expect(terdaftarPada(pindah, '2026-10-10')).toBe(true);
    expect(terdaftarPada(pindah, '2026-10-11')).toBe(false);
    expect(terdaftarPada(lama, '2026-10-01')).toBe(false);
  });
  it('siswaDalamRentang: yang keluar sebelum periode tidak ikut, yang keluar di tengah ikut', () => {
    const l = [aktif, pindah, lama];
    expect(siswaDalamRentang(l, '2026-10-01', '2026-10-31')).toEqual([aktif, pindah]);
    expect(siswaDalamRentang(l, '2026-11-01', '2026-11-30')).toEqual([aktif]);
    expect(siswaDalamRentang(l, '2026-10-10', '2026-10-10')).toEqual([aktif, pindah]);
  });
  it('tanggalUntukSiswa memotong pada tanggal keluar', () => {
    const t = ['2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13'];
    expect(tanggalUntukSiswa(pindah, t)).toEqual(['2026-10-08', '2026-10-09']);
    expect(tanggalUntukSiswa(aktif, t)).toEqual(t);
  });
  it('label', () => {
    expect(labelKeluar({ alasan_keluar: 'pindah', tanggal_keluar: '2026-10-10', keterangan_keluar: 'SMPN 1' })).toBe('Pindah sekolah sejak 2026-10-10 (SMPN 1)');
    expect(labelKeluar({})).toBe('');
  });
});

describe('arsip semester dengan siswa keluar', () => {
  const kelas: any[] = [{ id: 'k1', nama_kelas: 'VII-A', tingkat: '7' }];
  const mk = (id: string, nisn: string, extra: any = {}): any => ({ id, nisn, nama: id, kelas_id: 'k1', status_aktif: true, ...extra });
  const masuk = (id: string, tanggal: string): any => ({ id: id + tanggal, siswa_id: id, tanggal, jenis: 'masuk', status: 'tepat_waktu', timestamp: Date.parse(tanggal) });
  const hari = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'];
  const input = (siswa: any[]) => ({
    siswaList: siswa, kelasList: kelas, catatan: [], resolveNisn: (id: string) => ({ a: '1', b: '2', c: '3' } as any)[id],
    absensi: [...hari.map((t) => masuk('a', t)), masuk('b', '2026-10-05'), masuk('b', '2026-10-06'), masuk('c', '2026-10-05'), masuk('c', '2026-10-06')],
  });

  it('siswa pindah tidak diberi alpa setelah tanggal keluar', () => {
    const h = hitungArsip(input([mk('a', '1'), mk('b', '2', { status_aktif: false, tanggal_keluar: '2026-10-06' })]));
    const b = h.perSiswa.find((s) => s.nisn === '2')!;
    expect(b).toMatchObject({ hariEfektif: 2, hadir: 2, tanpaKeterangan: 0, persen: 100 });
    expect(h.perSiswa.find((s) => s.nisn === '1')).toMatchObject({ hariEfektif: 4, persen: 100 });
  });
  it('data lama tanpa tanggal keluar dipotong pada hari terakhir ada data', () => {
    const h = hitungArsip(input([mk('a', '1'), mk('c', '3', { status_aktif: false })]));
    expect(h.perSiswa.find((s) => s.nisn === '3')).toMatchObject({ hariEfektif: 2, hadir: 2, tanpaKeterangan: 0 });
  });
});

describe('naik kelas mencatat tanggal keluar lulusan', () => {
  const kelas: any[] = [{ id: 'k9', nama_kelas: 'IX-A', tingkat: '9' }];
  const siswa: any[] = [{ id: 's1', nama: 'x', nisn: '1', kelas_id: 'k9', status_aktif: true }];
  it('lulus: status nonaktif + tanggal & alasan; urungkan mengosongkannya', () => {
    const r = rencanakanNaikKelas(siswa, kelas, new Set(), '2026-07-01');
    expect(r.perubahan[0].data).toMatchObject({ status_aktif: false, tanggal_keluar: '2026-07-01', alasan_keluar: 'lulus' });
    const u = buatDataUrungkan(siswa, r.perubahan, 1, '2025/2026');
    expect(perubahanUrungkan(u, siswa)[0].data).toMatchObject({ status_aktif: true, tanggal_keluar: null });
  });
});
