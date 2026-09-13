# PATCH v14 — Anti Resurrection / Durable Delete Tombstone

## Tujuan
Memperbaiki kasus data absensi yang sudah dihapus dari aplikasi tetapi muncul kembali setelah tab/window diaktifkan, karena rekonsiliasi membaca data yang masih ada di Supabase.

## Perubahan utama
- Menambahkan `absensi_attendance_tombstones_v1` di LocalStorage.
- Delete absensi menulis tombstone sebelum state lokal diubah.
- Reset hari ini menulis tombstone tanggal.
- Rekonsiliasi Supabase menghormati tombstone dan tidak menghidupkan kembali record yang sengaja dihapus.
- Tombstone tetap tersimpan sampai ada scan baru pada business key/tanggal tersebut.
- Scan baru otomatis membuka kembali key/tanggal yang sebelumnya di-reset/dihapus.
- Delete absensi selalu masuk durable mutation queue, termasuk bila row lokal sebelumnya belum berstatus `synced`.
- Fallback delete menggunakan NISN/alias untuk menemukan `siswa_id` canonical di Supabase.
- Diagnostic trace ditambah event `delete`, `reset`, dan `reconcile`.
- Audit menampilkan tombstone yang terkait dengan NISN target.

## Tidak perlu SQL migration
Tombstone hanya merupakan state lokal untuk mencegah reconciliation mengembalikan data yang memang sengaja dihapus. Penghapusan Supabase tetap dilakukan melalui mutation queue.

## Pengujian wajib
### A. Hapus satu absensi
1. Scan siswa.
2. Pastikan masuk Supabase.
3. Hapus dari aplikasi.
4. Tunggu sinkronisasi selesai.
5. Pastikan row hilang di Supabase.
6. Pindah tab / buka aplikasi lain / kembali.
7. Row tidak boleh muncul lagi.

### B. Reset hari ini
1. Buat beberapa absensi.
2. Pastikan masuk Supabase.
3. Reset semua absensi hari ini.
4. Pastikan Supabase kosong untuk tanggal tersebut.
5. Pindah tab / kembali.
6. Data tidak boleh muncul lagi.

### C. Scan setelah reset
1. Setelah reset, scan satu siswa baru.
2. Siswa tersebut harus muncul lokal.
3. Harus masuk Supabase.
4. Jangan sampai tombstone tanggal reset memblokir scan baru.

### D. Offline delete
1. Buat absensi lokal.
2. Putuskan koneksi.
3. Hapus absensi.
4. Aktifkan koneksi.
5. Tunggu auto-sync.
6. Data tidak boleh direstore oleh focus/visibility.

### E. Diagnostic
Gunakan Audit Integritas Data. Untuk Alip gunakan NISN `0124203121`. Event `delete`, `reset`, dan `reconcile` sekarang dapat terlihat pada trace.
