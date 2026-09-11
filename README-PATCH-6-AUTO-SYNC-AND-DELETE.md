# PATCH v6 — Auto Sync + Remote Delete

Perbaikan pada versi v5:

1. **Auto-sync presensi lebih kuat**
   - Setelah browser kembali online, aplikasi mencoba sinkronisasi otomatis.
   - Ada beberapa retry bertahap jika internet sudah terdeteksi tetapi Supabase belum siap.
   - Sinkronisasi juga dipicu saat tab kembali aktif/fokus.
   - Ada watchdog sekitar 10 detik untuk antrean yang masih tertunda.
   - Manual tombol Sinkronisasi tetap tersedia sebagai cadangan.

2. **Perubahan master siswa & kelas ikut antre otomatis**
   - Tambah/edit/hapus siswa dan kelas sekarang masuk durable mutation queue di localStorage.
   - Jika offline, perubahan tidak hilang dan akan dikirim otomatis ketika online.
   - Jika online, perubahan dicoba otomatis tanpa harus menekan Sinkronisasi Master.
   - NISN tetap dipakai sebagai identitas bisnis siswa untuk menghindari duplikasi.

3. **Hapus absensi ikut menghapus data Supabase**
   - Menghapus absensi yang sudah tersinkron akan mengantre operasi DELETE ke Supabase.
   - Log WhatsApp yang terkait absensi tersebut juga dihapus dari `log_notifikasi_wa` agar tidak menumpuk.
   - Jika sedang offline, penghapusan disimpan sebagai antrean dan dikirim otomatis saat online.
   - Absensi yang belum pernah masuk Supabase tidak membuat DELETE remote yang tidak perlu.

4. **Reset absensi hari ini**
   - Semua absensi hari ini yang sudah ada di cloud akan dijadwalkan untuk dihapus dari Supabase.
   - Data lokal dan log WA lokal ikut dibersihkan.

5. **Urutan sinkronisasi aman**
   - Mutasi master/penghapusan diproses lebih dahulu.
   - Baru kemudian proses sync absensi dan log WA.
   - Ini mencegah cleanup lokal menghapus perubahan master yang baru dibuat saat offline.

## Pengujian yang disarankan

### A. Offline scan → online
1. Aktifkan simulasi offline atau putuskan internet.
2. Scan 2–3 siswa.
3. Jangan tekan tombol Sinkronisasi.
4. Kembalikan koneksi / matikan simulasi offline.
5. Tunggu beberapa detik. Data harus masuk Supabase otomatis.

### B. Hapus absensi → Supabase
1. Pastikan satu absensi sudah terlihat di Supabase.
2. Hapus absensi tersebut dari aplikasi.
3. Saat online, aplikasi harus menghapus baris `absensi` dan log WA terkait di Supabase otomatis.
4. Jika offline, reconnect dan tunggu auto-sync.

### C. Edit master saat offline
1. Edit nama siswa atau data kelas saat offline.
2. Tutup/refresh boleh dilakukan.
3. Kembalikan koneksi.
4. Perubahan harus terkirim tanpa menekan tombol sinkron manual.

## Catatan

PATCH ini tidak mengubah struktur tabel Supabase sehingga tidak membutuhkan SQL migration tambahan.
