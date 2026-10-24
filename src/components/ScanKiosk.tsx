import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { soundManager } from '../lib/sound';
import {
  Scan,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Send,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Cloud,
  CloudOff,
  HardDrive,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFotoSiswaUrl, getFotoPlaceholder } from '../lib/fotoHelper';
import { nextFotoCandidate } from '../lib/fotoFallback';
import { panaskanFotoSiswa } from '../lib/fotoPreload';
import { KioskSyncIndicator } from './KioskSyncIndicator';
import { CountdownPulang } from './CountdownPulang';
import { KioskKesehatan } from './KioskKesehatan';
import { useWakeLock } from '../lib/useWakeLock';

export const ScanKiosk: React.FC = () => {
  const {
    processScanNisn,
    lastScanResult,
    clearLastScanResult,
    currentActiveTimeStr,
    currentActiveDateStr,
    pengaturanJam,
    siswaList,
    kelasList,
    todayHariInfo,
    effectiveOnline,
    pendingSyncCount,
    supabaseConfig,
    kioskAuthStatus,
  } = useApp();

  const wakeLock = useWakeLock();
  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // Semua input dari scanner USB masuk ke antrean yang sama. Ini mencegah scan kedua hilang
  // ketika dua scanner mengirim hampir bersamaan ke laptop yang sama.
  const scanQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueScan = (code: string) => {
    const normalized = code.trim();
    if (!normalized) return;
    setIsProcessing(true);
    scanQueueRef.current = scanQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await processScanNisn(normalized);
        } finally {
          setIsProcessing(false);
          ensureInputFocus();
        }
      });
  };
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep hidden input field constantly focused
  const ensureInputFocus = () => {
    if (inputRef.current && !showManualInput) {
      inputRef.current.focus();
    }
  };

  // Pemanasan foto: muat foto semua siswa aktif ke cache browser sebelum ada yang scan, lalu ulangi
  // tiap 45 menit (cache Supabase hanya 1 jam). Foto tampil cepat dan tidak bergantung sinyal saat scan.
  useEffect(() => {
    if (!supabaseConfig.url || siswaList.length === 0) return;
    let batal = false;
    const jalan = () => { if (navigator.onLine) void panaskanFotoSiswa(siswaList, supabaseConfig.url, { batalkan: () => batal }); };
    const awal = window.setTimeout(jalan, 3000);
    const ulang = window.setInterval(jalan, 45 * 60 * 1000);
    return () => { batal = true; window.clearTimeout(awal); window.clearInterval(ulang); };
  }, [siswaList.length, supabaseConfig.url]);

  useEffect(() => {
    ensureInputFocus();
    const handleGlobalClick = () => ensureInputFocus();
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If pressing a key while not focusing an input or modal, refocus
      if (document.activeElement?.tagName !== 'INPUT' && !showManualInput) {
        ensureInputFocus();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showManualInput]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundManager.setSoundEnabled(next);
  };

  // Handle QR Scanner Input via Enter key
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = inputVal.trim();
      setInputVal('');

      if (!code) return;
      enqueueScan(code);
    }
  };

  // Handle Manual Input Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const code = manualCode.trim();
    if (!code) return;
    enqueueScan(code);
    setManualCode('');
    setShowManualInput(false);
  };

  // Quick Student Test Scanner Click
  const handleQuickTestScan = async (code: string) => {
    enqueueScan(code);
  };

  // Determine current day & session status (Friday dismissal vs regular dismissal)
  const currentDayOfWeek = new Date().getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
  const isMondayToday = currentDayOfWeek === 1;
  const isFridayToday = currentDayOfWeek === 5;
  const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;

  // Sumber yang sama dengan logika scan (termasuk hari pulang cepat / jadwal khusus)
  const activeBatasPulangTime = (todayHariInfo.jamPulangEfektif || pengaturanJam.batas_jam_pulang || '14:15').slice(0, 5);

  const batasPulang = activeBatasPulangTime + ':00';
  const batasTepatWaktu = (pengaturanJam.batas_tepat_waktu || '07:15') + ':00';
  const isSesiPulang = currentActiveTimeStr >= batasPulang;
  const isSesiTerlambat = !isSesiPulang && currentActiveTimeStr > batasTepatWaktu;

  return (
    <div id="scan-kiosk-page" className="min-h-[calc(100vh-4.5rem)] bg-slate-950 text-white flex flex-col justify-between p-4 md:p-6 select-none relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden Transparent Input strictly listening to USB QR Code NISN Scanner */}
      <input
        id="scanner-hidden-input"
        ref={inputRef}
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute -top-40 left-0 w-10 h-10 pointer-events-none"
        autoFocus
        autoComplete="off"
        aria-label="USB QR Scanner Input"
      />

      {(kioskAuthStatus === 'failed' || kioskAuthStatus === 'not_configured') && supabaseConfig.url && (
        <div className="mb-4 bg-rose-950/80 border border-rose-800 rounded-xl px-4 py-3 text-sm text-rose-200 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              {kioskAuthStatus === 'not_configured'
                ? 'Pos gerbang belum aktif di perangkat ini.'
                : 'Akun kiosk gagal login ke Supabase.'}
            </span>{' '}
            Absensi hanya tersimpan lokal di perangkat ini dan TIDAK akan tersinkron ke database
            sampai diaktifkan.{' '}
            {kioskAuthStatus === 'failed'
              ? 'Akun kiosk gagal login: periksa email/password-nya di Pengaturan > Supabase > Akun Kiosk, atau login staf lagi lalu logout agar data terbaru diambil.'
              : 'Cukup login SEKALI dengan akun staf (tombol Login Pengguna), lalu logout. Setelah itu pos gerbang aktif sendiri, tanpa mengisi apa pun.'}
          </div>
        </div>
      )}

      {/* Indikator sinkron untuk petugas gerbang */}
      <KioskSyncIndicator />

      {/* TOP HEADER: Pos Status, Live Clock, Simulator */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        {/* Pos Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">POS GERBANG UTAMA</div>
              <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Scanner QR / NISN Siaga
              </div>
            </div>
          </div>

          {/* Session Banner */}
          <div
            className={`px-4 py-2 rounded-xl border font-medium text-sm flex items-center gap-2 ${
              isSesiPulang
                ? 'bg-blue-950/70 border-blue-800/80 text-blue-300'
                : isSesiTerlambat
                ? 'bg-amber-950/70 border-amber-800/80 text-amber-300'
                : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>
              {isSesiPulang
                ? `Sesi Kepulangan ${isFridayToday ? 'Khusus Jumat' : 'Siang'} (Batas ≥ ${activeBatasPulangTime})`
                : isSesiTerlambat
                ? `Sesi Masuk: Terlambat (Batas ${pengaturanJam.batas_tepat_waktu})`
                : `Sesi Masuk: Tepat Waktu (s.d ${pengaturanJam.batas_tepat_waktu})`}
            </span>
            {isFridayToday && (
              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">
                Jadwal Jumat
              </span>
            )}
          </div>
        </div>

        {/* Live Clock & Quick Controls */}
        <div className="flex items-center gap-3">
          {/* Jam pulang hari ini */}
          <div className="bg-blue-950/60 border border-blue-800/70 px-4 py-2 rounded-xl text-right">
            <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-blue-300/90">Jam pulang hari ini</div>
            <div className="text-2xl md:text-3xl font-mono font-black text-blue-300 leading-tight">
              {todayHariInfo.isHariEfektif ? activeBatasPulangTime : '--:--'}
            </div>
            {todayHariInfo.isPulangCepat && <div className="text-[10px] font-bold text-amber-300">Pulang cepat</div>}
          </div>

          {/* Big Digital Clock */}
          <div className="bg-slate-900/90 border border-slate-800 px-5 py-2 rounded-xl text-right">
            <div className="text-3xl md:text-4xl font-mono font-black tracking-wider text-emerald-400">
              {currentActiveTimeStr} <span className="text-xs font-sans text-slate-400">WIB</span>
            </div>
            <div className="text-sm md:text-base text-slate-400 font-semibold">
              {currentActiveDateStr}
            </div>
          </div>

          <span
            title={wakeLock === 'aktif' ? 'Layar dan komputer ditahan agar tidak sleep selama halaman ini terbuka' : wakeLock === 'tidak_didukung' ? 'Browser ini tidak mendukung penahan sleep. Atur sleep komputer secara manual.' : 'Penahan sleep belum aktif (butuh tab terlihat dan HTTPS)'}
            className={`hidden 2xl:inline-flex whitespace-nowrap text-[11px] font-semibold px-2 py-1 rounded-lg border ${wakeLock === 'aktif' ? 'text-emerald-300 border-emerald-800 bg-emerald-950/50' : 'text-amber-300 border-amber-800 bg-amber-950/40'}`}
          >
            {wakeLock === 'aktif' ? 'Anti-sleep aktif' : 'Anti-sleep mati'}
          </span>

          {/* Sound & Screen Controls */}
          <button
            id="toggle-sound-btn"
            onClick={handleToggleSound}
            title={soundOn ? 'Suara Aktif (Klik untuk mute)' : 'Suara Mute (Klik untuk aktifkan)'}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>

          <button
            id="toggle-fullscreen-btn"
            onClick={toggleFullscreen}
            title="Layar Penuh (Kiosk Mode)"
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5 text-blue-400" /> : <Maximize2 className="w-5 h-5 text-slate-400" />}
          </button>
        </div>
      </div>

      <KioskKesehatan
        sekarang={currentActiveTimeStr}
        hariEfektif={todayHariInfo.isHariEfektif}
        jamPulang={activeBatasPulangTime}
        fokuskan={ensureInputFocus}
      />

      {/* BAR HITUNG MUNDUR menuju scan pulang */}
      <CountdownPulang
        sekarang={currentActiveTimeStr}
        mulai={(pengaturanJam.jam_buka_pos || '06:00').slice(0, 5)}
        pulang={activeBatasPulangTime}
        aktif={todayHariInfo.isHariEfektif}
        keterangan={todayHariInfo.catatanStatus}
      />

      {/* CENTER STAGE: Giant Distance-Readable Feedback Screen */}
      <div className="my-auto py-6 max-w-5xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {!lastScanResult ? (
            /* IDLE WAITING STATE */
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center text-center p-10 md:p-14 rounded-3xl bg-slate-900/60 border-2 border-dashed border-slate-800 shadow-2xl relative"
            >
              {/* Pulsing Radar Scanner Graphic */}
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative">
                  <Scan className="w-16 h-16 text-emerald-400 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping opacity-30 pointer-events-none" />
                </div>
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight mb-3">
                SILAKAN SCAN KARTU PELAJAR
              </h2>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-8 leading-relaxed">
                Arahkan QR Code NISN pada kartu identitas siswa ke laser scanner USB di pos gerbang sekolah.
              </p>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 px-6 py-3 rounded-full text-slate-300 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Keyboard HID Scanner Listener Aktif & Fokus Otomatis</span>
              </div>
            </motion.div>
          ) : lastScanResult.isDuplicate ? (
            /* DUPLICATE WARNING STATE */
            <motion.div
              key="duplicate"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 md:p-10 rounded-3xl bg-amber-950/40 border-2 border-amber-500/80 shadow-2xl backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Student Photo */}
                <div className="relative">
                  <img
                    key={lastScanResult.siswa?.id ?? 'tanpa-siswa'}
                    src={
                      lastScanResult.siswa
                        ? getFotoSiswaUrl(lastScanResult.siswa, supabaseConfig.url)
                        : getFotoPlaceholder('L')
                    }
                    alt={lastScanResult.siswa?.nama}
                    className="w-36 h-36 md:w-44 md:h-44 object-cover rounded-2xl border-4 border-amber-500 shadow-xl"
                    onError={(e) => {
                      if (nextFotoCandidate(e.target as HTMLImageElement)) return;
                      (e.target as HTMLImageElement).src = getFotoPlaceholder(
                        lastScanResult.siswa?.jenis_kelamin || 'L'
                      );
                    }}
                  />
                  <div className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 p-2 rounded-full shadow-lg">
                    <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
                  </div>
                </div>

                {/* Info Text */}
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    DUPLIKASI TERDETEKSI: SUDAH TERCATAT
                  </div>

                  <h3 className="text-4xl md:text-6xl font-black text-white tracking-[0.08em] mb-3">
                    {lastScanResult.siswa?.nama}
                  </h3>

                  <div className="text-xl text-slate-300 mb-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <span className="font-semibold text-amber-400">Kelas {lastScanResult.kelas?.nama_kelas || '-'}</span>
                    <span>•</span>
                    <span>NISN: {lastScanResult.siswa?.nisn}</span>
                  </div>

                  <div className="bg-amber-900/30 border border-amber-800/60 p-4 rounded-xl text-amber-200 text-base">
                    Siswa ini telah tercatat {lastScanResult.jenis?.toUpperCase()} sebelumnya pada pukul{' '}
                    <strong>{lastScanResult.duplicatePreviousScanTime || lastScanResult.waktu} WIB</strong>.
                    <br />
                    <span className="text-sm text-amber-300/80">
                      (Pencegahan anti-duplikasi aktif: Scan baru diabaikan dalam rentang{' '}
                      {pengaturanJam.toleransi_duplikasi_menit} menit).
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !lastScanResult.success ? (
            /* ERROR STATE (BARCODE NOT FOUND) */
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 md:p-12 rounded-3xl bg-rose-950/40 border-2 border-rose-500/80 shadow-2xl backdrop-blur-md text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-4 text-rose-400">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-rose-300 mb-3">
                NISN TIDAK DIKENAL
              </h3>
              <p className="text-slate-300 text-lg max-w-xl mx-auto mb-6">
                {lastScanResult.message}
              </p>
              <div className="text-sm text-slate-400">
                Silakan periksa apakah kartu siswa terdaftar di database master, atau gunakan input manual jika QR Code bermasalah.
              </div>
            </motion.div>
          ) : (
            /* SUCCESS STATE (MASUK / TERLAMBAT / PULANG) */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-8 md:p-12 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden border-2 ${
                lastScanResult.status === 'terlambat'
                  ? 'bg-amber-950/30 border-amber-500/90'
                  : lastScanResult.jenis === 'pulang'
                  ? 'bg-blue-950/30 border-blue-500/90'
                  : 'bg-emerald-950/30 border-emerald-500/90'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
                {/* Student Photo */}
                <div className="relative shrink-0">
                  <img
                    key={lastScanResult.siswa?.id ?? 'tanpa-siswa'}
                    src={
                      lastScanResult.siswa
                        ? getFotoSiswaUrl(lastScanResult.siswa, supabaseConfig.url)
                        : getFotoPlaceholder('L')
                    }
                    alt={lastScanResult.siswa?.nama}
                    onError={(e) => {
                      if (nextFotoCandidate(e.target as HTMLImageElement)) return;
                      (e.target as HTMLImageElement).src = getFotoPlaceholder(
                        lastScanResult.siswa?.jenis_kelamin || 'L'
                      );
                    }}
                    className={`w-40 aspect-[2/3] md:w-52 object-cover rounded-2xl border-4 shadow-2xl ${
                      lastScanResult.isScanClosed
                        ? 'border-rose-400'
                        : lastScanResult.status === 'terlambat'
                        ? 'border-amber-400'
                        : lastScanResult.jenis === 'pulang'
                        ? 'border-blue-400'
                        : 'border-emerald-400'
                    }`}
                  />
                  <div
                    className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg ${
                      lastScanResult.isScanClosed
                        ? 'bg-rose-500 text-white'
                        : lastScanResult.status === 'terlambat'
                        ? 'bg-amber-500 text-slate-950'
                        : lastScanResult.jenis === 'pulang'
                        ? 'bg-blue-500 text-white'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {lastScanResult.isScanClosed ? <AlertTriangle className="w-8 h-8 stroke-[2.5]" /> : <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />}
                  </div>
                </div>

                {/* Details & Status Banner */}
                <div className="flex-1 text-center md:text-left">
                  {/* Status Badge */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-lg md:text-xl font-black tracking-wide uppercase shadow-lg ${
                        lastScanResult.isScanClosed
                          ? 'bg-rose-500 text-white'
                          : lastScanResult.status === 'terlambat'
                          ? 'bg-amber-500 text-slate-950'
                          : lastScanResult.jenis === 'pulang'
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {lastScanResult.isScanClosed ? (
                        <>
                          <AlertTriangle className="w-5 h-5" />
                          {lastScanResult.scanClosedReason === 'not_started'
                            ? 'ABSENSI BELUM DIMULAI'
                            : lastScanResult.scanClosedReason === 'pulang_not_started'
                            ? 'ABSENSI KEPULANGAN BELUM DIMULAI'
                            : 'SCAN MASUK SUDAH DITUTUP'}
                        </>
                      ) : lastScanResult.status === 'terlambat' ? (
                        <>
                          <AlertTriangle className="w-5 h-5" />
                          ABSENSI MASUK: TERLAMBAT
                        </>
                      ) : lastScanResult.jenis === 'pulang' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          ABSENSI KEPULANGAN TERCATAT
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          ABSENSI MASUK: TEPAT WAKTU
                        </>
                      )}
                    </span>
                  </div>

                  {lastScanResult.isScanClosed && (
                    <div className="mb-3 text-rose-300 font-bold text-sm md:text-base">{lastScanResult.message}</div>
                  )}

                  {/* Student Full Name */}
                  <h3 className="text-4xl md:text-6xl font-black text-white tracking-[0.08em] mb-3">
                    {lastScanResult.siswa?.nama}
                  </h3>

                  {/* Class, NISN, ID */}
                  <div className="text-xl md:text-3xl text-slate-200 mb-6 flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-5">
                    <span className="font-black text-white bg-slate-800/80 px-4 py-1.5 rounded-lg border border-slate-700">
                      Kelas {lastScanResult.kelas?.nama_kelas || '-'}
                    </span>
                    <span className="text-slate-300 font-semibold">NISN: {lastScanResult.siswa?.nisn}</span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/70 border border-slate-800 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs text-slate-400">Waktu Scan</div>
                        <div className="text-base font-bold text-white">
                          {lastScanResult.waktu} WIB
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Offline / Synced Storage Status Banner */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    {lastScanResult.isOfflineSaved ? (
                      <div className="flex items-center gap-2 text-amber-300 font-semibold bg-amber-950/60 border border-amber-800/80 px-3.5 py-2 rounded-xl text-xs">
                        <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Mode Offline: Presensi tersimpan aman di penyimpanan lokal & akan disinkron otomatis ke database saat internet tersedia.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-2 rounded-xl text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Presensi tersimpan dan berhasil disinkronkan ke database server.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM FOOTER: input manual */}
      <div className="pt-4 border-t border-slate-800/80 flex justify-end">
        <button
          id="open-manual-input-btn"
          onClick={() => {
            setShowManualInput(!showManualInput);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Ketik Manual NISN</span>
        </button>
      </div>

      {/* MANUAL INPUT MODAL */}
      {showManualInput && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Input Manual NISN</h3>
            <p className="text-slate-400 text-sm mb-4">
              Gunakan jika kartu siswa kotor, terlipat, atau scanner USB mengalami kendala.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  NISN Siswa
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Contoh: SMP2026-7A-001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!manualCode.trim() || isProcessing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  Catat Absensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
