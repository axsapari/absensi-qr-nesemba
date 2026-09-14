# PATCH v17 — Readability Pos Gerbang & Laporan Siap Cetak

Berdasarkan pengujian operasional, patch ini mempertahankan seluruh fitur v16 dan menambahkan penyempurnaan tampilan.

## 1. Pos Gerbang
- Nama siswa diperbesar dan letter spacing diperlebar agar mudah dibaca dari jarak jauh.
- Kelas dan NISN diperbesar.
- Status **ABSENSI KEPULANGAN TERCATAT** diperbesar.
- Foto siswa menggunakan rasio **4:6 (2:3)**, bukan kotak 1:1.
- Jam digital dan tanggal di pojok kanan atas diperbesar.
- Tampilan **SCAN MASUK SUDAH DITUTUP** tetap dipertahankan.

## 2. Kop laporan
Kop laporan disesuaikan mengikuti referensi yang diberikan:
- PEMERINTAH KOTA BANJAR
- DINAS PENDIDIKAN DAN KEBUDAYAAN
- UPTD SEKOLAH MENENGAH PERTAMA NEGERI 9 BANJAR
- Desa Batulawang Kecamatan Pataruman Kota Banjar 46326
- Email : info.smpn9bjr@gmail.com
- Website : smpn9kotabanjar.sch.id
- Logo Pemerintah Kota Banjar di kiri dan logo sekolah di kanan.

## 3. Cetak / Simpan PDF
Mode print sekarang hanya mencetak area laporan resmi.
- Toolbar/modal **Pratinjau Cetak Laporan Presensi Resmi** tidak ikut tercetak.
- Background abu-abu, frame, rounded corner, border aplikasi, dan shadow dihilangkan saat print.
- Ukuran halaman A4 portrait.
- Header tabel dapat berulang pada halaman berikutnya.
- Baris tabel dijaga agar tidak terpotong di tengah halaman.

## Catatan
Full build belum dijalankan karena paket `node_modules` tidak tersedia di lingkungan patch. Pemeriksaan TypeScript hanya menunjukkan dependency yang belum terpasang dan beberapa error tipe yang sudah ada pada v16.
