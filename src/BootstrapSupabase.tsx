import React, { useState } from 'react';
import { Database, Save, ShieldCheck } from 'lucide-react';
import { useApp } from './context/AppContext';

/**
 * Bootstrap screen for a fresh device. Settings is intentionally protected by
 * Supabase Auth, so a device without URL/anon key would otherwise deadlock:
 * cannot login -> cannot open Settings -> cannot configure Supabase.
 */
export const BootstrapSupabase: React.FC = () => {
  const { supabaseConfig, updateSupabaseConfig } = useApp();
  const [url, setUrl] = useState(supabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;
    updateSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim(), connected: true });
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white p-7">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black">Konfigurasi Supabase</h1>
              <p className="text-xs text-slate-400">Pengaturan awal perangkat ini</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-7 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
            <strong>Perangkat baru?</strong> Masukkan Project URL dan Anon Key Supabase terlebih dahulu.
            Setelah disimpan, aplikasi akan kembali ke proses login normal. Menu Settings tetap terlindungi.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supabase Project URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxxxxxx.supabase.co"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supabase Anon Key</label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500"
              autoComplete="off"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5 py-3 transition"
          >
            <Save className="w-4 h-4" />
            Simpan & Lanjut ke Login
          </button>

          {saved && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <ShieldCheck className="w-4 h-4" /> Konfigurasi tersimpan. Silakan lanjut login.
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Gunakan <strong>Anon/Public Key</strong>, bukan service_role key. Key disimpan di localStorage perangkat ini.
          </p>
        </form>
      </div>
    </div>
  );
};
