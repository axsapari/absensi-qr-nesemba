// Supabase Edge Function: proses-antrian-wa
// Dipanggil pg_cron tiap menit (hanya bila ada antrean). Mengirim rekap WA mingguan secara bertahap
// dengan jeda acak antar pesan supaya nomor pengirim tidak dianggap spam.
// verify_jwt = false karena dipanggil dari database; keamanannya memakai kunci rahasia di vault
// (header x-cron-secret) yang dicocokkan lewat fungsi database cek_rahasia_cron_wa.

// @ts-nocheck

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WA_API_TOKEN = Deno.env.get('WA_API_TOKEN') || '';
const ENDPOINT_FONNTE = 'https://api.fonnte.com/send';

const BATCH = 6;          // pesan per panggilan (cron tiap menit => ~360 pesan/jam)
const JEDA_MIN_MS = 4000; // jeda acak antar pesan
const JEDA_MAKS_MS = 9000;
const MAKS_PERCOBAAN = 3;

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

const tidur = (ms: number) => new Promise((r) => setTimeout(r, ms));
const acak = (a: number, b: number) => a + Math.floor(Math.random() * (b - a));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

// Alasan gagal yang berlaku untuk SEMUA pesan (bukan salah satu nomor): hentikan batch, jangan hangus-kan percobaan.
const GAGAL_SISTEM = /token|device|disconnect|quota|kuota|limit|expired|unauthorized|not connected|belum terhubung/i;

async function ubah(id: string, data: Record<string, unknown>) {
  await rest(`log_rekap_wa_mingguan?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
}

Deno.serve(async (req: Request) => {
  try {
    const kunci = req.headers.get('x-cron-secret') || '';
    const cek = await rest('rpc/cek_rahasia_cron_wa', { method: 'POST', body: JSON.stringify({ kunci }) });
    if (!kunci || (await cek.json()) !== true) return json({ error: 'Tidak diizinkan' }, 401);
    if (!WA_API_TOKEN) return json({ error: 'WA_API_TOKEN belum diatur' }, 500);

    const klaim = await rest('rpc/klaim_antrian_wa_mingguan', { method: 'POST', body: JSON.stringify({ jumlah: BATCH }) });
    const rows: any[] = await klaim.json();
    if (!Array.isArray(rows) || rows.length === 0) return json({ diproses: 0 });

    let terkirim = 0, gagal = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!/^62[0-9]{8,13}$/.test(String(r.nomor_tujuan))) {
        await ubah(r.id, { status_kirim: 'gagal', percobaan: MAKS_PERCOBAAN, waktu_kirim: new Date().toISOString(), diklaim_pada: null, response_payload: 'Nomor tujuan tidak valid' });
        gagal++;
        continue;
      }
      let ok = false, alasan = '';
      try {
        const fd = new FormData();
        fd.append('target', r.nomor_tujuan);
        fd.append('message', r.pesan);
        const res = await fetch(ENDPOINT_FONNTE, { method: 'POST', headers: { Authorization: WA_API_TOKEN }, body: fd });
        const body = await res.json().catch(() => ({ status: false, reason: `Respons bukan JSON (HTTP ${res.status})` }));
        ok = res.ok && body?.status === true;
        alasan = JSON.stringify(body);
      } catch (e) {
        alasan = e instanceof Error ? e.message : String(e);
      }

      if (ok) {
        terkirim++;
        await ubah(r.id, { status_kirim: 'terkirim', waktu_kirim: new Date().toISOString(), diklaim_pada: null, response_payload: alasan });
      } else if (GAGAL_SISTEM.test(alasan)) {
        // Masalah gateway: kembalikan pesan ini dan sisanya ke antrean tanpa menambah percobaan.
        await ubah(r.id, { response_payload: `Ditunda: ${alasan}`, diklaim_pada: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
        for (const sisa of rows.slice(i + 1)) await ubah(sisa.id, { diklaim_pada: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
        return json({ terkirim, gagal, dihentikan: alasan.slice(0, 200) });
      } else {
        gagal++;
        await ubah(r.id, { status_kirim: 'gagal', percobaan: (r.percobaan || 0) + 1, waktu_kirim: new Date().toISOString(), diklaim_pada: null, response_payload: alasan });
      }
      if (i < rows.length - 1) await tidur(acak(JEDA_MIN_MS, JEDA_MAKS_MS));
    }
    return json({ terkirim, gagal });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
