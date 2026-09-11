# Patch Sinkronisasi Presensi + Log WhatsApp

## Perubahan utama

1. Scan baru selalu dibuat `synced: false`.
2. Scan online langsung mencoba `upsert` ke `public.absensi`.
3. `synced` baru menjadi `true` setelah Supabase mengembalikan `error: null`.
4. `public.log_notifikasi_wa` sekarang benar-benar di-upsert dengan hasil gateway WhatsApp yang sebenarnya.
5. Bug lama yang mengubah `pending` menjadi `terkirim` hanya karena internet kembali dihapus.
6. Sinkronisasi memeriksa Supabase Auth session, bukan hanya `navigator.onLine`.
7. Scan lama hasil versi buggy dengan ID `abs_...` dimigrasikan kembali menjadi pending saat aplikasi dibuka.
8. Setelah akun kiosk/staf berhasil login ke Supabase, antrean lokal otomatis dicoba sinkron.
9. Urutan sinkronisasi: `absensi` dulu, baru `log_notifikasi_wa` karena log memiliki foreign key ke absensi.

## Catatan

- Data demo bawaan dengan ID seperti `abs-001` tidak dipaksa menjadi pending.
- Tidak perlu mengubah SQL schema untuk patch ini.
- Setelah deploy, lakukan hard refresh browser agar JavaScript versi baru benar-benar digunakan.
- Jika sebelumnya ada scan nyata yang tersimpan lokal dengan ID `abs_...`, patch akan mencoba mengirim ulang ke Supabase.
