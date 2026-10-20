import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { bacaTema, terapkanTema, type Tema } from '../lib/tema';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [tema, setTema] = useState<Tema>(() => bacaTema());
  const gelap = tema === 'gelap';

  const ganti = () => {
    const baru: Tema = gelap ? 'terang' : 'gelap';
    terapkanTema(baru);
    setTema(baru);
  };

  return (
    <button
      type="button"
      onClick={ganti}
      role="switch"
      aria-checked={gelap}
      title={gelap ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      aria-label={gelap ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      className={`p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/90 text-slate-200 transition-colors shrink-0 ${className}`}
    >
      {gelap ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};
