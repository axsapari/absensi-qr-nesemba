# PATCH SYNC FIX v2

Perbaikan lanjutan berdasarkan error Supabase saat sinkronisasi:

1. **`ON CONFLICT DO UPDATE command cannot affect row a second time`**
   - Data absensi lokal dideduplikasi berdasarkan `(siswa_id, tanggal, jenis)` sebelum satu batch dikirim ke Supabase.
   - Ini sesuai dengan constraint UNIQUE di tabel `absensi`.

2. **Foreign key `log_notifikasi_wa_absensi_id_fkey`**
   - Sebelum upload absensi, aplikasi membaca absensi yang sudah ada di Supabase.
   - Jika ID lokal berbeda dengan ID remote untuk kombinasi siswa/tanggal/jenis yang sama, ID lokal direkonsiliasi ke ID remote.
   - `absensi_id` pada log WA juga diperbaiki sebelum disimpan.
   - Setelah scan online, pengiriman WA memakai ID absensi kanonik dari Supabase bila tersedia.

3. **Status sinkronisasi**
   - Absensi hanya menjadi `synced: true` setelah Supabase mengonfirmasi upsert berhasil.
   - Online browser tidak lagi dianggap sama dengan berhasil tersimpan.

4. **Log WhatsApp**
   - Log disimpan setelah absensi tersedia sehingga FK tidak mendahului parent row.
   - Status `terkirim/gagal/simulasi/pending` tidak dipalsukan hanya karena koneksi kembali.

## Cara pakai

- Ganti project lama dengan project hasil patch ini.
- Hard refresh browser setelah deploy (`Ctrl+Shift+R`).
- Login kembali jika session Supabase sebelumnya sudah kedaluwarsa.
- Tekan **Sinkron Data** sekali untuk mengirim ulang data lokal yang masih `synced: false`.
- Setelah itu lakukan satu scan baru dan cek tabel `absensi` di Supabase.

Tidak ada perubahan SQL yang diperlukan untuk error di atas; constraint UNIQUE yang ada justru menjadi acuan deduplikasi.

Catatan: build penuh belum dapat diverifikasi di lingkungan ini karena ZIP tidak membawa `node_modules`. Struktur kode dan perubahan sumber sudah diperiksa secara statis.
