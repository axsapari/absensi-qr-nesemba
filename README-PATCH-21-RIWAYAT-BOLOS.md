# PATCH v21 — Pull Riwayat Absensi Antar-Pos + Bolos

## 1. Riwayat absensi antar perangkat
Perangkat sekarang menarik seluruh riwayat `absensi` dari Supabase saat sesi Supabase tersedia dan setelah siklus sinkronisasi berhasil. Data remote yang sudah tersimpan akan masuk ke cache lokal perangkat, sehingga pos yang sempat tidak melakukan sync pada hari scan tetap dapat mengejar data pada hari berikutnya.

- Pengambilan dilakukan bertahap 1000 baris agar tidak berhenti pada batas hasil query.
- Record lokal yang masih pending tetap dipertahankan.
- Tombstone delete/reset tetap dihormati.
- Jika koneksi/query gagal, cache lokal tidak dibuang.
- Fokus/pindah tab tidak memicu sinkronisasi.

## 2. Bolos
Status `bolos` ditambahkan ke `catatan_kehadiran` tanpa mengganti nama tabel/kolom.

Bolos dapat ditandai untuk siswa yang sudah scan masuk tetapi kemudian tidak mengikuti pembelajaran/pembiasaan pagi. Karena itu tombol catatan sekarang tetap tersedia walaupun siswa sudah memiliki scan masuk. Jika catatan `bolos` ada, status harian menampilkan Bolos sebagai catatan pembinaan.

Migration: `SUPABASE-MIGRATION-V21-BOLOS.sql`

Jalankan sekali di Supabase SQL Editor.
