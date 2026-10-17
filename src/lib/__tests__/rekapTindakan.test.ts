import { describe, expect, it } from 'vitest';
import { hitungTidakPulang, daftarApresiasi, daftarPerluTindakan, hitungMetrikTindakan, hitungStreak, peringkat, polaHari, ringkasKelas, sarankanTindakan, tautanWaWali } from '../rekapTindakan';

const ef = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']; // Sen-Jum
const k: any[] = [{ id: 'k1', nama_kelas: '7A', wali_kelas: 'X' }];
const mk = (id: string, nama: string): any => ({ id, nama, nisn: id, kelas_id: 'k1', status_aktif: true, nomor_wa_ortu: '0812', jenis_kelamin: 'L' });
const siswa = [mk('rajin', 'Rajin'), mk('telat', 'Telat'), mk('alpa', 'Alpa'), mk('bolos', 'Bolos'), mk('kartu', 'Kartu')];
const masuk = (id: string, t: string, s: 'tepat_waktu' | 'terlambat'): any => ({ siswa_id: id, tanggal: t, jenis: 'masuk', status: s, timestamp: 1 });
const cat = (id: string, t: string, s: string): any => ({ siswa_id: id, tanggal: t, status: s });

const pulangFix = (id: string, t: string): any => ({ siswa_id: id, tanggal: t, jenis: 'pulang', status: 'tepat_waktu', timestamp: 2 });
const absensi = [
  ...ef.map((t) => masuk('rajin', t, 'tepat_waktu')),
  ...ef.map((t) => pulangFix('rajin', t)),
  ...ef.map((t, i) => masuk('telat', t, i < 4 ? 'terlambat' : 'tepat_waktu')),
  ...ef.slice(0, 2).map((t) => masuk('alpa', t, 'tepat_waktu')),
  ...ef.slice(0, 4).map((t) => masuk('bolos', t, 'tepat_waktu')),
  ...ef.slice(0, 2).map((t) => masuk('kartu', t, 'tepat_waktu')),
];
const catatan = [
  cat('alpa', '2026-10-07', 'alpa'), cat('alpa', '2026-10-08', 'alpa'), cat('alpa', '2026-10-09', 'alpa'),
  cat('bolos', '2026-10-09', 'bolos'),
  ...['2026-10-07', '2026-10-08', '2026-10-09'].map((t) => cat('kartu', t, 'tidak_bawa_kartu')),
];
const metrik = hitungMetrikTindakan(siswa, k, absensi, catatan, ef);
const by = (id: string) => metrik.find((m) => m.siswa.id === id)!;

describe('peringkat', () => {
  it('terbaik: hadir penuh dan tepat waktu di urutan pertama', () => {
    expect(peringkat(metrik, 'terbaik')[0].siswa.id).toBe('rajin');
  });
  it('terlambat terbanyak', () => {
    const p = peringkat(metrik, 'terlambat');
    expect(p).toHaveLength(1);
    expect(p[0].siswa.id).toBe('telat');
    expect(p[0].totalTerlambat).toBe(4);
  });
  it('tanpa kartu, alfa, bolos', () => {
    expect(peringkat(metrik, 'tanpaKartu')[0].siswa.id).toBe('kartu');
    expect(peringkat(metrik, 'alfa')[0].siswa.id).toBe('alpa');
    expect(peringkat(metrik, 'bolos')[0].siswa.id).toBe('bolos');
  });
  it('siswa nonaktif tidak masuk', () => {
    const m = hitungMetrikTindakan([...siswa, { ...mk('pindah', 'Pindah'), status_aktif: false }], k, absensi, catatan, ef);
    expect(m.some((x) => x.siswa.id === 'pindah')).toBe(false);
  });
});

describe('streak & saran', () => {
  it('streak tidak hadir berturut-turut', () => {
    expect(hitungStreak({ a: 'alpa', b: 'bolos', c: 'tepat_waktu', d: 'kosong' } as any, ['a', 'b', 'c', 'd'])).toEqual({ terpanjang: 2, terkini: 1 });
    expect(by('alpa').streakTerkini).toBe(3);
  });
  it('siswa alfa 3 hari berturut-turut ditandai mendesak', () => {
    expect(daftarPerluTindakan(metrik).find((x) => x.metrik.siswa.id === 'alpa')?.tingkat).toBe('mendesak');
  });
  it('bolos menghasilkan saran konseling BK', () => {
    expect(sarankanTindakan(by('bolos')).some((s) => /BK/.test(s.teks))).toBe(true);
  });
  it('siswa rajin tidak butuh tindakan, dan masuk apresiasi', () => {
    expect(sarankanTindakan(by('rajin'))).toEqual([]);
    expect(daftarApresiasi(metrik).map((m) => m.siswa.id)).toEqual(['rajin']);
  });
  it('urutan: mendesak lebih dulu', () => {
    expect(daftarPerluTindakan(metrik)[0].tingkat).toBe('mendesak');
  });
});

describe('ringkasan', () => {
  it('ringkas kelas dan pola hari', () => {
    const r = ringkasKelas(metrik, k);
    expect(r).toHaveLength(1);
    expect(r[0].jumlahSiswa).toBe(5);
    const p = polaHari(metrik, ef);
    expect(p.map((x) => x.hari)).toEqual(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
    expect(p[4].persenTidakHadir).toBeGreaterThan(p[0].persenTidakHadir);
  });
  it('tautan WA berisi nama dan nomor', () => {
    const u = tautanWaWali(by('alpa'), 'Oktober 2026', '62812');
    expect(u.startsWith('https://wa.me/62812?text=')).toBe(true);
    expect(decodeURIComponent(u)).toContain('Alpa');
  });
});

describe('tidak scan pulang', () => {
  const pulang = (id: string, t: string): any => ({ siswa_id: id, tanggal: t, jenis: 'pulang', status: 'tepat_waktu', timestamp: 2 });
  it('hari masuk tanpa pulang dihitung; hari tanpa masuk atau tanpa kartu tidak', () => {
    const a = [masuk('x', ef[0], 'tepat_waktu'), pulang('x', ef[0]), masuk('x', ef[1], 'tepat_waktu'), masuk('x', ef[2], 'terlambat')];
    expect(hitungTidakPulang('x', ef, a)).toEqual([ef[1], ef[2]]);
    expect(hitungTidakPulang('y', ef, a)).toEqual([]);
  });
  it('hari ini dikecualikan sebelum jam pulang', () => {
    const a = [masuk('x', ef[1], 'tepat_waktu')];
    expect(hitungTidakPulang('x', ef, a, ef[1])).toEqual([]);
  });
  it('masuk ke peringkat, saran, dan metrik', () => {
    const m = hitungMetrikTindakan([mk('x', 'X')], k, ef.map((t) => masuk('x', t, 'tepat_waktu')), [], ef);
    expect(m[0].totalTidakPulang).toBe(5);
    expect(peringkat(m, 'tidakPulang')[0].siswa.id).toBe('x');
    expect(sarankanTindakan(m[0]).some((s) => /scan pulang/.test(s.teks) && s.tingkat === 'info')).toBe(true);
    expect(tautanWaWali(m[0], 'Oktober', '62812')).toContain(encodeURIComponent('scan pulang'));
  });
});
