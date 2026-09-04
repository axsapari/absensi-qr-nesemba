import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  CloudOff,
  ChevronDown,
  X,
  Radio,
  Clock,
  HardDrive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SyncStatusBadgeProps {
  compact?: boolean;
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ compact = false, className = '' }) => {
  const {
    isOnline,
    isSimulatedOffline,
    effectiveOnline,
    isSyncing,
    lastSyncTime,
    pendingSyncCount,
    syncData,
    toggleSimulatedOffline,
    supabaseConfig,
    absensiList,
  } = useApp();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    const res = await syncData(false);
    setFeedbackMsg(res.message);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        {/* Connection & Sync Pill Indicator */}
        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${
            !effectiveOnline
              ? 'bg-amber-950/40 border-amber-800/80 text-amber-300 hover:bg-amber-900/40'
              : pendingSyncCount > 0
              ? 'bg-amber-900/30 border-amber-700/60 text-amber-200 hover:bg-amber-900/50'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
          }`}
          title="Klik untuk melihat detail koneksi & sinkronisasi"
        >
          {/* Signal Indicator Dot */}
          <span className="relative flex h-2.5 w-2.5">
            {effectiveOnline ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </>
            )}
          </span>

          {/* Network icon & text */}
          <span className="flex items-center gap-1">
            {effectiveOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="font-bold">
              {isSimulatedOffline
                ? 'Simulasi Offline'
                : effectiveOnline
                ? 'Online'
                : 'Offline'}
            </span>
          </span>

          <span className="text-slate-500">•</span>

          {/* Sync Status Label */}
          {isSyncing ? (
            <span className="flex items-center gap-1 text-sky-400 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin" />
              {!compact && <span>Menyinkronkan...</span>}
            </span>
          ) : pendingSyncCount > 0 ? (
            <span className="flex items-center gap-1 text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.5 rounded text-[11px]">
              <AlertCircle className="w-3 h-3" />
              <span>{pendingSyncCount} {compact ? 'pending' : 'belum sinkron'}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {!compact && <span>Tersinkron</span>}
            </span>
          )}

          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
        </button>

        {/* Dedicated "Sinkron Data" Compact Button */}
        <button
          type="button"
          id="btn-sinkron-data"
          onClick={handleManualSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer select-none shadow-xs ${
            isSyncing
              ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
              : pendingSyncCount > 0
              ? 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white animate-pulse'
              : 'bg-emerald-700/80 hover:bg-emerald-600 border-emerald-600/80 text-white'
          }`}
          title="Klik untuk memastikan seluruh data tersinkron ke database"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sinkron...' : 'Sinkron Data'}</span>
        </button>
      </div>

      {/* Floating feedback alert if manual sync triggered */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-6 z-50 bg-slate-900/95 border border-emerald-500/80 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Modal / Popover */}
      <AnimatePresence>
        {isOpenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${effectiveOnline ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-amber-950 border border-amber-800 text-amber-400'}`}>
                    {effectiveOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Status Jaringan & Sinkronisasi</h3>
                    <p className="text-[11px] text-slate-400">Pusat kontrol penyimpanan & sinkronisasi data presensi</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpenModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-5 space-y-4 text-xs">
                {/* Network & Local Status Card */}
                <div className={`p-4 rounded-xl border ${effectiveOnline ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-amber-950/30 border-amber-800/60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Koneksi</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${effectiveOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                      {isSimulatedOffline ? 'SIMULASI OFFLINE' : effectiveOnline ? 'TERHUBUNG (ONLINE)' : 'TERPUTUS (OFFLINE)'}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    {effectiveOnline
                      ? 'Koneksi internet aktif. Setiap data absensi langsung tersimpan aman secara lokal dan otomatis tersinkron ke database.'
                      : 'Internet tidak terdeteksi atau tidak stabil. Aplikasi otomatis mengalihkan ke mode offline: seluruh presensi tetap tersimpan 100% aman di memori perangkat dan akan otomatis tersinkron sesaat setelah internet tersedia.'}
                  </p>
                </div>

                {/* Data Metric Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                      <span>Data Belum Sinkron</span>
                    </div>
                    <div className="text-xl font-black text-white">
                      {pendingSyncCount}{' '}
                      <span className="text-xs font-normal text-slate-400">data</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {pendingSyncCount > 0
                        ? 'Tersimpan aman di antrean lokal perangkat'
                        : 'Semua data telah tersinkron'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sinkron Terakhir</span>
                    </div>
                    <div className="text-base font-black text-emerald-400 truncate">
                      {lastSyncTime || 'Belum pernah'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Total {absensiList.length} data absensi
                    </div>
                  </div>
                </div>

                {/* Target Database Info */}
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Target Database</span>
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      {supabaseConfig.url ? 'Supabase PostgreSQL Cloud' : 'Penyimpanan Lokal Persisten'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    {supabaseConfig.url ? (
                      <span>Terhubung ke instance Supabase: <code className="text-slate-300">{supabaseConfig.url.slice(0, 30)}...</code></span>
                    ) : (
                      <span>Penyimpanan browser persisten (LocalStorage + Snapshot) beroperasi penuh dan siap diekspor / dibackup kapan pun.</span>
                    )}
                  </div>
                </div>

                {/* Testing Offline Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
                  <div>
                    <div className="font-bold text-white text-xs">Simulasi Mode Offline</div>
                    <div className="text-[10px] text-slate-400">
                      Gunakan ini untuk menguji coba scan saat internet mati dan melihat auto-sync saat kembali online.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSimulatedOffline}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isSimulatedOffline
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {isSimulatedOffline ? 'Matikan Simulasi' : 'Uji Coba Offline'}
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 bg-slate-950/60">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
                    isSyncing
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
