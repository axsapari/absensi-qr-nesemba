import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Siswa,
  Kelas,
  Absensi,
  PengaturanJam,
  LogNotifikasiWA,
  WAGatewayConfig,
  SupabaseConfig,
  ScanResult,
  JenisAbsensi,
  StatusAbsensi,
  AppBackupPayload,
  LocalSnapshot,
  UserAccount,
  ProfilSekolah,
  HariKhusus,
  HariInfo,
} from '../types';
import {
  INITIAL_KELAS,
  INITIAL_SISWA,
  INITIAL_PENGATURAN_JAM,
  INITIAL_PROFIL_SEKOLAH,
  INITIAL_USERS,
  getInitialAttendance,
  getTodayDateString,
} from '../data/initialData';
import {
  INDONESIAN_NATIONAL_HOLIDAYS,
  INITIAL_HARI_KHUSUS_SEKOLAH,
} from '../data/nationalHolidays';
import {
  getHariInfo,
  calculatePeriodDayMetrics,
  PeriodDayMetrics,
} from '../lib/holidayUtils';
import { soundManager } from '../lib/sound';
import { DEFAULT_WA_CONFIG, sendWhatsAppNotification } from '../lib/whatsapp';
import { processSyncToDatabase } from '../lib/syncService';
import { getSupabaseClient, resetSupabaseClient } from '../lib/supabase';

interface RecentScanItem {
  absensi: Absensi;
  siswa: Siswa;
  kelas?: Kelas;
}

interface AppContextType {
  siswaList: Siswa[];
  kelasList: Kelas[];
  absensiList: Absensi[];
  logNotifikasiList: LogNotifikasiWA[];
  pengaturanJam: PengaturanJam;
  waConfig: WAGatewayConfig;
  supabaseConfig: SupabaseConfig;
  lastScanResult: ScanResult | null;
  recentScans: RecentScanItem[];
  simulatedTime: string | null;
  currentActiveTimeStr: string;
  currentActiveDateStr: string;
  isAdminLoggedIn: boolean;

  // Offline & Synchronization
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingSyncCount: number;
  syncBanner: { type: 'online' | 'offline' | 'sync_success' | 'sync_error' | 'syncing'; message: string } | null;
  syncData: (isAuto?: boolean) => Promise<{ success: boolean; count: number; message: string }>;
  toggleSimulatedOffline: () => void;
  dismissSyncBanner: () => void;

  setSimulatedTime: (time: string | null) => void;
  processScanNisn: (nisnInput: string) => Promise<ScanResult>;
  clearLastScanResult: () => void;

  // CRUD Siswa
  addSiswa: (siswa: Omit<Siswa, 'id'>) => void;
  importSiswaBatch: (
    newStudents: Omit<Siswa, 'id'>[],
    mode?: 'append' | 'replace'
  ) => { added: number; updated: number };
  updateSiswa: (id: string, siswa: Partial<Siswa>) => void;
  deleteSiswa: (id: string) => void;

  // CRUD Kelas
  addKelas: (kelas: Omit<Kelas, 'id'>) => void;
  updateKelas: (id: string, kelas: Partial<Kelas>) => void;
  deleteKelas: (id: string) => void;

  // Settings
  updatePengaturanJam: (pengaturan: Partial<PengaturanJam>) => void;
  updateWAConfig: (config: Partial<WAGatewayConfig>) => void;
  updateSupabaseConfig: (config: Partial<SupabaseConfig>) => void;
  syncMasterData: () => Promise<{ success: boolean; message: string; kelas: number; siswa: number }>;

  // Attendance Actions
  deleteAbsensi: (id: string) => void;
  resetTodayAttendance: () => void;
  reloadInitialData: () => void;

  // Backup & Restore
  localSnapshots: LocalSnapshot[];
  getBackupPayload: () => AppBackupPayload;
  restoreBackupData: (
    payload: AppBackupPayload,
    mode: 'replace' | 'merge'
  ) => { success: boolean; message: string; counts: { siswa: number; kelas: number; absensi: number } };
  createLocalSnapshot: (label?: string) => void;
  restoreLocalSnapshot: (snapshotId: string) => boolean;
  deleteLocalSnapshot: (snapshotId: string) => void;

  // Admin & User Auth
  loginAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;

  // School Profile & Custom Logo
  profilSekolah: ProfilSekolah;
  updateProfilSekolah: (update: Partial<ProfilSekolah>) => void;
  setCustomSchoolLogo: (logoDataUrl: string | null) => void;
  setCustomCityLogo: (logoDataUrl: string | null) => void;

