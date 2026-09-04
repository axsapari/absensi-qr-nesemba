import React, { useState } from 'react';
import { Mail, Copy, Check, Heart, Shield } from 'lucide-react';

export const PersistentFooter: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText('axsapari@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer
      id="persistent-app-footer"
      className="fixed bottom-0 left-0 right-0 z-40 md:left-64 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/90 text-slate-300 px-4 py-2 text-xs shadow-2xl transition-all select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4">
        {/* Developer Credit Requirement */}
        <div className="flex items-center gap-1.5 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span className="text-slate-400">
            Aplikasi ini dikembangkan oleh{' '}
            <strong className="text-white font-semibold">Agus Sugiharto Sapari, S.Pd.</strong>
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="inline-flex items-center gap-1">
            <a
              href="mailto:axsapari@gmail.com"
              className="text-blue-400 hover:text-blue-300 font-mono font-medium underline underline-offset-2 transition-colors flex items-center gap-1"
              title="Kirim email ke pengembang"
            >
              <Mail className="w-3 h-3 inline" />
              axsapari@gmail.com
            </a>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title="Salin alamat email"
            >
              {copied ? (
                <span className="text-emerald-400 text-[10px] flex items-center gap-0.5 font-sans font-medium">
                  <Check className="w-3 h-3" /> Tersalin
                </span>
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">SMP Negeri 9 Banjar</span>
        </div>

        {/* School & System Badge */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sistem Aktif
          </span>
          <span>•</span>
          <span className="font-mono text-slate-400">v2.4 Pro</span>
        </div>
      </div>
    </footer>
  );
};
