-- SMP NEGERI 9 BANJAR - Tambah status kehadiran manual "tidak_bawa_kartu"
-- (siswa hadir tetapi lupa membawa kartu QR).
-- WAJIB dijalankan di Supabase SQL Editor SEBELUM fitur ini dipakai; tanpa ini database menolak
-- penyimpanan catatan dengan status baru. Aman dijalankan berulang kali.

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.catatan_kehadiran'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.catatan_kehadiran DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.catatan_kehadiran
  ADD CONSTRAINT catatan_kehadiran_status_check
  CHECK (status IN ('izin','sakit','bolos','alpa','tidak_bawa_kartu'));

-- PENTING: periksa fungsi alpa otomatis (proses_alpa_otomatis). Pastikan ia MELEWATI siswa yang
-- sudah punya baris catatan_kehadiran pada tanggal itu (INSERT ... ON CONFLICT (siswa_id, tanggal)
-- DO NOTHING), supaya "tidak_bawa_kartu" tidak tertimpa menjadi "alpa". Untuk melihat definisinya:
--   SELECT pg_get_functiondef('public.proses_alpa_otomatis'::regproc);
