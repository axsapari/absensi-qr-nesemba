/**
 * Menggabungkan hasil sinkronisasi ke state saat ini TANPA menghilangkan perubahan yang terjadi
 * selama sinkron berlangsung.
 *
 * Masalah yang diselesaikan: sinkron mengambil "snapshot" daftar absensi, lalu menunggu jaringan
 * (bisa beberapa detik). Jika scan baru masuk selama menunggu, menimpa state dengan hasil sinkron
 * akan membuang scan tersebut dari memori sekaligus dari localStorage.
 *
 *  - prev     : state saat sinkron SELESAI (sudah memuat scan baru)
 *  - snapshot : daftar yang dikirim saat sinkron DIMULAI
 *  - result   : daftar hasil sinkron (flag synced sudah diperbarui)
 *
 * Aturan:
 *  1. Item di `prev` yang tidak ada di `snapshot` = ditambahkan selama sinkron -> dipertahankan.
 *  2. Item di `snapshot` yang tidak ada lagi di `prev` = dihapus pengguna selama sinkron
 *     -> tidak dihidupkan kembali.
 *  3. Selain itu hasil sinkron (`result`) yang dipakai.
 */
export function mergeAfterSync<T extends { id: string }>(prev: T[], snapshot: T[], result: T[]): T[] {
  const prevIds = new Set(prev.map((x) => String(x.id)));
  const snapshotIds = new Set(snapshot.map((x) => String(x.id)));
  const resultIds = new Set(result.map((x) => String(x.id)));

  const removedMeanwhile = new Set([...snapshotIds].filter((id) => !prevIds.has(id)));
  const kept = result.filter((x) => !removedMeanwhile.has(String(x.id)));
  const addedMeanwhile = prev.filter(
    (x) => !snapshotIds.has(String(x.id)) && !resultIds.has(String(x.id))
  );
  return addedMeanwhile.length ? [...kept, ...addedMeanwhile] : kept;
}
