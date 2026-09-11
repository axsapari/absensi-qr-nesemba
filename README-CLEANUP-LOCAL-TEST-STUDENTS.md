# Patch v4 — Cleanup siswa lokal ujicoba/orphan

Perubahan utama:
- Sebelum sinkronisasi absensi, aplikasi membaca master `siswa` dari Supabase.
- Siswa lokal/alias yang NISN-nya tidak ditemukan di Supabase dianggap sebagai data ujicoba/orphan.
- Data tersebut dihapus dari **localStorage/perangkat saja**; data Supabase tidak dihapus.
- Absensi lokal yang menunjuk ke siswa orphan ikut dibersihkan agar tidak lagi memicu `absensi_siswa_id_fkey`.
- Log WA lokal yang menunjuk ke absensi/siswa orphan ikut dibersihkan agar tidak lagi memicu `log_notifikasi_wa_absensi_id_fkey`.
- Alias ID siswa lama juga dibersihkan.
- Setelah cleanup, sinkronisasi dilanjutkan menggunakan hanya siswa yang valid di Supabase.

## Cara memakai
1. Ganti project dengan patch ini.
2. Hard refresh (`Ctrl+Shift+R`).
3. Pastikan koneksi dan session Supabase aktif.
4. Klik **Sinkron Data**.
5. Siswa lokal ujicoba yang NISN-nya tidak ada di Supabase akan dibersihkan otomatis.
6. Setelah itu absensi siswa yang benar dapat disinkronkan.

Catatan: patch ini **tidak menghapus baris apa pun dari Supabase**. Yang dibersihkan adalah data lokal yang tidak mempunyai pasangan NISN di master Supabase.
