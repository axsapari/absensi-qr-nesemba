/**
 * Konfigurasi bawaan supaya perangkat baru langsung terhubung ke database sekolah tanpa mengisi
 * URL/Anon Key. Anon key memang dirancang publik (akses data tetap dilindungi login & RLS Supabase),
 * jadi aman ada di kode. Bisa ditimpa lewat env VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY saat build,
 * dan pengaturan yang tersimpan di perangkat selalu didahulukan.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const DEFAULT_SUPABASE_URL: string =
  (env.VITE_SUPABASE_URL || '').trim() || 'https://idrtsetyfwesqnuoxgdq.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY: string =
  (env.VITE_SUPABASE_ANON_KEY || '').trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkcnRzZXR5Zndlc3FudW94Z2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1ODE0NzksImV4cCI6MjEwNDE1NzQ3OX0.BaL3FAfjueUbj4_W1voszuZDXVwyjVV_KuahZBJZTwU';

export interface KonfigDasar { url: string; anonKey: string; connected: boolean; kioskEmail?: string; kioskPassword?: string }

/** Gabungkan konfigurasi tersimpan dengan bawaan: kolom yang kosong diisi bawaan. */
export function gabungkanKonfigSupabase<T extends KonfigDasar>(tersimpan: Partial<T> | null | undefined): T {
  const t = (tersimpan ?? {}) as Partial<T>;
  const url = (t.url || '').trim() || DEFAULT_SUPABASE_URL;
  const anonKey = (t.anonKey || '').trim() || DEFAULT_SUPABASE_ANON_KEY;
  return { ...t, url, anonKey, connected: Boolean(url && anonKey) } as T;
}
