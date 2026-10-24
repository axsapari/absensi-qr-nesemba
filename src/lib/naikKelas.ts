import type { Kelas, Siswa } from '../types';
import { daftarSemester, semesterDari, type Semester } from './semester';

/**
 * Logika murni untuk fitur "Naik Kelas" (tanpa React / tanpa penyimpanan),
 * supaya mudah diuji. Aturan:
 *   VII  X -> VIII X   (rombel/huruf sama)
 *   VIII X -> IX  X
 *   IX   X -> lulus    (status_aktif = false, kelas_id TIDAK diubah agar riwayat tetap utuh)
 * Siswa nonaktif tidak disentuh. Siswa yang dikecualikan (tinggal kelas) tetap.
 */

export type AksiSiswa = 'naik' | 'lulus' | 'tetap';

export interface RencanaSiswa {
  siswa: Siswa;
  aksi: AksiSiswa;
  dariKelas: Kelas | null;
  keKelas: Kelas | null;
  /** true bila user mengecualikan siswa ini (tinggal kelas) */
  dikecualikan: boolean;
}

export interface MasalahRencana {
  jenis: 'kelas-tidak-ditemukan' | 'kelas-tujuan-tidak-ada';
  siswaId: string;
  nama: string;
  keterangan: string;
}

export interface PerubahanSiswa {
  id: string;
  data: Partial<Siswa>;
}

export interface RingkasanKelas {
  dariKelasId: string;
  dariNama: string;
  keNama: string; // nama kelas tujuan atau "Lulus"
  jumlah: number;
}

export interface Rencana {
  baris: RencanaSiswa[];
  masalah: MasalahRencana[];
  perubahan: PerubahanSiswa[];
  ringkasan: RingkasanKelas[];
  jumlahNaik: number;
  jumlahLulus: number;
  jumlahTetap: number;
  jumlahNonaktifDiabaikan: number;
  /** false bila ada masalah (mis. kelas tujuan belum dibuat) */
  bisaDiterapkan: boolean;
}

const TINGKAT_AWAL = /^(VIII|VII|IX|7|8|9)[\s\-._]*/i;

/** Kunci rombel dari nama kelas: "VII A" -> "A", "7A" -> "A", "VIII-B" -> "B". */
export function kunciRombel(namaKelas: string): string {
  return namaKelas.trim().replace(TINGKAT_AWAL, '').trim().toUpperCase();
}

const tingkatBerikut = (t: Kelas['tingkat']): Kelas['tingkat'] | null =>
  t === '7' ? '8' : t === '8' ? '9' : null;

