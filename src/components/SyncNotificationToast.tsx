import React from 'react';
import { useApp } from '../context/AppContext';
import { Wifi, WifiOff, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SyncNotificationToast: React.FC = () => {
  const { syncBanner, dismissSyncBanner, isSyncing, syncData } = useApp();

  if (!syncBanner) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-3.5 ${
            syncBanner.type === 'online'
              ? 'bg-slate-900/95 border-emerald-500/80 text-white'
              : syncBanner.type === 'offline'
              ? 'bg-slate-900/95 border-amber-500/80 text-white'
              : syncBanner.type === 'sync_success'
              ? 'bg-slate-900/95 border-emerald-500/80 text-white'
              : 'bg-slate-900/95 border-rose-500/80 text-white'
          }`}
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            {syncBanner.type === 'online' && (
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Wifi className="w-5 h-5" />
              </div>
            )}
            {syncBanner.type === 'offline' && (
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <WifiOff className="w-5 h-5" />
              </div>
            )}
            {syncBanner.type === 'sync_success' && (
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {syncBanner.type === 'sync_error' && (
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {syncBanner.type === 'online'
                ? 'Koneksi Internet Pulih'
                : syncBanner.type === 'offline'
                ? 'Koneksi Offline (Lokal)'
                : syncBanner.type === 'sync_success'
                ? 'Sinkronisasi Selesai'
                : 'Pemberitahuan Sistem'}
            </div>
            <p className="text-sm font-semibold text-slate-100 mt-0.5 leading-snug">
              {syncBanner.message}
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={dismissSyncBanner}
            className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
