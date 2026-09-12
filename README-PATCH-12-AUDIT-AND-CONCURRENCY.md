# PATCH v12 — Audit Data & Concurrency-Safe Attendance

Patch ini melanjutkan v11.

## 1. Audit Integritas Data

Panel Admin > Pemeliharaan menambahkan `Audit Integritas Data`.
Audit bersifat READ-ONLY: tidak menghapus atau mengubah data.

Pemeriksaan meliputi:
- jumlah siswa, kelas, absensi, dan log WA di Supabase;
- absensi Supabase tanpa siswa;
- log WA Supabase tanpa absensi;
- duplikasi kombinasi siswa+tanggal+jenis;
- orphan data lokal;
- antrean mutation yang masih pending;
- perbedaan absensi hari ini yang sudah synced antara lokal dan Supabase.

## 2. Perlindungan dua scanner pada satu komputer

ScanKiosk sudah memiliki antrean input USB. v12 menambah queue pada AppContext sehingga semua pemanggilan `processScanNisn()` diproses serial, bahkan bila berasal dari dua komponen/scanner yang hampir bersamaan.

Catatan penting: dua scanner USB yang bertindak sebagai keyboard wedge masih berbagi satu input field. Jika dua scanner benar-benar mengirim karakter pada milidetik yang sama, perangkat operasi bisa menginterleave karakter sebelum Enter. Untuk deployment dua scanner fisik pada satu komputer, pengujian hardware tetap diperlukan. Jika diperlukan isolasi scanner yang benar-benar independen, gunakan scanner sebagai HID serial/COM atau dua device input yang dapat diidentifikasi, bukan dua keyboard wedge ke field yang sama.

## 3. Perlindungan dua pos komputer / banyak scanner

Database `absensi` sudah memiliki UNIQUE `(siswa_id, tanggal, jenis)`. v12 mengganti attendance sync dari UPSERT menjadi INSERT + verifikasi.

Jika dua pos memasukkan siswa yang sama hampir bersamaan:
- hanya satu INSERT yang menang secara atomik di Supabase;
- scanner lain yang kalah pada unique constraint diperlakukan sebagai duplicate;
- data pemenang tidak ditimpa oleh scanner kedua;
- log WhatsApp dari scan duplikat lokal tidak dikirim ulang;
- waktu/status data pemenang tetap menjadi sumber kebenaran.

Dengan demikian, aturan database adalah sumber kebenaran terakhir, bukan timing JavaScript/browser.

## 4. Prinsip penting

Background reconciliation tidak boleh menghapus data lokal hanya karena mismatch sementara.
Penghapusan hanya berasal dari delete/reset mutation yang eksplisit dan diverifikasi.

## 5. Tes yang disarankan

A. Satu komputer + dua scanner: scan siswa berbeda secara bergantian dan hampir bersamaan.
B. Dua komputer/pos: scan siswa yang sama pada waktu hampir bersamaan. Harus hanya ada satu row `absensi` untuk kombinasi siswa+tanggal+jenis.
C. Cek bahwa scan yang kalah tidak menimpa `waktu_scan` pemenang.
D. Cek bahwa tidak ada dua log WA untuk satu attendance akibat race.
E. Jalankan Audit Integritas Data setelah tes dan pastikan tidak ada orphan/duplikat.
