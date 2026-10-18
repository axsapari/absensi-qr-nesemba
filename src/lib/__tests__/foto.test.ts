import { describe, expect, it } from 'vitest';
import { fotoAlternatives, urlCobaUlang } from '../fotoFallback';

describe('foto fallback', () => {
  it('URL coba ulang menambah parameter tanpa mengubah path', () => {
    const u = urlCobaUlang('https://x.supabase.co/storage/v1/object/public/foto-siswa/0123.jpg');
    expect(u).toMatch(/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/foto-siswa\/0123\.jpg\?coba=\d+$/);
    expect(urlCobaUlang('https://x/a.jpg?v=1')).toMatch(/\?v=1&coba=\d+$/);
  });
  it('alternatif ekstensi tidak memuat ekstensi saat ini', () => {
    const alt = fotoAlternatives('https://x/foto-siswa/0123.jpg');
    expect(alt).toContain('https://x/foto-siswa/0123.png');
    expect(alt).not.toContain('https://x/foto-siswa/0123.jpg');
  });
});
