# PATCH v20 — WA Rekap Mingguan + Update Data Ortu Massal

## Tujuan
- Database tetap memakai kolom `nama_ortu` dan `nomor_wa_ortu`.
- Data Ayah lama dapat ditimpa cepat dengan data Ibu baru berdasarkan NISN.
- Tidak ada lagi pengiriman WhatsApp setiap kali siswa scan.
- Rekap WhatsApp dikirim satu kali per siswa setiap minggu, periode Senin–Jumat.

## Update Data Ibu Massal
Menu: **Master Data → Update Data Ibu**.

Excel minimal berisi:
- NISN
- Nama Ibu
- No WA Ibu

NISN menjadi kunci pencocokan. Sistem hanya mengubah `nama_ortu` dan `nomor_wa_ortu`; data siswa lain tidak diubah.

## WhatsApp Mingguan
Menu: **Rekap & Laporan → WA Mingguan**.

- Tombol `Kirim Rekap Mingguan`.
- Tombol `Kirim Ulang yang Gagal`.
- Otomatis mencoba mengirim pada Jumat mulai pukul 12.00 jika aplikasi sedang terbuka, pengguna sudah login, gateway aktif, dan internet/Supabase tersedia.
- Jika aplikasi tidak terbuka pada waktu tersebut, gunakan tombol manual.
- Database menggunakan unique `(siswa_id, minggu_mulai)` sehingga satu siswa tidak dikirim dua kali untuk minggu yang sama.
- Pengiriman memakai mekanisme claim `pending` terlebih dahulu agar dua perangkat yang sama-sama mencoba mengirim tidak mudah menghasilkan duplikasi.
- Log pengiriman disimpan di `log_rekap_wa_mingguan`.

## Isi pesan
Rekap mencakup per hari:
- waktu masuk dan status terlambat/tepat waktu
- waktu pulang
- Izin/Sakit/Alpa bila ada
- ringkasan jumlah hari Hadir, Terlambat, Izin, Sakit, Alpa

## Migration Supabase
Jalankan sekali:
`SUPABASE-MIGRATION-V20-WA-MINGGUAN.sql`

## Catatan
`log_notifikasi_wa` lama tidak dihapus agar histori tetap aman. v20 hanya menghentikan pembuatan log/pengiriman baru per scan dan menggunakan tabel rekap mingguan baru.
