import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolLogo } from './SchoolLogos';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  Scan,
  LayoutDashboard,
  Users,
  CreditCard,
  Database,
  Sliders,
  ShieldCheck,
  LogOut,
  KeyRound,
  X,
  Clock,
  Wifi,
  WifiOff,
  Cloud,
  HardDrive,
  RefreshCw,
  ChevronRight,
  UserCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type AppView = 'kiosk' | 'rekap' | 'master' | 'kartu' | 'backup' | 'admin' | 'settings';

interface SidebarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onOpenLoginModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isMobileOpen,
  setIsMobileOpen,
  onOpenLoginModal,
}) => {
  const {
    profilSekolah,
    currentUser,
    logoutUser,
    effectiveOnline,
    pendingSyncCount,
    isSyncing,
    syncData,
    currentActiveTimeStr,
    currentActiveDateStr,
  } = useApp();

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const menuItems: {
    id: AppView;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'kiosk',
      label: 'Pos Gerbang (Scan)',
      description: 'Layar scan QR/NISN & audio',
      icon: Scan,
    },
    {
      id: 'rekap',
      label: 'Rekap & Laporan',
      description: 'Grafik harian, bulanan & cetak',
      icon: LayoutDashboard,
    },
    {
      id: 'master',
      label: 'Master Data Siswa',
      description: 'Kelola siswa & rombel kelas',
      icon: Users,
    },
    {
      id: 'kartu',
      label: 'Cetak Kartu Pelajar',
      description: 'Kartu QR/NISN siap print A4',
      icon: CreditCard,
    },
    {
      id: 'backup',
      label: 'Cadangan & Pulihkan',
      description: 'Backup JSON & snapshot lokal',
      icon: Database,
    },
    {
      id: 'admin',
      label: 'Tab Admin Sekolah',
      description: 'Upload logo, profil & akun',
      icon: ShieldCheck,
      badge: 'Admin',
      badgeColor: 'bg-blue-500 text-white',
    },
    {
      id: 'settings',
      label: 'Pengaturan Sistem',
      description: 'Jam masuk, WA & Supabase',
      icon: Sliders,
    },
  ];

  const handleSelectNav = (view: AppView) => {
    setCurrentView(view);
    setIsMobileOpen(false);
  };

  const handleLogoutClick = () => {
    if (confirm('Apakah Anda yakin ingin keluar / berganti akun pengguna?')) {
      logoutUser();
      if (onOpenLoginModal) onOpenLoginModal();
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-slate-900 border-r border-slate-800/90 text-white select-none">
      {/* 1. Header & Brand */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div
            onClick={() => handleSelectNav('kiosk')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-slate-800/80 border border-slate-700/80 p-1 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
              <SchoolLogo className="w-9 h-9" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm text-white tracking-tight leading-tight truncate">
                {profilSekolah.nama || 'SMP NEGERI 9 BANJAR'}
              </div>
              <div className="text-[11px] text-blue-400 font-semibold tracking-wide">
                PRESENSI SISWA DIGITAL
              </div>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realtime Clock & Date Widget */}
        <div className="mt-4 bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold text-white text-sm">
              {currentActiveTimeStr}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
            {currentActiveDateStr}
          </div>
        </div>
      </div>

      {/* 2. Navigation Menu List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Navigasi Menu
        </div>

        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs truncate font-semibold leading-tight">
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase ml-1 shrink-0 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Compact Network & Sync Status inside Sidebar */}
        <div className="mt-4 pt-3 border-t border-slate-800 px-1">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {effectiveOnline ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-200">
                  {effectiveOnline ? 'Koneksi Online' : 'Mode Offline'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {pendingSyncCount > 0 ? `${pendingSyncCount} data antrean` : 'Semua tersinkron'}
                </div>
              </div>
            </div>

            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={() => syncData(false)}
                disabled={isSyncing}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sinkron</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. User Profile Card & Logout (Bottom) */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        {currentUser ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-blue-400 font-mono">
                  @{currentUser.username} • Admin
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                title="Ganti kata sandi akun Anda"
              >
                <KeyRound className="w-3 h-3 text-blue-400" />
                <span>Sandi</span>
              </button>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="px-2 py-1.5 bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700/50 hover:border-rose-800/80 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                title="Keluar / Ganti akun"
              >
                <LogOut className="w-3 h-3" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
          >
            <UserCircle2 className="w-4 h-4" />
            <span>Login Pengguna</span>
          </button>
        )}
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && currentUser && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          targetUsername={currentUser.username}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:block fixed top-0 bottom-0 left-0 w-64 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay with Slide Animation) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
