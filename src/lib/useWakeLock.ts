import { useEffect, useState } from 'react';

/** Menahan layar/komputer agar tidak sleep selama komponen aktif (Screen Wake Lock API).
 *  Butuh HTTPS dan tab yang terlihat; dipasang ulang otomatis saat tab kembali tampil. */
export function useWakeLock(): 'aktif' | 'tidak_didukung' | 'gagal' {
  const [status, setStatus] = useState<'aktif' | 'tidak_didukung' | 'gagal'>(
    typeof navigator !== 'undefined' && 'wakeLock' in navigator ? 'gagal' : 'tidak_didukung'
  );

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let batal = false;

    const minta = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (batal) { void s.release(); return; }
        sentinel = s;
        setStatus('aktif');
        s.addEventListener('release', () => { if (!batal) setStatus('gagal'); });
      } catch {
        setStatus('gagal');
      }
    };

    const saatTampil = () => { if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void minta(); };
    void minta();
    document.addEventListener('visibilitychange', saatTampil);
    return () => {
      batal = true;
      document.removeEventListener('visibilitychange', saatTampil);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);

  return status;
}
