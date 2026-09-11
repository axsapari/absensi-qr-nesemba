# PATCH 3 — Perbaikan FK `siswa_id` dan `absensi_id`

Patch ini memperbaiki kasus ketika ID siswa lokal berbeda dari ID siswa di Supabase.

## Perbaikan
- Sinkronisasi absensi sekarang menerima mapping `id siswa lokal -> NISN`.
- ID siswa dicocokkan ke ID kanonik Supabase berdasarkan NISN sebelum INSERT/UPSERT ke `absensi`.
- ID `absensi` untuk log WA dicocokkan kembali berdasarkan siswa + tanggal + jenis.
- Jika siswa lokal tidak dapat dipetakan ke siswa Supabase, aplikasi TIDAK melakukan INSERT yang pasti gagal dengan FK; sinkronisasi dihentikan dengan pesan yang jelas.
- Log WA tidak lagi dipaksa masuk ke Supabase ketika absensi induknya belum berhasil tersimpan.
- Ditambahkan penyimpanan alias ID siswa historis (`local ID -> NISN`) sebelum master siswa lokal diganti dengan data kanonik dari Supabase. Ini mencegah masalah yang sama pada sinkronisasi berikutnya.

## Penting untuk 13 data lama
Jika 13 data yang sekarang gagal adalah scan percobaan lama yang tidak penting, data tersebut boleh dihapus dari daftar absensi lokal lalu lakukan scan ulang setelah master siswa sudah sinkron.

Jika 13 data tersebut adalah absensi penting, JANGAN hapus dulu. ID siswa lama harus masih dapat dipetakan ke NISN (misalnya melalui backup lokal sebelum master siswa diganti). Tanpa informasi itu, `absensi.siswa_id` tidak mungkin ditebak secara aman karena tabel absensi memang hanya menyimpan ID siswa.

## SQL
Tidak perlu mengubah foreign key. Constraint FK justru bekerja dengan benar dan menjaga data agar tidak menunjuk ke siswa yang tidak ada.
