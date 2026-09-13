# PATCH v13 — Diagnostic Audit + Pelacakan Alip

Tanggal: 13 September 2026

Patch ini **tidak menghapus atau mengubah data absensi**. Fokusnya adalah mencari sumber record yang muncul kembali setelah ganti tab/tampilan.

## Fitur
- Audit menerima NISN target; default `0124203121` (Alip Yoga Permana).
- Menampilkan master siswa lokal vs Supabase.
- Menampilkan setiap absensi lokal yang terhubung ke target.
- Menampilkan local `siswa_id`, ID absensi, tanggal, jenis, waktu, `synced`.
- Menampilkan apakah siswa/absensi padanan ada di Supabase.
- Menampilkan `siswaIdAliases` yang relevan.
- Membaca pending mutation yang berkaitan dengan target.
- Menampilkan ukuran LocalStorage absensi.
- Menyimpan trace ringkas 80 event terakhir untuk `absensiList`: localStorage write, focus/visibility, dan audit.
- Audit tetap read-only.

## Cara memakai
1. Buka Admin → Maintenance → Audit Integritas Data.
2. Pastikan NISN `0124203121`.
3. Klik Jalankan Audit.
4. Catat hasil Diagnostic Trace dan detail Alip.
5. Lakukan eksperimen: hapus/ubah tampilan sesuai prosedur pengujian, pindah tab, kembali ke aplikasi, lalu jalankan audit lagi.
6. Jika Alip muncul lagi, trace akan membantu melihat apakah kemunculan berkaitan dengan write localStorage atau event tab.

## Catatan
Trace hanya untuk diagnosis dan disimpan lokal di browser. Tidak dikirim ke Supabase dan tidak mengubah data absensi.
