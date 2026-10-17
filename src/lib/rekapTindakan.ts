import type { Absensi, CatatanKehadiran, Kelas, Siswa } from '../types';
import { hitungSiswa, type HitunganSiswa, type StatusHari } from './rekapKehadiran';

/**
 * Rekap Tindakan: dari data kehadiran satu periode, tentukan siswa yang perlu diapresiasi
 * atau ditindaklanjuti. Logika murni (tanpa React) agar mudah diuji.
 */

export interface MetrikTindakan extends HitunganSiswa {
  siswa: Siswa;
  kelas?: Kelas;
  /** hari tidak hadir berturut-turut terpanjang (alfa/bolos/tanpa keterangan) */
  streakTerpanjang: number;
  /** hari tidak hadir berturut-turut yang masih berjalan sampai hari efektif terakhir */
  streakTerkini: number;
  /** hari ada scan masuk tetapi tidak ada scan pulang */
  totalTidakPulang: number;
  tanggalTidakPulang: string[];
}

const TIDAK_HADIR: StatusHari[] = ['alpa', 'bolos', 'kosong'];

export function hitungStreak(perTanggal: Record<string, StatusHari>, tanggalEfektif: string[]): { terpanjang: number; terkini: number } {
  let terpanjang = 0, cur = 0;
  for (const d of tanggalEfektif) {
    if (TIDAK_HADIR.includes(perTanggal[d] ?? 'kosong')) { cur++; terpanjang = Math.max(terpanjang, cur); } else cur = 0;
  }
  return { terpanjang, terkini: cur };
}

/**
 * Hari efektif yang punya scan masuk tetapi tanpa scan pulang. Hari "tidak bawa kartu" tidak dihitung
 * (tanpa kartu memang tidak bisa scan). `kecualiTanggal` dipakai untuk hari ini yang belum waktunya pulang.
 */
export function hitungTidakPulang(siswaId: string, tanggalEfektif: string[], absensi: Absensi[], kecualiTanggal?: string): string[] {
  const masuk = new Set<string>(), pulang = new Set<string>();
  const efektif = new Set(tanggalEfektif);
  for (const a of absensi) {
    if (a.siswa_id !== siswaId || !efektif.has(a.tanggal)) continue;
    (a.jenis === 'masuk' ? masuk : pulang).add(a.tanggal);
  }
  return tanggalEfektif.filter((d) => d !== kecualiTanggal && masuk.has(d) && !pulang.has(d));
}

export function hitungMetrikTindakan(
  siswaList: Siswa[], kelasList: Kelas[], absensi: Absensi[], catatan: CatatanKehadiran[], tanggalEfektif: string[],
  kecualiPulang?: string
): MetrikTindakan[] {
  const kelasById = new Map(kelasList.map((k) => [k.id, k]));
  return siswaList
    .filter((s) => s.status_aktif !== false)
    .map((siswa) => {
      const h = hitungSiswa(siswa.id, tanggalEfektif, absensi, catatan);
      const st = hitungStreak(h.perTanggal, tanggalEfektif);
      const tp = hitungTidakPulang(siswa.id, tanggalEfektif, absensi, kecualiPulang);
      return { ...h, siswa, kelas: kelasById.get(siswa.kelas_id), streakTerpanjang: st.terpanjang, streakTerkini: st.terkini, totalTidakPulang: tp.length, tanggalTidakPulang: tp };
    });
}

export type KunciPeringkat = 'terbaik' | 'terlambat' | 'tanpaKartu' | 'alfa' | 'bolos' | 'tidakPulang';

const byNama = (a: MetrikTindakan, b: MetrikTindakan) => a.siswa.nama.localeCompare(b.siswa.nama, 'id');

/** Peringkat: yang "negatif" hanya memuat siswa dengan nilai > 0. Seri diurutkan nama. */
export function peringkat(metrik: MetrikTindakan[], kunci: KunciPeringkat, batas = 10): MetrikTindakan[] {
  const nilai: Record<Exclude<KunciPeringkat, 'terbaik'>, (m: MetrikTindakan) => number> = {
    terlambat: (m) => m.totalTerlambat, tanpaKartu: (m) => m.totalTanpaKartu, alfa: (m) => m.totalAlfa, bolos: (m) => m.totalBolos,
    tidakPulang: (m) => m.totalTidakPulang,
  };
  if (kunci === 'terbaik') {
    return metrik
      .filter((m) => m.totalDaysRecorded > 0)
      .sort((a, b) => b.persentase - a.persentase || a.totalTerlambat - b.totalTerlambat || b.totalTepatWaktu - a.totalTepatWaktu || a.totalTanpaKartu - b.totalTanpaKartu || byNama(a, b))
      .slice(0, batas);
  }
  const f = nilai[kunci];
  return metrik.filter((m) => f(m) > 0).sort((a, b) => f(b) - f(a) || byNama(a, b)).slice(0, batas);
}

