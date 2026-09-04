import { HariKhusus, HariInfo, PengaturanJam } from '../types';

const NAMA_HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Format string tanggal YYYY-MM-DD ke objek Date lokal (menghindari offset UTC)
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Cek apakah sebuah tanggal adalah hari libur akhir pekan / di luar hari operasional sekolah
 */
export function isWeekendOrInactiveDay(dateStr: string, activeDays: string[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']): boolean {
  const d = parseLocalDate(dateStr);
  const dayName = NAMA_HARI_INDONESIA[d.getDay()];
  return !activeDays.includes(dayName);
}

/**
 * Cari informasi hari libur nasional atau cuti bersama
 */
export function findNationalHoliday(dateStr: string, nationalHolidays: HariKhusus[]): HariKhusus | undefined {
  return nationalHolidays.find((h) => h.tanggal === dateStr && (h.kategori === 'libur_nasional' || h.kategori === 'cuti_bersama'));
}

/**
 * Cari informasi hari khusus yang ditandai oleh sekolah (libur khusus, pulang cepat, dll)
 */
export function findCustomSchoolDay(dateStr: string, customDays: HariKhusus[]): HariKhusus | undefined {
  return customDays.find((h) => h.tanggal === dateStr);
}

/**
 * Dapatkan informasi status lengkap suatu tanggal:
 * Apakah hari efektif KBM, libur nasional, libur khusus sekolah, atau hari pulang cepat
 */
export function getHariInfo(
  dateStr: string,
  nationalHolidays: HariKhusus[],
  customSchoolDays: HariKhusus[],
  pengaturanJam: PengaturanJam
): HariInfo {
  const d = parseLocalDate(dateStr);
  const dayOfWeekIndex = d.getDay();
  const namaHari = NAMA_HARI_INDONESIA[dayOfWeekIndex];
  const isFriday = dayOfWeekIndex === 5;

  const activeDays = pengaturanJam.hari_aktif_sekolah || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const isWeekend = !activeDays.includes(namaHari);

  // 1. Cek Libur Khusus Sekolah (flag kustom sekolah)
  const customDay = findCustomSchoolDay(dateStr, customSchoolDays);
  // 2. Cek Libur Nasional
  const natHoliday = findNationalHoliday(dateStr, nationalHolidays);

  const isLiburKhusus = customDay?.kategori === 'libur_khusus' || (customDay !== undefined && customDay.isEfektifKBM === false);
  const isLiburNasional = !!natHoliday;
  const isPulangCepat = customDay?.kategori === 'pulang_cepat' || (customDay !== undefined && !!customDay.jamPulangKustom);

  // Hari Efektif KBM:
  // - Harus BUKAN weekend / inactive day
  // - Harus BUKAN libur nasional / cuti bersama
  // - Harus BUKAN libur khusus sekolah
  const isHariEfektif = !isWeekend && !isLiburNasional && !isLiburKhusus;

  // Jam pulang yang berlaku:
  let jamPulangEfektif = pengaturanJam.batas_jam_pulang || '14:00';
  if (isFriday && pengaturanJam.batas_jam_pulang_jumat) {
    jamPulangEfektif = pengaturanJam.batas_jam_pulang_jumat;
  }
  if (isPulangCepat && customDay?.jamPulangKustom) {
    jamPulangEfektif = customDay.jamPulangKustom;
  }

  // Teks status dan keterangan
  let catatanStatus = 'Hari Efektif KBM';
  let namaKhusus: string | undefined = undefined;
  let keterangan: string | undefined = undefined;

  if (isLiburKhusus && customDay) {
    catatanStatus = `Libur Khusus Sekolah (${customDay.nama})`;
    namaKhusus = customDay.nama;
    keterangan = customDay.keterangan;
  } else if (isLiburNasional && natHoliday) {
    catatanStatus = `Libur Nasional (${natHoliday.nama})`;
    namaKhusus = natHoliday.nama;
    keterangan = natHoliday.keterangan || 'Libur Nasional Resmi SKB 3 Menteri';
  } else if (isWeekend) {
    catatanStatus = `Akhir Pekan (${namaHari}) - Tidak Aktif KBM`;
  } else if (isPulangCepat && customDay) {
    catatanStatus = `Hari Pulang Cepat (${jamPulangEfektif}) - ${customDay.nama}`;
    namaKhusus = customDay.nama;
    keterangan = customDay.keterangan;
  } else if (isFriday) {
    catatanStatus = `Hari Efektif (Jadwal Khusus Jumat: Pulang ${jamPulangEfektif})`;
  }

  return {
    tanggal: dateStr,
    namaHari,
    isWeekend,
    isHariEfektif,
    isLiburNasional,
    isLiburKhusus,
    isPulangCepat,
    jamPulangEfektif,
    catatanStatus,
    namaKhusus,
    keterangan,
  };
}

/**
 * Menghitung rincian hari kalender, hari efektif KBM, hari libur, dan akhir pekan
 * dalam suatu rentang tanggal (misal dalam satu bulan atau rentang kustom).
 */
export interface PeriodDayMetrics {
  totalHariKalender: number;
  totalHariEfektif: number;
  totalHariEfektifBerjalan: number; // Hari efektif yang sudah lewat / hari ini
  effectiveDates: string[]; // Daftar YYYY-MM-DD hari efektif KBM berjalan
  allEffectiveDatesInPeriod: string[]; // Semua hari efektif KBM (termasuk yang belum tiba)
  totalWeekend: number;
  totalLiburNasional: number;
  totalLiburKhusus: number;
  totalPulangCepat: number;
  holidaysList: { tanggal: string; nama: string; tipe: string; keterangan?: string }[];
}

export function calculatePeriodDayMetrics(
  startDateStr: string,
  endDateStr: string,
  nationalHolidays: HariKhusus[],
  customSchoolDays: HariKhusus[],
  pengaturanJam: PengaturanJam,
  todayStr?: string
): PeriodDayMetrics {
  const curToday = todayStr || new Date().toISOString().split('T')[0];

  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  const effectiveDates: string[] = [];
  const allEffectiveDatesInPeriod: string[] = [];
  const holidaysList: { tanggal: string; nama: string; tipe: string; keterangan?: string }[] = [];

  let totalHariKalender = 0;
  let totalWeekend = 0;
  let totalLiburNasional = 0;
  let totalLiburKhusus = 0;
  let totalPulangCepat = 0;

  // Loop through dates
  const curr = new Date(start.getTime());
  while (curr <= end) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    totalHariKalender++;

    const info = getHariInfo(dateStr, nationalHolidays, customSchoolDays, pengaturanJam);

    if (info.isWeekend) {
      totalWeekend++;
    } else if (info.isLiburNasional) {
      totalLiburNasional++;
      holidaysList.push({
        tanggal: dateStr,
        nama: info.namaKhusus || 'Libur Nasional',
        tipe: 'Libur Nasional',
        keterangan: info.keterangan,
      });
    } else if (info.isLiburKhusus) {
      totalLiburKhusus++;
      holidaysList.push({
        tanggal: dateStr,
        nama: info.namaKhusus || 'Libur Khusus Sekolah',
        tipe: 'Libur Khusus Sekolah',
        keterangan: info.keterangan,
      });
    } else {
      // Hari Efektif KBM
      allEffectiveDatesInPeriod.push(dateStr);
      if (dateStr <= curToday) {
        effectiveDates.push(dateStr);
      }
      if (info.isPulangCepat) {
        totalPulangCepat++;
      }
    }

    // Step next day
    curr.setDate(curr.getDate() + 1);
  }

  return {
    totalHariKalender,
    totalHariEfektif: allEffectiveDatesInPeriod.length,
    totalHariEfektifBerjalan: effectiveDates.length,
    effectiveDates,
    allEffectiveDatesInPeriod,
    totalWeekend,
    totalLiburNasional,
    totalLiburKhusus,
    totalPulangCepat,
    holidaysList,
  };
}
