import { describe, it, expect } from 'vitest';
import { tarikSemuaBaris } from '../tarikSemuaBaris';

const sumber = (n: number) => {
  const semua = Array.from({ length: n }, (_, i) => ({ id: i }));
  const panggilan: Array<[number, number]> = [];
  const ambil = async (dari: number, sampai: number) => {
    panggilan.push([dari, sampai]);
    // meniru batas server 1000 baris
    return { data: semua.slice(dari, Math.min(sampai + 1, dari + 1000)), error: null };
  };
  return { ambil, panggilan };
};

describe('tarikSemuaBaris', () => {
  it('mengambil semua baris melewati batas 1000', async () => {
    const { ambil, panggilan } = sumber(2218);
    const hasil = await tarikSemuaBaris<{ id: number }>(ambil);
    expect(hasil).toHaveLength(2218);
    expect(hasil[2217].id).toBe(2217);
    expect(panggilan).toHaveLength(3);
  });
  it('tepat kelipatan halaman tetap berhenti', async () => {
    const { ambil } = sumber(2000);
    expect(await tarikSemuaBaris(ambil)).toHaveLength(2000);
  });
  it('tabel kosong', async () => {
    const { ambil } = sumber(0);
    expect(await tarikSemuaBaris(ambil)).toEqual([]);
  });
  it('melempar error server', async () => {
    await expect(tarikSemuaBaris(async () => ({ data: null, error: { message: 'gagal' } }))).rejects.toThrow('gagal');
  });
});
