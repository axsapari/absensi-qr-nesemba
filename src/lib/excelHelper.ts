import * as XLSX from 'xlsx';
import { Siswa, Kelas } from '../types';

export interface ParsedSiswaRow {
  nama: string;
  nisn: string;
  kode_barcode: string;
  nama_kelas: string;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
  nomor_wa_ortu: string;
  nama_ortu: string;
  foto_url: string;
  isValid: boolean;
  errors: string[];
}

// Generate and trigger download for official Excel Template (.xlsx)
export function downloadExcelTemplate(kelasList: Kelas[] = []) {
  const sampleClasses = kelasList.length > 0
    ? kelasList.map((k) => k.nama_kelas).join(', ')
    : 'VII-A, VII-B, VIII-A, VIII-B, IX-A, IX-B';

  const templateData = [
    {
      'Nama Lengkap': 'Cahaya Dewi',
      'NISN': '0098234101',
      'Kode Barcode': 'SMP9-7A-001',
      'Kelas': 'VII-A',
      'Jenis Kelamin (L/P)': 'P',
      'Tempat Lahir': 'Banjar',
      'Tanggal Lahir': '12 Mei 2012',
      'Alamat': 'Jl. Tentara Pelajar No. 45, Banjar',
      'No WA Ortu': '081234567890',
      'Nama Ortu': 'Bpk. Hendra Gunawan',
      'Foto URL': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    },
    {
      'Nama Lengkap': 'Aditya Pratama Putra',
      'NISN': '0098234102',
      'Kode Barcode': 'SMP9-7A-002',
      'Kelas': 'VII-A',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Lahir': 'Banjar',
      'Tanggal Lahir': '20 Agustus 2012',
      'Alamat': 'Jl. Mayor Babas No. 18, Banjar',
      'No WA Ortu': '081298765432',
      'Nama Ortu': 'Bpk. Joko Santoso',
      'Foto URL': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
    },
    {
      'Nama Lengkap': 'Bagas Satria Nugraha',
      'NISN': '0098234103',
      'Kode Barcode': 'SMP9-7B-001',
      'Kelas': 'VII-B',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Lahir': 'Ciamis',
      'Tanggal Lahir': '05 Januari 2012',
      'Alamat': 'Jl. Dr. Husein Kartasasmita No. 88, Banjar',
      'No WA Ortu': '085712345678',
      'Nama Ortu': 'Ibu Sri Wahyuni',
      'Foto URL': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
    {
      'Nama Lengkap': 'Salma Zahirah',
      'NISN': '0076113301',
      'Kode Barcode': 'SMP9-9A-001',
      'Kelas': 'IX-A',
      'Jenis Kelamin (L/P)': 'P',
      'Tempat Lahir': 'Banjar',
      'Tanggal Lahir': '14 September 2010',
      'Alamat': 'Jl. BKR Lingkungan Sukarame, Banjar',
      'No WA Ortu': '081344556677',
      'Nama Ortu': 'Ibu Hj. Faridah',
      'Foto URL': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    },
  ];

  const petunjukData = [
    { 'PANDUAN PENGISIAN DATA SISWA': 'SMP NEGERI 9 BANJAR' },
    { 'PANDUAN PENGISIAN DATA SISWA': '1. Kolom "Nama Lengkap" dan "Kelas" wajib diisi.' },
    { 'PANDUAN PENGISIAN DATA SISWA': `2. Kolom "Kelas" dapat diisi sesuai nama kelas yang ada, contoh: ${sampleClasses}` },
    { 'PANDUAN PENGISIAN DATA SISWA': '3. Kolom "Kode Barcode" bersifat unik. Jika dikosongkan, sistem akan otomatis membuatkan kode barcode unik.' },
    { 'PANDUAN PENGISIAN DATA SISWA': '4. Kolom "Jenis Kelamin (L/P)" diisi L untuk Laki-laki atau P untuk Perempuan.' },
    { 'PANDUAN PENGISIAN DATA SISWA': '5. Kolom "Tempat Lahir", "Tanggal Lahir", dan "Alamat" akan langsung tampil di Kartu Pelajar resmi.' },
    { 'PANDUAN PENGISIAN DATA SISWA': '6. Kolom "No WA Ortu" diisi nomor WhatsApp orang tua (contoh: 081234567890) untuk notifikasi absensi.' },
    { 'PANDUAN PENGISIAN DATA SISWA': '7. Setelah diisi, simpan file ini dan gunakan tombol "Impor dari Excel" pada aplikasi.' },
  ];

  const wb = XLSX.utils.book_new();

  // Sheet 1: Data Siswa
  const wsData = XLSX.utils.json_to_sheet(templateData);
  wsData['!cols'] = [
    { wch: 25 }, // Nama Lengkap
    { wch: 15 }, // NISN
    { wch: 18 }, // Kode Barcode
    { wch: 10 }, // Kelas
    { wch: 20 }, // Jenis Kelamin
    { wch: 16 }, // Tempat Lahir
    { wch: 18 }, // Tanggal Lahir
    { wch: 35 }, // Alamat
    { wch: 16 }, // No WA Ortu
    { wch: 22 }, // Nama Ortu
    { wch: 40 }, // Foto URL
  ];

  // Sheet 2: Petunjuk
  const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData);
  wsPetunjuk['!cols'] = [{ wch: 75 }];

  XLSX.utils.book_append_sheet(wb, wsData, 'Data Siswa');
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk Pengisian');

  // Trigger file download in browser
  XLSX.writeFile(wb, 'Format_Impor_Siswa_SMPN_9_Banjar.xlsx');
}

