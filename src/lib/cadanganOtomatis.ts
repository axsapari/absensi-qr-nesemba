import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cadangan otomatis ke Supabase Storage (bucket privat "cadangan-absensi").
 * Berisi seluruh data inti langsung dari database (bukan hanya cache browser) dan TIDAK memuat
 * token WhatsApp, kunci Supabase, maupun sandi apa pun.
 */
export const BUCKET_CADANGAN = 'cadangan-absensi';
export const TABEL_CADANGAN = ['kelas', 'siswa', 'absensi', 'catatan_kehadiran', 'pengaturan_jam', 'log_rekap_wa_mingguan'] as const;
export const KUNCI_PENGATURAN = 'absensi_cadangan_otomatis_v1';

export type Interval = 'harian' | 'mingguan';
export interface PengaturanCadangan { aktif: boolean; interval: Interval; simpanTerakhir: number }
export const PENGATURAN_AWAL: PengaturanCadangan = { aktif: true, interval: 'mingguan', simpanTerakhir: 8 };

export interface BerkasCadangan { name: string; tanggal: string; ukuran?: number }

const HARI: Record<Interval, number> = { harian: 1, mingguan: 7 };
const POLA = /^cadangan_(\d{4}-\d{2}-\d{2})_(\d{4})\.json(\.gz)?$/;

export const namaBerkasCadangan = (now: Date, gz: boolean): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `cadangan_${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.json${gz ? '.gz' : ''}`;
};

export const tanggalDariNama = (name: string): string | null => POLA.exec(name)?.[1] ?? null;

/** Selisih hari kalender (b - a), keduanya YYYY-MM-DD. */
export function selisihHari(a: string, b: string): number {
  const t = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86_400_000);
}

export function perluCadangan(berkas: BerkasCadangan[], todayStr: string, interval: Interval): boolean {
  const terbaru = berkas.map((b) => b.tanggal).sort().pop();
  if (!terbaru) return true;
  return selisihHari(terbaru, todayStr) >= HARI[interval];
}

/** Nama berkas yang harus dihapus agar hanya `simpan` cadangan terbaru yang tersisa. */
export function berkasUntukDihapus(berkas: BerkasCadangan[], simpan: number): string[] {
  const urut = [...berkas].sort((a, b) => b.name.localeCompare(a.name));
  return urut.slice(Math.max(1, simpan)).map((b) => b.name);
}

const RAHASIA = /token|key|password|sandi|secret|apikey/i;
/** Buang kolom yang tampak rahasia dari baris mana pun (pertahanan berlapis). */
export function bersihkanRahasia<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!RAHASIA.test(k)) out[k] = v;
  return out as Partial<T>;
}

