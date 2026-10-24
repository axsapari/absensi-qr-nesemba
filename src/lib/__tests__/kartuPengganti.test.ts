import { describe, expect, it } from 'vitest';
import { catatKartuPengganti, labelKartuPengganti } from '../kartuPengganti';

describe('kartu pengganti', () => {
  it('mencatat penggantian pertama dan berikutnya', () => {
    const a = catatKartuPengganti({}, 'hilang', '2026-10-24');
    expect(a).toEqual({ kartu_ganti_jumlah: 1, kartu_ganti_terakhir: '2026-10-24', kartu_ganti_alasan: 'hilang' });
    const b = catatKartuPengganti(a, 'rusak', '2026-11-02');
    expect(b.kartu_ganti_jumlah).toBe(2);
    expect(b.kartu_ganti_alasan).toBe('rusak');
  });
  it('label', () => {
    expect(labelKartuPengganti({})).toBe('');
    expect(labelKartuPengganti({ kartu_ganti_jumlah: 2, kartu_ganti_terakhir: '2026-11-02', kartu_ganti_alasan: 'rusak' }))
      .toBe('Diganti 2x, terakhir rusak / tidak terbaca pada 2026-11-02');
  });
});
