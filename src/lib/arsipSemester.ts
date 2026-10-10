import * as XLSX from 'xlsx';
import { Absensi, CatatanKehadiran, Kelas, Siswa } from '../types';
import { Semester } from './semester';
import { sortKelas } from './classUtils';

/**
 * Arsip semester: perhitungan rekap + berkas JSON & Excel.
 *
 * Aturan (sama dengan Dashboard Rekap):
 *  - Hari efektif  = tanggal yang punya scan masuk atau catatan "tidak bawa kartu" (minimal satu siswa)
 *  - Per siswa per hari efektif (urutan prioritas):
 *      catatan bolos           -> Bolos
 *      scan masuk              -> Hadir (Tepat Waktu / Terlambat)
 *      catatan tidak bawa kartu-> Hadir (Tidak Bawa Kartu)
 *      catatan izin/sakit/alpa -> status itu
 *      lainnya                 -> Tanpa Keterangan
 *  - % Kehadiran = Hadir / Hari efektif
 */
export interface BarisSiswa {
  nisn: string; nama: string; kelas: string; kelasId: string;
  hariEfektif: number; hadir: number; tepatWaktu: number; terlambat: number; tanpaKartu: number;
  izin: number; sakit: number; bolos: number; alpa: number; tanpaKeterangan: number; persen: number;
}
export interface BarisKelas {
  kelas: string; jumlahSiswa: number; hariEfektif: number; hadir: number; tepatWaktu: number; terlambat: number;
  tanpaKartu: number; izin: number; sakit: number; bolos: number; alpa: number; tanpaKeterangan: number; persen: number;
}
export interface BarisDetail {
  tanggal: string; kelas: string; nisn: string; nama: string;
  jamMasuk: string; statusMasuk: string; jamPulang: string; catatan: string;
}
export interface HasilArsip {
  hariEfektif: string[];
  perSiswa: BarisSiswa[];
  perKelas: BarisKelas[];
  detail: BarisDetail[];
  catatan: { tanggal: string; kelas: string; nisn: string; nama: string; status: string; keterangan: string; oleh: string }[];
}

