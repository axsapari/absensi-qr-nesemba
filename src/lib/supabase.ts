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
  supabaseInstance = null;
}

// Complete SQL Schema Script for Supabase PostgreSQL
export const SUPABASE_SQL_SCHEMA = `-- ==========================================================
-- SKEMA DATABASE ABSENSI SISWA SEKOLAH MENENGAH (SMP)
-- Platform: Supabase / PostgreSQL
-- ==========================================================

-- 1. TABEL KELAS
CREATE TABLE IF NOT EXISTS public.kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kelas VARCHAR(50) NOT NULL UNIQUE,
    tingkat VARCHAR(10) NOT NULL CHECK (tingkat IN ('7', '8', '9')),
    wali_kelas VARCHAR(100) NOT NULL,
    ruang VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL SISWA
CREATE TABLE IF NOT EXISTS public.siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(150) NOT NULL,
    kode_barcode VARCHAR(100) NOT NULL UNIQUE, -- ID unik yang dicetak pada kartu Barcode/QR
    nisn VARCHAR(20) NOT NULL UNIQUE,
    kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE RESTRICT,
    nomor_wa_ortu VARCHAR(25) NOT NULL,
    nama_ortu VARCHAR(100) NOT NULL,
    jenis_kelamin VARCHAR(2) NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    foto_url TEXT,
    status_aktif BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_siswa_barcode ON public.siswa(kode_barcode);
CREATE INDEX IF NOT EXISTS idx_siswa_kelas ON public.siswa(kelas_id);

-- 3. TABEL ABSENSI
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_scan TIME NOT NULL DEFAULT CURRENT_TIME,
    timestamp BIGINT NOT NULL,
    jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('masuk', 'pulang')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('tepat_waktu', 'terlambat')),
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pencegahan duplikasi dan kecepatan query rekap
CREATE INDEX IF NOT EXISTS idx_absensi_siswa_tgl ON public.absensi(siswa_id, tanggal, jenis);
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON public.absensi(tanggal);

-- 4. TABEL LOG NOTIFIKASI WA
CREATE TABLE IF NOT EXISTS public.log_notifikasi_wa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    absensi_id UUID REFERENCES public.absensi(id) ON DELETE SET NULL,
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE,
    nomor_tujuan VARCHAR(25) NOT NULL,
    jenis_pesan VARCHAR(20) NOT NULL, -- 'masuk', 'pulang', 'terlambat'
    pesan TEXT NOT NULL,
    status_kirim VARCHAR(20) NOT NULL CHECK (status_kirim IN ('terkirim', 'gagal', 'simulasi', 'pending')),
    waktu_kirim TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    response_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_log_wa_absensi ON public.log_notifikasi_wa(absensi_id);
CREATE INDEX IF NOT EXISTS idx_log_wa_waktu ON public.log_notifikasi_wa(waktu_kirim DESC);

-- 5. TABEL PENGATURAN JAM ABSENSI
CREATE TABLE IF NOT EXISTS public.pengaturan_jam (
    id VARCHAR(20) PRIMARY KEY DEFAULT 'default_config',
    jam_buka_pos TIME NOT NULL DEFAULT '06:00:00',
    batas_tepat_waktu TIME NOT NULL DEFAULT '07:15:00', -- Sebelum jam ini = Tepat Waktu
    batas_jam_masuk TIME NOT NULL DEFAULT '10:00:00',   -- Sampai jam ini = Terlambat (Masuk)
    batas_jam_pulang TIME NOT NULL DEFAULT '12:30:00',  -- Setelah jam ini = Pulang
    toleransi_duplikasi_menit INT NOT NULL DEFAULT 5,   -- Cegah scan ganda dalam 5 menit
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert nilai default pengaturan jika belum ada
INSERT INTO public.pengaturan_jam (id, jam_buka_pos, batas_tepat_waktu, batas_jam_masuk, batas_jam_pulang, toleransi_duplikasi_menit)
VALUES ('default_config', '06:00:00', '07:15:00', '10:00:00', '12:30:00', 5)
ON CONFLICT (id) DO NOTHING;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_notifikasi_wa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan_jam ENABLE ROW LEVEL SECURITY;

-- Allow anon read & write for Pos Absensi Kiosk & Dashboard
CREATE POLICY "Allow public read-write for kelas" ON public.kelas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for siswa" ON public.siswa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for absensi" ON public.absensi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for log_notifikasi_wa" ON public.log_notifikasi_wa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for pengaturan_jam" ON public.pengaturan_jam FOR ALL USING (true) WITH CHECK (true);

-- 7. CONTOH EDGE FUNCTION / DATABASE WEBHOOK TRIGGER
-- Untuk auto-send WhatsApp dari server Supabase saat row absensi di-insert:
-- create trigger on_absensi_created
-- after insert on public.absensi
-- for each row execute function supabase_functions.http_request(
--   'https://<project-ref>.functions.supabase.co/send-wa-notification',
--   'POST',
--   '{"Content-Type":"application/json"}',
--   json_build_object('record', NEW)::text,
--   '1000'
-- );
`;
