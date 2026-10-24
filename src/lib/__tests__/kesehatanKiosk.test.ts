import { describe, expect, it } from 'vitest';
import { periksaTanpaScan, pilihSampel } from '../kesehatanKiosk';

const dasar = { jamBuka: '06:00', batasTepatWaktu: '07:15', jamPulang: '14:15', hariEfektif: true };

describe('periksaTanpaScan', () => {
  it('tidak memperingatkan di luar jam sibuk', () => {
    expect(periksaTanpaScan({ ...dasar, sekarang: '10:30:00', scanTerakhir: null })).toBeNull();
  });
  it('tidak memperingatkan di hari libur', () => {
    expect(periksaTanpaScan({ ...dasar, hariEfektif: false, sekarang: '06:40:00', scanTerakhir: null })).toBeNull();
  });
  it('belum ada scan sama sekali 15 menit setelah pos dibuka', () => {
    expect(periksaTanpaScan({ ...dasar, sekarang: '06:14:00', scanTerakhir: null })).toBeNull();
    expect(periksaTanpaScan({ ...dasar, sekarang: '06:16:00', scanTerakhir: null })).toEqual({ menit: 16, sesi: 'masuk' });
  });
  it('scan terakhir terlalu lama di jam masuk', () => {
    expect(periksaTanpaScan({ ...dasar, sekarang: '07:00:00', scanTerakhir: '06:40:00' })).toEqual({ menit: 20, sesi: 'masuk' });
    expect(periksaTanpaScan({ ...dasar, sekarang: '07:00:00', scanTerakhir: '06:50:00' })).toBeNull();
  });
  it('jam pulang: scan pagi tidak dianggap scan sesi pulang', () => {
    expect(periksaTanpaScan({ ...dasar, sekarang: '14:35:00', scanTerakhir: '07:10:00' })).toEqual({ menit: 20, sesi: 'pulang' });
    expect(periksaTanpaScan({ ...dasar, sekarang: '14:35:00', scanTerakhir: '14:30:00' })).toBeNull();
  });
});

describe('pilihSampel', () => {
  it('mengambil n item tanpa pengulangan', () => {
    const r = pilihSampel([1, 2, 3, 4, 5], 3, () => 0);
    expect(r).toEqual([1, 2, 3]);
    expect(pilihSampel([1], 3)).toEqual([1]);
  });
});
