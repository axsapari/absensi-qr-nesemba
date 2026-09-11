# Patch Clean Baseline QR/NISN

Baseline: `absensi-qr-nesemba(1).zip`

Perubahan utama:
- `kode_barcode` dihapus dari tipe, master siswa, import/export, kartu, rekap, backup, dan proses scan.
- QR siswa menggunakan NISN 10 digit sebagai satu-satunya identitas.
- Migrasi localStorage lama membuang properti `kode_barcode` dan menyaring duplikat NISN.
- Data contoh diperbaiki agar NISN unik.
- Scan USB dari dua scanner pada satu laptop diantrikan sehingga scan yang datang hampir bersamaan tidak saling menimpa.
- Constraint database absensi tetap `(siswa_id, tanggal, jenis)` sehingga satu siswa dapat punya satu scan masuk dan satu scan pulang per hari.
- Pengaturan jam absensi dibaca/disimpan ke Supabase ketika sesi authenticated aktif, dengan localStorage sebagai fallback offline.
- RLS master/absensi/settings menggunakan role `authenticated`.

Catatan validasi:
- Patch ini dibuat dari ZIP terbaru yang diberikan pengguna.
- `npm run lint`/`npm run build` belum dapat dijalankan di lingkungan ini karena instalasi dependency npm tidak selesai sebelum batas waktu; jangan anggap build sudah tervalidasi sampai dijalankan di mesin proyek.
