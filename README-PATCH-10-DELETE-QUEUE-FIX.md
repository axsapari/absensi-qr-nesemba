# PATCH v10 — Delete/Reset Queue Fix

## Masalah yang diperbaiki

Pada versi sebelumnya, `resetTodayAttendance()` mengubah React state secara asynchronous lalu langsung menjalankan sync. Snapshot `absensiList` yang dipakai pada pass sync yang sama masih dapat berisi data yang baru saja dihapus. Akibatnya proses dapat:

1. menghapus absensi dari Supabase, lalu
2. membaca snapshot lokal lama, lalu
3. meng-upload kembali absensi tersebut.

## Perbaikan

- `syncPendingMutations()` sekarang mengembalikan daftar attendance ID yang berhasil dihapus dan tanggal reset yang berhasil diproses.
- `syncData()` mengecualikan row dan tanggal tersebut dari snapshot lokal yang dikirim ke proses upload pada pass yang sama.
- Delete individual diverifikasi ulang dengan SELECT setelah DELETE. Jika row masih ada, mutation dianggap gagal dan tetap berada di queue.
- Reset tanggal diverifikasi ulang dengan SELECT setelah DELETE. Jika masih ada row pada tanggal tersebut, mutation dianggap gagal dan tetap di queue.
- Tidak ada lagi notifikasi sukses palsu untuk penghapusan yang belum benar-benar selesai.
- Perbaikan v9 tetap dipertahankan: background reconciliation bersifat non-destructive.

## Tes utama

1. Buat beberapa absensi hari ini.
2. Pastikan data masuk Supabase.
3. Pilih **Reset Absensi Hari Ini**.
4. Jangan tekan tombol Sinkronisasi manual.
5. Tunggu auto-sync.
6. Refresh tabel `absensi` di Supabase dan filter `tanggal = hari ini`.
7. Hasil harus 0 row.
8. Buat absensi lagi, hapus satu record, lalu pastikan row yang sama hilang dari Supabase tanpa muncul kembali.

Jika DELETE ditolak RLS atau gagal karena kondisi lain, aplikasi sekarang harus mempertahankan mutation di queue dan melaporkan kegagalan, bukan menyatakan sinkronisasi berhasil.
