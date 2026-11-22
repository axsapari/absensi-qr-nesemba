// Supabase Edge Function: send-wa-notification
//
// Fungsi ini menerima { provider, endpointUrl, targetPhone, message } dari aplikasi,
// lalu meneruskannya ke gateway WhatsApp (Fonnte/Wablas) menggunakan token yang
// TERSIMPAN DI SERVER (Supabase Secret), bukan dikirim dari browser.
//
// Cara pasang (lewat Supabase Dashboard, tanpa perlu install apa pun di laptop):
// 1. Buka project Supabase Anda > menu "Edge Functions" di sidebar kiri
// 2. Klik "Deploy a new function" > pilih "Via Editor"
// 3. Beri nama function: send-wa-notification (harus persis nama ini)
// 4. Hapus semua kode contoh bawaan, ganti dengan SELURUH isi file ini
// 5. Klik "Deploy function"
// 6. Setelah ter-deploy, buka halaman function ini > cari "Manage secrets" / "Secrets"
// 7. Tambahkan secret baru: nama = WA_API_TOKEN, isi = token API dari Fonnte/Wablas Anda
//
// Selesai -- token sekarang hanya ada di server Supabase, tidak pernah terlihat di browser.

// @ts-nocheck -- file ini berjalan di runtime Deno milik Supabase, bukan Node/browser,
// jadi editor TypeScript project Anda akan menandai banyak "error" palsu. Ini normal
// dan aman diabaikan -- yang penting kode ini valid saat di-deploy ke Supabase.

const WA_API_TOKEN = Deno.env.get('WA_API_TOKEN') || '';

// Endpoint gateway DITETAPKAN di server. Alamat dari browser tidak pernah dipakai, supaya token
// tidak bisa dibelokkan ke server lain.
const ENDPOINT_FONNTE = 'https://api.fonnte.com/send';
const ENDPOINT_WABLAS = 'https://phone.wablas.com/api/send-message';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// verify_jwt sudah memeriksa tanda tangan JWT. Di sini hanya memastikan perannya "authenticated"
// (guru/staf/kiosk yang login), bukan kunci anon yang publik di browser.
function peranJwt(req: Request): string {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return String(payload.role || '');
  } catch {
    return '';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (peranJwt(req) !== 'authenticated') {
      return json({ success: false, error: 'Harus login sebagai pengguna aplikasi.' }, 401);
    }

    const { provider, targetPhone, message } = await req.json();

    if (!targetPhone || !message) {
      return json({ success: false, error: 'targetPhone dan message wajib diisi' }, 400);
    }
    if (!/^62[0-9]{8,13}$/.test(String(targetPhone))) {
      return json({ success: false, error: 'Format nomor tujuan tidak valid (harus 62xxxxxxxxxx).' }, 400);
    }
    if (String(message).length > 4000) {
      return json({ success: false, error: 'Pesan terlalu panjang.' }, 400);
    }
    if (!WA_API_TOKEN) {
      return json({
        success: false,
        error: 'WA_API_TOKEN belum diatur. Tambahkan secret WA_API_TOKEN di halaman Edge Functions > Manage secrets pada Supabase Dashboard.',
      }, 500);
    }

    let res: Response;
    let isSuccessFn: (r: any) => boolean;

    if (provider === 'wablas') {
      res = await fetch(ENDPOINT_WABLAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: WA_API_TOKEN },
        body: JSON.stringify({ phone: targetPhone, message }),
      });
      isSuccessFn = (r) => r?.status === true || r?.status === 'success';
    } else {
      const formData = new FormData();
      formData.append('target', targetPhone);
      formData.append('message', message);
      res = await fetch(ENDPOINT_FONNTE, { method: 'POST', headers: { Authorization: WA_API_TOKEN }, body: formData });
      // Fonnte membalas HTTP 200 juga saat gagal ({"status":false,"reason":...}); hanya status:true yang sukses.
      isSuccessFn = (r) => r?.status === true;
    }

    const resJson = await res.json().catch(() => ({ status: false, text: 'Respons bukan JSON', http: res.status }));
    return json({ success: res.ok && isSuccessFn(resJson), response: resJson });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Kesalahan tak dikenal di Edge Function' }, 500);
  }
});
