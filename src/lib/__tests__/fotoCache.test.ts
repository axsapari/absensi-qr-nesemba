import { describe, it, expect, beforeEach } from 'vitest';
import { bersihkanCacheFoto, fotoHilang, tandaiFotoHilang, catatFotoCache, fotoDariCache, TTL_HILANG_MS, TTL_ADA_MS } from '../fotoCache';
import { muatFotoKeCache, type AmbilFn } from '../fotoMuat';
import { getFotoSiswaUrl } from '../fotoHelper';

const SB = 'https://x.supabase.co';
const siswa = { foto_url: '', nisn: '0012345678', jenis_kelamin: 'L' as const };
const urlJpg = `${SB}/storage/v1/object/public/foto-siswa/0012345678.jpg`;

const balas = (status: number): ReturnType<AmbilFn> =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, blob: async () => new Blob(['x'], { type: 'image/jpeg' }) });

beforeEach(async () => { await bersihkanCacheFoto(); });

describe('ingatan foto hilang', () => {
  it('foto ditandai hilang lalu kedaluwarsa setelah TTL', () => {
    const t0 = 1_000_000;
    tandaiFotoHilang(urlJpg, t0);
    expect(fotoHilang(urlJpg, t0 + 1000)).toBe(true);
    expect(fotoHilang(urlJpg, t0 + TTL_HILANG_MS + 1)).toBe(false);
  });
  it('getFotoSiswaUrl memakai placeholder untuk foto yang diketahui hilang, kecuali abaikanCache', () => {
    tandaiFotoHilang(urlJpg);
    expect(getFotoSiswaUrl(siswa, SB)).toMatch(/^data:image\/svg/);
    expect(getFotoSiswaUrl(siswa, SB, { abaikanCache: true })).toBe(urlJpg);
  });
  it('getFotoSiswaUrl memakai blob lokal bila ada dan segar', () => {
    catatFotoCache(urlJpg, 'blob:lokal-1');
    expect(getFotoSiswaUrl(siswa, SB)).toBe('blob:lokal-1');
    expect(fotoDariCache(urlJpg, Date.now() + TTL_ADA_MS + 5)).toBeNull();
  });
});

describe('muatFotoKeCache', () => {
  it('foto ada: tersimpan, panggilan kedua tanpa jaringan', async () => {
    let n = 0;
    const ambil: AmbilFn = () => { n++; return balas(200); };
    expect(await muatFotoKeCache(urlJpg, ambil)).toBe('ada');
    expect(await muatFotoKeCache(urlJpg, ambil)).toBe('ada');
    expect(n).toBe(1);
  });
  it('foto tidak ada di semua ekstensi: ditandai hilang, panggilan berikut tanpa jaringan', async () => {
    let n = 0;
    const ambil: AmbilFn = () => { n++; return balas(400); };
    expect(await muatFotoKeCache(urlJpg, ambil)).toBe('hilang');
    const setelahPertama = n;
    expect(setelahPertama).toBe(8); // .jpg + 7 ekstensi lain, SEKALI saja
    expect(await muatFotoKeCache(urlJpg, ambil)).toBe('hilang');
    expect(n).toBe(setelahPertama);
  });
  it('hanya ekstensi lain yang ada (.png): ditemukan dan diingat', async () => {
    const ambil: AmbilFn = (u) => balas(u.endsWith('.png') ? 200 : 400);
    expect(await muatFotoKeCache(urlJpg, ambil)).toBe('ada');
    expect(fotoHilang(urlJpg)).toBe(false);
    expect(getFotoSiswaUrl(siswa, SB)).toMatch(/^blob:/);
  });
  it('galat jaringan/5xx tidak menandai hilang', async () => {
    expect(await muatFotoKeCache(urlJpg, () => Promise.reject(new Error('offline')))).toBe('galat');
    expect(await muatFotoKeCache(urlJpg, () => balas(503))).toBe('galat');
    expect(fotoHilang(urlJpg)).toBe(false);
  });
});
