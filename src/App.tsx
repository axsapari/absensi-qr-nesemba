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

// Halaman yang WAJIB login untuk diakses. Layar scan (kiosk) sengaja dikecualikan
// karena itu memang layar publik yang dipakai penjaga gerbang tanpa perlu login tiap pagi.
const PROTECTED_VIEWS: AppView[] = ['rekap', 'master', 'kartu', 'backup', 'admin', 'settings'];

function MainApp() {
  const { currentUser } = useApp();
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
