import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SyncStatusBadge } from './SyncStatusBadge';
import { SchoolLogo } from './SchoolLogos';
import { AppView } from './Sidebar';
import {
  Menu,
  Scan,
  LayoutDashboard,
  Users,
  CreditCard,
  Database,
  Sliders,
  ShieldCheck,
  UserCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface TopHeaderProps {
  currentView: AppView;
  onOpenMobileMenu: () => void;
  onOpenLoginModal: () => void;
}

const VIEW_TITLES: Record<AppView, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }> = {
  kiosk: {
    title: 'Pos Gerbang Scan Siswa',
    subtitle: 'Pemindai Barcode, Display Status & Audio Bell',
    icon: Scan,
  },
  rekap: {
    title: 'Rekap & Laporan Presensi',
    subtitle: 'Statistik Kehadiran, Grafik & Cetak Laporan',
    icon: LayoutDashboard,
  },
  master: {
    title: 'Master Data Siswa & Kelas',
    subtitle: 'Manajemen Data Siswa, Import Excel & Rombel',
    icon: Users,
  },
  kartu: {
    title: 'Cetak Kartu Pelajar',
    subtitle: 'Generator Kartu Siswa Barcode Siap Cetak A4',
    icon: CreditCard,
  },
  backup: {
    title: 'Cadangan & Pemulihan Data',
    subtitle: 'Ekspor JSON, Impor & Snapshot Riwayat Lokal',
    icon: Database,
  },
  admin: {
    title: 'Panel Pengaturan & Admin Sekolah',
    subtitle: 'Upload Logo Sekolah, Profil & Kelola Akun',
    icon: ShieldCheck,
  },
  settings: {
    title: 'Pengaturan Jam & Integrasi Gateway',
    subtitle: 'Aturan Jam, WhatsApp Gateway & Cloud Supabase',
    icon: Sliders,
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentView,
  onOpenMobileMenu,
  onOpenLoginModal,
}) => {
  const { currentUser, profilSekolah, isSuperAdmin } = useApp();
  const viewInfo = VIEW_TITLES[currentView] || VIEW_TITLES.kiosk;
  const Icon = viewInfo.icon;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-20 shadow-md">
      <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left Side: Mobile Menu Button & Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0"
            title="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile Logo Indicator */}
          <div className="md:hidden flex items-center gap-2 shrink-0">
            <SchoolLogo className="w-8 h-8" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30 hidden sm:inline-flex">
                <Icon className="w-4 h-4" />
              </span>
              <h1 className="text-base md:text-lg font-black text-white tracking-tight truncate leading-tight">
                {viewInfo.title}
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              {viewInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Network Sync Badge & User Chip */}
        <div className="flex items-center gap-2 shrink-0">
          <SyncStatusBadge compact={false} className="hidden lg:flex" />
          <SyncStatusBadge compact={true} className="flex lg:hidden" />

          {currentUser ? (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 transition-all text-left group"
              title="Klik untuk melihat atau berganti akun pengguna"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-200 truncate leading-tight group-hover:text-blue-400">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  {currentUser.username.toLowerCase() === 'agus' && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      SUPER
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  @{currentUser.username}
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserCircle2 className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
