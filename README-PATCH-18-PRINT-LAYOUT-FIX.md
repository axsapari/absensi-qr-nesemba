# PATCH v18 — Perbaikan Layout Print Laporan

Berdasarkan pengujian v17, print laporan masih membawa ruang/layout aplikasi sebelum modal laporan sehingga dokumen dapat menjadi beberapa halaman dan kop baru muncul di halaman berikutnya.

Perbaikan:
- Modal laporan resmi dipindahkan ke `document.body` menggunakan React portal.
- Saat print, root aplikasi disembunyikan sehingga layout dashboard tidak ikut mengambil ruang halaman.
- Hanya dokumen `printable-report` yang dicetak.
- Kop surat dimulai dari halaman pertama.
- Frame, toolbar, preview, dan elemen aplikasi tidak ikut tercetak.
- Tetap menggunakan A4 portrait.
- Jarak kop/judul dan area tanda tangan dibuat lebih kompak agar laporan harian 22 siswa dapat tetap muat secara wajar pada satu halaman bila kontennya sesuai.


## Revisi v18: F4 dan identitas Kepala Sekolah
- Ukuran cetak laporan resmi diubah dari A4 menjadi F4/Folio (215,9 x 330,2 mm), portrait.
- Nama Kepala Sekolah pada blok tanda tangan sekarang mengambil `profilSekolah.kepalaSekolah`.
- NIP Kepala Sekolah pada blok tanda tangan sekarang mengambil `profilSekolah.nipKepalaSekolah`.
- Tidak lagi menggunakan nama/NIP kepala sekolah yang di-hardcode.
