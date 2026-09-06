import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolLogo } from './SchoolLogos';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onCancel }) => {
  const { users, currentUser, loginUser, profilSekolah } = useApp();

  const [selectedUsername, setSelectedUsername] = useState<string>(
    currentUser?.username || 'agus'
  );
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectUser = (uname: string) => {
    setSelectedUsername(uname);
    setErrorMsg(null);
    setSuccessMsg(null);
    // Suggest default password in placeholder or clear
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Masukkan kata sandi terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = loginUser(selectedUsername, password);
      setIsLoading(false);

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 500);
      } else {
        setErrorMsg(res.message);
      }
    }, 300);
  };

  const targetAccount = users.find(
    (u) => u.username.toLowerCase() === selectedUsername.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Decorative backdrop glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 text-white">
          {/* Header & Logo */}
          <div className="text-center flex flex-col items-center mb-6">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-inner mb-3">
              <SchoolLogo className="w-16 h-16 drop-shadow-md" />
            </div>
            <span className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">
              Aplikasi Presensi Siswa Digital
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">
              {profilSekolah.nama || 'SMP NEGERI 9 BANJAR'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Silakan pilih pengguna dan masukkan kata sandi untuk masuk
            </p>
          </div>

          {/* User Selection Chips */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Pilih Akun Pengguna:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => {
                const isSelected =
                  u.username.toLowerCase() === selectedUsername.toLowerCase();
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u.username)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm shadow-blue-500/20'
                        : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800/90 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-slate-100">
                        {u.username}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {u.name.split(' ')[0]}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Active User Name Banner */}
            {targetAccount && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                  {targetAccount.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">Masuk sebagai:</div>
                  <div className="text-sm font-bold text-white truncate">
                    {targetAccount.name}
                  </div>
                  <div className="text-[11px] text-blue-400 font-mono">
                    @{targetAccount.username} • Administrator
                  </div>
                </div>
              </div>
            )}

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 transition-colors"
                  title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] font-bold text-sm text-white rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk ke Sistem Presensi</span>
                </>
              )}
            </button>
          </form>

          {onCancel && (
            <div className="mt-5 pt-4 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
              >
                ← Kembali ke Layar Scan
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