const labelCatatan: Record<string, string> = {
  izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa', bolos: 'Bolos', tidak_bawa_kartu: 'Tidak Bawa Kartu',
};
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export function hitungArsip(input: {
  siswaList: Siswa[]; kelasList: Kelas[]; absensi: Absensi[]; catatan: CatatanKehadiran[];
  /** siswa_id (lokal maupun server) -> NISN. Wajib agar data dari beberapa perangkat tetap cocok. */
  resolveNisn: (siswaId: string) => string | undefined;
}): HasilArsip {
  const { siswaList, kelasList, absensi, catatan, resolveNisn } = input;
  const kelasById = new Map(kelasList.map((k) => [k.id, k]));
  const siswaByNisn = new Map(siswaList.map((s) => [String(s.nisn).trim(), s]));
  const nisnOf = (id: string) => (resolveNisn(id) || '').trim();

  // indeks: nisn -> tanggal -> data
  const masuk = new Map<string, Map<string, Absensi>>();
  const pulang = new Map<string, Map<string, Absensi>>();
  const put = (m: Map<string, Map<string, Absensi>>, nisn: string, a: Absensi) => {
    let inner = m.get(nisn); if (!inner) { inner = new Map(); m.set(nisn, inner); }
    const cur = inner.get(a.tanggal);
    // masuk: ambil yang paling awal; pulang: yang paling akhir
    if (!cur || (m === masuk ? a.timestamp < cur.timestamp : a.timestamp > cur.timestamp)) inner.set(a.tanggal, a);
  };
  for (const a of absensi) {
    const nisn = nisnOf(a.siswa_id); if (!nisn) continue;
    put(a.jenis === 'masuk' ? masuk : pulang, nisn, a);
  }
  const cat = new Map<string, Map<string, CatatanKehadiran>>();
  for (const c of catatan) {
    const nisn = nisnOf(c.siswa_id); if (!nisn) continue;
    let inner = cat.get(nisn); if (!inner) { inner = new Map(); cat.set(nisn, inner); }
    inner.set(c.tanggal, c);
  }

  const efektif = new Set<string>();
  for (const inner of masuk.values()) for (const t of inner.keys()) efektif.add(t);
  for (const inner of cat.values()) for (const [t, c] of inner) if (c.status === 'tidak_bawa_kartu') efektif.add(t);
  const hariEfektif = Array.from(efektif).sort();

  // siswa yang dilaporkan: aktif ATAU punya data pada periode
  const adaData = new Set<string>([...masuk.keys(), ...pulang.keys(), ...cat.keys()]);
  const daftar = siswaList.filter((s) => s.status_aktif !== false || adaData.has(String(s.nisn).trim()));

  const perSiswa: BarisSiswa[] = daftar.map((s) => {
    const nisn = String(s.nisn).trim();
    const r: BarisSiswa = {
      nisn, nama: s.nama, kelas: kelasById.get(s.kelas_id)?.nama_kelas || '-', kelasId: s.kelas_id,
      hariEfektif: hariEfektif.length, hadir: 0, tepatWaktu: 0, terlambat: 0, tanpaKartu: 0,
      izin: 0, sakit: 0, bolos: 0, alpa: 0, tanpaKeterangan: 0, persen: 0,
    };
    for (const t of hariEfektif) {
      const c = cat.get(nisn)?.get(t);
      const m = masuk.get(nisn)?.get(t);
      if (c?.status === 'bolos') r.bolos++;
      else if (m) { r.hadir++; if (m.status === 'terlambat') r.terlambat++; else r.tepatWaktu++; }
      else if (c?.status === 'tidak_bawa_kartu') { r.hadir++; r.tanpaKartu++; }
      else if (c?.status === 'izin') r.izin++;
      else if (c?.status === 'sakit') r.sakit++;
      else if (c?.status === 'alpa') r.alpa++;
      else r.tanpaKeterangan++;
    }
    r.persen = pct(r.hadir, r.hariEfektif);
    return r;
  });

  const kelasUrut = sortKelas(kelasList);
  const urutanKelas = new Map(kelasUrut.map((k, i) => [k.id, i]));
  perSiswa.sort((a, b) => (urutanKelas.get(a.kelasId) ?? 999) - (urutanKelas.get(b.kelasId) ?? 999) || a.nama.localeCompare(b.nama, 'id'));

  const perKelas: BarisKelas[] = kelasUrut
    .map((k) => {
      const rows = perSiswa.filter((s) => s.kelasId === k.id);
      const sum = (f: (s: BarisSiswa) => number) => rows.reduce((n, s) => n + f(s), 0);
      const hadir = sum((s) => s.hadir);
      return {
        kelas: k.nama_kelas, jumlahSiswa: rows.length, hariEfektif: hariEfektif.length, hadir,
        tepatWaktu: sum((s) => s.tepatWaktu), terlambat: sum((s) => s.terlambat), tanpaKartu: sum((s) => s.tanpaKartu),
        izin: sum((s) => s.izin), sakit: sum((s) => s.sakit), bolos: sum((s) => s.bolos), alpa: sum((s) => s.alpa),
        tanpaKeterangan: sum((s) => s.tanpaKeterangan), persen: pct(hadir, rows.length * hariEfektif.length),
      };
    })
    .filter((k) => k.jumlahSiswa > 0);

  // detail harian: satu baris per siswa-hari yang punya catatan/scan
  const detail: BarisDetail[] = [];
  for (const s of daftar) {
    const nisn = String(s.nisn).trim();
    const tanggalSet = new Set<string>([
      ...(masuk.get(nisn)?.keys() ?? []), ...(pulang.get(nisn)?.keys() ?? []), ...(cat.get(nisn)?.keys() ?? []),
    ]);
    for (const t of tanggalSet) {
      const m = masuk.get(nisn)?.get(t); const p = pulang.get(nisn)?.get(t); const c = cat.get(nisn)?.get(t);
      detail.push({
        tanggal: t, kelas: kelasById.get(s.kelas_id)?.nama_kelas || '-', nisn, nama: s.nama,
        jamMasuk: m?.waktu_scan || '', statusMasuk: m ? (m.status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu') : '',
        jamPulang: p?.waktu_scan || '',
        catatan: c ? `${labelCatatan[c.status] || c.status}${c.keterangan ? ` - ${c.keterangan}` : ''}` : '',
      });
    }
  }
  detail.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id'));

  const catatanRows = catatan
    .map((c) => {
      const s = siswaByNisn.get(nisnOf(c.siswa_id));
      return {
        tanggal: c.tanggal, kelas: s ? kelasById.get(s.kelas_id)?.nama_kelas || '-' : '-', nisn: nisnOf(c.siswa_id),
        nama: s?.nama || '(siswa tidak dikenal)', status: labelCatatan[c.status] || c.status,
        keterangan: c.keterangan || '', oleh: c.diinput_oleh || '',
      };
    })
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.nama.localeCompare(b.nama, 'id'));

  return { hariEfektif, perSiswa, perKelas, detail, catatan: catatanRows };
}

export const namaBerkasArsip = (s: Semester, ext: 'json' | 'xlsx') =>
  `Arsip_${s.jenis === 'ganjil' ? 'Ganjil' : 'Genap'}_${s.tahunAjaran.replace('/', '-')}_SMPN9Banjar.${ext}`;

