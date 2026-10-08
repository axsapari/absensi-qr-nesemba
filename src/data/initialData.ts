import { Kelas, Siswa, PengaturanJam, Absensi, UserAccount, ProfilSekolah } from '../types';

export const INITIAL_PROFIL_SEKOLAH: ProfilSekolah = {
  nama: 'SMP NEGERI 9 BANJAR',
  npsn: '20225389',
  alamat: 'Jl. Lapang Sangkuriang No. 17, Pataruman',
  kota: 'Kota Banjar',
  provinsi: 'Jawa Barat',
  kodePos: '46323',
  telepon: '(0265) 741234',
  email: 'smpn9banjar@gmail.com',
  website: 'https://smpn9banjar.sch.id',
  kepalaSekolah: 'Drs. H. Dedi Kurniawan, M.Pd.',
  nipKepalaSekolah: '19680512 199403 1 005',
  customLogoUrl: null,
  customLogoKotaUrl: null,
  templateKartuUrl: null,
  templateFotoBox: { x: 72, y: 158, width: 144, height: 176 },
  templateQrBox: { x: 252, y: 358, width: 84, height: 84 },
};

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'u-agus',
    username: 'agus',
    name: 'Agus Sugiharto Sapari, S.Pd.',
    email: 'agus@smpn9banjar.sch.id', // GANTI sesuai email akun Supabase Auth Anda
    role: 'admin',
    isSuperAdmin: true, // Only Agus is Super Admin
    nip: '199108152019031009',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-moch',
    username: 'moch',
    name: 'Mochamad Fernanda A',
    email: 'moch@smpn9banjar.sch.id',
    role: 'admin',
    isSuperAdmin: false,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-alia',
    username: 'alia',
    name: 'Alia Zakiyah',
    email: 'alia@smpn9banjar.sch.id',
    role: 'admin',
    isSuperAdmin: false,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-tri',
    username: 'tri',
    name: 'Tri Feby Adinsyah',
    email: 'feby@smpn9banjar.sch.id',
    role: 'admin',
    isSuperAdmin: false,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
  },
];

// Data kelas demo dihapus. Master kelas & siswa berasal dari Supabase / impor Excel.
export const INITIAL_KELAS: Kelas[] = [];

export const INITIAL_PENGATURAN_JAM: PengaturanJam = {
  id: 'default_config',
  jam_buka_pos: '06:00',
  batas_tepat_waktu: '07:15',
  batas_jam_masuk: '10:00',
  batas_jam_pulang_senin: '14:00', // Khusus Hari Senin
  batas_jam_pulang: '14:15', // Selasa - Kamis
  batas_jam_pulang_jumat: '11:30', // Khusus Hari Jumat
  hari_aktif_sekolah: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
  toleransi_duplikasi_menit: 5,
};

// Siswa uji coba (fiktif) dihapus agar perangkat baru tidak menampilkan data palsu.
export const INITIAL_SISWA: Siswa[] = [];

// Helper to get today's date formatted YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Absensi demo dihapus (sebelumnya membuat 'kehadiran palsu' hari ini di perangkat baru).
export function getInitialAttendance(): Absensi[] {
  return [];
}
