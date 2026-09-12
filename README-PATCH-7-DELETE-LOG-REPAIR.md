# PATCH v7 — Perbaikan FK log WhatsApp + auto cleanup

## Masalah yang diperbaiki

Setelah absensi dihapus, beberapa versi lama dapat meninggalkan `log_notifikasi_wa` di localStorage. Pada sinkronisasi berikutnya aplikasi mencoba meng-upload log tersebut dengan `absensi_id` yang sudah tidak ada di Supabase, sehingga muncul:

`log_notifikasi_wa_absensi_id_fkey`

## Perbaikan aplikasi

1. Sebelum upload log WhatsApp, aplikasi memvalidasi bahwa `absensi_id` masih ada di tabel `absensi`.
2. Log lokal yang menunjuk ke absensi yang sudah tidak ada dianggap stale/orphan dan dibersihkan.
3. Jika row log dengan ID yang sama masih ada di Supabase, row tersebut juga dihapus.
4. Penghapusan absensi tetap menghapus log terkait terlebih dahulu.
5. Auto-sync v6 tetap dipertahankan.
6. Sinkronisasi siswa dan kelas v6 tetap dipertahankan.

## Perbaikan database yang direkomendasikan

Jalankan `SUPABASE-MIGRATION-LOG-CASCADE.sql` SATU KALI di Supabase SQL Editor.

Foreign key `log_notifikasi_wa.absensi_id` diubah menjadi `ON DELETE CASCADE`. Dengan begitu, jika sebuah absensi dihapus dari Supabase karena alasan apa pun, log WhatsApp yang terkait ikut terhapus otomatis di level database. Ini adalah lapisan pengaman terakhir dan mencegah penumpukan log yatim.

## Urutan tes

1. Jalankan migration SQL sekali.
2. Pasang PATCH v7.
3. Buka aplikasi dan tunggu auto-sync. Error FK lama seharusnya hilang.
4. Hapus satu absensi yang sudah ada di Supabase.
5. Tunggu auto-sync tanpa menekan tombol manual.
6. Pastikan row absensi dan log terkait hilang di Supabase.
7. Ulangi dengan Reset Absensi Hari Ini.
8. Tes offline -> online lagi.
