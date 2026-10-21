import React from 'react';
import { LogOut } from 'lucide-react';
import { formatHitungMundur, hitungMundurPulang } from '../lib/hitungMundurPulang';

interface Props {
  sekarang: string; // HH:MM:SS
  mulai: string; // jam buka pos HH:MM
  pulang: string; // jam pulang HH:MM
  aktif: boolean; // hari efektif
  keterangan?: string;
}

export const CountdownPulang: React.FC<Props> = ({ sekarang, mulai, pulang, aktif, keterangan }) => {
  if (!aktif) {
    return (
      <div className="mt-4 px-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-sm text-slate-400">
        Hari ini bukan hari efektif{keterangan ? ` — ${keterangan}` : ''}. Hitung mundur pulang tidak ditampilkan.
      </div>
    );
  }
  const h = hitungMundurPulang(sekarang, mulai, pulang);
  const warna =
    h.fase === 'pulang'
      ? { bar: 'bg-blue-500', teks: 'text-blue-300', kotak: 'border-blue-800/80 bg-blue-950/50' }
      : h.fase === 'segera'
      ? { bar: 'bg-amber-400', teks: 'text-amber-300', kotak: 'border-amber-800/80 bg-amber-950/40' }
      : { bar: 'bg-emerald-500', teks: 'text-emerald-300', kotak: 'border-slate-800 bg-slate-900/70' };

  return (
    <div className={`mt-4 px-4 py-3 rounded-xl border ${warna.kotak}`} role="timer" aria-live="off">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className={`flex items-center gap-2 text-sm font-semibold ${warna.teks}`}>
          <LogOut className="w-4 h-4" />
          {h.fase === 'pulang'
            ? 'Sesi scan pulang sedang berlangsung'
            : h.fase === 'sebelum_buka'
            ? `Pos belum dibuka (buka ${mulai})`
            : 'Menuju sesi scan pulang'}
        </div>
        {h.fase !== 'pulang' && (
          <div className={`font-mono font-black text-2xl md:text-3xl tracking-wider ${warna.teks}`}>
            {formatHitungMundur(h.sisaDetik)}
            <span className="text-xs font-sans font-medium text-slate-400 ml-2">lagi pukul {pulang}</span>
          </div>
        )}
      </div>
      <div className="h-4 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700/70">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${warna.bar}`}
          style={{ width: `${h.persen}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
        <span>{mulai}</span>
        <span>{pulang}</span>
      </div>
    </div>
  );
};
