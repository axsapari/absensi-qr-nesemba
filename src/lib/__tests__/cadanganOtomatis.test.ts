import { describe, expect, it } from 'vitest';
import { bersihkanRahasia, berkasUntukDihapus, namaBerkasCadangan, perluCadangan, tanggalDariNama } from '../cadanganOtomatis';

const b = (n: string) => ({ name: n, tanggal: tanggalDariNama(n)! });

describe('jadwal cadangan', () => {
  const l = [b('cadangan_2026-10-12_0800.json.gz')];
  it('belum ada cadangan -> perlu', () => expect(perluCadangan([], '2026-10-18', 'mingguan')).toBe(true));
  it('mingguan: 6 hari belum, 7 hari perlu', () => {
    expect(perluCadangan(l, '2026-10-18', 'mingguan')).toBe(false);
    expect(perluCadangan(l, '2026-10-19', 'mingguan')).toBe(true);
  });
  it('harian', () => expect(perluCadangan(l, '2026-10-13', 'harian')).toBe(true));
});

describe('retensi & keamanan', () => {
  it('hapus yang terlama, minimal satu tersisa', () => {
    const banyak = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((d) => b(`cadangan_${d}_0800.json.gz`));
    expect(berkasUntukDihapus(banyak, 2)).toEqual(['cadangan_2026-09-08_0800.json.gz', 'cadangan_2026-09-01_0800.json.gz']);
    expect(berkasUntukDihapus(banyak, 0)).toHaveLength(3);
  });
  it('membuang kolom rahasia', () => {
    expect(Object.keys(bersihkanRahasia({ id: 1, wa_token: 'x', anonKey: 'y', nama: 'a', password: 'z' }))).toEqual(['id', 'nama']);
  });
  it('format nama berkas', () => {
    expect(namaBerkasCadangan(new Date(), true)).toMatch(/^cadangan_\d{4}-\d{2}-\d{2}_\d{4}\.json\.gz$/);
  });
});
