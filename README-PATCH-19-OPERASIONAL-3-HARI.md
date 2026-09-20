# PATCH v19 — Perbaikan Operasional Setelah Uji 3 Hari

Basis: v18-F4-KEPSEK.

## Perubahan

1. **Penandatangan kanan laporan**
   - Nama koordinator mengikuti akun yang sedang login (`currentUser.name`).
   - NIP mengikuti `currentUser.nip` bila tersedia.
   - NIP akun Agus diperbaiki menjadi `199108152019031009`.

2. **WhatsApp diarahkan ke Ibu**
   - Field lama `nomor_wa_ortu` dan `nama_ortu` tetap dipertahankan agar tidak memecahkan database lama, tetapi UI dan template Excel sekarang menyebutnya **Nomor WhatsApp Ibu / Nama Ibu**.
   - Template WhatsApp bawaan menyapa `Ibu`.
   - Import Excel menerima `No WA Ibu` / `Nama Ibu` sekaligus tetap kompatibel dengan header lama.
   - Data nomor WhatsApp lama yang masih berisi nomor ayah harus diperbarui melalui Master Data/Excel; aplikasi tidak dapat menebak nomor ibu.

3. **Placeholder foto menjadi ilustrasi kartun lokal**
   - Placeholder siswa/siswi SMP dibuat sebagai SVG lokal.
   - Tidak lagi memakai foto manusia dari Unsplash sebagai placeholder.
   - URL demo lama dari Unsplash juga diperlakukan sebagai placeholder kartun.
   - Foto asli yang diunggah ke Supabase Storage tetap dapat digunakan.

4. **Urutan kelas konsisten**
   - VII-A, VII-B, VII-C ... lalu VIII-A ... lalu IX-A ...
   - Diterapkan pada dropdown Rekap, Kartu Pelajar, Master Data dan perbandingan kelas.
   - Data siswa/laporan diurutkan berdasarkan kelas lalu nama siswa.

5. **Scan di luar jam operasional lebih informatif**
   - Sebelum `jam_buka_pos`: `ABSENSI BELUM DIMULAI` + jam mulai.
   - Setelah batas akhir scan masuk tetapi sebelum jam pulang: `ABSENSI KEPULANGAN BELUM DIMULAI` + jam mulai pulang.
   - Setelah jam pulang: scan diproses sebagai kepulangan sesuai aturan yang sudah ada.
   - Pesan tidak lagi menyalahkan NISN yang sebenarnya terdaftar.

6. **Cetak Kartu Pelajar**
   - Print mode diperbaiki menggunakan mode print khusus berbasis `body.printing-student-cards`.
   - Hanya area kartu yang dicetak.
   - Layout kartu 2 kolom pada kertas F4 portrait.
   - Preview print tidak lagi tertutup oleh layout aplikasi.

## Catatan database

Tidak diperlukan migration Supabase untuk perubahan WhatsApp karena v19 sengaja mempertahankan kolom database lama sebagai field target Ibu/orang tua utama.

## Verifikasi

- ZIP v19 diuji integritas arsip.
- Full TypeScript build tidak dapat dijalankan di lingkungan patch karena `node_modules` tidak tersedia; `tsc` global hanya menunjukkan dependency yang belum terpasang serta beberapa type issue yang sudah ada pada basis v18.
