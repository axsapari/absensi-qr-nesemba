import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar, AppView } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { PersistentFooter } from './components/PersistentFooter';
import { ScanKiosk } from './components/ScanKiosk';
import { RekapDashboard } from './components/RekapDashboard';
import { MasterData } from './components/MasterData';
import { KartuPelajar } from './components/KartuPelajar';
import { BackupRestore } from './components/BackupRestore';
import { AdminPanel } from './components/AdminPanel';
import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './components/LoginPage';
import { SyncNotificationToast } from './components/SyncNotificationToast';
import { BootstrapSupabase } from './BootstrapSupabase';

// Halaman yang WAJIB login untuk diakses. Layar scan (kiosk) sengaja dikecualikan
// karena itu memang layar publik yang dipakai penjaga gerbang tanpa perlu login tiap pagi.
const PROTECTED_VIEWS: AppView[] = ['rekap', 'master', 'kartu', 'backup', 'admin', 'settings'];

function MainApp() {
  const { currentUser, authChecking, supabaseConfig } = useApp();
  const [currentView, setCurrentView] = useState<AppView>('kiosk');
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleSelectCetakSiswa = (siswaId: string) => {
    setSelectedStudentForCard(siswaId);
    setCurrentView('kartu');
  };

  // Wajibkan login kalau halaman yang sedang dituju termasuk yang dilindungi
  // dan belum ada pengguna yang login -- dievaluasi ulang di setiap render,
  // jadi otomatis kembali ke layar login juga kalau pengguna logout.
  const needsLogin = PROTECTED_VIEWS.includes(currentView) && !currentUser;

  // Bootstrap hanya muncul untuk halaman yang memang butuh Supabase (di luar layar
  // scan). Layar Pos Gerbang (kiosk) TIDAK BOLEH terkunci oleh ini -- itu bertentangan
  // dengan desain awal aplikasi (kiosk tetap harus bisa jalan/offline walau perangkat
  // itu belum pernah diisi pengaturan Supabase-nya sendiri).
  if ((!supabaseConfig.url || !supabaseConfig.anonKey) && currentView !== 'kiosk') {
    return <BootstrapSupabase />;
  }

  // Sedang mengecek sesi Supabase Auth (sekali saat app dibuka) -- tampilkan loading
  // singkat, jangan langsung anggap "belum login" supaya tidak salah kedip ke layar
  // login padahal sesinya sebenarnya masih ada.
  if (authChecking && PROTECTED_VIEWS.includes(currentView)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs">Memeriksa sesi masuk...</span>
        </div>
      </div>
    );
  }

  // If user opens login page (baik lewat tombol login, maupun karena mengakses halaman terkunci)
  if (showLoginModal || needsLogin) {
    return (
      <LoginPage
        onSuccess={() => setShowLoginModal(false)}
        onCancel={() => {
          setShowLoginModal(false);
          setCurrentView('kiosk');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* 1. Left Sidebar Navigation (Desktop Fixed & Mobile Drawer) */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {/* 2. Main Content Area (Offset to right by md:pl-64) */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <TopHeader
          currentView={currentView}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenLoginModal={() => setShowLoginModal(true)}
        />

        {/* Dynamic View Body (with pb-16 to guarantee clearance above fixed persistent footer) */}
        <main className="flex-1 pb-16">
          {currentView === 'kiosk' && <ScanKiosk />}
          {currentView === 'rekap' && <RekapDashboard />}
          {currentView === 'master' && <MasterData onSelectCetakSiswa={handleSelectCetakSiswa} />}
          {currentView === 'kartu' && <KartuPelajar initialSelectedId={selectedStudentForCard} />}
          {currentView === 'backup' && <BackupRestore />}
          {currentView === 'admin' && <AdminPanel />}
          {currentView === 'settings' && <SettingsModal />}
        </main>

        {/* 3. Persistent Footer (Fixed at bottom, stays visible while scrolling) */}
        <PersistentFooter />
      </div>

      <SyncNotificationToast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
