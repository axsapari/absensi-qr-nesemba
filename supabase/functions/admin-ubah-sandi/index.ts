// Edge Function: Super Admin mengganti kata sandi akun guru lain.
// Deploy:  supabase functions deploy admin-ubah-sandi --project-ref <ref>
// (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY otomatis tersedia di Supabase.)
// Opsional: supabase secrets set SUPER_ADMIN_EMAIL=agus@smpn9banjar.sch.id
//
// Aturan keamanan: yang boleh memanggil HANYA pemilik email SUPER_ADMIN_EMAIL (dibaca dari JWT yang
// diverifikasi server, bukan dari isi permintaan). Service Role Key tidak pernah keluar dari server.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export interface Lingkungan {
  superAdminEmail: string;
  url: string;
  anonKey: string;
  serviceKey: string;
}

// Antarmuka minimal klien supabase yang dipakai (supaya mudah diuji dengan klien palsu).
export interface KlienAuth {
  auth: {
    getUser(jwt: string): Promise<{ data: { user: { email?: string | null } | null }; error: unknown }>;
    admin: {
      listUsers(p: { page: number; perPage: number }): Promise<{ data: { users: { id: string; email?: string | null }[] }; error: unknown }>;
      updateUserById(id: string, attrs: { password: string }): Promise<{ error: { message: string } | null }>;
    };
  };
}

export async function tangani(req: Request, env: Lingkungan, buatKlien: (url: string, key: string) => KlienAuth): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Metode tidak diizinkan.' });

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json(401, { error: 'Anda belum login.' });

  const klien = buatKlien(env.url, env.serviceKey);
  const { data: u, error: ue } = await klien.auth.getUser(jwt);
  const pemanggil = u?.user?.email?.toLowerCase();
  if (ue || !pemanggil) return json(401, { error: 'Sesi tidak valid. Silakan login ulang.' });
  if (pemanggil !== env.superAdminEmail.toLowerCase()) {
    return json(403, { error: 'Hanya Super Admin yang boleh mengganti kata sandi akun lain.' });
  }

  let body: { email?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: 'Permintaan tidak valid.' }); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email.includes('@')) return json(400, { error: 'Email akun wajib diisi.' });
  if (password.length < 6) return json(400, { error: 'Kata sandi minimal 6 karakter.' });

  // Cari akun Auth berdasarkan email (sekolah kecil: satu halaman 1000 sudah cukup).
  const { data: daftar, error: le } = await klien.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (le) return json(500, { error: 'Gagal membaca daftar akun.' });
  const target = daftar.users.find((x) => (x.email || '').toLowerCase() === email);
  if (!target) return json(404, { error: `Akun ${email} belum dibuat di Supabase Authentication.` });

  const { error } = await klien.auth.admin.updateUserById(target.id, { password });
  if (error) return json(500, { error: `Gagal mengganti kata sandi: ${error.message}` });
  return json(200, { ok: true, message: `Kata sandi ${email} berhasil diganti.` });
}

// deno-lint-ignore no-explicit-any
const D: any = (globalThis as any).Deno;
if (D && typeof D.serve === 'function') {
  D.serve(async (req: Request) => {
    // @ts-ignore: impor URL hanya dikenal oleh Deno
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const env: Lingkungan = {
      superAdminEmail: D.env.get('SUPER_ADMIN_EMAIL') || 'agus@smpn9banjar.sch.id',
      url: D.env.get('SUPABASE_URL') ?? '',
      anonKey: D.env.get('SUPABASE_ANON_KEY') ?? '',
      serviceKey: D.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    };
    return tangani(req, env, (url, key) => createClient(url, key, { auth: { persistSession: false } }) as unknown as KlienAuth);
  });
}
