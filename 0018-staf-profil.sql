-- Patch 0018: profil guru/staf disinkronkan antar perangkat
-- Jalankan SEKALI di Supabase Dashboard -> SQL Editor (aman diulang).
CREATE TABLE IF NOT EXISTS public.staf_profil (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','petugas','wali_kelas')),
  wali_kelas_id TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  nip TEXT,
  avatar TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_staf_profil_username ON public.staf_profil (lower(username));
ALTER TABLE public.staf_profil ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staf_profil_all" ON public.staf_profil;
CREATE POLICY "authenticated_staf_profil_all" ON public.staf_profil FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staf_profil TO authenticated;
