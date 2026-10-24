/**
 * Logika murni pemantau kesehatan layar scan (kiosk). Semua jam berupa "HH:MM" atau "HH:MM:SS".
 */
const detik = (j: string): number => {
  const [h = '0', m = '0', d = '0'] = j.split(':');
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(d) || 0);
};

export interface MasukanTanpaScan {
  sekarang: string;
  /** jam scan terakhir hari ini (HH:MM:SS) atau null bila belum ada */
  scanTerakhir: string | null;
  jamBuka: string;
  batasTepatWaktu: string;
  jamPulang: string;
  hariEfektif: boolean;
  /** berapa menit tanpa scan di jam sibuk dianggap mencurigakan */
  ambangMenit?: number;
}

export interface PeringatanTanpaScan {
  menit: number;
  sesi: 'masuk' | 'pulang';
}

/**
 * Jam sibuk: sejak pos dibuka sampai 30 menit setelah batas tepat waktu, dan 45 menit sejak jam pulang.
 * Bila di jam sibuk tidak ada scan selama ambang menit, scanner kemungkinan terlepas/mati.
 */
export function periksaTanpaScan(m: MasukanTanpaScan): PeringatanTanpaScan | null {
  if (!m.hariEfektif) return null;
  const ambang = (m.ambangMenit ?? 15) * 60;
  const now = detik(m.sekarang);
  const sesi: { nama: 'masuk' | 'pulang'; awal: number; akhir: number }[] = [
    { nama: 'masuk', awal: detik(m.jamBuka), akhir: detik(m.batasTepatWaktu) + 30 * 60 },
    { nama: 'pulang', awal: detik(m.jamPulang), akhir: detik(m.jamPulang) + 45 * 60 },
  ];
  const aktif = sesi.find((s) => now >= s.awal && now <= s.akhir);
  if (!aktif) return null;
  const terakhir = m.scanTerakhir ? detik(m.scanTerakhir) : null;
  // acuan: scan terakhir di sesi ini, atau awal sesi bila belum ada
  const acuan = terakhir !== null && terakhir >= aktif.awal ? terakhir : aktif.awal;
  const tanpa = now - acuan;
  if (tanpa < ambang) return null;
  return { menit: Math.floor(tanpa / 60), sesi: aktif.nama };
}

/** Pilih sampel acak tanpa pengulangan (deterministik bila `acak` diberikan). */
export function pilihSampel<T>(daftar: T[], n: number, acak: () => number = Math.random): T[] {
  const salinan = [...daftar];
  const out: T[] = [];
  while (out.length < n && salinan.length > 0) {
    out.push(salinan.splice(Math.floor(acak() * salinan.length), 1)[0]);
  }
  return out;
}
