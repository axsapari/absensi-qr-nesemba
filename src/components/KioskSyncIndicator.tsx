import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, HardDrive, RefreshCw, WifiOff, CheckCircle2, UploadCloud } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * v22 — Indikator sinkron untuk layar kiosk (pos gerbang).
 * Menjawab 3 pertanyaan petugas: "data saya aman?", "berapa yang belum terkirim?",
 * dan "kapan terkirim?" tanpa harus membuka dashboard.
 */
const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const KioskSyncIndicator: React.FC = () => {
  const {
    effectiveOnline,
    isSimulatedOffline,
    isSyncing,
    pendingSyncCount,
    lastSyncTime,
    nextBatchSyncAt,
    kioskAuthStatus,
    supabaseConfig,
    syncNow,
  } = useApp();

  const [now, setNow] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Detak 1 detik hanya saat ada yang perlu dihitung mundur.
  useEffect(() => {
    if (pendingSyncCount === 0 || !nextBatchSyncAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [pendingSyncCount, nextBatchSyncAt]);

  const sessionMissing =
    !!supabaseConfig.url && (kioskAuthStatus === 'failed' || kioskAuthStatus === 'not_configured');

  const handleSendNow = async () => {
    if (isSyncing) return;
    const res = await syncNow();
    setFeedback(res.message);
    window.setTimeout(() => setFeedback(null), 6000);
    // kembalikan fokus ke input scanner agar scan berikutnya tidak terlewat
    window.setTimeout(() => document.getElementById('scanner-hidden-input')?.focus(), 50);
  };

  type Tone = 'ok' | 'wait' | 'warn' | 'busy';
  let tone: Tone = 'ok';
  let Icon = CheckCircle2;
  let title = 'Semua data sudah tersimpan di server';
  let detail = lastSyncTime ? `Sinkron terakhir ${lastSyncTime}` : 'Belum ada sinkron tercatat di perangkat ini';

  if (isSyncing) {
    tone = 'busy';
    Icon = RefreshCw;
    title = 'Mengirim data ke server...';
    detail = 'Scan tetap bisa dilanjutkan';
  } else if (!effectiveOnline || isSimulatedOffline) {
    tone = 'warn';
    Icon = pendingSyncCount > 0 ? HardDrive : WifiOff;
    title = pendingSyncCount > 0
      ? `Offline — ${pendingSyncCount} data aman di perangkat`
      : 'Offline — scan tetap disimpan di perangkat';
    detail = 'Akan terkirim otomatis begitu internet kembali';
  } else if (sessionMissing) {
    tone = 'warn';
    Icon = CloudOff;
    title = `${pendingSyncCount} data belum bisa dikirim`;
    detail = 'Akun kiosk belum login ke Supabase (lihat peringatan merah di atas)';
  } else if (pendingSyncCount > 0) {
    tone = 'wait';
    Icon = UploadCloud;
    title = `${pendingSyncCount} data menunggu dikirim`;
    detail = nextBatchSyncAt
      ? `Dikirim otomatis dalam ${formatCountdown(nextBatchSyncAt - now)}`
      : 'Menunggu koneksi ke server';
  }

  const toneClass: Record<Tone, string> = {
    ok: 'bg-emerald-950/50 border-emerald-800/70 text-emerald-200',
    wait: 'bg-sky-950/50 border-sky-800/70 text-sky-200',
    warn: 'bg-amber-950/50 border-amber-700/70 text-amber-200',
    busy: 'bg-indigo-950/50 border-indigo-800/70 text-indigo-200',
  };
  const showButton = pendingSyncCount > 0 && effectiveOnline && !isSimulatedOffline && !sessionMissing;

  return (
    <div
      id="kiosk-sync-indicator"
      className={`mb-3 flex flex-wrap items-center justify-between gap-3 border rounded-xl px-4 py-2.5 ${toneClass[tone]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-5 h-5 shrink-0 ${tone === 'busy' ? 'animate-spin' : ''}`} />
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight">{title}</div>
          <div className="text-xs opacity-80 leading-tight mt-0.5">{feedback || detail}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {effectiveOnline && !isSimulatedOffline && !sessionMissing && (
          <Cloud className="w-4 h-4 opacity-60" />
        )}
        {showButton && (
          <button
            type="button"
            onClick={handleSendNow}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
          >
            Kirim sekarang
          </button>
        )}
      </div>
    </div>
  );
};