async function ambilSemua(supabase: SupabaseClient, tabel: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(tabel).select('*').range(from, from + 999);
    if (error) throw new Error(`${tabel}: ${error.message}`);
    out.push(...((data ?? []) as Record<string, unknown>[]));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

export interface IsiCadangan {
  versi: 1; dibuatAt: string; sekolah: string; catatan: string;
  jumlah: Record<string, number>; data: Record<string, Record<string, unknown>[]>;
}

export async function bangunIsiCadangan(supabase: SupabaseClient, sekolah: string): Promise<IsiCadangan> {
  const data: IsiCadangan['data'] = {};
  const jumlah: Record<string, number> = {};
  for (const t of TABEL_CADANGAN) {
    try {
      const rows = (await ambilSemua(supabase, t)).map(bersihkanRahasia) as Record<string, unknown>[];
      data[t] = rows; jumlah[t] = rows.length;
    } catch (e) {
      // tabel opsional (mis. log) tidak boleh menggagalkan seluruh cadangan; tabel inti wajib
      if (['siswa', 'kelas', 'absensi'].includes(t)) throw e;
      data[t] = []; jumlah[t] = 0;
    }
  }
  return {
    versi: 1, dibuatAt: new Date().toISOString(), sekolah,
    catatan: 'Cadangan otomatis. Tidak memuat token WhatsApp, kunci Supabase, atau sandi.',
    jumlah, data,
  };
}

async function gzip(teks: string): Promise<Blob | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([teks]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

export async function daftarCadangan(supabase: SupabaseClient): Promise<BerkasCadangan[]> {
  const { data, error } = await supabase.storage.from(BUCKET_CADANGAN).list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((f) => ({ name: f.name, tanggal: tanggalDariNama(f.name) ?? '', ukuran: (f.metadata as { size?: number } | null)?.size }))
    .filter((b) => b.tanggal);
}

export async function jalankanCadangan(supabase: SupabaseClient, sekolah: string, simpan: number): Promise<{ nama: string; jumlah: Record<string, number>; dihapus: number }> {
  const isi = await bangunIsiCadangan(supabase, sekolah);
  const teks = JSON.stringify(isi);
  const terkompres = await gzip(teks);
  const nama = namaBerkasCadangan(new Date(), !!terkompres);
  const badan = terkompres ?? new Blob([teks], { type: 'application/json' });
  const { error } = await supabase.storage.from(BUCKET_CADANGAN).upload(nama, badan, {
    contentType: terkompres ? 'application/gzip' : 'application/json', upsert: false,
  });
  if (error) throw new Error(error.message);
  const hapus = berkasUntukDihapus(await daftarCadangan(supabase), simpan);
  if (hapus.length) await supabase.storage.from(BUCKET_CADANGAN).remove(hapus);
  return { nama, jumlah: isi.jumlah, dihapus: hapus.length };
}

export async function unduhCadangan(supabase: SupabaseClient, nama: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET_CADANGAN).download(nama);
  if (error || !data) throw new Error(error?.message || 'Gagal mengunduh');
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url; a.download = nama;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const pesanGalatCadangan = (msg: string): string =>
  /bucket not found|not found/i.test(msg)
    ? 'Bucket "cadangan-absensi" belum ada. Jalankan berkas SUPABASE-MIGRATION-V23-CADANGAN-OTOMATIS.sql di Supabase SQL Editor.'
    : /row-level security|policy|unauthorized|permission/i.test(msg)
    ? 'Akses ke bucket cadangan ditolak. Pastikan SUPABASE-MIGRATION-V23-CADANGAN-OTOMATIS.sql sudah dijalankan dan Anda login sebagai admin.'
    : msg;

/* ------------------------------------------------------------------ */
/* Pemulihan (hanya menambah/memperbarui; tidak pernah menghapus)       */
/* ------------------------------------------------------------------ */

/** Urutan penting: kelas -> siswa -> absensi/catatan (bergantung pada siswa). */
export const TABEL_PEMULIHAN = ['kelas', 'siswa', 'absensi', 'catatan_kehadiran'] as const;
export type TabelPemulihan = (typeof TABEL_PEMULIHAN)[number];
const KONFLIK: Record<TabelPemulihan, string> = {
  kelas: 'id', siswa: 'id', absensi: 'id', catatan_kehadiran: 'siswa_id,tanggal',
};

export function bagiBatch<T>(rows: T[], ukuran = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += ukuran) out.push(rows.slice(i, i + ukuran));
  return out;
}

/** Mengembalikan pesan galat bila isi bukan cadangan yang valid, atau null bila aman dipakai. */
export function validasiIsiCadangan(isi: unknown): string | null {
  const x = isi as Partial<IsiCadangan> | null;
  if (!x || typeof x !== 'object' || x.versi !== 1 || !x.data || typeof x.data !== 'object') return 'Berkas bukan cadangan otomatis yang valid.';
  if (!Array.isArray(x.data.siswa) || !Array.isArray(x.data.kelas)) return 'Cadangan tidak memuat data siswa/kelas.';
  return null;
}

export async function bacaIsiCadangan(supabase: SupabaseClient, nama: string): Promise<IsiCadangan> {
  const { data, error } = await supabase.storage.from(BUCKET_CADANGAN).download(nama);
  if (error || !data) throw new Error(error?.message || 'Gagal mengunduh cadangan');
  let teks: string;
  if (nama.endsWith('.gz')) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Browser ini tidak mendukung membuka .gz. Gunakan Chrome/Edge terbaru.');
    teks = await new Response(data.stream().pipeThrough(new DecompressionStream('gzip'))).text();
  } else teks = await data.text();
  const isi = JSON.parse(teks);
  const galat = validasiIsiCadangan(isi);
  if (galat) throw new Error(galat);
  return isi as IsiCadangan;
}

export async function hitungDiServer(supabase: SupabaseClient): Promise<Record<TabelPemulihan, number>> {
  const out = {} as Record<TabelPemulihan, number>;
  for (const t of TABEL_PEMULIHAN) {
    const { count, error } = await supabase.from(t).select('id', { count: 'exact', head: true });
    if (error) throw new Error(`${t}: ${error.message}`);
    out[t] = count ?? 0;
  }
  return out;
}

export async function pulihkanCadangan(
  supabase: SupabaseClient,
  isi: IsiCadangan,
  tabel: TabelPemulihan[],
  onProgres?: (tabel: TabelPemulihan, selesai: number, total: number) => void
): Promise<Record<string, number>> {
  const hasil: Record<string, number> = {};
  for (const t of TABEL_PEMULIHAN) {
    if (!tabel.includes(t)) continue;
    const rows = isi.data[t] ?? [];
    let selesai = 0;
    for (const batch of bagiBatch(rows)) {
      const { error } = await supabase.from(t).upsert(batch, { onConflict: KONFLIK[t] });
      if (error) throw new Error(`${t}: ${error.message} (sudah dipulihkan ${selesai} baris di tabel ini)`);
      selesai += batch.length;
      onProgres?.(t, selesai, rows.length);
    }
    hasil[t] = selesai;
  }
  return hasil;
}
