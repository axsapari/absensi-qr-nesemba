/**
 * Supabase (PostgREST) membatasi satu permintaan SELECT sampai 1000 baris.
 * Tabel yang terus bertambah (mis. catatan_kehadiran) harus ditarik per halaman,
 * kalau tidak baris di luar 1000 pertama diam-diam tidak terambil.
 */
export type HalamanFn = (dari: number, sampai: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

export async function tarikSemuaBaris<T>(ambil: HalamanFn, ukuranHalaman = 1000): Promise<T[]> {
  const hasil: T[] = [];
  for (let dari = 0; ; dari += ukuranHalaman) {
    const { data, error } = await ambil(dari, dari + ukuranHalaman - 1);
    if (error) throw new Error(error.message);
    const baris = (data ?? []) as T[];
    hasil.push(...baris);
    if (baris.length < ukuranHalaman) break;
  }
  return hasil;
}
