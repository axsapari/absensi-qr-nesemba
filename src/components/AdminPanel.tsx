import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolLogo, LogoSMPN9Banjar, CityLogo, LogoKotaBanjar } from './SchoolLogos';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Save,
  Building2,
  Users,
  Clock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileBadge,
  Crown,
  UserPlus,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'motion/react';

export const AdminPanel: React.FC = () => {
  const {
    profilSekolah,
    updateProfilSekolah,
    setCustomSchoolLogo,
    setCustomCityLogo,
    users,
    currentUser,
    isSuperAdmin,
    addUser,
    deleteUser,
    pengaturanJam,
    updatePengaturanJam,
    resetTodayAttendance,
    reloadInitialData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'logo' | 'profil' | 'users' | 'jam' | 'maintenance'>('logo');
  const [logoPreview, setLogoPreview] = useState<string | null>(profilSekolah.customLogoUrl);
  const [cityLogoPreview, setCityLogoPreview] = useState<string | null>(profilSekolah.customLogoKotaUrl || null);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [schoolForm, setSchoolForm] = useState(profilSekolah);
  const [jamForm, setJamForm] = useState(pengaturanJam);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // New User Form State (Super Admin Only)
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'petugas'>('petugas');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [addUserFeedback, setAddUserFeedback] = useState<{ success?: boolean; message: string } | null>(null);

  // Password reset modal for specific user
  const [passwordModalUser, setPasswordModalUser] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cityFileInputRef = useRef<HTMLInputElement>(null);

  // Handle School Logo Upload File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file gambar maksimal 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLogoPreview(dataUrl);
      setCustomSchoolLogo(dataUrl);
      setUploadFeedback('Logo sekolah berhasil diunggah dan disimpan ke sistem!');
      setTimeout(() => setUploadFeedback(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  // Reset School Logo to default vector
  const handleResetDefaultLogo = () => {
    if (confirm('Kembalikan logo sekolah ke lambang resmi default SMP Negeri 9 Banjar?')) {
      setLogoPreview(null);
      setCustomSchoolLogo(null);
      setUploadFeedback('Logo sekolah dikembalikan ke lambang resmi vektor SMPN 9 Banjar.');
      setTimeout(() => setUploadFeedback(null), 3000);
    }
  };

  // Handle City Logo Upload File
  const handleCityLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file gambar maksimal 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCityLogoPreview(dataUrl);
      setCustomCityLogo(dataUrl);
      setUploadFeedback('Logo Pemerintah Kota Banjar berhasil diunggah untuk kop surat!');
      setTimeout(() => setUploadFeedback(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  // Reset City Logo to default vector Kota Banjar
  const handleResetDefaultCityLogo = () => {
    if (confirm('Kembalikan logo daerah ke lambang vektor resmi Pemerintah Kota Banjar?')) {
      setCityLogoPreview(null);
      setCustomCityLogo(null);
      setUploadFeedback('Logo daerah dikembalikan ke lambang vektor resmi Kota Banjar.');
      setTimeout(() => setUploadFeedback(null), 3000);
    }
  };

  // Handle Add New User by Super Admin
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserFeedback(null);

    const res = addUser({
      name: newUserName,
      username: newUserUsername,
      role: newUserRole,
      password: newUserPassword.trim() || undefined,
    });

    setAddUserFeedback(res);
    if (res.success) {
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setTimeout(() => {
        setShowAddUserModal(false);
        setAddUserFeedback(null);
      }, 2000);
    }
  };

  // Handle Delete User by Super Admin
  const handleDeleteUser = (userId: string, targetName: string, targetUsername: string) => {
    if (targetUsername.toLowerCase() === 'agus') {
      alert('Akun Super Admin (Agus) adalah akun induk sistem dan tidak dapat dihapus.');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus akun @${targetUsername} (${targetName}) secara permanen?`)) {
      const res = deleteUser(userId);
      alert(res.message);
    }
  };

  // Save School Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfilSekolah(schoolForm);
    setSavedSuccess('Data profil & identitas sekolah berhasil diperbarui!');
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  // Save Attendance Hours Policy
  const handleSaveJam = (e: React.FormEvent) => {
    e.preventDefault();
    updatePengaturanJam(jamForm);
    setSavedSuccess('Kebijakan jam presensi & jadwal hari sekolah berhasil disimpan!');
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  // Toggle active days
  const handleToggleDay = (day: string) => {
    const currentDays = jamForm.hari_aktif_sekolah || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    let updated: string[];
    if (currentDays.includes(day)) {
      if (currentDays.length <= 1) {
        alert('Minimal harus ada 1 hari aktif sekolah.');
        return;
      }
      updated = currentDays.filter((d) => d !== day);
    } else {
      updated = [...currentDays, day];
    }
    setJamForm({ ...jamForm, hari_aktif_sekolah: updated });
  };

  return (
    <div id="admin-panel-page" className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/90 via-slate-900 to-indigo-950 border border-blue-800/60 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600/30 rounded-2xl border border-blue-400/30 shadow-inner">
            <SchoolLogo className="w-14 h-14" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Hak Akses Administrator
              </span>
              <span className="text-xs text-slate-400">
                Login aktif: <strong className="text-white">{currentUser?.name}</strong> (@{currentUser?.username})
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
              Panel Pengaturan & Admin Sekolah
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Kelola logo sekolah, profil institusi, manajemen akun petugas/pengguna, dan kebijakan sistem presensi.
            </p>
          </div>
        </div>

        {/* Quick User Password Change Button */}
        {currentUser && (
          <button
            type="button"
            onClick={() => setPasswordModalUser(currentUser.username)}
            className="self-start md:self-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <KeyRound className="w-4 h-4 text-blue-300" />
            <span>Ubah Password Akun Saya</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('logo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'logo'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Upload Logo Sekolah</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'profil'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Profil & Identitas Sekolah</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kelola Pengguna ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jam')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'jam'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Kebijakan Jam Presensi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'maintenance'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Pemeliharaan & Reset</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {uploadFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* TAB 1: UPLOAD LOGO SEKOLAH & LOGO KOTA BANJAR */}
      {activeTab === 'logo' && (
        <div className="space-y-6">
          {/* Section 1: Logo Sekolah SMPN 9 Banjar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  1. Upload & Personalisasi Logo Sekolah (SMPN 9 Banjar)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Logo sekolah utama yang ditampilkan pada Pos Gerbang Kiosk, bagian kanan Kop Surat, dan Kartu Pelajar.
                </p>
              </div>
              {profilSekolah.customLogoUrl && (
                <button
                  type="button"
                  onClick={handleResetDefaultLogo}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ke Lambang Vektor Sekolah</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Upload Area Sekolah */}
              <div className="lg:col-span-6 space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 group-hover:bg-blue-200 text-blue-600 flex items-center justify-center mb-3 transition-colors">
                    <Upload className="w-8 h-8 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Klik untuk Memilih File Logo Sekolah
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Mendukung format PNG transparan, JPG, WebP, atau SVG. Maksimal 3MB.
                  </p>
                  <span className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm group-hover:bg-blue-700 transition-colors">
                    Pilih File Logo Sekolah
                  </span>
                </div>
              </div>

              {/* Live Preview Sekolah */}
              <div className="lg:col-span-6 bg-slate-900 rounded-2xl p-6 text-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <FileBadge className="w-4 h-4 text-blue-400" />
                    Pratinjau Logo Sekolah Aktif
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {profilSekolah.customLogoUrl ? 'Logo Kustom Sekolah' : 'Vektor Bawaan SMPN 9'}
                  </span>
                </div>

                <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800 flex items-center gap-4">
                  <SchoolLogo className="w-14 h-14 shrink-0 drop-shadow-md" />
                  <div>
                    <div className="font-black text-sm tracking-tight text-white">
                      {profilSekolah.nama}
                    </div>
                    <div className="text-[11px] text-blue-400 font-semibold">
                      SMP NEGERI 9 BANJAR • JAWA BARAT
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      NPSN: {profilSekolah.npsn}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Logo Pemerintah Kota Banjar (Kop Surat) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  2. Upload Logo Pemerintah Kota Banjar (Kop Surat Resmi)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Logo Lambang Daerah Kota Banjar yang dicantumkan pada sisi kiri Kop Surat Resmi laporan presensi & dokumen dinas.
                </p>
              </div>
              {profilSekolah.customLogoKotaUrl && (
                <button
                  type="button"
                  onClick={handleResetDefaultCityLogo}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ke Lambang Resmi Kota Banjar</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Upload Area Kota */}
              <div className="lg:col-span-6 space-y-4">
                <input
                  ref={cityFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleCityLogoChange}
                  className="hidden"
                />

                <div
                  onClick={() => cityFileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-600 flex items-center justify-center mb-3 transition-colors">
                    <Upload className="w-8 h-8 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Klik untuk Memilih File Logo Kota Banjar
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Mendukung format PNG transparan, JPG, WebP, atau SVG. Maksimal 3MB.
                  </p>
                  <span className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm group-hover:bg-emerald-700 transition-colors">
                    Pilih File Logo Kota Banjar
                  </span>
                </div>
              </div>

              {/* Live Preview Kota */}
              <div className="lg:col-span-6 bg-slate-900 rounded-2xl p-6 text-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <FileBadge className="w-4 h-4 text-emerald-400" />
                    Pratinjau Logo Daerah Aktif
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {profilSekolah.customLogoKotaUrl ? 'Logo Kustom Kota' : 'Lambang Resmi Kota Banjar'}
                  </span>
                </div>

                <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800 flex items-center gap-4">
                  <CityLogo className="w-14 h-14 shrink-0 drop-shadow-md" />
                  <div>
                    <div className="font-black text-sm tracking-tight text-white">
                      PEMERINTAH KOTA BANJAR
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      DINAS PENDIDIKAN DAN KEBUDAYAAN
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Logo Lambang Daerah Resmi untuk Kop Laporan
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Live Kop Surat Mockup */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Pratinjau Hasil Gabungan Kop Surat Resmi Sekolah
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Kiri: Logo Kota Banjar • Kanan: Logo SMPN 9 Banjar
              </span>
            </div>

            <div className="p-6 bg-slate-100 rounded-2xl flex justify-center">
              <div className="bg-white w-full max-w-[760px] p-6 rounded-xl shadow-md border border-slate-300 text-slate-900 font-serif">
                <div className="flex items-center justify-between border-b-4 border-double border-black pb-3">
                  <div className="w-16 h-16 flex items-center justify-center shrink-0" title="Logo Pemerintah Kota Banjar">
                    <CityLogo className="w-14 h-14" />
                  </div>
                  <div className="text-center flex-1 px-4">
                    <div className="text-xs uppercase tracking-wider font-bold">Pemerintah Kota Banjar</div>
                    <div className="text-[11px] uppercase font-bold">Dinas Pendidikan dan Kebudayaan</div>
                    <div className="text-base font-black uppercase tracking-tight text-emerald-950 font-sans mt-0.5">
                      {profilSekolah.nama || 'SMP NEGERI 9 BANJAR'}
                    </div>
                    <div className="text-[10px] text-slate-600 font-sans">
                      {profilSekolah.alamat}, {profilSekolah.kota} • NPSN: {profilSekolah.npsn}
                    </div>
                  </div>
                  <div className="w-16 h-16 flex items-center justify-center shrink-0" title="Logo SMP Negeri 9 Banjar">
                    <SchoolLogo className="w-14 h-14" />
                  </div>
                </div>
                <div className="text-center mt-3 font-sans">
                  <div className="text-xs font-bold text-slate-700 tracking-wider">
                    DOKUMEN REKAPITULASI PRESENSI RESMI
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIL & IDENTITAS SEKOLAH */}
      {activeTab === 'profil' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Identitas & Profil Resmi Sekolah
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Data ini akan dicantumkan pada Kop Laporan, Surat Rekap Kehadiran, dan Kartu Pelajar Siswa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Lengkap Satuan Pendidikan
              </label>
              <input
                type="text"
                value={schoolForm.nama}
                onChange={(e) => setSchoolForm({ ...schoolForm, nama: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nomor Pokok Sekolah Nasional (NPSN)
              </label>
              <input
                type="text"
                value={schoolForm.npsn}
                onChange={(e) => setSchoolForm({ ...schoolForm, npsn: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Alamat Lengkap Sekolah
              </label>
              <input
                type="text"
                value={schoolForm.alamat}
                onChange={(e) => setSchoolForm({ ...schoolForm, alamat: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kota / Kabupaten
              </label>
              <input
                type="text"
                value={schoolForm.kota}
                onChange={(e) => setSchoolForm({ ...schoolForm, kota: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Provinsi
              </label>
              <input
                type="text"
                value={schoolForm.provinsi}
                onChange={(e) => setSchoolForm({ ...schoolForm, provinsi: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Kepala Sekolah (Beserta Gelar)
              </label>
              <input
                type="text"
                value={schoolForm.kepalaSekolah}
                onChange={(e) => setSchoolForm({ ...schoolForm, kepalaSekolah: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={schoolForm.nipKepalaSekolah}
                onChange={(e) => setSchoolForm({ ...schoolForm, nipKepalaSekolah: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Sekolah
              </label>
              <input
                type="email"
                value={schoolForm.email}
                onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Website Resmi
              </label>
              <input
                type="text"
                value={schoolForm.website}
                onChange={(e) => setSchoolForm({ ...schoolForm, website: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil Sekolah</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: KELOLA PENGGUNA (USER MANAGEMENT) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Manajemen Akun & Pengguna Sistem
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pengelolaan akun login petugas & administrator sekolah.
              </p>
            </div>

            {/* If Super Admin, show Add User button */}
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => setShowAddUserModal(!showAddUserModal)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah Pengguna Baru</span>
              </button>
            ) : (
              <div className="px-3.5 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Super Admin Mode: Khusus Bpk. Agus</span>
              </div>
            )}
          </div>

          {/* Privilege explanation banner */}
          {isSuperAdmin ? (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl flex items-start gap-3 text-amber-950">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                  Hak Akses Penuh Super Admin Aktif (Bpk. Agus Sugiharto Sapari)
                </div>
                <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                  Sebagai Super Admin, hanya Anda yang berhak <strong>menambah pengguna baru</strong>, <strong>menghapus akun petugas</strong>, serta <strong>mereset kata sandi semua pengguna</strong>. Format kata sandi awal default: <span className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">[username]1234</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-slate-700">
              <div className="p-2 bg-slate-200 text-slate-700 rounded-xl shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800 text-sm">
                  Login Sebagai: {currentUser?.name} (@{currentUser?.username})
                </div>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  Sesuai kebijakan keamanan sistem, hak menambah pengguna, menghapus akun, dan mereset kata sandi pengguna lain <strong>hanya dimiliki oleh Super Admin (Bpk. Agus Sugiharto Sapari)</strong>. Anda dapat memperbarui kata sandi akun Anda sendiri melalui tombol "Ubah Sandi Saya".
                </p>
              </div>
            </div>
          )}

          {/* Add User Modal / Form (Super Admin Only) */}
          {isSuperAdmin && showAddUserModal && (
            <form onSubmit={handleCreateUser} className="p-5 bg-emerald-50/50 border-2 border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                  Formulir Tambah Akun Pengguna Baru
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="misal: Budi Santoso, S.Pd."
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username (ID Login)</label>
                  <input
                    type="text"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="misal: budi"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Peran Akses</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'petugas')}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="petugas">Petugas Presensi</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi (Opsional)</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Kosongkan = [user]1234"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {addUserFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
                    addUserFeedback.success
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addUserFeedback.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengguna Baru</span>
                </button>
              </div>
            </form>
          )}

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => {
              const isCurrent = currentUser?.username.toLowerCase() === u.username.toLowerCase();
              const isAgus = u.username.toLowerCase() === 'agus';

              return (
                <div
                  key={u.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isAgus
                      ? 'border-amber-400/80 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 shadow-sm ring-1 ring-amber-400/40'
                      : isCurrent
                      ? 'border-blue-400 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl font-black text-lg flex items-center justify-center shadow-md shrink-0 ${
                          isAgus
                            ? 'bg-gradient-to-tr from-amber-500 to-amber-600 text-white ring-2 ring-amber-300'
                            : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                        }`}
                      >
                        {isAgus ? <Crown className="w-6 h-6 text-white" /> : u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm">{u.name}</h3>
                          {isAgus && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white flex items-center gap-1">
                              <Crown className="w-3 h-3" />
                              Super Admin
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          Username: <strong className="text-blue-700 font-bold">@{u.username}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Peran: {u.role === 'admin' ? 'Administrator Sekolah' : 'Petugas Gerbang'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Password Change Action: Available to Super Admin OR to the current user for their own account */}
                      {(isSuperAdmin || isCurrent) ? (
                        <button
                          type="button"
                          onClick={() => setPasswordModalUser(u.username)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                          title="Ubah kata sandi pengguna ini"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-current" />
                          <span>{isCurrent ? 'Sandi Saya' : 'Ubah Sandi'}</span>
                        </button>
                      ) : (
                        <span
                          className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-[11px] font-semibold border border-slate-200 cursor-not-allowed"
                          title="Hanya Super Admin (Bpk. Agus) yang dapat mengubah sandi akun ini"
                        >
                          Terkunci
                        </span>
                      )}

                      {/* Delete Action: Only Super Admin can delete, and Agus cannot be deleted */}
                      {isSuperAdmin && !isAgus && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.name, u.username)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl transition-colors"
                          title={`Hapus akun @${u.username}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Kata sandi:{' '}
                      <span className="font-mono text-slate-700 font-medium">
                        {u.password ? '••••••••' : `${u.username}1234 (default)`}
                      </span>
                    </span>
                    <span>{u.lastLogin ? `Login: ${u.lastLogin}` : 'Aktif'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: KEBIJAKAN JAM PRESENSI & JADWAL HARI */}
      {activeTab === 'jam' && (
        <form onSubmit={handleSaveJam} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Kebijakan Jam Presensi & Hari Operasional Sekolah
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Atur hari operasional sekolah (Senin - Jumat) serta jam pulang khusus hari Jumat agar sistem presensi bekerja akurat.
            </p>
          </div>

          {/* Section: Hari Aktif Sekolah */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Hari Aktif Sekolah
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan hari kegiatan belajar mengajar aktif. Hari yang dipilih akan memproses scan barcode siswa.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setJamForm({
                      ...jamForm,
                      hari_aktif_sekolah: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
                    })
                  }
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold rounded-lg transition-colors"
                >
                  Set: Senin - Jumat (5 Hari)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                const isActive = (jamForm.hari_aktif_sekolah || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30'
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-300'}`} />
                    <span>{day}</span>
                    {day === 'Jumat' && (
                      <span className="text-[10px] bg-blue-500/50 px-1.5 py-0.5 rounded text-white font-normal">
                        Pulang Khusus
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 italic pt-1">
              * SMP Negeri 9 Banjar aktif beroperasi <strong>Senin sampai dengan Jumat</strong>.
            </p>
          </div>

          {/* Section: Jam Presensi Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Buka Pos Gerbang
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Pos siap menerima scan masuk</p>
              <input
                type="time"
                value={jamForm.jam_buka_pos}
                onChange={(e) => setJamForm({ ...jamForm, jam_buka_pos: e.target.value })}
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-800"
              />
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-900 mb-1">
                Batas Tepat Waktu (Bel Masuk)
              </label>
              <p className="text-[11px] text-emerald-700 mb-2">Lewat dari jam ini berstatus "Terlambat"</p>
              <input
                type="time"
                value={jamForm.batas_tepat_waktu}
                onChange={(e) => setJamForm({ ...jamForm, batas_tepat_waktu: e.target.value })}
                required
                className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-800"
              />
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
              <label className="block text-xs font-bold text-amber-900 mb-1">
                Batas Akhir Scan Masuk
              </label>
              <p className="text-[11px] text-amber-700 mb-2">Peralihan sesi masuk menuju sesi pulang</p>
              <input
                type="time"
                value={jamForm.batas_jam_masuk}
                onChange={(e) => setJamForm({ ...jamForm, batas_jam_masuk: e.target.value })}
                required
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-800"
              />
            </div>

            {/* Senin - Kamis Dismissal */}
            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
              <label className="block text-xs font-bold text-blue-900 mb-1">
                Jam Pulang Reguler (Senin - Kamis)
              </label>
              <p className="text-[11px] text-blue-700 mb-2">Mulai waktu scan pulang hari Senin s/d Kamis</p>
              <input
                type="time"
                value={jamForm.batas_jam_pulang}
                onChange={(e) => setJamForm({ ...jamForm, batas_jam_pulang: e.target.value })}
                required
                className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-blue-800"
              />
            </div>

            {/* Khusus Jumat Dismissal */}
            <div className="bg-purple-50/80 p-4 rounded-2xl border-2 border-purple-300 shadow-sm relative">
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-purple-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                Khusus Jumat
              </div>
              <label className="block text-xs font-bold text-purple-950 mb-1">
                Jam Mulai Pulang (Khusus Hari Jumat)
              </label>
              <p className="text-[11px] text-purple-800 mb-2">
                Jadwal lebih awal untuk persiapan shalat Jumat
              </p>
              <input
                type="time"
                value={jamForm.batas_jam_pulang_jumat || '11:30'}
                onChange={(e) => setJamForm({ ...jamForm, batas_jam_pulang_jumat: e.target.value })}
                required
                className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-purple-950 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Toleransi Duplikasi (Menit)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Mencegah dobel scan berturut-turut</p>
              <input
                type="number"
                min="1"
                max="60"
                value={jamForm.toleransi_duplikasi_menit}
                onChange={(e) =>
                  setJamForm({ ...jamForm, toleransi_duplikasi_menit: parseInt(e.target.value) || 5 })
                }
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Kebijakan Jam & Hari Sekolah</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: PEMELIHARAAN SISTEM */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Kontrol Pemeliharaan & Data Uji Coba
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tindakan administratif untuk keperluan pemeliharaan dan pengujian alur presensi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-700" />
                Reset Data Absensi Hari Ini
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                Menghapus rekaman scan masuk dan pulang untuk tanggal hari ini saja. Data master siswa dan riwayat tanggal lampau tetap aman.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Yakin ingin mereset seluruh data absensi hari ini? Tindakan ini berguna untuk simulasi baru.')) {
                    resetTodayAttendance();
                    alert('Data absensi hari ini berhasil direset.');
                  }
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Reset Absensi Hari Ini
              </button>
            </div>

            <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-700" />
                Muat Ulang Data Simulasi Awal
              </h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                Mengembalikan 33 data siswa SMPN 9 Banjar, 6 rombel kelas (7A-9B), dan catatan presensi percontohan jika diperlukan demo ulang.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Kembalikan data percontohan awal (33 siswa & 6 kelas)?')) {
                    reloadInitialData();
                    alert('Data percontohan awal berhasil dimuat kembali.');
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Muat Ulang Data Awal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModalUser && (
        <ChangePasswordModal
          isOpen={true}
          onClose={() => setPasswordModalUser(null)}
          targetUsername={passwordModalUser}
        />
      )}
    </div>
  );
};
