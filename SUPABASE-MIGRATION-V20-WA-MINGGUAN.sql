-- SMP NEGERI 9 BANJAR - v20
-- Rekap WhatsApp mingguan, 1 pesan/siswa/minggu.
CREATE TABLE IF NOT EXISTS public.log_rekap_wa_mingguan (
  id TEXT PRIMARY KEY,
  siswa_id TEXT NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
  minggu_mulai DATE NOT NULL,
  minggu_selesai DATE NOT NULL,
  nomor_tujuan VARCHAR(25) NOT NULL,
  pesan TEXT NOT NULL,
  status_kirim VARCHAR(20) NOT NULL CHECK (status_kirim IN ('terkirim','gagal','simulasi','pending')),
  waktu_kirim TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  response_payload TEXT,
  CONSTRAINT log_rekap_wa_mingguan_siswa_minggu_unique UNIQUE (siswa_id, minggu_mulai)
);

CREATE INDEX IF NOT EXISTS idx_log_rekap_wa_mingguan_minggu
  ON public.log_rekap_wa_mingguan(minggu_mulai);
CREATE INDEX IF NOT EXISTS idx_log_rekap_wa_mingguan_siswa
  ON public.log_rekap_wa_mingguan(siswa_id);

ALTER TABLE public.log_rekap_wa_mingguan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_log_rekap_wa_mingguan_all" ON public.log_rekap_wa_mingguan;
CREATE POLICY "authenticated_log_rekap_wa_mingguan_all"
  ON public.log_rekap_wa_mingguan
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
