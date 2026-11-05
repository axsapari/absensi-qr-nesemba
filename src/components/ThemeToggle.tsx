import React, { useState } from 'react';
import { Palette, Moon, Boxes, Cloud, Terminal, Droplets, Monitor, Contrast } from 'lucide-react';
import { bacaTema, terapkanTema, type Tema } from '../lib/tema';

const ITEM: { tema: Exclude<Tema, 'terang'>; nama: string; Ikon: React.ComponentType<{ className?: string }> }[] = [
  { tema: 'gelap', nama: 'Gelap', Ikon: Moon },
  { tema: 'neo', nama: 'Neo-brutalism', Ikon: Boxes },
  { tema: 'clay', nama: 'Clay', Ikon: Cloud },
  { tema: 'retro', nama: 'Retro terminal', Ikon: Terminal },
  { tema: 'glass', nama: 'Glassmorphism', Ikon: Droplets },
  { tema: 'win98', nama: 'Windows 98 klasik', Ikon: Monitor },
  { tema: 'kontras', nama: 'Kontras tinggi', Ikon: Contrast },
];

/** Saklar tema berdampingan; hanya satu aktif, mematikan = kembali ke terang. */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [tema, setTema] = useState<Tema>(() => bacaTema());
  const [buka, setBuka] = useState(false);

  const ganti = (t: Tema) => {
    const baru: Tema = tema === t ? 'terang' : t;
    terapkanTema(baru);
    setTema(baru);
    setBuka(false);
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* HP: satu tombol yang membuka daftar tema; layar lebar: saklar berdampingan */}
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-expanded={buka}
        aria-label="Pilih tema tampilan"
        title="Pilih tema tampilan"
        className="md:hidden min-h-10 min-w-10 flex items-center justify-center rounded-xl border bg-slate-800/90 border-slate-700/90 text-slate-300"
      >
        <Palette className="w-4 h-4" />
      </button>
    <div
      className={`theme-switches ${buka ? 'grid' : 'hidden'} md:flex grid-cols-4 gap-1 md:items-center
        max-md:absolute max-md:right-0 max-md:top-full max-md:mt-2 max-md:z-50 max-md:p-2 max-md:rounded-2xl max-md:border max-md:border-slate-700 max-md:bg-slate-900 max-md:shadow-2xl`}
      role="group"
      aria-label="Pilih tema tampilan"
    >
      {ITEM.map(({ tema: t, nama, Ikon }) => {
        const aktif = tema === t;
        const label = aktif ? `Matikan tema ${nama}` : `Aktifkan tema ${nama}`;
        return (
          <button
            key={t}
            type="button"
            onClick={() => ganti(t)}
            role="switch"
            aria-checked={aktif}
            aria-label={label}
            title={label}
            data-testid={`${t === 'gelap' ? 'dark' : t}-toggle`}
            className={`theme-switch p-2 max-md:min-h-11 max-md:min-w-11 max-md:flex max-md:items-center max-md:justify-center rounded-xl border transition-colors ${
              aktif
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/90 text-slate-300'
            }`}
          >
            <Ikon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
    </div>
  );
};