export function rencanakanNaikKelas(
  siswaList: Siswa[],
  kelasList: Kelas[],
  kecualikan: ReadonlySet<string> = new Set(),
  /** tanggal eksekusi: dicatat sebagai tanggal keluar siswa yang lulus agar rekap lama tetap utuh */
  tanggalKeluar?: string,
): Rencana {
  const kelasById = new Map(kelasList.map((k) => [k.id, k]));
  const baris: RencanaSiswa[] = [];
  const masalah: MasalahRencana[] = [];
  const perubahan: PerubahanSiswa[] = [];
  let nonaktif = 0;

  const cariTujuan = (dari: Kelas): Kelas | null => {
    const t = tingkatBerikut(dari.tingkat);
    if (!t) return null;
    const kunci = kunciRombel(dari.nama_kelas);
    return kelasList.find((k) => k.tingkat === t && kunciRombel(k.nama_kelas) === kunci) ?? null;
  };

  for (const s of siswaList) {
    if (!s.status_aktif) { nonaktif++; continue; }
    const dari = kelasById.get(s.kelas_id) ?? null;
    if (!dari) {
      masalah.push({ jenis: 'kelas-tidak-ditemukan', siswaId: s.id, nama: s.nama, keterangan: `Kelas siswa ${s.nama} tidak ditemukan` });
      baris.push({ siswa: s, aksi: 'tetap', dariKelas: null, keKelas: null, dikecualikan: false });
      continue;
    }
    if (kecualikan.has(s.id)) {
      baris.push({ siswa: s, aksi: 'tetap', dariKelas: dari, keKelas: dari, dikecualikan: true });
      continue;
    }
    if (dari.tingkat === '9') {
      baris.push({ siswa: s, aksi: 'lulus', dariKelas: dari, keKelas: null, dikecualikan: false });
      perubahan.push({
        id: s.id,
        data: tanggalKeluar
          ? { status_aktif: false, tanggal_keluar: tanggalKeluar, alasan_keluar: 'lulus' }
          : { status_aktif: false },
      });
      continue;
    }
    const tujuan = cariTujuan(dari);
    if (!tujuan) {
      const t = tingkatBerikut(dari.tingkat);
      masalah.push({
        jenis: 'kelas-tujuan-tidak-ada',
        siswaId: s.id,
        nama: s.nama,
        keterangan: `Kelas tujuan untuk ${dari.nama_kelas} (tingkat ${t}, rombel "${kunciRombel(dari.nama_kelas)}") belum dibuat`,
      });
      baris.push({ siswa: s, aksi: 'tetap', dariKelas: dari, keKelas: null, dikecualikan: false });
      continue;
    }
    baris.push({ siswa: s, aksi: 'naik', dariKelas: dari, keKelas: tujuan, dikecualikan: false });
    perubahan.push({ id: s.id, data: { kelas_id: tujuan.id } });
  }

  const peta = new Map<string, RingkasanKelas>();
  for (const b of baris) {
    if (!b.dariKelas || b.aksi === 'tetap') continue;
    const keNama = b.aksi === 'lulus' ? 'Lulus' : b.keKelas!.nama_kelas;
    const key = `${b.dariKelas.id}>${keNama}`;
    const cur = peta.get(key);
    if (cur) cur.jumlah++;
    else peta.set(key, { dariKelasId: b.dariKelas.id, dariNama: b.dariKelas.nama_kelas, keNama, jumlah: 1 });
  }
  const ringkasan = [...peta.values()].sort((a, b) => a.dariNama.localeCompare(b.dariNama, 'id', { numeric: true }));

  return {
    baris,
    masalah,
    perubahan,
    ringkasan,
    jumlahNaik: baris.filter((b) => b.aksi === 'naik').length,
    jumlahLulus: baris.filter((b) => b.aksi === 'lulus').length,
    jumlahTetap: baris.filter((b) => b.aksi === 'tetap').length,
    jumlahNonaktifDiabaikan: nonaktif,
    bisaDiterapkan: masalah.length === 0 && perubahan.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Kesiapan                                                            */
/* ------------------------------------------------------------------ */

export type CatatanArsip = Record<string, { json?: string; xlsx?: string; dibersihkan?: string }>;

export interface Kesiapan {
  /** Semester Genap terakhir yang sudah berakhir (yang arsipnya wajib diunduh) */
  semesterWajib: Semester;
  arsipLengkap: boolean;
  semesterBerakhir: boolean;
  /** tahun ajaran saat naik kelas dijalankan, mis. "2026/2027" */
  tahunAjaranBaru: string;
  sudahDijalankanTahunIni: boolean;
  belumSinkron: number;
  /** blocker: tidak boleh lanjut sama sekali */
  blokir: string[];
  /** peringatan: boleh lanjut bila user mencentang "saya paham" */
  peringatan: string[];
}

export interface KesiapanInput {
  today: string; // YYYY-MM-DD
  catatanArsip: CatatanArsip;
  belumSinkron: number;
  tahunAjaranTerakhirDiterapkan?: string | null;
}

/** Tahun ajaran baru: Juli–Desember -> tahun ini/depan; Januari–Juni -> tahun ajaran berjalan. */
export const tahunAjaranDari = (today: string): string => semesterDari(today).tahunAjaran;

export function cekKesiapan(i: KesiapanInput): Kesiapan {
  const daftar = daftarSemester(i.today, 4);
  const semesterWajib = daftar.find((s) => s.jenis === 'genap' && s.selesai < i.today) ?? daftar[daftar.length - 1];
  const c = i.catatanArsip[semesterWajib.id];
  const arsipLengkap = !!(c && c.json && c.xlsx);
  const semesterBerakhir = semesterDari(i.today).jenis === 'ganjil';
  const tahunAjaranBaru = tahunAjaranDari(i.today);
  const sudah = !!i.tahunAjaranTerakhirDiterapkan && i.tahunAjaranTerakhirDiterapkan === tahunAjaranBaru;

  const blokir: string[] = [];
  const peringatan: string[] = [];
  if (i.belumSinkron > 0) {
    blokir.push(`Masih ada ${i.belumSinkron} data yang belum tersinkron. Sambungkan internet dan tunggu sinkronisasi selesai dulu.`);
  }
  if (!semesterBerakhir) {
    peringatan.push(`Semester Genap ${semesterWajib.tahunAjaran} belum berakhir (selesai ${semesterWajib.selesai}). Naik kelas biasanya dilakukan mulai 1 Juli.`);
  }
  if (!arsipLengkap) {
    peringatan.push(`Arsip ${semesterWajib.label} belum diunduh lengkap (JSON dan Excel). Unduh dulu di tab Arsip Semester.`);
  }
  if (sudah) {
    peringatan.push(`Naik kelas sudah pernah dijalankan untuk tahun ajaran ${tahunAjaranBaru}. Menjalankan lagi akan menaikkan siswa dua tingkat.`);
  }
  return { semesterWajib, arsipLengkap, semesterBerakhir, tahunAjaranBaru, sudahDijalankanTahunIni: sudah, belumSinkron: i.belumSinkron, blokir, peringatan };
}

/* ------------------------------------------------------------------ */
/* Data urungkan                                                       */
/* ------------------------------------------------------------------ */

/** null (bukan undefined) supaya kolom di database ikut dikosongkan saat disinkronkan. */
export const KOSONGKAN_KELUAR = {
  tanggal_keluar: null,
  alasan_keluar: null,
  keterangan_keluar: null,
} as unknown as Pick<Siswa, 'tanggal_keluar' | 'alasan_keluar' | 'keterangan_keluar'>;

export interface DataUrungkan {
  at: number;
  tahunAjaran: string;
  siswa: { id: string; kelas_id: string; status_aktif: boolean }[];
}

export function buatDataUrungkan(siswaList: Siswa[], perubahan: PerubahanSiswa[], at: number, tahunAjaran: string): DataUrungkan {
  const byId = new Map(siswaList.map((s) => [s.id, s]));
  const siswa = perubahan
    .map((p) => byId.get(p.id))
    .filter((s): s is Siswa => !!s)
    .map((s) => ({ id: s.id, kelas_id: s.kelas_id, status_aktif: s.status_aktif }));
  return { at, tahunAjaran, siswa };
}

export function perubahanUrungkan(d: DataUrungkan, siswaList: Siswa[]): PerubahanSiswa[] {
  const ada = new Set(siswaList.map((s) => s.id));
  return d.siswa
    .filter((s) => ada.has(s.id))
    .map((s) => ({
      id: s.id,
      data: {
        kelas_id: s.kelas_id,
        status_aktif: s.status_aktif,
        // bila diaktifkan kembali, hapus data keluar (null dikirim agar kolom di server ikut kosong)
        ...(s.status_aktif ? KOSONGKAN_KELUAR : {}),
      },
    }));
}