// Download lightweight CSV Template alternative
export function downloadCsvTemplate() {
  const headers = [
    'Nama Lengkap',
    'NISN',
    'Kode Barcode',
    'Kelas',
    'Jenis Kelamin (L/P)',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Alamat',
    'No WA Ortu',
    'Nama Ortu',
    'Foto URL',
  ];

  const rows = [
    [
      'Cahaya Dewi',
      '0098234101',
      'SMP9-7A-001',
      'VII-A',
      'P',
      'Banjar',
      '12 Mei 2012',
      'Jl. Tentara Pelajar No. 45, Banjar',
      '081234567890',
      'Bpk. Hendra Gunawan',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    ],
    [
      'Aditya Pratama Putra',
      '0098234102',
      'SMP9-7A-002',
      'VII-A',
      'L',
      'Banjar',
      '20 Agustus 2012',
      'Jl. Mayor Babas No. 18, Banjar',
      '081298765432',
      'Bpk. Joko Santoso',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
    ],
  ];

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'Format_Impor_Siswa_SMPN_9_Banjar.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Parse uploaded Excel or CSV file
export async function parseExcelFile(file: File): Promise<ParsedSiswaRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as raw objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('Sheet Excel kosong atau tidak memiliki baris data.');
  }

  // Normalization helper
  const findValue = (row: Record<string, any>, possibleKeys: string[]): string => {
    const rowKeys = Object.keys(row);
    for (const p of possibleKeys) {
      const match = rowKeys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === p.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (match && row[match] !== undefined && row[match] !== null) {
        return String(row[match]).trim();
      }
    }
    return '';
  };

  const parsed: ParsedSiswaRow[] = rawRows.map((row, index) => {
    const nama = findValue(row, ['Nama Lengkap', 'Nama', 'Nama Siswa', 'Full Name']);
    const nisn = findValue(row, ['NISN', 'Nomor Induk Siswa Nasional', 'NIS']);
    const kode_barcode = findValue(row, ['Kode Barcode', 'Barcode', 'Barcode Scanner', 'Kode']);
    const nama_kelas = findValue(row, ['Kelas', 'Nama Kelas', 'Class', 'Rombel']);
    const jkRaw = findValue(row, ['Jenis Kelamin (L/P)', 'Jenis Kelamin', 'JK', 'Gender', 'L/P']).toUpperCase();
    const tempat_lahir = findValue(row, ['Tempat Lahir', 'TempatLahir', 'Kota Lahir']);
    const tanggal_lahir = findValue(row, ['Tanggal Lahir', 'TanggalLahir', 'Tgl Lahir', 'TTL']);
    const alamat = findValue(row, ['Alamat', 'Alamat Siswa', 'Domisili']);
    const nomor_wa_ortu = findValue(row, ['No WA Ortu', 'No WA', 'Nomor WhatsApp', 'No HP', 'Kontak Ortu', 'Telepon']);
    const nama_ortu = findValue(row, ['Nama Ortu', 'Nama Orang Tua', 'Nama Wali', 'Orang Tua']);
    const foto_url = findValue(row, ['Foto URL', 'Foto', 'Photo', 'URL Foto']);

    const jenis_kelamin: 'L' | 'P' = jkRaw.startsWith('P') || jkRaw.includes('PEREMPUAN') ? 'P' : 'L';

    const errors: string[] = [];
    if (!nama) errors.push('Nama siswa wajib diisi');
    if (!nama_kelas) errors.push('Kelas wajib diisi');

    return {
      nama,
      nisn: nisn || `009${String(Date.now()).slice(-7)}${index}`,
      kode_barcode: kode_barcode || '', // will be auto generated if empty
      nama_kelas,
      jenis_kelamin,
      tempat_lahir: tempat_lahir || 'Banjar',
      tanggal_lahir: tanggal_lahir || '-',
      alamat: alamat || 'Kota Banjar',
      nomor_wa_ortu: nomor_wa_ortu || '081234567890',
      nama_ortu: nama_ortu || `Orang Tua dari ${nama || 'Siswa'}`,
      foto_url: foto_url || (jenis_kelamin === 'P'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
        : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200'),
      isValid: errors.length === 0,
      errors,
    };
  });

  return parsed;
}

// Export existing students to Excel file
export function exportStudentsToExcel(siswaList: Siswa[], kelasList: Kelas[]) {
  const exportData = siswaList.map((s) => {
    const k = kelasList.find((item) => item.id === s.kelas_id);
    return {
      'Nama Lengkap': s.nama,
      'NISN': s.nisn,
      'Kode Barcode': s.kode_barcode,
      'Kelas': k?.nama_kelas || '-',
      'Jenis Kelamin (L/P)': s.jenis_kelamin,
      'Tempat Lahir': s.tempat_lahir || 'Banjar',
      'Tanggal Lahir': s.tanggal_lahir || '-',
      'Alamat': s.alamat || 'Kota Banjar',
      'No WA Ortu': s.nomor_wa_ortu,
      'Nama Ortu': s.nama_ortu,
      'Status': s.status_aktif ? 'Aktif' : 'Nonaktif',
      'Foto URL': s.foto_url,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
    { wch: 10 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 35 },
    { wch: 16 },
    { wch: 22 },
    { wch: 10 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  XLSX.writeFile(wb, `Data_Siswa_SMPN_9_Banjar_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