/** Apresiasi: hadir di semua hari efektif, tidak pernah terlambat, selalu bawa kartu, dan selalu scan pulang. */
export function daftarApresiasi(metrik: MetrikTindakan[], minimalHari = 5): MetrikTindakan[] {
  return metrik
    .filter((m) => m.totalDaysRecorded >= minimalHari && m.persentase === 100 && m.totalTerlambat === 0 && m.totalTanpaKartu === 0 && m.totalTidakPulang === 0)
    .sort((a, b) => (a.kelas?.nama_kelas ?? '').localeCompare(b.kelas?.nama_kelas ?? '', 'id', { numeric: true }) || byNama(a, b));
}

export type Tingkat = 'info' | 'waspada' | 'mendesak';
export interface Saran { tingkat: Tingkat; teks: string }

/** Ambang tindakan; ditampilkan di layar agar transparan dan mudah disesuaikan pihak sekolah. */
export const AMBANG = {
  bolosMendesak: 2, streakMendesak: 3, alfaMendesak: 5, alfaWaspada: 3, terlambatWaspada: 5, tanpaKartuInfo: 3, tidakPulangInfo: 3, tidakPulangWaspada: 6,
  persenRendah: 75, minimalHariPersen: 5,
} as const;

export function sarankanTindakan(m: MetrikTindakan): Saran[] {
  const s: Saran[] = [];
  if (m.totalBolos >= 1) {
    s.push({ tingkat: m.totalBolos >= AMBANG.bolosMendesak ? 'mendesak' : 'waspada', teks: `Bolos ${m.totalBolos} hari: konseling BK dan hubungi orang tua` });
  }
  if (m.streakTerkini >= AMBANG.streakMendesak) {
    s.push({ tingkat: 'mendesak', teks: `Tidak hadir ${m.streakTerkini} hari berturut-turut sampai sekarang: hubungi orang tua / kunjungan rumah` });
  }
  if (m.totalAlfa >= AMBANG.alfaMendesak) {
    s.push({ tingkat: 'mendesak', teks: `Alfa ${m.totalAlfa} hari: panggil orang tua ke sekolah` });
  } else if (m.totalAlfa >= AMBANG.alfaWaspada) {
    s.push({ tingkat: 'waspada', teks: `Alfa ${m.totalAlfa} hari: wali kelas memanggil siswa dan menghubungi wali murid` });
  }
  if (m.totalTerlambat >= AMBANG.terlambatWaspada) {
    s.push({ tingkat: 'waspada', teks: `Terlambat ${m.totalTerlambat} kali: pembinaan kedisiplinan, tanyakan penyebab (jarak/transportasi)` });
  }
  if (m.totalTanpaKartu >= AMBANG.tanpaKartuInfo) {
    s.push({ tingkat: 'info', teks: `Tidak bawa kartu ${m.totalTanpaKartu} kali: ingatkan atau cetak ulang kartu` });
  }
  if (m.totalTidakPulang >= AMBANG.tidakPulangInfo) {
    s.push({
      tingkat: m.totalTidakPulang >= AMBANG.tidakPulangWaspada ? 'waspada' : 'info',
      teks: `Tidak scan pulang ${m.totalTidakPulang} hari: ingatkan scan pulang, dan cek apakah pulang sebelum waktunya tanpa izin`,
    });
  }
  if (m.totalDaysRecorded >= AMBANG.minimalHariPersen && m.persentase < AMBANG.persenRendah && m.totalAlfa < AMBANG.alfaWaspada) {
    s.push({ tingkat: 'waspada', teks: `Kehadiran ${m.persentase}% (di bawah ${AMBANG.persenRendah}%): tinjau alasan izin/sakit berulang` });
  }
  return s;
}

const URUT_TINGKAT: Record<Tingkat, number> = { mendesak: 0, waspada: 1, info: 2 };
export const tingkatTertinggi = (s: Saran[]): Tingkat | null =>
  s.length === 0 ? null : s.reduce<Tingkat>((acc, x) => (URUT_TINGKAT[x.tingkat] < URUT_TINGKAT[acc] ? x.tingkat : acc), 'info');

export interface PerluTindakan { metrik: MetrikTindakan; saran: Saran[]; tingkat: Tingkat }

