-- SMP NEGERI 9 BANJAR - v21
-- Tambah status kehadiran manual "bolos".
-- Struktur kolom tetap: status pada public.catatan_kehadiran.
-- Aman dijalankan berulang kali.

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
  CHECK (status IN ('izin','sakit','bolos','alpa'));

CREATE INDEX IF NOT EXISTS idx_catatan_kehadiran_siswa_tanggal
  ON public.catatan_kehadiran(siswa_id, tanggal);
