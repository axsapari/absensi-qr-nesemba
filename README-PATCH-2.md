# PATCH 2 — Diagnostik & Sinkronisasi Master Data Supabase

Patch ini dibuat dari project ZIP terakhir yang dikirim pengguna. Fokusnya adalah masalah: **login berhasil, tetapi tabel `kelas` dan `siswa` tetap 0 tanpa error yang terlihat di layar**.

## File yang diubah

- `src/App.tsx`
- `src/context/AppContext.tsx`
- `src/components/SettingsModal.tsx`
- `src/BootstrapSupabase.tsx` (file baru)

## Yang diperbaiki

1. **Error sinkronisasi master sekarang terlihat di UI** melalui `syncBanner`, bukan hanya `console.error`.
2. **Session Supabase diverifikasi** sebelum membaca/mengirim master data.
3. Query `kelas` dan `siswa` dilakukan terpisah sehingga error salah satu tabel tidak disamarkan oleh `Promise.all`.
4. Saat login, cloud yang memiliki data akan diambil. Jika cloud kosong, data lokal **tidak otomatis ditimpa**.
5. Ditambahkan fungsi **Sinkronkan Master Data ke Supabase** yang:
   - memeriksa session;
   - upload `kelas` terlebih dahulu;
   - upload `siswa` setelah kelas berhasil;
   - membaca ulang kedua tabel;
   - menampilkan jumlah data hasil verifikasi.
6. Ditambahkan **Bootstrap Supabase** untuk perangkat baru. Jika URL/Anon Key kosong, aplikasi tidak lagi terjebak pada siklus `login -> Settings -> konfigurasi`.
7. Saat konfigurasi Supabase diganti, singleton client di-reset agar URL/key baru benar-benar dipakai.
8. Mempertahankan perbaikan login sebelumnya: profile user lama di localStorage akan dilengkapi email dari `INITIAL_USERS`, dan password login tidak lagi di-trim.
9. CRUD siswa/kelas yang gagal sekarang juga memberi informasi error melalui banner.

## Cara memasang

ZIP ini adalah **patch**, bukan project lengkap.

Salin file ke project utama sesuai struktur berikut:

- `App.tsx` -> `src/App.tsx`
- `AppContext.tsx` -> `src/context/AppContext.tsx`
- `SettingsModal.tsx` -> `src/components/SettingsModal.tsx`
- `BootstrapSupabase.tsx` -> `src/BootstrapSupabase.tsx`

Jangan mengganti seluruh project dengan ZIP ini.

## Urutan pengujian setelah Git update

1. Jalankan aplikasi.
2. Login dengan akun yang sudah berhasil pada versi sebelumnya.
3. Buka **Settings -> Supabase**.
4. Lihat jumlah `Kelas lokal` dan `Siswa lokal`.
5. Klik **Sinkronkan Master Data ke Supabase**.
6. Tunggu hasil verifikasi.
7. Buka Supabase Table Editor dan cek jumlah row `kelas` dan `siswa`.

Jika gagal, **pesan error yang muncul di banner adalah informasi utama yang perlu dikirim untuk diagnosis berikutnya**.

## Catatan penting

Patch ini sengaja tidak mengubah migration SQL dan tidak mengubah kebijakan RLS. Karena hasil pemeriksaan Anda menunjukkan policy memakai role `authenticated`, langkah berikutnya adalah melihat error nyata dari operasi SELECT/UPSERT.

Patch ini juga tidak menghapus data lokal. Migrasi master ke cloud dilakukan secara eksplisit lewat tombol.
