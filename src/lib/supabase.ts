import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  if (!config || !config.url || !config.anonKey) return null;

  try {
    supabaseInstance = createClient(config.url, config.anonKey);
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to init Supabase client:', err);
    return null;
  }
}

export function resetSupabaseClient() {
  // Dipakai ketika URL / anon key berubah agar client singleton tidak
  // terus menunjuk ke project Supabase yang lama.
  supabaseInstance = null;
}

// Complete SQL Schema Script for Supabase PostgreSQL
export const SUPABASE_SQL_SCHEMA = `-- ==========================================================
-- SMP NEGERI 9 BANJAR - DATABASE ABSENSI QR/NISN
-- Jalankan setelah database lama dibersihkan.
-- Semua operasi aplikasi normal menggunakan Supabase Auth.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.kelas (
  id TEXT PRIMARY KEY,
  nama_kelas VARCHAR(50) NOT NULL UNIQUE,
  tingkat VARCHAR(10) NOT NULL CHECK (tingkat IN ('7','8','9')),
  wali_kelas VARCHAR(100) NOT NULL DEFAULT '',
  ruang VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.siswa (
  id TEXT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  nisn VARCHAR(10) NOT NULL UNIQUE CHECK (nisn ~ '^[0-9]{10}$'),
  kelas_id TEXT NOT NULL REFERENCES public.kelas(id) ON DELETE RESTRICT,
  nomor_wa_ortu VARCHAR(25) NOT NULL DEFAULT '',
  nama_ortu VARCHAR(100) NOT NULL DEFAULT '',
  jenis_kelamin VARCHAR(1) NOT NULL CHECK (jenis_kelamin IN ('L','P')),
  tempat_lahir VARCHAR(100),
  tanggal_lahir VARCHAR(50),
  alamat TEXT,
  foto_url TEXT,
  status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn ON public.siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_siswa_kelas ON public.siswa(kelas_id);
CREATE INDEX IF NOT EXISTS idx_siswa_status ON public.siswa(status_aktif);

CREATE TABLE IF NOT EXISTS public.absensi (
  id TEXT PRIMARY KEY,
  siswa_id TEXT NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  waktu_scan TIME NOT NULL,
  timestamp BIGINT NOT NULL,
  jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('masuk','pulang')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('tepat_waktu','terlambat')),
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT absensi_siswa_tgl_jenis_unique UNIQUE (siswa_id, tanggal, jenis)
);
CREATE INDEX IF NOT EXISTS idx_absensi_siswa_tgl ON public.absensi(siswa_id, tanggal, jenis);
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON public.absensi(tanggal);

CREATE TABLE IF NOT EXISTS public.log_notifikasi_wa (
  id TEXT PRIMARY KEY,
  absensi_id TEXT REFERENCES public.absensi(id) ON DELETE SET NULL,
  siswa_id TEXT REFERENCES public.siswa(id) ON DELETE CASCADE,
  nomor_tujuan VARCHAR(25) NOT NULL,
  jenis_pesan VARCHAR(20) NOT NULL,
  pesan TEXT NOT NULL,
  status_kirim VARCHAR(20) NOT NULL CHECK (status_kirim IN ('terkirim','gagal','simulasi','pending')),
  waktu_kirim TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  response_payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_log_wa_absensi ON public.log_notifikasi_wa(absensi_id);
CREATE INDEX IF NOT EXISTS idx_log_wa_waktu ON public.log_notifikasi_wa(waktu_kirim DESC);

CREATE TABLE IF NOT EXISTS public.pengaturan_jam (
  id VARCHAR(20) PRIMARY KEY DEFAULT 'default_config',
  jam_buka_pos TIME NOT NULL DEFAULT '06:00:00',
  batas_tepat_waktu TIME NOT NULL DEFAULT '07:15:00',
  batas_jam_masuk TIME NOT NULL DEFAULT '10:00:00',
  batas_jam_pulang TIME NOT NULL DEFAULT '14:00:00',
  batas_jam_pulang_jumat TIME NOT NULL DEFAULT '11:30:00',
  hari_aktif_sekolah TEXT[] NOT NULL DEFAULT ARRAY['Senin','Selasa','Rabu','Kamis','Jumat'],
  toleransi_duplikasi_menit INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
INSERT INTO public.pengaturan_jam (id) VALUES ('default_config') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_notifikasi_wa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan_jam ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_kelas_all" ON public.kelas;
DROP POLICY IF EXISTS "authenticated_siswa_all" ON public.siswa;
DROP POLICY IF EXISTS "authenticated_absensi_all" ON public.absensi;
DROP POLICY IF EXISTS "authenticated_log_wa_all" ON public.log_notifikasi_wa;
DROP POLICY IF EXISTS "authenticated_pengaturan_jam_all" ON public.pengaturan_jam;

CREATE POLICY "authenticated_kelas_all" ON public.kelas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_siswa_all" ON public.siswa FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_absensi_all" ON public.absensi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_log_wa_all" ON public.log_notifikasi_wa FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_pengaturan_jam_all" ON public.pengaturan_jam FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kelas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.siswa TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absensi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.log_notifikasi_wa TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pengaturan_jam TO authenticated;
`;
