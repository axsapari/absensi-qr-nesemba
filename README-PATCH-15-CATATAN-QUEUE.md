# PATCH v15 — Durable Queue Izin/Sakit/Alpa

## Tujuan
Menyamakan persistence Izin/Sakit dengan arsitektur sync absensi yang sudah stabil.

## Perubahan
- Izin/Sakit sekarang ditulis lokal terlebih dahulu.
- Setiap upsert Izin/Sakit masuk `absensi_pending_mutations_v1` sebagai `catatan_kehadiran_upsert`.
- Penghapusan catatan masuk queue sebagai `catatan_kehadiran_delete`.
- Queue diproses otomatis saat online/focus/watchdog.
- Upsert memakai unique business key `(siswa_id,tanggal)`.
- Setelah upsert, aplikasi melakukan read-back verification.
- Setelah delete, aplikasi melakukan read-back verification.
- Refresh data `catatan_kehadiran` dari Supabase tidak boleh menimpa perubahan lokal yang masih pending.
- Alpa otomatis tetap menjadi tanggung jawab server/function `proses_alpa_otomatis`; v15 tidak membuat Alpa lokal palsu.

## Tes wajib
1. Online: Izin -> refresh/focus -> tetap ada di Supabase.
2. Offline: Izin -> tutup/pindah tab -> tetap lokal + pending mutation.
3. Online kembali: queue otomatis -> record masuk Supabase -> pending hilang.
4. Offline: Sakit -> ubah menjadi Izin -> hanya versi terakhir yang dikirim.
5. Offline: Izin -> hapus -> online -> record benar-benar hilang di Supabase.
6. Online: hapus Izin -> pindah tab -> tidak muncul kembali.
7. Alpa dari server tetap dapat tampil setelah refresh tanpa mengganggu pending Izin/Sakit.
8. Pastikan tabel `catatan_kehadiran` memiliki unique constraint `(siswa_id,tanggal)` dan RLS/policy yang mengizinkan operasi aplikasi.

## Catatan
Full build harus dijalankan di environment proyek dengan dependencies terpasang. ZIP ini tidak menyertakan `node_modules`.
