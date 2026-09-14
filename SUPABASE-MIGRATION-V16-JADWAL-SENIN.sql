-- v16: jadwal pulang khusus Hari Senin
ALTER TABLE public.pengaturan_jam
  ADD COLUMN IF NOT EXISTS batas_jam_pulang_senin TIME NOT NULL DEFAULT '14:00:00';

-- Sesuaikan default jadwal Selasa-Kamis menjadi 14:15 hanya bila kolom masih
-- memakai default lama 14:00. Jika sekolah sudah memiliki nilai sendiri,
-- perintah ini tidak memaksa perubahan operasional yang sudah disimpan.

ALTER TABLE public.pengaturan_jam
  ADD COLUMN IF NOT EXISTS hari_khusus JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Kolom JSONB ini menyimpan jadwal khusus per tanggal agar dua pos memakai aturan yang sama.
