import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolLogo } from './SchoolLogos';
import { SyncStatusBadge } from './SyncStatusBadge';
import {
  Scan,
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  Lock,
  Unlock,
  Building2,
  X,
  KeyRound,
  Database,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'kiosk' | 'rekap' | 'master' | 'kartu' | 'backup' | 'settings';
  setCurrentView: (view: 'kiosk' | 'rekap' | 'master' | 'kartu' | 'backup' | 'settings') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { isAdminLoggedIn, loginAdmin, logoutAdmin } = useApp();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [targetViewAfterLogin, setTargetViewAfterLogin] = useState<
    'master' | 'settings' | 'backup' | null
  >(null);

  const handleNavClick = (view: 'kiosk' | 'rekap' | 'master' | 'kartu' | 'backup' | 'settings') => {
    if ((view === 'master' || view === 'settings' || view === 'backup') && !isAdminLoggedIn) {
      setTargetViewAfterLogin(view);
      setPinInput('');
      setPinError(false);
      setShowAuthModal(true);
      return;
    }
    setCurrentView(view);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginAdmin(pinInput);
    if (success) {
      setShowAuthModal(false);
      setPinError(false);
      if (targetViewAfterLogin) {
        setCurrentView(targetViewAfterLogin);
        setTargetViewAfterLogin(null);
      }
    } else {
      setPinError(true);
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div
            onClick={() => setCurrentView('kiosk')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 p-0.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition shrink-0">
              <SchoolLogo className="w-9 h-9" />
            </div>
            <div>
              <div className="font-black text-base text-white tracking-tight leading-none flex items-center gap-1.5">
                <span>SMP NEGERI 9 BANJAR</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                  POS GERBANG
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Sistem Presensi QR/NISN & WhatsApp Gateway
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-kiosk"
              onClick={() => handleNavClick('kiosk')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentView === 'kiosk'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Pos Scan</span>
            </button>

            <button
              id="nav-rekap"
              onClick={() => handleNavClick('rekap')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentView === 'rekap'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Rekap Dashboard</span>
            </button>

            <button
              id="nav-master"
              onClick={() => handleNavClick('master')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentView === 'master'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Data Siswa & Kelas</span>
            </button>

            <button
              id="nav-kartu"
              onClick={() => handleNavClick('kartu')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentView === 'kartu'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Cetak Kartu Siswa</span>
            </button>

            <button
              id="nav-backup"
              onClick={() => handleNavClick('backup')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentView === 'backup'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Backup & Restore</span>
            </button>

            <button
              id="nav-settings"
              onClick={() => handleNavClick('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentView === 'settings'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan</span>
            </button>
          </nav>

          {/* Right Action Controls: Sync Status + Admin Auth */}
          <div className="flex items-center gap-2">
            <SyncStatusBadge compact={false} className="hidden sm:flex" />
            <SyncStatusBadge compact={true} className="flex sm:hidden" />

            {isAdminLoggedIn ? (
              <button
                onClick={logoutAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Keluar dari sesi Admin"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Aktif (Keluar)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setTargetViewAfterLogin(null);
                  setPinInput('');
                  setPinError(false);
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Login Admin untuk Kelola Data & Pengaturan"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Login Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around px-2 py-2 border-t border-slate-800 bg-slate-950 text-xs">
          <button
            onClick={() => handleNavClick('kiosk')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentView === 'kiosk' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Scan</span>
          </button>
          <button
            onClick={() => handleNavClick('rekap')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentView === 'rekap' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Rekap</span>
          </button>
          <button
            onClick={() => handleNavClick('master')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentView === 'master' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Siswa</span>
          </button>
          <button
            onClick={() => handleNavClick('kartu')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentView === 'kartu' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Kartu</span>
          </button>
          <button
            onClick={() => handleNavClick('backup')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentView === 'backup' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Database className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Backup</span>
          </button>
          <button
            onClick={() => handleNavClick('settings')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentView === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Setting</span>
          </button>
        </div>
      </header>

      {/* ADMIN AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-white font-black text-lg">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <span>Otentikasi Admin</span>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs mb-4">
              Halaman Pos Scan di gerbang terbuka untuk umum, namun Data Master dan Pengaturan dilindungi PIN Admin.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Masukkan PIN Admin
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="PIN Default: 1234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-white text-xl tracking-widest font-mono focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                {pinError && (
                  <p className="text-rose-400 text-xs mt-1.5 text-center">
                    PIN Salah! Gunakan PIN default <strong>1234</strong>
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  Masuk Sebagai Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
