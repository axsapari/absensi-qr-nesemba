import { describe, it, expect } from 'vitest';
import { hitungMundurPulang, formatHitungMundur, keDetik } from '../hitungMundurPulang';

describe('hitungMundurPulang', () => {
  it('keDetik & format', () => {
    expect(keDetik('07:15:30')).toBe(7 * 3600 + 15 * 60 + 30);
    expect(formatHitungMundur(3725)).toBe('1:02:05');
    expect(formatHitungMundur(125)).toBe('02:05');
  });
  it('sebelum pos dibuka', () => {
    const h = hitungMundurPulang('05:30:00', '06:00', '14:15');
    expect(h.fase).toBe('sebelum_buka');
    expect(h.persen).toBe(0);
  });
  it('menunggu: persen proporsional', () => {
    const h = hitungMundurPulang('10:07:30', '06:00', '14:15');
    expect(h.fase).toBe('menunggu');
    expect(Math.round(h.persen)).toBe(50);
    expect(h.sisaDetik).toBe(4 * 3600 + 7 * 60 + 30);
  });
  it('segera: 30 menit terakhir', () => {
    expect(hitungMundurPulang('13:50:00', '06:00', '14:15').fase).toBe('segera');
  });
  it('pulang: tepat jam pulang dan sesudahnya', () => {
    const h = hitungMundurPulang('14:15:00', '06:00', '14:15');
    expect(h).toEqual({ fase: 'pulang', sisaDetik: 0, persen: 100 });
    expect(hitungMundurPulang('16:00:00', '06:00', '14:15').fase).toBe('pulang');
  });
});
