# PATCH v8 — Reliable Delete/Reset Sync

## Perbaikan utama
- `Reset Absensi Hari Ini` sekarang menjadi operasi sinkronisasi tingkat tanggal (`absensi_reset_today`), bukan sekadar mengantre ID lokal satu per satu.
- Saat online, operasi reset mencari seluruh `absensi` Supabase pada tanggal tersebut, menghapus log WhatsApp terkait terlebih dahulu, lalu menghapus seluruh absensi tanggal tersebut.
- Penghapusan individual menyimpan metadata `siswa_id + tanggal + jenis` sebagai fallback jika ID lokal lama berbeda dengan ID Supabase.
- Penghapusan diverifikasi dengan `.select('id')`; operasi tidak dianggap berhasil jika row yang ditargetkan ternyata tidak terhapus.
- Sinkronisasi tidak lagi menampilkan status "berhasil" jika ada pending mutation/penghapusan yang gagal.
- Queue reset tetap dibuat walaupun daftar absensi lokal sudah kosong, sehingga aksi Reset tetap memiliki efek cloud ketika koneksi kembali.

## Catatan penting
Untuk menguji bug yang sudah terjadi pada browser lama, jalankan Reset Absensi Hari Ini sekali setelah memasang patch v8 dan pastikan tanggal yang ditampilkan adalah tanggal yang ingin dibersihkan. v8 akan membersihkan seluruh absensi Supabase pada tanggal tersebut.

## Database
`SUPABASE-MIGRATION-LOG-CASCADE.sql` dari v7 tetap disertakan. Jika belum dijalankan, disarankan dijalankan sekali agar penghapusan absensi di database juga otomatis menghapus log WhatsApp yang bergantung padanya.
