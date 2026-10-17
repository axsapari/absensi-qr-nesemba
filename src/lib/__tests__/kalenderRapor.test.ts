import { describe, expect, it } from 'vitest';
import { getHariInfo } from '../holidayUtils';
import { INDONESIAN_NATIONAL_HOLIDAYS } from '../../data/nationalHolidays';
import { kelompokkanKegiatan, ringkasanTahunAjaran, tanggalUntukDitandai } from '../kalenderAkademik';
import { bangunBarisRapor, bangunWorkbookRapor } from '../rekapRapor';

const jam: any = { hari_aktif_sekolah: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] };

describe('kalender akademik', () => {
  it('menandai libur semester tanpa akhir pekan & libur nasional, dan mengurangi hari efektif', () => {
    let custom: any[] = [];
    const info = (d: string) => getHariInfo(d, INDONESIAN_NATIONAL_HOLIDAYS, custom, jam);
    const sebelum = ringkasanTahunAjaran(2026, info);
    const tgl = tanggalUntukDitandai('2026-12-21', '2027-01-02', 'libur', info);
    expect(tgl).toHaveLength(8);
    expect(tgl).not.toContain('2026-12-25');
    custom = tgl.map((t, i) => ({ id: 'c' + i, tanggal: t, nama: 'Libur Semester', kategori: 'libur_khusus', isEfektifKBM: false, sumber: 'sekolah' }));
    const sesudah = ringkasanTahunAjaran(2026, info);
    expect(sesudah.totalSetahun).toBe(sebelum.totalSetahun - 8);
    const kel = kelompokkanKegiatan(custom, info);
    expect(kel).toHaveLength(1);
    expect(kel[0].jumlahHari).toBe(8);
  });
});

describe('rekap rapor', () => {
  const hasil: any = {
    perSiswa: [
      { nisn: '1', nama: 'A', kelas: '7A', kelasId: 'k1', hariEfektif: 10, hadir: 6, tepatWaktu: 5, terlambat: 1, tanpaKartu: 0, izin: 1, sakit: 2, bolos: 1, alpa: 0, tanpaKeterangan: 0, persen: 60 },
      { nisn: '2', nama: 'B', kelas: '7A', kelasId: 'k1', hariEfektif: 10, hadir: 10, tepatWaktu: 10, terlambat: 0, tanpaKartu: 0, izin: 0, sakit: 0, bolos: 0, alpa: 0, tanpaKeterangan: 0, persen: 100 },
    ],
  };
  const siswa: any[] = [{ nisn: '1', status_aktif: true }, { nisn: '2', status_aktif: false }];

  it('mengeluarkan siswa nonaktif dan menggabung bolos ke tanpa keterangan', () => {
    const b = bangunBarisRapor(hasil, siswa);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ sakit: 2, izin: 1, tanpaKeterangan: 1 });
  });
  it('workbook: sheet Ringkasan pertama + satu sheet per kelas', () => {
    const wb = bangunWorkbookRapor({
      semester: { id: 'x', jenis: 'ganjil', tahunAjaran: '2026/2027', mulai: '', selesai: '', label: 'Semester Ganjil 2026/2027' },
      sekolah: 'SMPN 9', baris: bangunBarisRapor(hasil, siswa), kelasList: [{ id: 'k1', nama_kelas: '7A', wali_kelas: 'Bu X', tingkat: '7' } as any], hariEfektif: 10,
    });
    expect(wb.SheetNames).toEqual(['Ringkasan', '7A']);
  });
});