/** JSON arsip: data mentah semester + metadata. TIDAK memuat token WA / konfigurasi Supabase. */
export function bangunJsonArsip(input: {
  semester: Semester; sekolah: string; dibuatAt: string; sumber: 'supabase' | 'lokal';
  siswaList: Siswa[]; kelasList: Kelas[]; absensi: Absensi[]; catatan: CatatanKehadiran[];
  riwayatMakanSiang?: unknown[];
}) {
  const { semester, sekolah, dibuatAt, sumber, siswaList, kelasList, absensi, catatan, riwayatMakanSiang } = input;
  return {
    tipe: 'arsip_semester',
    versi: 1,
    sekolah,
    semester: { id: semester.id, label: semester.label, tahun_ajaran: semester.tahunAjaran, mulai: semester.mulai, selesai: semester.selesai },
    dibuat_at: dibuatAt,
    sumber_data: sumber,
    jumlah: { siswa: siswaList.length, kelas: kelasList.length, absensi: absensi.length, catatan_kehadiran: catatan.length },
    data: {
      siswa: siswaList, kelas: kelasList,
      absensi: absensi.map(({ synced, synced_at, ...rest }) => rest),
      catatan_kehadiran: catatan,
      riwayat_makan_siang: riwayatMakanSiang ?? [],
    },
  };
}

export function bangunWorkbook(input: {
  semester: Semester; sekolah: string; dibuatAt: string; sumber: 'supabase' | 'lokal'; hasil: HasilArsip;
  riwayatMakanSiang?: { tanggal: string; kelas: { namaKelas: string; porsi: number }[] }[];
}): XLSX.WorkBook {
  const { semester, sekolah, dibuatAt, sumber, hasil, riwayatMakanSiang } = input;
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['ARSIP SEMESTER'], [sekolah], [semester.label],
    ['Periode', `${semester.mulai} s.d. ${semester.selesai}`],
    ['Dibuat', dibuatAt], ['Sumber data', sumber === 'supabase' ? 'Supabase (lengkap)' : 'Perangkat lokal (mungkin tidak lengkap)'],
    ['Hari efektif', hasil.hariEfektif.length], ['Jumlah siswa', hasil.perSiswa.length],
    [], ['Aturan hitung'],
    ['Hari efektif = tanggal yang punya scan masuk (atau catatan Tidak Bawa Kartu).'],
    ['Hadir = scan masuk + Tidak Bawa Kartu. Bolos mengalahkan scan masuk. % Kehadiran = Hadir / Hari efektif.'],
  ]), 'Info');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hasil.perKelas.map((k) => ({
    Kelas: k.kelas, 'Jumlah Siswa': k.jumlahSiswa, 'Hari Efektif': k.hariEfektif, 'Hadir (siswa-hari)': k.hadir,
    'Tepat Waktu': k.tepatWaktu, Terlambat: k.terlambat, 'Tidak Bawa Kartu': k.tanpaKartu, Izin: k.izin, Sakit: k.sakit,
    Bolos: k.bolos, Alpa: k.alpa, 'Tanpa Keterangan': k.tanpaKeterangan, '% Kehadiran': k.persen,
  }))), 'Ringkasan Kelas');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hasil.perSiswa.map((s, i) => ({
    No: i + 1, NISN: s.nisn, Nama: s.nama, Kelas: s.kelas, 'Hari Efektif': s.hariEfektif, Hadir: s.hadir,
    'Tepat Waktu': s.tepatWaktu, Terlambat: s.terlambat, 'Tidak Bawa Kartu': s.tanpaKartu, Izin: s.izin, Sakit: s.sakit,
    Bolos: s.bolos, Alpa: s.alpa, 'Tanpa Keterangan': s.tanpaKeterangan, '% Kehadiran': s.persen,
  }))), 'Rekap Per Siswa');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hasil.detail.map((d) => ({
    Tanggal: d.tanggal, Kelas: d.kelas, NISN: d.nisn, Nama: d.nama, 'Jam Masuk': d.jamMasuk,
    'Status Masuk': d.statusMasuk, 'Jam Pulang': d.jamPulang, Catatan: d.catatan,
  }))), 'Detail Harian');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hasil.catatan.map((c) => ({
    Tanggal: c.tanggal, Kelas: c.kelas, NISN: c.nisn, Nama: c.nama, Status: c.status, Keterangan: c.keterangan, 'Diinput Oleh': c.oleh,
  }))), 'Catatan Kehadiran');

  if (riwayatMakanSiang && riwayatMakanSiang.length) {
    const rows = riwayatMakanSiang.flatMap((r) => r.kelas.map((k) => ({ Tanggal: r.tanggal, Kelas: k.namaKelas, 'Porsi Makan Siang': k.porsi })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Makan Siang');
  }
  return wb;
}
