# PATCH v16 — Operasional, Performa Scan & Aturan Jam

## Perubahan utama
1. Scan presensi tidak lagi langsung mengirim absensi ke Supabase setiap kali kartu dibaca. Data disimpan durable di browser sebagai pending lalu batch sync otomatis setiap 6 menit.
2. Pindah tab/focus tidak lagi memicu sinkronisasi absensi.
3. Perubahan pengaturan jam tetap memakai sinkronisasi segera agar aturan baru cepat berlaku.
4. Scan setelah `batas_jam_masuk` dan sebelum jam pulang menampilkan `SCAN MASUK SUDAH DITUTUP` dan tidak membuat record absensi.
5. Hari Senin mempunyai jam pulang sendiri, default 14:00. Selasa–Kamis memakai jam reguler (default 14:15). Jumat tetap memakai jadwal Jumat.
6. Pos Gerbang tidak lagi menampilkan nama orang tua, dan nama siswa dibuat lebih renggang.
7. Rekap: area ikon aksi diperbesar.
8. Username lama `feby` dimigrasikan menjadi `tri`, dengan nama `Tri Feby Adinsyah`; nama Moch dan Alia diperbarui sesuai permintaan.
9. Jadwal khusus per tanggal dapat ditambahkan sebagai hari pulang cepat.
10. Tombstone v14, queue Izin/Sakit v15, dan pengaman concurrency database tetap dipertahankan.

## Migrasi Supabase
Jalankan `SUPABASE-MIGRATION-V16-JADWAL-SENIN.sql` sekali pada project Supabase yang sudah berjalan.

## Catatan
WA dapat tetap diproses sesuai alur gateway yang sudah ada; perubahan 6 menit difokuskan pada sinkronisasi data presensi ke database.
