import { fotoAlternatives } from './fotoFallback';

export interface PercobaanFoto { url: string; ext: string; status: number | 'galat'; }
export interface HasilFotoSiswa { nama: string; nisn: string; percobaan: PercobaanFoto[]; ditemukan: string | null; }

export type StatusFetch = (url: string) => Promise<number | 'galat'>;

/** Uji satu siswa: coba URL awal lalu ekstensi alternatif, berhenti pada yang pertama berstatus 200. */
export async function ujiFotoSiswa(
  siswa: { nama: string; nisn: string },
  urlAwal: string,
  cekStatus: StatusFetch
): Promise<HasilFotoSiswa> {
  const urls = [urlAwal, ...fotoAlternatives(urlAwal)];
  const percobaan: PercobaanFoto[] = [];
  let ditemukan: string | null = null;
  for (const url of urls) {
    const status = await cekStatus(url);
    const ext = (/\.([A-Za-z]+)(\?.*)?$/.exec(url)?.[1]) || '?';
    percobaan.push({ url, ext, status });
    if (status === 200) { ditemukan = ext; break; }
  }
  return { nama: siswa.nama, nisn: siswa.nisn, percobaan, ditemukan };
}

/** Terjemahkan hasil uji menjadi saran perbaikan yang bisa dipahami petugas. */
export function tafsirkanDiagnosaFoto(hasil: HasilFotoSiswa[], supabaseUrl: string): { tingkat: 'ok' | 'peringatan' | 'galat'; pesan: string } {
  if (!supabaseUrl.trim()) {
    return { tingkat: 'galat', pesan: 'URL Supabase belum diisi di Pengaturan, sehingga foto tidak bisa dimuat dari Storage.' };
  }
  if (hasil.length === 0) return { tingkat: 'peringatan', pesan: 'Belum ada data siswa untuk diuji.' };
  const ok = hasil.filter((h) => h.ditemukan).length;
  if (ok === hasil.length) {
    const exts = Array.from(new Set(hasil.map((h) => h.ditemukan)));
    const bukanJpg = exts.some((e) => e && e.toLowerCase() !== 'jpg');
    return {
      tingkat: 'ok',
      pesan: bukanJpg
        ? `Semua foto uji ditemukan, tetapi sebagian berekstensi ${exts.join(', ')} (bukan .jpg). Aplikasi menanganinya otomatis; untuk konsistensi sebaiknya seragamkan menjadi .jpg.`
        : 'Semua foto uji ditemukan dan dapat diakses.',
    };
  }
  const semuaStatus = hasil.flatMap((h) => h.percobaan.map((p) => p.status));
  if (semuaStatus.every((s) => s === 'galat')) {
    return { tingkat: 'galat', pesan: 'Browser tidak bisa menghubungi Storage (koneksi atau CORS). Periksa internet dan URL Supabase di Pengaturan.' };
  }
  if (semuaStatus.some((s) => s === 400 || s === 401 || s === 403) && ok === 0) {
    return { tingkat: 'galat', pesan: 'Storage menolak akses (status 400/401/403). Bucket "foto-siswa" kemungkinan belum ada atau belum diatur PUBLIC di Supabase > Storage.' };
  }
  if (ok === 0) {
    return { tingkat: 'galat', pesan: 'Berkas foto tidak ditemukan untuk semua siswa uji (status 404). Pastikan nama berkas di bucket "foto-siswa" sama persis dengan NISN, contoh 0012345678.jpg.' };
  }
  return { tingkat: 'peringatan', pesan: `${ok} dari ${hasil.length} siswa uji punya foto. Sisanya belum diunggah atau namanya tidak sama dengan NISN.` };
}
