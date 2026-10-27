import React, { useState } from 'react';
import { Moon, Boxes, Cloud, Terminal, Droplets, Monitor } from 'lucide-react';
import { bacaTema, terapkanTema, type Tema } from '../lib/tema';

const ITEM: { tema: Exclude<Tema, 'terang'>; nama: string; Ikon: React.ComponentType<{ className?: string }> }[] = [
  { tema: 'gelap', nama: 'Gelap', Ikon: Moon },
  { tema: 'neo', nama: 'Neo-brutalism', Ikon: Boxes },
  { tema: 'clay', nama: 'Clay', Ikon: Cloud },
  { tema: 'retro', nama: 'Retro terminal', Ikon: Terminal },
  { tema: 'glass', nama: 'Glassmorphism', Ikon: Droplets },
  { tema: 'win98', nama: 'Windows 98 klasik', Ikon: Monitor },
];

/** Saklar tema berdampingan; hanya satu aktif, mematikan = kembali ke terang. */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [tema, setTema] = useState<Tema>(() => bacaTema());

  const ganti = (t: Tema) => {
    const baru: Tema = tema === t ? 'terang' : t;
    terapkanTema(baru);
    setTema(baru);
  };

  return (
    <div className={`theme-switches flex items-center gap-1 shrink-0 ${className}`} role="group" aria-label="Pilih tema tampilan">
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
            className={`theme-switch p-2 rounded-xl border transition-colors ${
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
  );
};
