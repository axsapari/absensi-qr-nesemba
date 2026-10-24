-- SMP NEGERI 9 BANJAR - Bagikan akun kiosk ke perangkat baru lewat database.
-- Perangkat baru cukup login staf SATU KALI; aplikasi mengambil email & password akun kiosk dari tabel
-- ini, lalu setelah staf logout pos gerbang login otomatis sebagai kiosk.
-- Tabel hanya bisa dibaca/ditulis pengguna yang sudah login (sama dengan tabel data lain).
-- Aman dijalankan berulang kali.

CREATE TABLE IF NOT EXISTS public.kiosk_akun (
  id TEXT PRIMARY KEY DEFAULT 'default',
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.kiosk_akun ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kiosk_akun' AND policyname = 'authenticated_kiosk_akun_all'
  ) THEN
    CREATE POLICY authenticated_kiosk_akun_all ON public.kiosk_akun
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