  // Multi-user authentication & Super Admin
  users: UserAccount[];
  currentUser: UserAccount | null;
  authChecking: boolean;
  kioskAuthStatus: 'idle' | 'checking' | 'success' | 'failed' | 'not_configured';
  isSuperAdmin: boolean;
  loginUser: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logoutUser: () => void;
  changeUserPassword: (username: string, oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  adminResetUserPassword: (username: string, newPass: string) => { success: boolean; message: string };
  addUser: (newUser: Omit<UserAccount, 'id'>) => { success: boolean; message: string };
  deleteUser: (userIdOrUsername: string) => { success: boolean; message: string };

  // Kalender Pendidikan, Hari Libur Nasional & Flag Hari Khusus Sekolah
  nationalHolidays: HariKhusus[];
  customSchoolDays: HariKhusus[];
  allHolidaysAndFlags: HariKhusus[];
  todayHariInfo: HariInfo;
  getDateHariInfo: (dateStr: string) => HariInfo;
  getPeriodMetrics: (startDateStr: string, endDateStr: string) => PeriodDayMetrics;
  addCustomSchoolDay: (item: Omit<HariKhusus, 'id' | 'sumber'>) => { success: boolean; message: string };
  updateCustomSchoolDay: (id: string, update: Partial<HariKhusus>) => { success: boolean; message: string };
  deleteCustomSchoolDay: (id: string) => { success: boolean; message: string };
  addNationalHoliday: (item: Omit<HariKhusus, 'id' | 'sumber'>) => { success: boolean; message: string };
  deleteNationalHoliday: (id: string) => { success: boolean; message: string };
  resetNationalHolidaysToDefault: () => void;
  resetCustomSchoolDaysToDefault: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  SISWA: 'absensi_siswa_v1',
  SISWA_ID_ALIASES: 'absensi_siswa_id_aliases_v1',
  KELAS: 'absensi_kelas_v1',
  ABSENSI: 'absensi_records_v1',
  LOG_WA: 'absensi_log_wa_v1',
  CONFIG_JAM: 'absensi_config_jam_v1',
  CONFIG_WA: 'absensi_config_wa_v1',
  CONFIG_SUPABASE: 'absensi_config_supabase_v1',
  ADMIN_AUTH: 'absensi_admin_auth_v1',
  SNAPSHOTS: 'absensi_local_snapshots_v1',
  LAST_SYNC: 'absensi_last_sync_v1',
  SIMULATED_OFFLINE: 'absensi_simulated_offline_v1',
  PROFIL_SEKOLAH: 'absensi_profil_sekolah_v1',
  USERS: 'absensi_users_v1',
  CURRENT_USER: 'absensi_current_user_v1',
  NATIONAL_HOLIDAYS: 'absensi_national_holidays_v1',
  CUSTOM_SCHOOL_DAYS: 'absensi_custom_school_days_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initialize State with localStorage fallback
  const [siswaList, setSiswaList] = useState<Siswa[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SISWA);
      if (saved) {
        const parsed: Siswa[] = JSON.parse(saved);
        // Ensure place of birth, date, address are populated for existing records
        const seenNisn = new Set<string>();
        return parsed
          .map((s, idx) => {
            const legacy = s as Siswa & { kode_barcode?: string };
            const { kode_barcode: _legacyBarcode, ...cleanStudent } = legacy;
            return {
              ...cleanStudent,
              tempat_lahir: s.tempat_lahir || 'Banjar',
              tanggal_lahir: s.tanggal_lahir || `${10 + (idx % 18)} Mei 2012`,
              alamat: s.alamat || `Jl. Tentara Pelajar No. ${15 + idx}, Banjar`,
            };
          })
          .filter((s) => {
            if (!s.nisn || seenNisn.has(s.nisn)) return false;
            seenNisn.add(s.nisn);
            return true;
          });
      }
      return INITIAL_SISWA;
    } catch {
      return INITIAL_SISWA;
    }
  });

  // Historical local-student-ID -> NISN aliases. These are essential when a
  // previous app version generated local student IDs and Supabase later assigned
  // different IDs. Attendance stores only siswa_id, so without this alias an old
  // attendance row cannot be converted back to the correct Supabase FK.
  const [siswaIdAliases, setSiswaIdAliases] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SISWA_ID_ALIASES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [kelasList, setKelasList] = useState<Kelas[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.KELAS);
      return saved ? JSON.parse(saved) : INITIAL_KELAS;
    } catch {
      return INITIAL_KELAS;
    }
  });

  const [absensiList, setAbsensiList] = useState<Absensi[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ABSENSI);
      if (!saved) return getInitialAttendance();

      const parsed = JSON.parse(saved) as Absensi[];
      // Migrasi penting untuk versi aplikasi yang sebelumnya menandai scan online
      // sebagai synced=true sebelum benar-benar masuk Supabase. ID scan nyata dibuat
      // dengan prefix `abs_`, sedangkan data demo bawaan memakai `abs-001`, dst.
      // Scan nyata lama dipaksa kembali ke antrean sinkronisasi agar bisa dipulihkan.
      return parsed.map((item) =>
        item.id.startsWith('abs_')
          ? { ...item, synced: false, synced_at: undefined }
          : item
      );
    } catch {
      return getInitialAttendance();
    }
  });

  const [logNotifikasiList, setLogNotifikasiList] = useState<LogNotifikasiWA[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOG_WA);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pengaturanJam, setPengaturanJam] = useState<PengaturanJam>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG_JAM);
      return saved ? { ...INITIAL_PENGATURAN_JAM, ...JSON.parse(saved) } : INITIAL_PENGATURAN_JAM;
    } catch {
      return INITIAL_PENGATURAN_JAM;
    }
  });

  const [waConfig, setWaConfig] = useState<WAGatewayConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG_WA);
      return saved ? JSON.parse(saved) : DEFAULT_WA_CONFIG;
    } catch {
      return DEFAULT_WA_CONFIG;
    }
  });

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG_SUPABASE);
      return saved ? JSON.parse(saved) : { url: '', anonKey: '', connected: false };
    } catch {
      return { url: '', anonKey: '', connected: false };
    }
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
    } catch {
      return true;
    }
  });

  // Profil Sekolah
  const [profilSekolah, setProfilSekolah] = useState<ProfilSekolah>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFIL_SEKOLAH);
      return saved ? { ...INITIAL_PROFIL_SEKOLAH, ...JSON.parse(saved) } : INITIAL_PROFIL_SEKOLAH;
    } catch {
      return INITIAL_PROFIL_SEKOLAH;
    }
  });

  // User Accounts (agus, moch, alia, feby)
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed: UserAccount[] = JSON.parse(saved);
        const merged = [...parsed];
        for (const defUser of INITIAL_USERS) {
          const existing = merged.find((u) => u.username.toLowerCase() === defUser.username.toLowerCase());
          if (!existing) merged.push(defUser);
          else if (!existing.email && defUser.email) existing.email = defUser.email;
        }
        return merged;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Active Logged-in User -- SEKARANG sumber kebenarannya adalah sesi Supabase Auth
  // (bukan localStorage lokal lagi), supaya status login konsisten di semua perangkat
  // dan data privat benar-benar diverifikasi server, bukan sekadar dicek di browser.
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeSessionEmail, setActiveSessionEmail] = useState<string | null>(null);
  // Status login akun kiosk -- supaya bisa ditampilkan di layar Pos Gerbang tanpa
  // perlu buka DevTools untuk tahu kenapa absensi tidak tersinkron.
  const [kioskAuthStatus, setKioskAuthStatus] = useState<
    'idle' | 'checking' | 'success' | 'failed' | 'not_configured'
  >('idle');

  const [localSnapshots, setLocalSnapshots] = useState<LocalSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Offline & Synchronization State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
    } catch {
      return false;
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || '07:00 WIB';
    } catch {
      return '07:00 WIB';
    }
  });
  const [syncBanner, setSyncBanner] = useState<{
    type: 'online' | 'offline' | 'sync_success' | 'sync_error' | 'syncing';
    message: string;
  } | null>(null);

  const effectiveOnline = isOnline && !isSimulatedOffline;

  const pendingSyncCount = useMemo(() => {
    return absensiList.filter((a) => !a.synced).length;
  }, [absensiList]);

  const [simulatedTime, setSimulatedTime] = useState<string | null>(null);
  const [realClock, setRealClock] = useState<Date>(new Date());
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);

  // Kalender Libur Nasional & Flag Hari Khusus Sekolah
  const [nationalHolidays, setNationalHolidays] = useState<HariKhusus[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NATIONAL_HOLIDAYS);
      return saved ? JSON.parse(saved) : INDONESIAN_NATIONAL_HOLIDAYS;
    } catch {
      return INDONESIAN_NATIONAL_HOLIDAYS;
    }
  });

  const [customSchoolDays, setCustomSchoolDays] = useState<HariKhusus[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_SCHOOL_DAYS);
      return saved ? JSON.parse(saved) : INITIAL_HARI_KHUSUS_SEKOLAH;
    } catch {
      return INITIAL_HARI_KHUSUS_SEKOLAH;
    }
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(siswaList));
  }, [siswaList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SISWA_ID_ALIASES, JSON.stringify(siswaIdAliases));
  }, [siswaIdAliases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NATIONAL_HOLIDAYS, JSON.stringify(nationalHolidays));
  }, [nationalHolidays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_SCHOOL_DAYS, JSON.stringify(customSchoolDays));
  }, [customSchoolDays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(kelasList));
  }, [kelasList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(absensiList));
  }, [absensiList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOG_WA, JSON.stringify(logNotifikasiList));
  }, [logNotifikasiList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG_JAM, JSON.stringify(pengaturanJam));
  }, [pengaturanJam]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG_WA, JSON.stringify(waConfig));
  }, [waConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG_SUPABASE, JSON.stringify(supabaseConfig));
  }, [supabaseConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, isAdminLoggedIn ? 'true' : 'false');
  }, [isAdminLoggedIn]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(localSnapshots));
  }, [localSnapshots]);

  useEffect(() => {
    if (lastSyncTime) {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, lastSyncTime);
    }
  }, [lastSyncTime]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, String(isSimulatedOffline));
  }, [isSimulatedOffline]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFIL_SEKOLAH, JSON.stringify(profilSekolah));
  }, [profilSekolah]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  // Pantau sesi Supabase Auth -- ini sumber kebenaran status login sekarang, bukan
  // localStorage lokal. Efek ini: (1) mengecek sesi yang sudah ada saat app dibuka,
  // (2) berlangganan perubahan (login/logout/token refresh) dari mana pun perubahan
  // itu terjadi, (3) mencocokkan email sesi ke profil staf lokal (untuk tampilan nama/
  // role di UI), dan (4) kalau TIDAK ADA sesi sama sekali dan akun kiosk sudah diatur,
  // otomatis login diam-diam pakai akun kiosk (supaya penjaga gerbang tidak perlu login).
  useEffect(() => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) {
      // Supabase belum dikonfigurasi -- tidak ada yang bisa dicek, anggap belum login
      setCurrentUser(null);
      setIsAdminLoggedIn(false);
      setAuthChecking(false);
      return;
    }

    const resolveUserFromSession = (email: string | undefined) => {
      setActiveSessionEmail(email || null);
      if (!email) {
        setCurrentUser(null);
        setIsAdminLoggedIn(false);
        return;
      }
      const matchedStaff = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (matchedStaff) {
        // Sesi ini adalah staf (admin/petugas) yang benar-benar login
        setCurrentUser(matchedStaff);
        setIsAdminLoggedIn(true);
      } else {
        // Sesi ini kemungkinan akun kiosk (terautentikasi ke Supabase, tapi bukan
        // profil staf) -- pos gerbang tetap bisa akses data, tapi TIDAK dianggap
        // "login" di level tampilan (tidak buka akses halaman admin/master data).
        setCurrentUser(null);
        setIsAdminLoggedIn(false);
      }
    };

    let kioskLoginInFlight = false;

    const trySilentKioskLogin = async () => {
      if (kioskLoginInFlight) return;
      if (!supabaseConfig.kioskEmail || !supabaseConfig.kioskPassword) {
        setKioskAuthStatus('not_configured');
        return;
      }
      kioskLoginInFlight = true;
      setKioskAuthStatus('checking');
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: supabaseConfig.kioskEmail,
          password: supabaseConfig.kioskPassword,
        });
        if (error) {
          // JANGAN dibisukan -- ini penyebab paling umum kiosk gagal akses data/tulis absensi.
          // Tampilkan di console supaya bisa didiagnosis lewat DevTools (F12).
          console.error('Auto-login akun kiosk GAGAL:', error.message);
          setKioskAuthStatus('failed');
        } else {
          setKioskAuthStatus('success');
        }
      } catch (err) {
        console.error('Auto-login akun kiosk gagal (exception):', err);
        setKioskAuthStatus('failed');
      } finally {
        kioskLoginInFlight = false;
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      resolveUserFromSession(email);
      setAuthChecking(false);
      if (!email) {
        trySilentKioskLogin();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveUserFromSession(session?.user?.email);
      // PENTING: kalau sesi jadi kosong KAPAN PUN (misalnya staf baru saja logout
      // setelah mengisi kredensial kiosk di Pengaturan), langsung coba login kiosk
      // lagi di sini -- sebelumnya ini HANYA dicoba sekali saat halaman pertama
      // dibuka, jadi logout staf tanpa refresh manual membuat kiosk tidak pernah
      // benar-benar login sampai halaman dimuat ulang.
      if (!session) {
        trySilentKioskLogin();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseConfig.url, supabaseConfig.anonKey, supabaseConfig.kioskEmail, supabaseConfig.kioskPassword]);

  // Sinkronisasi master siswa & kelas.
  // Pada login kita HANYA mengambil data yang memang tersedia di cloud.
  // Jika cloud kosong, data lokal tidak otomatis ditimpa dan tidak otomatis
  // di-seed agar perangkat baru tidak tanpa sengaja mengirim INITIAL_DATA.
  useEffect(() => {
    if (!activeSessionEmail) return;
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) return;

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setSyncBanner({ type: 'sync_error', message: 'Session Supabase tidak ditemukan. Silakan login ulang.' });
          return;
        }

        const kelasResult = await supabase.from('kelas').select('*');
        if (kelasResult.error) {
          setSyncBanner({ type: 'sync_error', message: `Gagal membaca tabel kelas: ${kelasResult.error.message}` });
          console.error('Supabase kelas SELECT:', kelasResult.error);
          return;
        }

        const siswaResult = await supabase.from('siswa').select('*');
        if (siswaResult.error) {
          setSyncBanner({ type: 'sync_error', message: `Gagal membaca tabel siswa: ${siswaResult.error.message}` });
          console.error('Supabase siswa SELECT:', siswaResult.error);
          return;
        }

        if ((kelasResult.data?.length ?? 0) > 0) setKelasList(kelasResult.data as Kelas[]);
        if ((siswaResult.data?.length ?? 0) > 0) {
          // Preserve every local ID -> NISN relationship before replacing local
          // master data with the canonical Supabase rows.
          setSiswaIdAliases((prev) => {
            const next = { ...prev };
            for (const local of siswaList) {
              if (local.id && local.nisn) next[local.id] = local.nisn;
            }
            for (const remote of siswaResult.data as Siswa[]) {
              if (remote.id && remote.nisn) next[remote.id] = remote.nisn;
            }
            return next;
          });
          setSiswaList(siswaResult.data as Siswa[]);
        }

        const kelasCount = kelasResult.data?.length ?? 0;
        const siswaCount = siswaResult.data?.length ?? 0;
        setSyncBanner({
          type: 'sync_success',
          message: `Terhubung ke Supabase. Master cloud: ${kelasCount} kelas, ${siswaCount} siswa.`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setSyncBanner({ type: 'sync_error', message: `Gagal memeriksa master Supabase: ${message}` });
        console.error('Master sync check:', err);
      }
    })();
  }, [activeSessionEmail, supabaseConfig.url, supabaseConfig.anonKey]);

  // Bersihkan payload berdasarkan primary key sebelum upsert.
  // PostgreSQL menolak satu statement upsert jika key yang sama muncul lebih dari sekali.
  // Jika ada duplikat, pertahankan data terakhir untuk ID tersebut.
  function dedupeRowsById<T extends { id: string }>(rows: T[]) {
    const byId = new Map<string, T>();
    const duplicateIds = new Set<string>();

    for (const row of rows) {
      const id = String(row.id ?? '').trim();
      if (!id) continue;
      if (byId.has(id)) duplicateIds.add(id);
      byId.set(id, row);
    }

    return {
      rows: Array.from(byId.values()),
      duplicateIds: Array.from(duplicateIds),
      invalidCount: rows.filter((row) => !String(row.id ?? '').trim()).length,
    };
  }

  // PENTING: database mewajibkan NISN unik per siswa (dipakai untuk QR/scan).
  // Kalau ada 2+ baris LOKAL yang kebetulan punya NISN sama (misal dari percobaan
  // import berulang sebelumnya), upsert berbasis ID saja TIDAK akan menangkap ini --
  // Postgres akan menolak seluruh batch dengan error "duplicate key ... nisn_key".
  // Fungsi ini membuang duplikat NISN, menyisakan data yang paling baru (created_at
  // terbaru, atau baris terakhir kalau created_at sama) untuk tiap NISN.
  function dedupeSiswaByNisn(rows: Siswa[]) {
    const byNisn = new Map<string, Siswa>();
    const duplicateNisn = new Set<string>();

    for (const row of rows) {
      const nisn = String(row.nisn ?? '').trim();
      if (!nisn) continue;
      if (byNisn.has(nisn)) duplicateNisn.add(nisn);
      byNisn.set(nisn, row);
    }

    return {
      rows: Array.from(byNisn.values()),
      duplicateNisn: Array.from(duplicateNisn),
      invalidCount: rows.filter((row) => !String(row.nisn ?? '').trim()).length,
    };
  }

  // Supabase tabel master memiliki kolom created_at NOT NULL.
  // Data lama/localStorage belum tentu memiliki kolom ini, dan nilai null
  // akan dikirim sebagai NULL sehingga INSERT/UPSERT ditolak PostgreSQL.
  // Isi created_at hanya jika belum ada; data created_at yang sudah ada
  // tetap dipertahankan.
  function ensureCreatedAt<T extends { id: string }>(rows: T[]) {
    const now = new Date().toISOString();
    return rows.map((row) => {
      const existing = (row as T & { created_at?: string | null }).created_at;
      return {
        ...row,
        created_at: existing || now,
      };
    });
  }

  function prepareSiswaForSupabase(rows: Siswa[]) {
    return rows.map((row) => {
      // Migrasi kompatibilitas: localStorage lama mungkin masih menyimpan
      // properti kode_barcode. Properti itu sengaja dibuang sebelum request ke DB.
      const legacy = row as Siswa & { kode_barcode?: string };
      const { kode_barcode: _legacyBarcode, ...cleanRow } = legacy;
      return cleanRow;
    });
  }

  // Migrasi master lokal -> Supabase secara eksplisit.
  // Urutan wajib: kelas dulu, baru siswa karena siswa.kelas_id adalah FK ke kelas.id.
  const syncMasterData = async (): Promise<{ success: boolean; message: string; kelas: number; siswa: number }> => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) {
      const message = 'Supabase belum dikonfigurasi.';
      setSyncBanner({ type: 'sync_error', message });
      return { success: false, message, kelas: 0, siswa: 0 };
    }

    setSyncBanner({ type: 'syncing', message: 'Memeriksa sesi dan mengirim master data...' });
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Gagal memeriksa session: ${sessionError.message}`);
      if (!sessionData.session) throw new Error('Session Supabase tidak aktif. Silakan logout lalu login kembali.');

      // Bersihkan duplicate primary key sebelum upsert.
      // Ini penting karena PostgreSQL menghasilkan: \"ON CONFLICT DO UPDATE command cannot affect row a second time\"
      // jika dua baris dalam satu batch memiliki ID yang sama.
      const kelasDeduped = dedupeRowsById<Kelas>(kelasList);
      const siswaDedupedById = dedupeRowsById<Siswa>(siswaList);
      // Lalu bersihkan juga duplikat NISN (lihat penjelasan di dedupeSiswaByNisn) --
      // ini yang menyebabkan error "duplicate key value violates unique constraint siswa_nisn_key"
      const siswaDedupedByNisn = dedupeSiswaByNisn(siswaDedupedById.rows);

      // PENTING: percobaan sinkronisasi sebelumnya (termasuk dari sesi ChatGPT) mungkin
      // sudah sempat memasukkan sebagian data ke Supabase dengan ID yang BEDA dari ID
      // lokal saat ini (misal karena re-import yang membuat ID baru). Kalau kita upsert
      // pakai onConflict "id" saja, baris ini dianggap "baris baru" dan bentrok dengan
      // constraint unik NISN/nama_kelas milik baris lama itu. Solusinya: cek dulu data
      // yang SUDAH ada di Supabase, lalu SAMAKAN id lokal dengan id remote-nya berdasarkan
      // kunci bisnis yang sesungguhnya (NISN untuk siswa, nama_kelas untuk kelas).
      const [{ data: remoteKelasRows, error: remoteKelasErr }, { data: remoteSiswaRows, error: remoteSiswaErr }] =
        await Promise.all([
          supabase.from('kelas').select('id, nama_kelas'),
          supabase.from('siswa').select('id, nisn'),
        ]);
      if (remoteKelasErr) throw new Error(`Gagal membaca kelas Supabase: ${remoteKelasErr.message}`);
      if (remoteSiswaErr) throw new Error(`Gagal membaca siswa Supabase: ${remoteSiswaErr.message}`);

      const remoteKelasIdByNama = new Map(
        (remoteKelasRows ?? []).map((r: { id: string; nama_kelas: string }) => [r.nama_kelas, r.id])
      );
      const remoteSiswaIdByNisn = new Map(
        (remoteSiswaRows ?? []).map((r: { id: string; nisn: string }) => [r.nisn, r.id])
      );

      // Keep historical local ID -> NISN aliases so pending attendance created
      // by older app versions can still be repaired after master IDs are reconciled.
      setSiswaIdAliases((prev) => {
        const next = { ...prev };
        for (const local of siswaList) {
          if (local.id && local.nisn) next[local.id] = local.nisn;
        }
        for (const remote of remoteSiswaRows ?? []) {
          if (remote.id && remote.nisn) next[remote.id] = remote.nisn;
        }
        return next;
      });

      // Peta id-lama -> id-baru, dipakai untuk membetulkan referensi kelas_id di siswa,
      // dan untuk membetulkan data lokal (siswaList/absensiList) setelah upload berhasil.
      const kelasIdRemap = new Map<string, string>();
      const kelasReconciled = kelasDeduped.rows.map((k) => {
        const remoteId = remoteKelasIdByNama.get(k.nama_kelas);
        if (remoteId && remoteId !== k.id) {
          kelasIdRemap.set(k.id, remoteId);
          return { ...k, id: remoteId };
        }
        return k;
      });

      const siswaIdRemap = new Map<string, string>();
      const siswaWithFixedKelasId = siswaDedupedByNisn.rows.map((s) => ({
        ...s,
        kelas_id: kelasIdRemap.get(s.kelas_id) || s.kelas_id,
      }));
      const siswaReconciled = siswaWithFixedKelasId.map((s) => {
        const remoteId = remoteSiswaIdByNisn.get(s.nisn);
        if (remoteId && remoteId !== s.id) {
          siswaIdRemap.set(s.id, remoteId);
          return { ...s, id: remoteId };
        }
        return s;
      });

      const kelasPrepared = { ...kelasDeduped, rows: ensureCreatedAt(kelasReconciled) };
      const siswaPrepared = {
        duplicateIds: [...siswaDedupedById.duplicateIds, ...siswaDedupedByNisn.duplicateNisn],
        invalidCount: siswaDedupedById.invalidCount + siswaDedupedByNisn.invalidCount,
        rows: ensureCreatedAt(prepareSiswaForSupabase(siswaReconciled)),
      };

      if (kelasPrepared.invalidCount > 0) {
        throw new Error(`Ditemukan ${kelasPrepared.invalidCount} data kelas tanpa ID. Periksa master kelas sebelum sinkronisasi.`);
      }
      if (siswaPrepared.invalidCount > 0) {
        throw new Error(`Ditemukan ${siswaPrepared.invalidCount} data siswa tanpa ID. Periksa master siswa sebelum sinkronisasi.`);
      }

      // Pastikan semua kelas tersedia sebelum siswa di-upsert.
      if (kelasPrepared.rows.length > 0) {
        const { error } = await supabase.from('kelas').upsert(kelasPrepared.rows, { onConflict: 'id' });
        if (error) throw new Error(`Upload kelas gagal: ${error.message}`);
      }

      if (siswaPrepared.rows.length > 0) {
        const { error } = await supabase.from('siswa').upsert(siswaPrepared.rows, { onConflict: 'id' });
        if (error) throw new Error(`Upload siswa gagal: ${error.message}`);
      }

      // Kalau ada ID yang disamakan (ikut ID remote), betulkan juga referensinya di
      // data lokal supaya absensi & tampilan lain tetap terhubung ke siswa yang benar.
      if (kelasIdRemap.size > 0 || siswaIdRemap.size > 0) {
        if (kelasIdRemap.size > 0) {
          setKelasList((prev) => prev.map((k) => ({ ...k, id: kelasIdRemap.get(k.id) || k.id })));
        }
        if (siswaIdRemap.size > 0 || kelasIdRemap.size > 0) {
          setSiswaList((prev) =>
            prev.map((s) => ({
              ...s,
              id: siswaIdRemap.get(s.id) || s.id,
              kelas_id: kelasIdRemap.get(s.kelas_id) || s.kelas_id,
            }))
          );
        }
        if (siswaIdRemap.size > 0) {
          setAbsensiList((prev) =>
            prev.map((a) => ({ ...a, siswa_id: siswaIdRemap.get(a.siswa_id) || a.siswa_id }))
          );
        }
      }

      const verifyKelas = await supabase.from('kelas').select('*');
      if (verifyKelas.error) throw new Error(`Verifikasi kelas gagal: ${verifyKelas.error.message}`);
      const verifySiswa = await supabase.from('siswa').select('*');
      if (verifySiswa.error) throw new Error(`Verifikasi siswa gagal: ${verifySiswa.error.message}`);

      const kelasCount = verifyKelas.data?.length ?? 0;
      const siswaCount = verifySiswa.data?.length ?? 0;
      setKelasList((verifyKelas.data ?? []) as Kelas[]);
      setSiswaList((verifySiswa.data ?? []) as Siswa[]);

      const duplicateSummary = [
        kelasPrepared.duplicateIds.length > 0
          ? `${kelasPrepared.duplicateIds.length} ID kelas duplikat dibersihkan`
          : '',
        siswaPrepared.duplicateIds.length > 0
          ? `${siswaPrepared.duplicateIds.length} ID siswa duplikat dibersihkan`
          : '',
      ].filter(Boolean).join('; ');

      const message = duplicateSummary
        ? `Sinkronisasi master berhasil: ${kelasCount} kelas dan ${siswaCount} siswa tersimpan di Supabase. ${duplicateSummary}.`
        : `Sinkronisasi master berhasil: ${kelasCount} kelas dan ${siswaCount} siswa tersimpan di Supabase.`;

      setSyncBanner({ type: 'sync_success', message });
      return { success: true, message, kelas: kelasCount, siswa: siswaCount };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSyncBanner({ type: 'sync_error', message });
      console.error('Master data sync:', err);
      return { success: false, message, kelas: 0, siswa: 0 };
    }
  };

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setRealClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute active current time string
  const currentActiveTimeStr = useMemo(() => {
    if (simulatedTime) return simulatedTime;
    const hh = String(realClock.getHours()).padStart(2, '0');
    const mm = String(realClock.getMinutes()).padStart(2, '0');
    const ss = String(realClock.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [simulatedTime, realClock]);

  const currentActiveDateStr = useMemo(() => {
    return getTodayDateString();
  }, []);

  // Today's complete holiday / effective day info
  const todayHariInfo: HariInfo = useMemo(() => {
    return getHariInfo(currentActiveDateStr, nationalHolidays, customSchoolDays, pengaturanJam);
  }, [currentActiveDateStr, nationalHolidays, customSchoolDays, pengaturanJam]);

  // All holidays and flags combined & sorted
  const allHolidaysAndFlags: HariKhusus[] = useMemo(() => {
    return [...nationalHolidays, ...customSchoolDays].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [nationalHolidays, customSchoolDays]);

  // Ambil pengaturan operasional dari Supabase saat sesi authenticated tersedia.
  // localStorage tetap menjadi fallback agar kiosk tetap dapat bekerja saat offline.
  useEffect(() => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey || !activeSessionEmail) return;
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('pengaturan_jam')
        .select('*')
        .eq('id', 'default_config')
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncBanner({ type: 'sync_error', message: `Gagal membaca pengaturan dari Supabase: ${error.message}` });
        return;
      }
      if (data) {
        setPengaturanJam((prev) => ({
          ...prev,
          jam_buka_pos: String(data.jam_buka_pos ?? prev.jam_buka_pos).slice(0, 5),
          batas_tepat_waktu: String(data.batas_tepat_waktu ?? prev.batas_tepat_waktu).slice(0, 5),
          batas_jam_masuk: String(data.batas_jam_masuk ?? prev.batas_jam_masuk).slice(0, 5),
          batas_jam_pulang: String(data.batas_jam_pulang ?? prev.batas_jam_pulang).slice(0, 5),
          batas_jam_pulang_jumat: String(data.batas_jam_pulang_jumat ?? prev.batas_jam_pulang_jumat).slice(0, 5),
          hari_aktif_sekolah: Array.isArray(data.hari_aktif_sekolah) ? data.hari_aktif_sekolah : prev.hari_aktif_sekolah,
          toleransi_duplikasi_menit: Number(data.toleransi_duplikasi_menit ?? prev.toleransi_duplikasi_menit),
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [supabaseConfig.url, supabaseConfig.anonKey, activeSessionEmail]);

  // Bersihkan data siswa UJICOBA lokal yang sudah tidak ada di Supabase.
  // Ini sengaja hanya menghapus data lokal yang NISN-nya tidak ditemukan di master
  // Supabase. Data di Supabase TIDAK disentuh. Tujuannya membuang siswa percobaan
  // lama beserta absensi/log lokalnya yang sekarang menjadi orphan FK.
  const cleanupLocalStudentsMissingInSupabase = async (): Promise<{
    siswaList: Siswa[];
    absensiList: Absensi[];
    logNotifikasiList: LogNotifikasiWA[];
    siswaIdAliases: Record<string, string>;
    removedCount: number;
  }> => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) {
      return { siswaList, absensiList, logNotifikasiList, siswaIdAliases, removedCount: 0 };
    }

    const { data: remoteRows, error } = await supabase.from('siswa').select('id,nisn');
    if (error || !remoteRows) {
      console.warn('Cleanup siswa lokal dilewati karena master Supabase tidak dapat dibaca:', error?.message);
      return { siswaList, absensiList, logNotifikasiList, siswaIdAliases, removedCount: 0 };
    }

    const remoteNisns = new Set(
      remoteRows.map((row: { id: string; nisn: string }) => String(row.nisn ?? '').trim()).filter(Boolean)
    );

    // Satu peta identitas untuk data lama: ID siswa saat ini + alias ID lama -> NISN.
    const nisnByStudentId = new Map<string, string>();
    for (const student of siswaList) {
      if (student.id && student.nisn) nisnByStudentId.set(String(student.id), String(student.nisn).trim());
    }
    for (const [id, nisn] of Object.entries(siswaIdAliases)) {
      if (id && nisn) nisnByStudentId.set(String(id), String(nisn).trim());
    }

    // Hanya siswa lokal yang punya NISN dan NISN tersebut benar-benar tidak ada
    // di master cloud yang dianggap siswa percobaan/orphan.
    const removableStudentIds = new Set<string>();
    for (const [id, nisn] of nisnByStudentId.entries()) {
      if (nisn && !remoteNisns.has(nisn)) removableStudentIds.add(id);
    }

    const nextSiswaList = siswaList.filter((student) => !removableStudentIds.has(String(student.id)));

    // Buang absensi lokal yang menunjuk ke siswa orphan. Ini penting karena absensi
    // tersebut pasti gagal FK jika dicoba dikirim ke Supabase.
    const removedAbsensiIds = new Set<string>();
    const nextAbsensiList = absensiList.filter((attendance) => {
      const studentNisn = nisnByStudentId.get(String(attendance.siswa_id));
      const shouldRemove = !!studentNisn && !remoteNisns.has(studentNisn);
      if (shouldRemove) removedAbsensiIds.add(String(attendance.id));
      return !shouldRemove;
    });

    // Log WA yang menunjuk ke absensi yang baru dibuang juga harus dibuang dari
    // localStorage agar tidak kembali memicu FK log_notifikasi_wa_absensi_id_fkey.
    const nextLogNotifikasiList = logNotifikasiList.filter(
      (log) => !removedAbsensiIds.has(String(log.absensi_id)) && !removableStudentIds.has(String(log.siswa_id))
    );

    const nextAliases = { ...siswaIdAliases };
    for (const id of removableStudentIds) delete nextAliases[id];

    if (removableStudentIds.size > 0 || removedAbsensiIds.size > 0 || nextLogNotifikasiList.length !== logNotifikasiList.length) {
      setSiswaList(nextSiswaList);
      setAbsensiList(nextAbsensiList);
      setLogNotifikasiList(nextLogNotifikasiList);
      setSiswaIdAliases(nextAliases);
      localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(nextSiswaList));
      localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(nextAbsensiList));
      localStorage.setItem(STORAGE_KEYS.LOG_WA, JSON.stringify(nextLogNotifikasiList));
      localStorage.setItem(STORAGE_KEYS.SISWA_ID_ALIASES, JSON.stringify(nextAliases));

      console.info(
        `Cleanup lokal: ${removableStudentIds.size} siswa, ${removedAbsensiIds.size} absensi, ` +
        `${logNotifikasiList.length - nextLogNotifikasiList.length} log WA dihapus karena NISN tidak ada di Supabase.`
      );
    }

    return {
      siswaList: nextSiswaList,
      absensiList: nextAbsensiList,
      logNotifikasiList: nextLogNotifikasiList,
      siswaIdAliases: nextAliases,
      removedCount: removableStudentIds.size,
    };
  };

  // Synchronization function
  const syncData = async (isAuto = false, attendanceOverride?: Absensi[], logOverride?: LogNotifikasiWA[]): Promise<{ success: boolean; count: number; message: string }> => {
    if (isSyncing) {
      return { success: false, count: 0, message: 'Proses sinkronisasi sedang berjalan...' };
    }

    setIsSyncing(true);
    try {
      // Sebelum sinkron, buang siswa ujicoba lokal yang NISN-nya sudah tidak ada
      // di master Supabase. Ini menghilangkan sumber utama error absensi_siswa_id_fkey.
      const cleaned = await cleanupLocalStudentsMissingInSupabase();
      const sourceAbsensi = attendanceOverride ?? cleaned.absensiList;
      const sourceLogs = logOverride ?? cleaned.logNotifikasiList;
      const sourceStudents = cleaned.siswaList;
      const sourceAliases = cleaned.siswaIdAliases;

      const { updatedAbsensiList, updatedLogNotifikasiList, result } = await processSyncToDatabase(
        sourceAbsensi,
        sourceLogs,
        supabaseConfig,
        isSimulatedOffline,
        [...sourceStudents.map((s) => ({ id: s.id, nisn: s.nisn })), ...Object.entries(sourceAliases).map(([id, nisn]) => ({ id, nisn }))]
      );

      if (result.success) {
        setAbsensiList(updatedAbsensiList);
        setLogNotifikasiList(updatedLogNotifikasiList);
        setLastSyncTime(result.timestamp);
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, result.timestamp);

        setSyncBanner({
          type: 'sync_success',
          message: result.syncedCount > 0
            ? `${result.message} (${result.timestamp})`
            : `Semua data (${absensiList.length} data) sudah tersinkron penuh dengan database (${result.timestamp}).`,
        });

        return { success: true, count: result.syncedCount, message: result.message };
      } else {
        setSyncBanner({
          type: 'sync_error',
          message: result.message,
        });
        return { success: false, count: 0, message: result.message };
      }
    } catch (err) {
      const errMsg = 'Gagal sinkronisasi data: ' + String(err);
      setSyncBanner({
        type: 'sync_error',
        message: errMsg,
      });
      return { success: false, count: 0, message: errMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  // Setelah sesi Supabase benar-benar tersedia (termasuk silent kiosk login),
  // segera coba kirim antrean presensi/log yang tertunda. Ini menutup race condition
  // saat scan terjadi ketika browser online tetapi Auth belum selesai login.
  useEffect(() => {
    if (!activeSessionEmail || isSimulatedOffline) return;
    const timer = window.setTimeout(() => {
      syncData(true);
    }, 500);
    return () => window.clearTimeout(timer);
    // syncData sengaja tidak dimasukkan ke dependency karena didefinisikan ulang
    // setiap render; trigger yang dibutuhkan di sini adalah perubahan sesi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionEmail, isSimulatedOffline]);

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, String(next));
      } catch {}
      if (next) {
        setSyncBanner({
          type: 'offline',
          message: 'Mode Simulasi Offline diaktifkan: Presensi akan disimpan di memori lokal perangkat.',
        });
      } else {
        setSyncBanner({
          type: 'online',
          message: 'Koneksi internet tersedia kembali. Memulai sinkronisasi otomatis ke database...',
        });
        setTimeout(() => {
          syncData(true);
        }, 800);
      }
      return next;
    });
  };

  const dismissSyncBanner = () => {
    setSyncBanner(null);
  };

  // Listen to browser network changes & auto-sync upon reconnection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isSimulatedOffline) {
        setSyncBanner({
          type: 'online',
          message: 'Koneksi internet terdeteksi pulih. Memulai sinkronisasi otomatis data presensi...',
        });
        setTimeout(() => {
          syncData(true);
        }, 1000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncBanner({
        type: 'offline',
        message: 'Koneksi internet terputus. Mode offline aktif — seluruh data scan tetap tersimpan aman di perangkat.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [absensiList, supabaseConfig, isSimulatedOffline]);

  // Auto-dismiss banner after 5 seconds
  useEffect(() => {
    if (!syncBanner) return;
    const t = setTimeout(() => {
      setSyncBanner(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [syncBanner]);

  // Compute recent scans
  const recentScans: RecentScanItem[] = useMemo(() => {
    const today = getTodayDateString();
    return absensiList
      .filter((a) => a.tanggal === today)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map((abs) => {
        const s = siswaList.find((item) => item.id === abs.siswa_id);
        const k = s ? kelasList.find((item) => item.id === s.kelas_id) : undefined;
        return {
          absensi: abs,
          siswa: s || {
            id: abs.siswa_id,
            nama: 'Siswa Tidak Ditemukan',
            nisn: '-',
            kelas_id: '',
            nomor_wa_ortu: '',
            nama_ortu: '',
            jenis_kelamin: 'L',
            foto_url: '',
            status_aktif: false,
          },
          kelas: k,
        };
      });
  }, [absensiList, siswaList, kelasList]);

  // CORE LOGIC: Process NISN Scan
  const processScanNisn = async (rawCode: string): Promise<ScanResult> => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) {
      soundManager.playError();
      const failResult: ScanResult = {
        success: false,
        message: 'Kode scan kosong. Harap arahkan scanner ke kartu pelajar.',
        waktu: currentActiveTimeStr,
      };
      setLastScanResult(failResult);
      return failResult;
    }

    // 1. Find student -- NISN adalah satu-satunya identitas QR/scan.
    const normalizedInput = cleanCode.toLowerCase();
    // NISN standar selalu 10 digit -- kalau scanner/alat lain membaca tanpa angka nol
    // di depan, kita tambahkan kembali sebelum dicocokkan supaya tidak gagal scan.
    const normalizedInputPadded = /^\d+$/.test(normalizedInput)
      ? normalizedInput.padStart(10, '0')
      : normalizedInput;

    const student = siswaList.find(
      (s) =>
        s.nisn.toLowerCase() === normalizedInput ||
        s.nisn.toLowerCase() === normalizedInputPadded
    );

    if (!student) {
      soundManager.playError();
      const failResult: ScanResult = {
        success: false,
        message: `NISN "${cleanCode}" tidak terdaftar di sistem!`,
        waktu: currentActiveTimeStr,
      };
      setLastScanResult(failResult);
      return failResult;
    }

    // Tolak scan untuk siswa yang sudah ditandai nonaktif (lulus/pindah sekolah/keluar) --
    // penting supaya alumni tidak ikut tercatat & memicu notifikasi WA ke orang tua.
    if (!student.status_aktif) {
      soundManager.playError();
      const failResult: ScanResult = {
        success: false,
        siswa: student,
        message: `${student.nama} berstatus NONAKTIF (lulus/pindah). Absensi tidak dicatat.`,
        waktu: currentActiveTimeStr,
      };
      setLastScanResult(failResult);
      return failResult;
    }

    const studentClass = kelasList.find((k) => k.id === student.kelas_id);
    const today = getTodayDateString();
    const nowTimeStr = currentActiveTimeStr;
    const nowTimestamp = Date.now();

    // 2. Anti-duplication check:
    // Check if the student already scanned within `toleransi_duplikasi_menit`
    const toleranceMs = (pengaturanJam.toleransi_duplikasi_menit || 5) * 60 * 1000;
    const existingRecentScan = absensiList.find((a) => {
      if (a.siswa_id !== student.id || a.tanggal !== today) return false;
      // Compare timestamp difference
      const diff = Math.abs(nowTimestamp - a.timestamp);
      return diff < toleranceMs;
    });

    if (existingRecentScan) {
      soundManager.playDuplicateWarning();
      const duplicateResult: ScanResult = {
        success: false,
        isDuplicate: true,
        duplicatePreviousScanTime: existingRecentScan.waktu_scan,
        siswa: student,
        kelas: studentClass,
        jenis: existingRecentScan.jenis,
        status: existingRecentScan.status,
        message: `Peringatan: ${student.nama} sudah tercatat ${existingRecentScan.jenis.toUpperCase()} pukul ${existingRecentScan.waktu_scan.substring(0, 5)} WIB (< ${pengaturanJam.toleransi_duplikasi_menit} menit yang lalu).`,
        waktu: nowTimeStr,
      };
      setLastScanResult(duplicateResult);
      return duplicateResult;
    }

    // 3. Automatic Detection of attendance type (Masuk vs Pulang)
    // Rule:
    // - Check dynamic holiday & school flag for today (Hari Libur / Pulang Cepat / Jumat)
    // - If flagged with 'pulang_cepat', use custom departure cutoff (e.g. 10:30)
    // - If Friday, use Friday cutoff (e.g. 11:30)
    // - Otherwise, use regular cutoff (e.g. 14:00)
    let jenis: JenisAbsensi = 'masuk';
    let status: StatusAbsensi = 'tepat_waktu';
    let catatan: string | undefined = undefined;

    const currentDayOfWeek = new Date().getDay(); // 0: Sunday, ..., 5: Friday, 6: Saturday
    const isFridayToday = currentDayOfWeek === 5;
    const todayInfo = getHariInfo(today, nationalHolidays, customSchoolDays, pengaturanJam);
    const effectiveBatasPulangStr = (todayInfo.jamPulangEfektif || '14:00') + ':00';
    const batasTepatWaktu = (pengaturanJam.batas_tepat_waktu || '07:15') + ':00';

    if (nowTimeStr >= effectiveBatasPulangStr) {
      jenis = 'pulang';
      status = 'tepat_waktu';
      if (todayInfo.isPulangCepat) {
        catatan = `Absensi Kepulangan (Hari Pulang Cepat: ${todayInfo.jamPulangEfektif} WIB)`;
      } else if (isFridayToday) {
        catatan = 'Absensi Kepulangan (Khusus Hari Jumat)';
      } else {
        catatan = 'Absensi Kepulangan';
      }
    } else {
      jenis = 'masuk';
      if (nowTimeStr > batasTepatWaktu) {
        status = 'terlambat';
        // Calculate late minutes
        const [hNow, mNow] = nowTimeStr.split(':').map(Number);
        const [hBatas, mBatas] = batasTepatWaktu.split(':').map(Number);
        const diffMinutes = Math.max(1, (hNow * 60 + mNow) - (hBatas * 60 + mBatas));
        catatan = `Terlambat ${diffMinutes} menit (Batas: ${pengaturanJam.batas_tepat_waktu})`;
      } else {
        status = 'tepat_waktu';
        catatan = 'Kedatangan Tepat Waktu';
      }
    }

    if (!todayInfo.isHariEfektif) {
      catatan = `${catatan ? catatan + ' | ' : ''}Catatan: Presensi pada ${todayInfo.catatanStatus}`;
    }

    // 4. Create Absensi record
    const isOnlineNow = effectiveOnline;
    const newAbsensi: Absensi = {
      id: 'abs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      siswa_id: student.id,
      tanggal: today,
      waktu_scan: nowTimeStr,
      timestamp: nowTimestamp,
      jenis,
      status,
      catatan,
      // ONLINE tidak sama dengan SUDAH TERSIMPAN DI SUPABASE.
      // Status baru menjadi true setelah Supabase mengembalikan success.
      synced: false,
      synced_at: undefined,
    };

    // 5. Sound trigger
    if (status === 'terlambat') {
      soundManager.playLate();
    } else if (jenis === 'pulang') {
      soundManager.playPulang();
    } else {
      soundManager.playSuccess();
    }

    // 6. Update attendance state. The record starts as PENDING regardless of
    // browser connectivity. Only a successful Supabase response may mark it synced.
    const nextAbsensiList = [newAbsensi, ...absensiList];
    setAbsensiList(nextAbsensiList);

    // 7. Try to persist the attendance immediately when online. We pass the new
    // snapshot explicitly so this does not depend on React state having re-rendered.
    let absensiForNotification = newAbsensi;

    if (isOnlineNow) {
      const syncResult = await processSyncToDatabase(
        nextAbsensiList,
        logNotifikasiList,
        supabaseConfig,
        isSimulatedOffline,
        [...siswaList.map((s) => ({ id: s.id, nisn: s.nisn })), ...Object.entries(siswaIdAliases).map(([id, nisn]) => ({ id, nisn }))]
      );
      if (syncResult.result.success) {
        setAbsensiList(syncResult.updatedAbsensiList);
        setLogNotifikasiList(syncResult.updatedLogNotifikasiList);
        setLastSyncTime(syncResult.result.timestamp);
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, syncResult.result.timestamp);

        // processSyncToDatabase may reconcile the local generated ID with an
        // existing Supabase absensi.id. Use that canonical ID for the WA log.
        absensiForNotification =
          syncResult.updatedAbsensiList.find(
            (a) =>
              a.siswa_id === newAbsensi.siswa_id &&
              a.tanggal === newAbsensi.tanggal &&
              a.jenis === newAbsensi.jenis &&
              a.synced
          ) || newAbsensi;
      } else {
        console.warn('Presensi disimpan lokal, sinkronisasi awal gagal:', syncResult.result.message);
      }
    }

    // 8. Send/queue WhatsApp notification. The returned log is the source of truth:
    // `terkirim` is used only when the Edge Function/gateway actually reports success.
    if (!isOnlineNow) {
      const offlineWALog: LogNotifikasiWA = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        absensi_id: absensiForNotification.id,
        siswa_id: student.id,
        nomor_tujuan: student.nomor_wa_ortu,
        jenis_pesan: status === 'terlambat' ? 'terlambat' : jenis,
        pesan: `Presensi ${student.nama} (${studentClass?.nama_kelas || '-'}) tercatat ${status === 'terlambat' ? 'TERLAMBAT' : 'TEPAT WAKTU'} pukul ${nowTimeStr.substring(0, 5)} WIB.`,
        status_kirim: 'pending',
        waktu_kirim: new Date().toISOString(),
        response_payload: 'Disimpan offline. Menunggu koneksi untuk pengiriman WhatsApp.',
      };
      const nextLogs = [offlineWALog, ...logNotifikasiList];
      setLogNotifikasiList(nextLogs);

      // Save the pending log to Supabase if connectivity/auth happens to be available.
      // This never changes its status to "terkirim".
      if (getSupabaseClient(supabaseConfig)) {
        const logSync = await processSyncToDatabase(
          nextAbsensiList,
          nextLogs,
          supabaseConfig,
          false,
          [...siswaList.map((s) => ({ id: s.id, nisn: s.nisn })), ...Object.entries(siswaIdAliases).map(([id, nisn]) => ({ id, nisn }))]
        );
        if (logSync.result.success) {
          setAbsensiList(logSync.updatedAbsensiList);
          setLogNotifikasiList(logSync.updatedLogNotifikasiList);
        }
      }
    } else {
      const logEntry = await sendWhatsAppNotification(
        waConfig,
        student,
        studentClass,
        absensiForNotification,
        getSupabaseClient(supabaseConfig)
      );
      setLogNotifikasiList((prev) => [logEntry, ...prev]);

      // Persist the exact gateway result. A failed/simulated log remains locally
      // available for diagnosis and can be retried explicitly later.
      const supabase = getSupabaseClient(supabaseConfig);
      if (supabase && absensiForNotification.synced) {
        const { error: logError } = await supabase.from('log_notifikasi_wa').upsert({
          id: logEntry.id,
          absensi_id: logEntry.absensi_id || null,
          siswa_id: logEntry.siswa_id || null,
          nomor_tujuan: logEntry.nomor_tujuan,
          jenis_pesan: logEntry.jenis_pesan,
          pesan: logEntry.pesan,
          status_kirim: logEntry.status_kirim,
          waktu_kirim: logEntry.waktu_kirim,
          response_payload: logEntry.response_payload || null,
        }, { onConflict: 'id' });
        if (logError) {
          console.error('Gagal menyimpan log WA ke Supabase:', logError);
          setSyncBanner({ type: 'sync_error', message: `WA tercatat lokal, tetapi log gagal disimpan ke Supabase: ${logError.message}` });
        }
      } else if (supabase && !absensiForNotification.synced) {
        // Attendance is still local/pending. Do not attempt the WA-log INSERT yet
        // because log_notifikasi_wa.absensi_id is an FK to absensi.id. The next
        // sync will upload attendance first, resolve the canonical ID, then upload
        // this log.
        setSyncBanner({
          type: 'sync_error',
          message: 'WA tercatat lokal. Log WA menunggu absensi berhasil tersinkron ke Supabase.',
        });
      }
    }

    // 8. Set last scan result for instant feedback
    const successResult: ScanResult = {
      success: true,
      siswa: student,
      kelas: studentClass,
      jenis,
      status,
      message:
        jenis === 'pulang'
          ? `Absensi Kepulangan Berhasil Tercatat`
          : status === 'terlambat'
          ? `Absensi Masuk Tercatat: TERLAMBAT`
          : `Absensi Masuk Berhasil: TEPAT WAKTU`,
      waktu: nowTimeStr,
      isOfflineSaved: !isOnlineNow,
    };

    setLastScanResult(successResult);
    return successResult;
  };

  const clearLastScanResult = () => {
    setLastScanResult(null);
  };

  // CRUD Siswa
  // Helper CRUD tetap fire-and-forget; kegagalan juga diteruskan ke banner agar tidak tersembunyi di console.
  // Tidak memblokir UI -- kalau gagal (misal sedang offline), perubahan tetap tersimpan
  // lokal dan akan tersinkron lagi saat fetch berikutnya berhasil terhubung.
  const pushSiswaUpsert = (rows: Siswa[]) => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase || rows.length === 0) return;
    const prepared = prepareSiswaForSupabase(dedupeRowsById(rows).rows);
    supabase
      .from('siswa')
      .upsert(ensureCreatedAt(prepared), { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          setSyncBanner({ type: 'sync_error', message: `Gagal menyinkronkan siswa: ${error.message}` });
          console.error('Gagal menyinkronkan data siswa ke Supabase:', error);
        }
      });
  };

  const deleteSiswaRemote = (id: string) => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) return;
    supabase
      .from('siswa')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          setSyncBanner({ type: 'sync_error', message: `Gagal menghapus siswa: ${error.message}` });
          console.error('Gagal menghapus data siswa di Supabase:', error);
        }
      });
  };

  const pushKelasUpsert = (rows: Kelas[]) => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase || rows.length === 0) return;
    supabase
      .from('kelas')
      .upsert(ensureCreatedAt(dedupeRowsById(rows).rows), { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          setSyncBanner({ type: 'sync_error', message: `Gagal menyinkronkan kelas: ${error.message}` });
          console.error('Gagal menyinkronkan data kelas ke Supabase:', error);
        }
      });
  };

  const deleteKelasRemote = (id: string) => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) return;
    supabase
      .from('kelas')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          setSyncBanner({ type: 'sync_error', message: `Gagal menghapus kelas: ${error.message}` });
          console.error('Gagal menghapus data kelas di Supabase:', error);
        }
      });
  };

  const addSiswa = (data: Omit<Siswa, 'id'>) => {
    const newSiswa: Siswa = {
      ...data,
      id: 's-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    };
    setSiswaList((prev) => [...prev, newSiswa]);
    pushSiswaUpsert([newSiswa]);
  };

  const importSiswaBatch = (
    newStudents: Omit<Siswa, 'id'>[],
    mode: 'append' | 'replace' = 'append'
  ) => {
    let added = 0;
    let updated = 0;

    if (mode === 'replace') {
      const generated: Siswa[] = newStudents.map((item, idx) => ({
        ...item,
        id: `s-${Date.now()}-${idx}`,
      }));
      setSiswaList(generated);
      pushSiswaUpsert(generated);
      return { added: generated.length, updated: 0 };
    }

    let finalList: Siswa[] = [];
    setSiswaList((prev) => {
      const updatedList = [...prev];
      newStudents.forEach((newS, idx) => {
        const existingIdx = updatedList.findIndex(
          (curr) => curr.nisn && curr.nisn === newS.nisn
        );

        if (existingIdx !== -1) {
          // update existing
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            ...newS,
          };
          updated++;
        } else {
          // add new
          updatedList.push({
            ...newS,
            id: `s-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          });
          added++;
        }
      });
      finalList = updatedList;
      return updatedList;
    });

    // Dorong seluruh daftar terbaru ke Supabase (upsert aman dipanggil berulang)
    pushSiswaUpsert(finalList);

    return { added, updated };
  };

  const updateSiswa = (id: string, data: Partial<Siswa>) => {
    let updatedRow: Siswa | undefined;
    setSiswaList((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          updatedRow = { ...s, ...data };
          return updatedRow;
        }
        return s;
      })
    );
    if (updatedRow) pushSiswaUpsert([updatedRow]);
  };

  const deleteSiswa = (id: string) => {
    setSiswaList((prev) => prev.filter((s) => s.id !== id));
    deleteSiswaRemote(id);
  };

  // CRUD Kelas
  const addKelas = (data: Omit<Kelas, 'id'>) => {
    const newKelas: Kelas = {
      ...data,
      id: 'k-' + Date.now(),
    };
    setKelasList((prev) => [...prev, newKelas]);
    pushKelasUpsert([newKelas]);
  };

  const updateKelas = (id: string, data: Partial<Kelas>) => {
    let updatedRow: Kelas | undefined;
    setKelasList((prev) =>
      prev.map((k) => {
        if (k.id === id) {
          updatedRow = { ...k, ...data };
          return updatedRow;
        }
        return k;
      })
    );
    if (updatedRow) pushKelasUpsert([updatedRow]);
  };

  const deleteKelas = (id: string) => {
    setKelasList((prev) => prev.filter((k) => k.id !== id));
    deleteKelasRemote(id);
  };

  // Settings
  const updatePengaturanJam = (data: Partial<PengaturanJam>) => {
    const next = { ...pengaturanJam, ...data };
    setPengaturanJam(next);
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase || !activeSessionEmail) return;
    supabase.from('pengaturan_jam').upsert({
      id: 'default_config',
      jam_buka_pos: next.jam_buka_pos,
      batas_tepat_waktu: next.batas_tepat_waktu,
      batas_jam_masuk: next.batas_jam_masuk,
      batas_jam_pulang: next.batas_jam_pulang,
      batas_jam_pulang_jumat: next.batas_jam_pulang_jumat,
      hari_aktif_sekolah: next.hari_aktif_sekolah,
      toleransi_duplikasi_menit: next.toleransi_duplikasi_menit,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).then(({ error }) => {
      if (error) setSyncBanner({ type: 'sync_error', message: `Gagal menyimpan pengaturan ke Supabase: ${error.message}` });
    });
  };

  const updateWAConfig = (data: Partial<WAGatewayConfig>) => {
    setWaConfig((prev) => ({ ...prev, ...data }));
  };

  const updateSupabaseConfig = (data: Partial<SupabaseConfig>) => {
    resetSupabaseClient();
    setSupabaseConfig((prev) => ({ ...prev, ...data, connected: Boolean((data.url ?? prev.url) && (data.anonKey ?? prev.anonKey)) }));
    setSyncBanner({ type: 'syncing', message: 'Konfigurasi Supabase diperbarui. Memeriksa koneksi...' });
  };

  const deleteAbsensi = (id: string) => {
    setAbsensiList((prev) => prev.filter((a) => a.id !== id));
  };

  const resetTodayAttendance = () => {
    const today = getTodayDateString();
    setAbsensiList((prev) => prev.filter((a) => a.tanggal !== today));
    setLastScanResult(null);
  };

  const reloadInitialData = () => {
    setSiswaList(INITIAL_SISWA);
    setKelasList(INITIAL_KELAS);
    setAbsensiList(getInitialAttendance());
    setPengaturanJam(INITIAL_PENGATURAN_JAM);
    setWaConfig(DEFAULT_WA_CONFIG);
  };

  // Backup & Restore Engine
  const getBackupPayload = (): AppBackupPayload => {
    return {
      version: '2.0',
      timestamp: new Date().toISOString(),
      app: 'Sistem Presensi QR/NISN & WhatsApp Gateway',
      sekolah: 'SMP NEGERI 9 BANJAR',
      stats: {
        total_siswa: siswaList.length,
        total_kelas: kelasList.length,
        total_absensi: absensiList.length,
        total_log_wa: logNotifikasiList.length,
        total_hari_khusus: customSchoolDays.length,
      },
      data: {
        siswa: siswaList,
        kelas: kelasList,
        absensi: absensiList,
        log_notifikasi: logNotifikasiList,
        pengaturan_jam: pengaturanJam,
        wa_config: waConfig,
        supabase_config: supabaseConfig,
        hari_khusus: customSchoolDays,
      },
    };
  };

  const restoreBackupData = (
    payload: AppBackupPayload,
    mode: 'replace' | 'merge'
  ): { success: boolean; message: string; counts: { siswa: number; kelas: number; absensi: number } } => {
    try {
      if (!payload || !payload.data) {
        return {
          success: false,
          message: 'Format file cadangan tidak valid atau data kosong.',
          counts: { siswa: 0, kelas: 0, absensi: 0 },
        };
      }

      const incomingSiswa = payload.data.siswa || [];
      const incomingKelas = payload.data.kelas || [];
      const incomingAbsensi = payload.data.absensi || [];
      const incomingLog = payload.data.log_notifikasi || [];
      const incomingHariKhusus = payload.data.hari_khusus;

      if (mode === 'replace') {
        setSiswaList(incomingSiswa);
        setKelasList(incomingKelas);
        setAbsensiList(incomingAbsensi);
        setLogNotifikasiList(incomingLog);
        if (incomingHariKhusus) setCustomSchoolDays(incomingHariKhusus);
        if (payload.data.pengaturan_jam) setPengaturanJam(payload.data.pengaturan_jam);
        if (payload.data.wa_config) setWaConfig(payload.data.wa_config);
        if (payload.data.supabase_config) setSupabaseConfig(payload.data.supabase_config);

        return {
          success: true,
          message: 'Seluruh data berhasil dipulihkan secara penuh (mode timpa).',
          counts: {
            siswa: incomingSiswa.length,
            kelas: incomingKelas.length,
            absensi: incomingAbsensi.length,
          },
        };
      } else {
        // Mode merge
        const existingSiswaIds = new Set(siswaList.map((s) => s.id));
        const mergedSiswa = [...siswaList];
        let addedSiswa = 0;
        incomingSiswa.forEach((s) => {
          if (!existingSiswaIds.has(s.id)) {
            mergedSiswa.push(s);
            existingSiswaIds.add(s.id);
            addedSiswa++;
          }
        });
        setSiswaList(mergedSiswa);

        const existingKelasIds = new Set(kelasList.map((k) => k.id));
        const mergedKelas = [...kelasList];
        let addedKelas = 0;
        incomingKelas.forEach((k) => {
          if (!existingKelasIds.has(k.id)) {
            mergedKelas.push(k);
            existingKelasIds.add(k.id);
            addedKelas++;
          }
        });
        setKelasList(mergedKelas);

        const existingAbsensiIds = new Set(absensiList.map((a) => a.id));
        const mergedAbsensi = [...absensiList];
        let addedAbsensi = 0;
        incomingAbsensi.forEach((a) => {
          if (!existingAbsensiIds.has(a.id)) {
            mergedAbsensi.push(a);
            existingAbsensiIds.add(a.id);
            addedAbsensi++;
          }
        });
        setAbsensiList(mergedAbsensi);

        const existingLogIds = new Set(logNotifikasiList.map((l) => l.id));
        const mergedLog = [...logNotifikasiList];
        incomingLog.forEach((l) => {
          if (!existingLogIds.has(l.id)) {
            mergedLog.push(l);
            existingLogIds.add(l.id);
          }
        });
        setLogNotifikasiList(mergedLog);

        if (incomingHariKhusus && Array.isArray(incomingHariKhusus)) {
          const existingDates = new Set(customSchoolDays.map((d) => d.tanggal));
          const mergedHolidays = [...customSchoolDays];
          incomingHariKhusus.forEach((h) => {
            if (!existingDates.has(h.tanggal)) {
              mergedHolidays.push(h);
              existingDates.add(h.tanggal);
            }
          });
          setCustomSchoolDays(mergedHolidays.sort((a, b) => a.tanggal.localeCompare(b.tanggal)));
        }

        return {
          success: true,
          message: `Penggabungan berhasil: +${addedSiswa} siswa baru, +${addedKelas} kelas baru, +${addedAbsensi} data absensi.`,
          counts: {
            siswa: mergedSiswa.length,
            kelas: mergedKelas.length,
            absensi: mergedAbsensi.length,
          },
        };
      }
    } catch (err) {
      console.error('Restore error:', err);
      return {
        success: false,
        message: 'Gagal memulihkan cadangan: ' + String(err),
        counts: { siswa: 0, kelas: 0, absensi: 0 },
      };
    }
  };

  const createLocalSnapshot = (label?: string) => {
    const payload = getBackupPayload();
    const newSnapshot: LocalSnapshot = {
      id: 'snap-' + Date.now(),
      timestamp: new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      label: label || `Snapshot ${new Date().toLocaleDateString('id-ID')} (${payload.stats.total_siswa} siswa)`,
      stats: {
        total_siswa: payload.stats.total_siswa,
        total_kelas: payload.stats.total_kelas,
        total_absensi: payload.stats.total_absensi,
      },
      payload,
    };
    setLocalSnapshots((prev) => [newSnapshot, ...prev.slice(0, 9)]);
  };

  const restoreLocalSnapshot = (snapshotId: string): boolean => {
    const target = localSnapshots.find((s) => s.id === snapshotId);
    if (!target) return false;
    const res = restoreBackupData(target.payload, 'replace');
    return res.success;
  };

  const deleteLocalSnapshot = (snapshotId: string) => {
    setLocalSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  };

  // Profil Sekolah & Custom Logo
  const updateProfilSekolah = (update: Partial<ProfilSekolah>) => {
    setProfilSekolah((prev) => ({ ...prev, ...update }));
  };

  const setCustomSchoolLogo = (logoDataUrl: string | null) => {
    setProfilSekolah((prev) => ({ ...prev, customLogoUrl: logoDataUrl }));
  };

  const setCustomCityLogo = (logoDataUrl: string | null) => {
    setProfilSekolah((prev) => ({ ...prev, customLogoKotaUrl: logoDataUrl }));
  };

  // Super Admin Check: Only user 'agus' has Super Admin privileges
  const isSuperAdmin = currentUser?.username?.toLowerCase() === 'agus';

  // Multi-user authentication -- sekarang benar-benar diverifikasi server lewat Supabase Auth
  const loginUser = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPass = password;

    const targetUser = users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (!targetUser) {
      return { success: false, message: `Pengguna dengan username "${username}" tidak ditemukan.` };
    }
    if (!targetUser.email) {
      return {
        success: false,
        message: 'Akun ini belum diatur emailnya. Hubungi Super Admin untuk melengkapi data akun.',
      };
    }

    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase belum dikonfigurasi. Login memerlukan koneksi Supabase yang aktif.',
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetUser.email,
      password: cleanPass,
    });

    if (error || !data.session) {
      return { success: false, message: 'Kata sandi salah atau akun belum terdaftar di Supabase Auth.' };
    }

    const updatedUser = {
      ...targetUser,
      lastLogin: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    };
    setCurrentUser(updatedUser);
    setIsAdminLoggedIn(true);
    setUsers((prev) =>
      prev.map((u) => (u.username.toLowerCase() === cleanUsername ? updatedUser : u))
    );

    return { success: true, message: `Selamat datang, ${targetUser.name}!` };
  };

  const logoutUser = () => {
    const supabase = getSupabaseClient(supabaseConfig);
    supabase?.auth.signOut();
    setCurrentUser(null);
    setIsAdminLoggedIn(false);
  };

  const changeUserPassword = async (
    username: string,
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanNew = newPass.trim();
    if (!cleanNew || cleanNew.length < 6) {
      return { success: false, message: 'Kata sandi baru minimal 6 karakter (syarat Supabase Auth).' };
    }

    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) {
      return { success: false, message: 'Supabase belum dikonfigurasi.' };
    }

    // Supabase Auth hanya mengizinkan pengguna mengganti password AKUN DIRI SENDIRI
    // yang sedang login (butuh sesi aktif) -- tidak bisa dilakukan atas nama pengguna lain
    // dari sisi aplikasi seperti dulu, karena itu perlu Service Role Key yang tidak boleh
    // ada di browser. Verifikasi dulu dengan kata sandi lama sebelum mengganti.
    const targetUser = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!targetUser?.email) {
      return { success: false, message: 'Akun tidak ditemukan atau belum diatur emailnya.' };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: targetUser.email,
      password: oldPass.trim(),
    });
    if (verifyError) {
      return { success: false, message: 'Kata sandi lama tidak sesuai.' };
    }

    const { error } = await supabase.auth.updateUser({ password: cleanNew });
    if (error) {
      return { success: false, message: `Gagal mengubah kata sandi: ${error.message}` };
    }

    return { success: true, message: 'Kata sandi berhasil diperbarui!' };
  };

  // CATATAN PENTING: Super Admin TIDAK LAGI bisa mereset password pengguna lain
  // langsung dari aplikasi ini -- Supabase Auth mewajibkan itu dilakukan lewat
  // Supabase Dashboard (Authentication > Users > pilih user > Reset Password),
  // atau lewat Edge Function terpisah yang memakai Service Role Key di server.
  // Fungsi di bawah ini sengaja dinonaktifkan (bukan dihapus) supaya UI yang
  // memanggilnya tidak error, dan mengarahkan Super Admin ke cara yang benar.
  const adminResetUserPassword = (
    username: string,
    _newPass: string
  ): { success: boolean; message: string } => {
    return {
      success: false,
      message:
        'Reset password pengguna lain sekarang dilakukan lewat Supabase Dashboard > Authentication > Users, bukan dari aplikasi ini (demi keamanan).',
    };
  };

  // Only Super Admin 'agus' is permitted to add new users
  const addUser = (newUser: Omit<UserAccount, 'id'>): { success: boolean; message: string } => {
    if (currentUser?.username?.toLowerCase() !== 'agus') {
      return {
        success: false,
        message: 'Akses Ditolak! Hanya Super Admin (Bpk. Agus Sugiharto Sapari) yang berhak menambah akun pengguna baru.',
      };
    }

    const cleanUsername = newUser.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      return { success: false, message: 'Username tidak valid (hanya huruf, angka, dan garis bawah).' };
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: `Username "@${cleanUsername}" sudah digunakan.` };
    }

    const cleanEmail = newUser.email?.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return {
        success: false,
        message: 'Email wajib diisi dan valid. PENTING: akun dengan email ini harus SUDAH dibuat lebih dulu di Supabase Dashboard > Authentication > Users, sebelum didaftarkan di sini.',
      };
    }
    if (users.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      return { success: false, message: `Email "${cleanEmail}" sudah dipakai akun lain.` };
    }

    const createdUser: UserAccount = {
      ...newUser,
      id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      username: cleanUsername,
      email: cleanEmail,
      isSuperAdmin: false,
      avatar: newUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    };

    setUsers((prev) => [...prev, createdUser]);
    return {
      success: true,
      message: `Profil @${cleanUsername} (${createdUser.name}) berhasil didaftarkan. Pastikan akun dengan email ${cleanEmail} sudah dibuat di Supabase Auth agar bisa login.`,
    };
  };

  // Only Super Admin 'agus' is permitted to delete users (and cannot delete 'agus')
  const deleteUser = (userIdOrUsername: string): { success: boolean; message: string } => {
    if (currentUser?.username?.toLowerCase() !== 'agus') {
      return {
        success: false,
        message: 'Akses Ditolak! Hanya Super Admin (Bpk. Agus Sugiharto Sapari) yang berhak menghapus akun pengguna.',
      };
    }

    const target = users.find(
      (u) => u.id === userIdOrUsername || u.username.toLowerCase() === userIdOrUsername.toLowerCase()
    );
    if (!target) {
      return { success: false, message: 'Akun pengguna tidak ditemukan.' };
    }

    if (target.username.toLowerCase() === 'agus') {
      return { success: false, message: 'Akun Super Admin (@agus) adalah akun induk sistem dan tidak dapat dihapus.' };
    }

    setUsers((prev) => prev.filter((u) => u.id !== target.id));
    return { success: true, message: `Akun @${target.username} (${target.name}) berhasil dihapus.` };
  };

  // Holiday and Special Day Operations
  const addCustomSchoolDay = (item: Omit<HariKhusus, 'id' | 'sumber'>): { success: boolean; message: string } => {
    if (!item.tanggal || !item.nama.trim()) {
      return { success: false, message: 'Tanggal dan nama hari khusus wajib diisi.' };
    }
    const cleanDate = item.tanggal.trim();
    const existingIndex = customSchoolDays.findIndex((d) => d.tanggal === cleanDate);
    const newEntry: HariKhusus = {
      ...item,
      id: 'custom-' + cleanDate + '-' + Math.random().toString(36).substring(2, 6),
      sumber: 'sekolah',
      nama: item.nama.trim(),
      keterangan: item.keterangan?.trim() || undefined,
      jamPulangKustom: item.kategori === 'pulang_cepat' ? (item.jamPulangKustom || '10:30') : undefined,
    };

    if (existingIndex >= 0) {
      const updated = [...customSchoolDays];
      updated[existingIndex] = newEntry;
      setCustomSchoolDays(updated.sort((a, b) => a.tanggal.localeCompare(b.tanggal)));
      return { success: true, message: `Hari khusus tanggal ${cleanDate} diperbarui menjadi "${newEntry.nama}".` };
    } else {
      setCustomSchoolDays((prev) => [...prev, newEntry].sort((a, b) => a.tanggal.localeCompare(b.tanggal)));
      return { success: true, message: `Hari khusus "${newEntry.nama}" tanggal ${cleanDate} berhasil ditandai.` };
    }
  };

  const updateCustomSchoolDay = (id: string, update: Partial<HariKhusus>): { success: boolean; message: string } => {
    const idx = customSchoolDays.findIndex((d) => d.id === id);
    if (idx === -1) {
      return { success: false, message: 'Data hari khusus tidak ditemukan.' };
    }
    const updated = [...customSchoolDays];
    updated[idx] = {
      ...updated[idx],
      ...update,
      sumber: 'sekolah',
    };
    setCustomSchoolDays(updated.sort((a, b) => a.tanggal.localeCompare(b.tanggal)));
    return { success: true, message: 'Perubahan hari khusus berhasil disimpan.' };
  };

  const deleteCustomSchoolDay = (id: string): { success: boolean; message: string } => {
    const target = customSchoolDays.find((d) => d.id === id);
    if (!target) {
      return { success: false, message: 'Data tidak ditemukan.' };
    }
    setCustomSchoolDays((prev) => prev.filter((d) => d.id !== id));
    return { success: true, message: `Penanda hari khusus "${target.nama}" (${target.tanggal}) berhasil dihapus.` };
  };

  const addNationalHoliday = (item: Omit<HariKhusus, 'id' | 'sumber'>): { success: boolean; message: string } => {
    if (!item.tanggal || !item.nama.trim()) {
      return { success: false, message: 'Tanggal dan nama libur nasional wajib diisi.' };
    }
    const cleanDate = item.tanggal.trim();
    const newEntry: HariKhusus = {
      ...item,
      id: 'hol-' + cleanDate + '-' + Math.random().toString(36).substring(2, 6),
      sumber: 'nasional',
      kategori: item.kategori || 'libur_nasional',
      isEfektifKBM: false,
    };
    setNationalHolidays((prev) => [...prev, newEntry].sort((a, b) => a.tanggal.localeCompare(b.tanggal)));
    return { success: true, message: `Hari libur nasional "${newEntry.nama}" berhasil ditambahkan.` };
  };

  const deleteNationalHoliday = (id: string): { success: boolean; message: string } => {
    const target = nationalHolidays.find((d) => d.id === id);
    if (!target) return { success: false, message: 'Libur tidak ditemukan.' };
    setNationalHolidays((prev) => prev.filter((d) => d.id !== id));
    return { success: true, message: `Libur nasional "${target.nama}" dihapus dari kalender.` };
  };

  const resetNationalHolidaysToDefault = () => {
    setNationalHolidays(INDONESIAN_NATIONAL_HOLIDAYS);
  };

  const resetCustomSchoolDaysToDefault = () => {
    setCustomSchoolDays(INITIAL_HARI_KHUSUS_SEKOLAH);
  };

  const getDateHariInfo = (dateStr: string): HariInfo => {
    return getHariInfo(dateStr, nationalHolidays, customSchoolDays, pengaturanJam);
  };

  const getPeriodMetrics = (startDateStr: string, endDateStr: string): PeriodDayMetrics => {
    return calculatePeriodDayMetrics(
      startDateStr,
      endDateStr,
      nationalHolidays,
      customSchoolDays,
      pengaturanJam,
      currentActiveDateStr
    );
  };

  // Legacy Admin Auth compatibility
  const loginAdmin = (pin: string): boolean => {
    if (pin === '1234' || pin === 'admin123') {
      setIsAdminLoggedIn(true);
      if (!currentUser) {
        setCurrentUser(users[0]);
      }
      return true;
    }
    // Check if matching any user's password
    const matched = users.find((u) => u.password === pin || `${u.username}1234` === pin);
    if (matched) {
      setIsAdminLoggedIn(true);
      setCurrentUser(matched);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    logoutUser();
  };

  return (
    <AppContext.Provider
      value={{
        siswaList,
        kelasList,
        absensiList,
        logNotifikasiList,
        pengaturanJam,
        waConfig,
        supabaseConfig,
        lastScanResult,
        recentScans,
        simulatedTime,
        currentActiveTimeStr,
        currentActiveDateStr,
        isAdminLoggedIn,
        localSnapshots,
        // Offline & Sync
        isOnline,
        isSimulatedOffline,
        effectiveOnline,
        isSyncing,
        lastSyncTime,
        pendingSyncCount,
        syncBanner,
        syncData,
        toggleSimulatedOffline,
        dismissSyncBanner,
        // Actions
        setSimulatedTime,
        processScanNisn,
        clearLastScanResult,
        addSiswa,
        importSiswaBatch,
        updateSiswa,
        deleteSiswa,
        addKelas,
        updateKelas,
        deleteKelas,
        updatePengaturanJam,
        updateWAConfig,
        updateSupabaseConfig,
        syncMasterData,
        deleteAbsensi,
        resetTodayAttendance,
        reloadInitialData,
        getBackupPayload,
        restoreBackupData,
        createLocalSnapshot,
        restoreLocalSnapshot,
        deleteLocalSnapshot,
        loginAdmin,
        logoutAdmin,
        // Profil Sekolah & Custom Logo
        profilSekolah,
        updateProfilSekolah,
        setCustomSchoolLogo,
        setCustomCityLogo,
        // Multi-User Auth & Super Admin
        users,
        currentUser,
        authChecking,
        kioskAuthStatus,
        isSuperAdmin,
        loginUser,
        logoutUser,
        changeUserPassword,
        adminResetUserPassword,
        addUser,
        deleteUser,
        // Kalender Pendidikan & Hari Libur
        nationalHolidays,
        customSchoolDays,
        allHolidaysAndFlags,
        todayHariInfo,
        getDateHariInfo,
        getPeriodMetrics,
        addCustomSchoolDay,
        updateCustomSchoolDay,
        deleteCustomSchoolDay,
        addNationalHoliday,
        deleteNationalHoliday,
        resetNationalHolidaysToDefault,
        resetCustomSchoolDaysToDefault,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