export function daftarPerluTindakan(metrik: MetrikTindakan[]): PerluTindakan[] {
  return metrik
    .map((m) => { const saran = sarankanTindakan(m); return { metrik: m, saran, tingkat: tingkatTertinggi(saran) }; })
    .filter((x): x is PerluTindakan => x.tingkat !== null)
    .sort((a, b) => URUT_TINGKAT[a.tingkat] - URUT_TINGKAT[b.tingkat] || b.saran.length - a.saran.length || a.metrik.siswa.nama.localeCompare(b.metrik.siswa.nama, 'id'));
}

export interface PeringkatKelas {
  kelas: Kelas; jumlahSiswa: number; persen: number; terlambat: number; tanpaKartu: number; alfa: number; bolos: number; tidakPulang: number; perluTindakan: number;
}

export function ringkasKelas(metrik: MetrikTindakan[], kelasList: Kelas[]): PeringkatKelas[] {
  return kelasList
    .map((kelas) => {
      const rows = metrik.filter((m) => m.siswa.kelas_id === kelas.id);
      if (rows.length === 0) return null;
      const sum = (f: (m: MetrikTindakan) => number) => rows.reduce((n, m) => n + f(m), 0);
      const hari = sum((m) => m.totalDaysRecorded);
      return {
        kelas, jumlahSiswa: rows.length,
        persen: hari > 0 ? Math.round((sum((m) => m.totalHadir) / hari) * 1000) / 10 : 0,
        terlambat: sum((m) => m.totalTerlambat), tanpaKartu: sum((m) => m.totalTanpaKartu), alfa: sum((m) => m.totalAlfa), bolos: sum((m) => m.totalBolos), tidakPulang: sum((m) => m.totalTidakPulang),
        perluTindakan: rows.filter((m) => sarankanTindakan(m).length > 0).length,
      };
    })
    .filter((x): x is PeringkatKelas => x !== null)
    .sort((a, b) => b.persen - a.persen);
}

export interface HariRawan { hari: string; hariEfektif: number; persenTidakHadir: number; terlambat: number }

/** Pola per hari dalam seminggu: hari apa yang paling banyak tidak hadir / terlambat. */
export function polaHari(metrik: MetrikTindakan[], tanggalEfektif: string[]): HariRawan[] {
  const NAMA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const acc = new Map<number, { hari: Set<string>; tidak: number; total: number; telat: number }>();
  for (const d of tanggalEfektif) {
    const w = new Date(d + 'T00:00:00Z').getUTCDay();
    const a = acc.get(w) ?? { hari: new Set<string>(), tidak: 0, total: 0, telat: 0 };
    a.hari.add(d);
    for (const m of metrik) {
      const st = m.perTanggal[d] ?? 'kosong';
      a.total++;
      if (TIDAK_HADIR.includes(st)) a.tidak++;
      if (st === 'terlambat') a.telat++;
    }
    acc.set(w, a);
  }
  return [...acc.entries()]
    .sort((x, y) => ((x[0] + 6) % 7) - ((y[0] + 6) % 7)) // Senin dulu
    .map(([w, a]) => ({ hari: NAMA[w], hariEfektif: a.hari.size, persenTidakHadir: a.total ? Math.round((a.tidak / a.total) * 1000) / 10 : 0, terlambat: a.telat }));
}

/** Tautan WhatsApp (wa.me) berisi pesan siap kirim; dikirim manual oleh staf, bukan lewat gateway. */
export function tautanWaWali(m: MetrikTindakan, periodeLabel: string, nomorInternasional: string): string {
  const baris = [
    `Yth. Bapak/Ibu wali dari ${m.siswa.nama}${m.kelas ? ` (kelas ${m.kelas.nama_kelas})` : ''}.`,
    `Rekap kehadiran ${periodeLabel} (${m.totalDaysRecorded} hari efektif): hadir ${m.totalHadir}, terlambat ${m.totalTerlambat}, izin ${m.totalIzin}, sakit ${m.totalSakit}, alfa/tanpa keterangan ${m.totalAlfa}${m.totalBolos ? `, bolos ${m.totalBolos}` : ''}${m.totalTidakPulang ? `. Tidak tercatat scan pulang ${m.totalTidakPulang} hari` : ''}.`,
    'Mohon kerja samanya untuk membantu ananda hadir tepat waktu dan teratur. Bila ada kendala, silakan menghubungi wali kelas. Terima kasih.',
    '- SMP Negeri 9 Banjar',
  ];
  return `https://wa.me/${nomorInternasional}?text=${encodeURIComponent(baris.join('\n'))}`;
}
