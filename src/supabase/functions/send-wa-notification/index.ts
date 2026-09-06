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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Browser akan mengirim preflight OPTIONS request dulu -- wajib direspons agar tidak diblokir CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider, endpointUrl, targetPhone, message } = await req.json();

    if (!targetPhone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'targetPhone dan message wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!WA_API_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WA_API_TOKEN belum diatur. Tambahkan secret WA_API_TOKEN di halaman Edge Functions > Manage secrets pada Supabase Dashboard.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let res: Response;

    if (provider === 'wablas') {
      res = await fetch(endpointUrl || 'https://phone.wablas.com/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: WA_API_TOKEN,
        },
        body: JSON.stringify({
          phone: targetPhone,
          message: message,
        }),
      });
    } else if (provider === 'custom') {
      res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WA_API_TOKEN}`,
        },
        body: JSON.stringify({
          to: targetPhone,
          message: message,
        }),
      });
    } else {
      // Default: Fonnte
      const formData = new FormData();
      formData.append('target', targetPhone);
      formData.append('message', message);

      res = await fetch(endpointUrl || 'https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: WA_API_TOKEN,
        },
        body: formData,
      });
    }

    const resJson = await res.json().catch(() => ({ status: res.status, text: 'Respons bukan JSON' }));
    const isSuccess =
      res.ok && (resJson.status === true || resJson.status === 'success' || res.status === 200);

    return new Response(
      JSON.stringify({ success: isSuccess, response: resJson }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Kesalahan tak dikenal di Edge Function',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
