import type { LaporanKepsek } from './laporanMingguan';
import { namaBerkasLaporanKepsek } from './laporanMingguan';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const tanggalIndo = (t: string): string => {
  const [y, m, d] = t.split('-').map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
};
const persen = (n: number) => `${String(n).replace('.', ',')}%`;

const HIJAU: [number, number, number] = [5, 150, 105];
const KUNING: [number, number, number] = [217, 119, 6];
const MERAH: [number, number, number] = [220, 38, 38];
const ABU: [number, number, number] = [100, 116, 139];
const GELAP: [number, number, number] = [15, 23, 42];

const warnaPersen = (p: number) => (p >= 90 ? HIJAU : p >= 80 ? KUNING : MERAH);

/** Membuat PDF satu halaman A4 dan mengunduhnya. jsPDF dimuat hanya saat tombol ditekan. */
export async function unduhPdfLaporanKepsek(lap: LaporanKepsek, opsi: { sekolah: string; dibuat: string }): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 15, R = 195, W = R - L;
  const p = lap.pekan;
  let y = 16;

  const teks = (s: string, x: number, yy: number, o: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right' } = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
    doc.setFontSize(o.size ?? 10);
    doc.setTextColor(...(o.color ?? GELAP));
    doc.text(s, x, yy, { align: o.align ?? 'left' });
  };

  // Kop
  teks(opsi.sekolah.toUpperCase(), 105, y, { size: 13, bold: true, align: 'center' });
  y += 6;
  teks('LAPORAN KEHADIRAN SISWA MINGGUAN', 105, y, { size: 11, bold: true, align: 'center', color: HIJAU });
  y += 5.5;
  teks(`Periode ${tanggalIndo(p.start)} s/d ${tanggalIndo(p.end)}  |  ${p.hariEfektif} hari efektif  |  ${p.jumlahSiswa} siswa aktif`, 105, y, { size: 9, align: 'center', color: ABU });
  y += 3;
  doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.4); doc.line(L, y, R, y);
  y += 7;

  if (p.hariEfektif === 0) {
    teks('Tidak ada hari efektif bercatatan pada periode ini.', 105, y + 10, { size: 11, align: 'center', color: ABU });
    doc.save(namaBerkasLaporanKepsek(p.start, p.end));
    return namaBerkasLaporanKepsek(p.start, p.end);
  }

  // Kartu KPI
  const kpi: { judul: string; nilai: string; ket: string; warna: [number, number, number] }[] = [
    {
      judul: 'KEHADIRAN SEKOLAH', nilai: persen(p.persen), warna: warnaPersen(p.persen),
      ket: lap.selisihPersen === null ? 'pekan sebelumnya: tidak ada data'
        : `${lap.selisihPersen > 0 ? '+' : ''}${String(lap.selisihPersen).replace('.', ',')} poin vs pekan lalu`,
    },
    { judul: 'TERLAMBAT', nilai: String(p.terlambat), ket: 'kejadian siswa-hari', warna: KUNING },
    { judul: 'ALPA / TANPA KET.', nilai: String(p.alfa), ket: `+ ${p.bolos} bolos`, warna: MERAH },
    { judul: 'TIDAK SCAN PULANG', nilai: String(p.tidakPulang), ket: 'kejadian siswa-hari', warna: ABU },
  ];
  const bw = (W - 3 * 4) / 4;
  kpi.forEach((k, i) => {
    const x = L + i * (bw + 4);
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, bw, 24, 2, 2, 'FD');
    teks(k.judul, x + 3, y + 5.5, { size: 7, bold: true, color: ABU });
    teks(k.nilai, x + 3, y + 15, { size: 18, bold: true, color: k.warna });
    teks(k.ket, x + 3, y + 21, { size: 7, color: ABU });
  });
  y += 30;

  // Rincian
  const rincian = [
    `Hadir ${p.hadir}`, `Tanpa kartu ${p.tanpaKartu}`, `Dispensasi ${p.dispensasi}`,
    `Izin ${p.izin}`, `Sakit ${p.sakit}`,
  ].join('   |   ');
  teks(`Rincian (siswa-hari): ${rincian}`, L, y, { size: 8.5, color: ABU });
  y += 8;

  // Bar per kelas
  teks('Kehadiran per Kelas', L, y, { size: 10.5, bold: true });
  y += 5;
  const kelas = p.kelas;
  const baris = Math.max(1, kelas.length);
  const tinggiBar = Math.min(6.2, 66 / baris);
  const xBar = L + 22, wBar = W - 22 - 22;
  for (const k of kelas) {
    teks(k.kelas.nama_kelas, L, y + tinggiBar * 0.68, { size: 8.5 });
    doc.setFillColor(226, 232, 240); doc.roundedRect(xBar, y, wBar, tinggiBar * 0.72, 1, 1, 'F');
    const w = Math.max(0.5, (wBar * Math.min(100, k.persen)) / 100);
    doc.setFillColor(...warnaPersen(k.persen)); doc.roundedRect(xBar, y, w, tinggiBar * 0.72, 1, 1, 'F');
    teks(persen(k.persen), R, y + tinggiBar * 0.68, { size: 8.5, bold: true, align: 'right', color: warnaPersen(k.persen) });
    y += tinggiBar;
  }
  y += 4;

  // Terbaik / terlemah
  const colW = (W - 6) / 2;
  const kotakKelas = (judul: string, daftar: typeof kelas, x: number, warna: [number, number, number]) => {
    teks(judul, x, y, { size: 9.5, bold: true, color: warna });
    daftar.forEach((k, i) => teks(`${i + 1}. ${k.kelas.nama_kelas}  ${persen(k.persen)}  (alpa ${k.alfa}, terlambat ${k.terlambat})`, x, y + 5 + i * 4.6, { size: 8.5 }));
    if (daftar.length === 0) teks('-', x, y + 5, { size: 8.5, color: ABU });
  };
  kotakKelas('Kelas Terbaik', lap.kelasTerbaik, L, HIJAU);
  kotakKelas('Kelas Perlu Perhatian', lap.kelasTerlemah, L + colW + 6, MERAH);
  y += 5 + Math.max(lap.kelasTerbaik.length, lap.kelasTerlemah.length, 1) * 4.6 + 4;

  // Siswa perlu perhatian
  teks('Siswa yang Perlu Perhatian', L, y, { size: 10.5, bold: true });
  y += 3;
  doc.setDrawColor(203, 213, 225); doc.line(L, y, R, y);
  y += 4.5;
  if (lap.perhatian.length === 0) {
    teks('Tidak ada siswa yang memerlukan tindak lanjut pekan ini.', L, y, { size: 9, color: HIJAU });
    y += 6;
  }
  for (const x of lap.perhatian) {
    if (y > 268) break;
    const m = x.metrik;
    const warna = x.tingkat === 'mendesak' ? MERAH : x.tingkat === 'waspada' ? KUNING : ABU;
    doc.setFillColor(...warna); doc.circle(L + 1.2, y - 1, 1.1, 'F');
    teks(m.siswa.nama.slice(0, 34), L + 4, y, { size: 8.5, bold: true });
    teks(m.kelas?.nama_kelas ?? '-', L + 62, y, { size: 8.5 });
    const ket = (x.saran[0]?.teks ?? '').replace(/\s+/g, ' ');
    const baris2 = doc.splitTextToSize(ket, R - (L + 80)) as string[];
    teks(baris2[0] + (baris2.length > 1 ? '...' : ''), L + 80, y, { size: 8, color: ABU });
    y += 5.2;
  }

  // Penutup
  teks(`Dibuat otomatis dari Sistem Presensi QR pada ${opsi.dibuat}. Hadir = scan masuk + tidak bawa kartu + dispensasi.`, 105, 288, { size: 7, align: 'center', color: ABU });

  const nama = namaBerkasLaporanKepsek(p.start, p.end);
  doc.save(nama);
  return nama;
}
