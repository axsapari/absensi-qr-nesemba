# PATCH v11 — Durable Sync Pengaturan Jam

## Tujuan

Menyamakan pengaturan jam operasional dengan pola durable mutation queue yang sudah dipakai siswa, kelas, dan absensi.

## Perbaikan

- Perubahan `pengaturan_jam` sekarang selalu disimpan lokal terlebih dahulu.
- Perubahan offline masuk ke `absensi_pending_mutations_v1` dengan tipe `pengaturan_jam_upsert`.
- Saat online, queue otomatis mengirim perubahan ke `public.pengaturan_jam`.
- Setelah upsert, aplikasi melakukan read-back verification sehingga tidak melaporkan sukses palsu.
- Queue hanya menyimpan satu perubahan terbaru untuk konfigurasi `default_config`.
- Saat tab kembali aktif atau koneksi pulih, aplikasi mencoba mengambil konfigurasi cloud terbaru.
- Jika masih ada perubahan lokal `pengaturan_jam_upsert` yang belum terkirim, aplikasi tidak menimpa perubahan lokal tersebut dengan snapshot cloud.
- Token/API credential WhatsApp tetap lokal dan TIDAK disinkronkan ke database.

## Urutan prioritas berikutnya

Setelah v11 stabil, tahap yang direkomendasikan adalah Sync & Data Integrity/Audit: menampilkan jumlah queue, error, dan pemeriksaan konsistensi siswa-kelas-absensi-log tanpa menghapus data otomatis. Setelah itu baru pertimbangkan Supabase Realtime untuk master data.

## Pengujian

1. Online: ubah jam, tunggu auto-sync, cek `pengaturan_jam`.
2. Offline: ubah jam, jangan sinkron manual, online kembali, cek database.
3. Ubah jam dari komputer A, lalu pindah/focus komputer B; konfigurasi B harus mengambil konfigurasi cloud jika tidak punya perubahan lokal yang belum tersinkron.
4. Pastikan pengaturan lokal tidak kembali ke nilai lama ketika masih ada mutation queue.
