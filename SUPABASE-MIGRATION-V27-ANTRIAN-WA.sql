-- v27: antrean rekap WA mingguan yang dikirim server (pg_cron + pg_net + Edge Function proses-antrian-wa).
-- Sudah dijalankan di project produksi lewat MCP; file ini dokumentasi/cadangan.
-- Urutan: (1) jalankan blok ini, (2) deploy src/supabase/functions/proses-antrian-wa (verify_jwt = false),
-- (3) pastikan secret WA_API_TOKEN ada di Edge Functions.
create extension if not exists pg_net with schema extensions;

alter table public.log_rekap_wa_mingguan add column if not exists percobaan int not null default 0;
alter table public.log_rekap_wa_mingguan add column if not exists diklaim_pada timestamptz;

create or replace function public.klaim_antrian_wa_mingguan(jumlah int default 6)
returns setof public.log_rekap_wa_mingguan
language sql security definer set search_path = public as $$
  update public.log_rekap_wa_mingguan t set diklaim_pada = now()
  where t.id in (
    select id from public.log_rekap_wa_mingguan
    where (diklaim_pada is null or diklaim_pada < now() - interval '5 minutes')
      and ((status_kirim = 'pending')
        or (status_kirim = 'gagal' and percobaan < 3 and waktu_kirim < now() - interval '10 minutes'))
    order by minggu_mulai, id
    limit jumlah
    for update skip locked
  )
  returning t.*;
$$;
revoke all on function public.klaim_antrian_wa_mingguan(int) from public, anon, authenticated;
grant execute on function public.klaim_antrian_wa_mingguan(int) to service_role;

select vault.create_secret(encode(gen_random_bytes(32),'hex'), 'cron_wa_secret', 'Kunci panggilan cron ke proses-antrian-wa')
 where not exists (select 1 from vault.secrets where name='cron_wa_secret');

create or replace function public.cek_rahasia_cron_wa(kunci text)
returns boolean language sql security definer set search_path = public, vault as $$
  select exists (select 1 from vault.decrypted_secrets where name='cron_wa_secret' and decrypted_secret = kunci);
$$;
revoke all on function public.cek_rahasia_cron_wa(text) from public, anon, authenticated;
grant execute on function public.cek_rahasia_cron_wa(text) to service_role;

-- Ganti <PROJECT_REF> bila memasang di project lain.
select cron.schedule('proses-antrian-wa-mingguan', '* * * * *', $cmd$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/proses-antrian-wa',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name='cron_wa_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 90000)
  where exists (
    select 1 from public.log_rekap_wa_mingguan
    where (diklaim_pada is null or diklaim_pada < now() - interval '5 minutes')
      and (status_kirim='pending' or (status_kirim='gagal' and percobaan<3 and waktu_kirim < now() - interval '10 minutes')));
$cmd$);
