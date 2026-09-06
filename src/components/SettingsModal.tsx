import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SUPABASE_SQL_SCHEMA, getSupabaseClient } from '../lib/supabase';
import { DEFAULT_WA_CONFIG, formatPhoneNumber } from '../lib/whatsapp';
import {
  Clock,
  MessageSquare,
  Database,
  Copy,
  Check,
  Send,
  RefreshCw,
  Sliders,
  Shield,
  Save,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    pengaturanJam,
    updatePengaturanJam,
    waConfig,
    updateWAConfig,
    supabaseConfig,
    updateSupabaseConfig,
    reloadInitialData,
    resetTodayAttendance,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'jam' | 'wa' | 'supabase'>('jam');
  const [copiedSql, setCopiedSql] = useState(false);
  const [testPhone, setTestPhone] = useState('081234567890');
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);

  // Form states
  const [jamForm, setJamForm] = useState(pengaturanJam);
  const [waForm, setWaForm] = useState(waConfig);
  const [supabaseForm, setSupabaseForm] = useState(supabaseConfig);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Handle Save Jam
  const handleSaveJam = (e: React.FormEvent) => {
    e.preventDefault();
    updatePengaturanJam(jamForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Handle Save WA
  const handleSaveWA = (e: React.FormEvent) => {
    e.preventDefault();
    updateWAConfig(waForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Handle Save Supabase
  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig(supabaseForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Copy Supabase SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Test WhatsApp -- benar-benar memanggil Supabase Edge Function `send-wa-notification`,
  // supaya bisa dipakai untuk memastikan token & secret di Supabase sudah benar.
  const handleTestWhatsApp = async () => {
    const formatted = formatPhoneNumber(testPhone);
    const supabase = getSupabaseClient(supabaseConfig);

    if (!supabase) {
      setTestResultMsg(
        'Supabase belum dikonfigurasi (lihat tab Supabase). Edge Function untuk pengiriman WA memerlukan koneksi Supabase.'
      );
      return;
    }

    setTestResultMsg('Menghubungi Edge Function send-wa-notification...');
    try {
      const { data, error } = await supabase.functions.invoke('send-wa-notification', {
        body: {
          provider: waForm.provider,
          endpointUrl: waForm.endpointUrl,
          targetPhone: formatted,
          message: `Ini pesan uji coba dari Sistem Presensi Digital pada ${new Date().toLocaleString('id-ID')}.`,
        },
      });

      if (error) {
        setTestResultMsg(
          `Gagal memanggil Edge Function: ${error.message}. Pastikan function "send-wa-notification" sudah di-deploy di Supabase Dashboard.`
        );
        return;
      }

      if (data?.success) {
        setTestResultMsg(`Berhasil! Pesan uji coba dikirim ke ${formatted}. Cek HP tujuan.`);
      } else {
        setTestResultMsg(
          `Edge Function merespons tapi gagal mengirim: ${JSON.stringify(data?.response || data)}. Periksa apakah secret WA_API_TOKEN sudah diisi dengan benar di Supabase.`
        );
      }
    } catch (err) {
      setTestResultMsg(
        `Gagal menghubungi Edge Function: ${err instanceof Error ? err.message : 'Kesalahan tak dikenal'}`
      );
    }
  };

  return (
    <div id="settings-page" className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-600" />
            <span>Pengaturan Sistem & Integrasi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi jam operasional masuk/pulang, integrasi WhatsApp Gateway, dan skema database Supabase.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Pengaturan Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('jam')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'jam'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Aturan Jam & Toleransi</span>
        </button>

        <button
          onClick={() => setActiveTab('wa')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'wa'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'supabase'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Database Supabase (SQL DDL)</span>
        </button>
      </div>

      {/* TAB 1: PENGATURAN JAM */}
      {activeTab === 'jam' && (
        <form onSubmit={handleSaveJam} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-900">Aturan Jam Kedatangan & Kepulangan</h3>
            <p className="text-xs text-slate-500">
              Sistem akan menentukan secara otomatis apakah scan barcode termasuk Masuk (Tepat Waktu / Terlambat) atau Pulang berdasarkan jam berikut.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Batas Jam Tepat Waktu Kedatangan (HH:mm)
              </label>
              <input
                type="time"
                value={jamForm.batas_tepat_waktu}
                onChange={(e) => setJamForm({ ...jamForm, batas_tepat_waktu: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Scan sebelum jam ini dicatat sebagai <strong>Hadir Tepat Waktu</strong> (contoh: 07:15).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Batas Jam Akhir Masuk / Terlambat (HH:mm)
              </label>
              <input
                type="time"
                value={jamForm.batas_jam_masuk}
                onChange={(e) => setJamForm({ ...jamForm, batas_jam_masuk: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Scan antara batas tepat waktu s.d jam ini dicatat sebagai <strong>Hadir Terlambat</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Batas Jam Mulai Kepulangan (HH:mm)
              </label>
              <input
                type="time"
                value={jamForm.batas_jam_pulang}
                onChange={(e) => setJamForm({ ...jamForm, batas_jam_pulang: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Scan setelah jam ini otomatis diklasifikasikan sebagai <strong>Absensi Kepulangan</strong> (contoh: 12:30).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pencegahan Duplikasi / Anti-Double Tap (Menit)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={jamForm.toleransi_duplikasi_menit}
                onChange={(e) =>
                  setJamForm({ ...jamForm, toleransi_duplikasi_menit: parseInt(e.target.value) || 5 })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Jika siswa yang sama scan ulang dalam rentang ini, sistem mengeluarkan peringatan tanpa menduplikasi data.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset rekap kehadiran hari ini untuk uji coba ulang?')) {
                  resetTodayAttendance();
                  alert('Data absensi hari ini berhasil direset.');
                }
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
            >
              Reset Data Absensi Hari Ini Saja
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Aturan Jam</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: WHATSAPP GATEWAY */}
      {activeTab === 'wa' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveWA}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Konfigurasi WhatsApp Gateway REST API</h3>
              <p className="text-xs text-slate-500">
                Hubungkan dengan provider gateway WhatsApp (Fonnte, Wablas, atau Custom REST API) untuk otomatisasi pengiriman pesan ke orang tua siswa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pilihan Provider Gateway
                </label>
                <select
                  value={waForm.provider}
                  onChange={(e) => {
                    const p = e.target.value as 'fonnte' | 'wablas' | 'custom';
                    let endpoint = 'https://api.fonnte.com/send';
                    if (p === 'wablas') endpoint = 'https://phone.wablas.com/api/send-message';
                    setWaForm({ ...waForm, provider: p, endpointUrl: endpoint });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="fonnte">Fonnte (Rekomendasi Indonesia)</option>
                  <option value="wablas">Wablas Webhook API</option>
                  <option value="custom">Custom REST API Webhook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  API Key / Token Gateway
                </label>
                <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 leading-relaxed">
                  Token API <strong>tidak lagi diatur di sini</strong> demi keamanan (supaya tidak
                  terlihat siapa pun lewat browser). Atur token di{' '}
                  <strong>Supabase Dashboard → Edge Functions → send-wa-notification → Manage secrets</strong>,
                  dengan nama secret <code className="font-mono bg-amber-100 px-1 rounded">WA_API_TOKEN</code>.
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Endpoint URL Gateway
              </label>
              <input
                type="text"
                value={waForm.endpointUrl}
                onChange={(e) => setWaForm({ ...waForm, endpointUrl: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Template Messages */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-bold text-slate-800">
                Template Pesan WhatsApp (Dapat menggunakan variabel: {'{nama}'}, {'{kelas}'}, {'{nama_ortu}'}, {'{waktu}'}, {'{tanggal}'})
              </h4>

              <div>
                <label className="block text-xs font-semibold text-emerald-700 mb-1">
                  1. Template Kedatangan Tepat Waktu:
                </label>
                <textarea
                  rows={3}
                  value={waForm.templateMasuk}
                  onChange={(e) => setWaForm({ ...waForm, templateMasuk: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1">
                  2. Template Kedatangan Terlambat:
                </label>
                <textarea
                  rows={3}
                  value={waForm.templateTerlambat}
                  onChange={(e) => setWaForm({ ...waForm, templateTerlambat: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">
                  3. Template Kepulangan:
                </label>
                <textarea
                  rows={3}
                  value={waForm.templatePulang}
                  onChange={(e) => setWaForm({ ...waForm, templatePulang: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan WhatsApp</span>
              </button>
            </div>
          </form>

          {/* Test Sender Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-800">Uji Coba Pengiriman Pesan WhatsApp</h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Nomor WA Percobaan (misal 0812...)"
                className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleTestWhatsApp}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Pesan Uji Coba</span>
              </button>
            </div>

            {testResultMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                {testResultMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE SUPABASE */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          {/* Supabase Connection Setup */}
          <form
            onSubmit={handleSaveSupabase}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Koneksi Supabase (Opsional)</h3>
                <p className="text-xs text-slate-500">
                  Aplikasi sudah memiliki penyimpanan data lokal persisten. Anda juga dapat menghubungkannya langsung ke proyek Supabase PostgreSQL Anda.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {supabaseForm.url ? 'Terkonfigurasi' : 'Penyimpanan Lokal Aktif'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={supabaseForm.url}
                  onChange={(e) => setSupabaseForm({ ...supabaseForm, url: e.target.value })}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  value={supabaseForm.anonKey}
                  onChange={(e) => setSupabaseForm({ ...supabaseForm, anonKey: e.target.value })}
                  placeholder="eyJh..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Kredensial Supabase</span>
              </button>
            </div>
          </form>

          {/* Supabase SQL DDL Schema Script */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Skema SQL Database Supabase (PostgreSQL DDL)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Salin dan tempelkan script berikut ke menu <strong>SQL Editor</strong> di dashboard Supabase Anda.
                </p>
              </div>

              <button
                id="copy-sql-schema-btn"
                onClick={handleCopySql}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Semua SQL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>

          {/* Reset All Data to Fresh Demo */}
          <div className="p-4 bg-slate-100 rounded-2xl flex items-center justify-between text-xs">
            <div className="text-slate-600">
              Ingin mengembalikan data awal simulasi (siswa, kelas, dan contoh absensi)?
            </div>
            <button
              onClick={() => {
                if (confirm('Kembalikan data ke contoh awal pabrikan (32 siswa SMP Harapan Bangsa)?')) {
                  reloadInitialData();
                  alert('Data berhasil di-reload.');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Data Sampel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
