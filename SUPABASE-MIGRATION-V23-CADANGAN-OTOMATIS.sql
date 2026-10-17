-- SMP NEGERI 9 BANJAR - Cadangan otomatis ke Supabase Storage.
-- Jalankan sekali di Supabase SQL Editor. Aman dijalankan berulang kali.
-- Membuat bucket PRIVAT "cadangan-absensi"; hanya pengguna login yang boleh membaca/menulis.
-- (Cadangan tidak memuat token WhatsApp maupun sandi.)

INSERT INTO storage.buckets (id, name, public)
VALUES ('cadangan-absensi', 'cadangan-absensi', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "cadangan_select" ON storage.objects;
DROP POLICY IF EXISTS "cadangan_insert" ON storage.objects;
DROP POLICY IF EXISTS "cadangan_delete" ON storage.objects;

CREATE POLICY "cadangan_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cadangan-absensi');
CREATE POLICY "cadangan_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cadangan-absensi');
CREATE POLICY "cadangan_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cadangan-absensi');
