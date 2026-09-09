export type JenisKelamin = 'L' | 'P';

export interface Kelas {
  id: string;
  nama_kelas: string;
  tingkat: '7' | '8' | '9';
  wali_kelas: string;
  ruang?: string;
}

export interface Siswa {
  id: string;
  nama: string;
  kode_barcode: string; // Unik untuk scan barcode/QR
  nisn: string;
  kelas_id: string;
  nomor_wa_ortu: string;
  nama_ortu: string;
  jenis_kelamin: JenisKelamin;
  foto_url: string;
  status_aktif: boolean;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
}

export type JenisAbsensi = 'masuk' | 'pulang';
export type StatusAbsensi = 'tepat_waktu' | 'terlambat';

export interface Absensi {
  id: string;
  siswa_id: string;
  tanggal: string; // YYYY-MM-DD
  waktu_scan: string; // HH:mm:ss
  timestamp: number; // Unix ms
  jenis: JenisAbsensi;
  status: StatusAbsensi;
  catatan?: string;
  synced?: boolean; // status sinkronisasi ke database
  synced_at?: string; // waktu sinkronisasi
}

export type StatusKirimWA = 'pending' | 'terkirim' | 'gagal' | 'simulasi';

export interface LogNotifikasiWA {
  id: string;
  absensi_id: string;
  siswa_id: string;
  nomor_tujuan: string;
  jenis_pesan: JenisAbsensi | 'terlambat';
  pesan: string;
  status_kirim: StatusKirimWA;
  waktu_kirim: string; // ISO or YYYY-MM-DD HH:mm:ss
  response_payload?: string;
}

export interface PengaturanJam {
  id: string;
  jam_buka_pos: string; // default "06:00"
  batas_tepat_waktu: string; // default "07:15"
  batas_jam_masuk: string; // default "10:00"
  batas_jam_pulang: string; // Jam pulang reguler (Senin - Kamis), default "14:00"
  batas_jam_pulang_jumat: string; // Jam pulang khusus Hari Jumat, default "11:30"
  hari_aktif_sekolah: string[]; // default ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
  toleransi_duplikasi_menit: number; // default 5 menit
}

export interface WAGatewayConfig {
  provider: 'fonnte' | 'wablas' | 'custom';
  endpointUrl: string;
  apiToken: string;
  senderPhone?: string;
  active: boolean;
  templateMasuk: string;
  templateTerlambat: string;
  templatePulang: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

export interface ScanResult {
  success: boolean;
  siswa?: Siswa;
  kelas?: Kelas;
  jenis?: JenisAbsensi;
  status?: StatusAbsensi;
  message: string;
  waktu: string;
  isDuplicate?: boolean;
  duplicatePreviousScanTime?: string;
  isOfflineSaved?: boolean;
}

export interface AppBackupPayload {
  version: string;
  timestamp: string;
  app: string;
  sekolah: string;
  stats: {
    total_siswa: number;
    total_kelas: number;
    total_absensi: number;
    total_log_wa: number;
    total_hari_khusus?: number;
  };
  data: {
    siswa: Siswa[];
    kelas: Kelas[];
    absensi: Absensi[];
    log_notifikasi: LogNotifikasiWA[];
    pengaturan_jam: PengaturanJam;
    wa_config: WAGatewayConfig;
    supabase_config?: SupabaseConfig;
    hari_khusus?: HariKhusus[];
  };
}

export interface LocalSnapshot {
  id: string;
  timestamp: string;
  label: string;
  stats: {
    total_siswa: number;
    total_kelas: number;
    total_absensi: number;
  };
  payload: AppBackupPayload;
}

export interface SyncStatusInfo {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  lastSyncMessage?: string;
  hasSyncError?: boolean;
}

export interface UserAccount {
  id: string;
  username: string; // 'agus' | 'moch' | 'alia' | 'feby'
  name: string; // Full Name
  role: 'admin' | 'petugas';
  isSuperAdmin?: boolean; // Only 'agus' is Super Admin
  avatar?: string;
  password?: string;
  lastLogin?: string;
}

export interface KartuOverlayBox {
  x: number; // posisi dari kiri (px, kanvas kartu 360x540)
  y: number; // posisi dari atas (px)
  width: number;
  height: number;
}

export interface ProfilSekolah {
  nama: string;
  npsn: string;
  alamat: string;
  kota: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  customLogoUrl: string | null; // base64 / data URL Logo Sekolah
  customLogoKotaUrl: string | null; // base64 / data URL Logo Kota Banjar
  templateKartuUrl: string | null; // base64 desain kartu OSIS asli (opsional, menggantikan desain bawaan)
  templateFotoBox: KartuOverlayBox; // posisi & ukuran foto siswa di atas template
  templateQrBox: KartuOverlayBox; // posisi & ukuran QR code di atas template
}

export type TipeHariKhusus =
  | 'libur_nasional' // Libur Nasional Resmi (SKB 3 Menteri)
  | 'cuti_bersama' // Cuti Bersama Nasional
  | 'libur_khusus' // Libur Khusus Sekolah (Libur Awal Ramadhan, Class Meeting, Rapat Kerja Guru, dll - Tidak Efektif)
  | 'pulang_cepat' // Hari Pulang Cepat (KBM Efektif, jam pulang dimajukan misal 10:30)
  | 'kegiatan_khusus'; // Kegiatan Khusus Sekolah (Porseni, Upacara, dll)

export interface HariKhusus {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nama: string; // Misal: "Hari Kemerdekaan RI", "Libur Awal Ramadhan", "Class Meeting Non-KBM"
  kategori: TipeHariKhusus;
  isEfektifKBM: boolean; // false untuk libur / tidak dihitung di persentase kehadiran
  jamPulangKustom?: string; // e.g. "10:30" jika kategori === 'pulang_cepat'
  keterangan?: string; // Alasan / surat edaran
  sumber: 'nasional' | 'sekolah'; // 'nasional' = otomatis SKB 3 Menteri, 'sekolah' = ditandai oleh admin sekolah
}

export interface HariInfo {
  tanggal: string;
  namaHari: string; // 'Senin', 'Selasa', dst
  isWeekend: boolean; // Sabtu / Minggu (atau di luar hari_aktif_sekolah)
  isHariEfektif: boolean; // true jika KBM aktif & wajib dihitung presensinya
  isLiburNasional: boolean;
  isLiburKhusus: boolean;
  isPulangCepat: boolean;
  jamPulangEfektif: string; // Jam batas pulang yang berlaku
  catatanStatus: string; // e.g. "Hari Efektif KBM", "Libur Nasional - Idul Fitri", "Libur Khusus - Class Meeting"
  namaKhusus?: string;
  keterangan?: string;
}
