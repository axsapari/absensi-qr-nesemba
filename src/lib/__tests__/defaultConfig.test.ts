import { describe, expect, it } from 'vitest';
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL, gabungkanKonfigSupabase } from '../defaultConfig';

describe('konfigurasi bawaan perangkat baru', () => {
  it('perangkat baru (tanpa data tersimpan) langsung terhubung', () => {
    const k = gabungkanKonfigSupabase({});
    expect(k).toMatchObject({ url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY, connected: true });
    expect(k.url).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(k.anonKey.split('.')).toHaveLength(3);
  });
  it('pengaturan tersimpan didahulukan dan kolom kosong diisi bawaan', () => {
    expect(gabungkanKonfigSupabase({ url: 'https://lain.supabase.co', anonKey: 'kunci-lain', connected: true }))
      .toMatchObject({ url: 'https://lain.supabase.co', anonKey: 'kunci-lain' });
    expect(gabungkanKonfigSupabase({ url: '', anonKey: '', connected: false, kioskEmail: 'k@x' }))
      .toMatchObject({ url: DEFAULT_SUPABASE_URL, kioskEmail: 'k@x', connected: true });
  });
});
