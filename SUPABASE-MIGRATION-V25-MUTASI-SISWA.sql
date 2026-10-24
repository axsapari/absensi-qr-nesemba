-- SMP NEGERI 9 BANJAR - Mutasi siswa bertanggal.
-- Menambah kolom tanggal keluar, alasan, dan keterangan pada tabel siswa.
-- WAJIB dijalankan di Supabase SQL Editor SEBELUM menonaktifkan siswa dengan tanggal keluar;
-- tanpa ini penyimpanan data siswa tersebut ditolak database. Aman dijalankan berulang kali.

ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS tanggal_keluar DATE;
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS alasan_keluar VARCHAR(20);
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS keterangan_keluar TEXT;

-- Riwayat penggantian kartu pelajar (hilang/rusak)
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS kartu_ganti_jumlah INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS kartu_ganti_terakhir DATE;
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS kartu_ganti_alasan VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'siswa_alasan_keluar_check') THEN
    ALTER TABLE public.siswa
      ADD CONSTRAINT siswa_alasan_keluar_check
      CHECK (alasan_keluar IS NULL OR alasan_keluar IN ('pindah','lulus','berhenti','lainnya'));
  END IF;
END $$;
