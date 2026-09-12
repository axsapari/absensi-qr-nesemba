-- PATCH v7: cegah log_notifikasi_wa menumpuk setelah absensi dihapus.
-- Jalankan SEKALI di Supabase SQL Editor.

ALTER TABLE public.log_notifikasi_wa
  DROP CONSTRAINT IF EXISTS log_notifikasi_wa_absensi_id_fkey;

ALTER TABLE public.log_notifikasi_wa
  ADD CONSTRAINT log_notifikasi_wa_absensi_id_fkey
  FOREIGN KEY (absensi_id)
  REFERENCES public.absensi(id)
  ON DELETE CASCADE;

-- Audit opsional: cari log yang tidak lagi memiliki pasangan absensi.
-- (Biasanya hasilnya 0 setelah constraint cascade aktif.)
-- SELECT l.id, l.absensi_id
-- FROM public.log_notifikasi_wa l
-- LEFT JOIN public.absensi a ON a.id = l.absensi_id
-- WHERE l.absensi_id IS NOT NULL AND a.id IS NULL;
