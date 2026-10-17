import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CloudUpload, Download, Loader2, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSupabaseClient } from '../lib/supabase';
import { getTodayDateString } from '../data/initialData';
import {
  KUNCI_PENGATURAN, PENGATURAN_AWAL, daftarCadangan, jalankanCadangan, perluCadangan,
  pesanGalatCadangan, unduhCadangan, type BerkasCadangan, type PengaturanCadangan,
} from '../lib/cadanganOtomatis';

const bacaPengaturan = (): PengaturanCadangan => {
  try { return { ...PENGATURAN_AWAL, ...JSON.parse(localStorage.getItem(KUNCI_PENGATURAN) || '{}') }; } catch { return PENGATURAN_AWAL; }
};
const simpanPengaturan = (p: PengaturanCadangan) => { try { localStorage.setItem(KUNCI_PENGATURAN, JSON.stringify(p)); } catch { /* abaikan */ } };
const KUNCI_HASIL = 'absensi_cadangan_otomatis_hasil_v1';

/** Berjalan di latar belakang: saat admin membuka aplikasi dan tiap jam, cek apakah cadangan sudah jatuh tempo. */
export function useCadanganOtomatis(jalankanOtomatis = false) {
  const { currentUser, supabaseConfig, profilSekolah } = useApp();
  const sibuk = useRef(false);
  const [status, setStatus] = useState<{ ok: boolean; teks: string; at: number } | null>(() => {
    try { return JSON.parse(localStorage.getItem(KUNCI_HASIL) || 'null'); } catch { return null; }
  });

  const catat = (ok: boolean, teks: string) => {
    const s = { ok, teks, at: Date.now() };
    setStatus(s);
    try { localStorage.setItem(KUNCI_HASIL, JSON.stringify(s)); } catch { /* abaikan */ }
  };

  const cadangkan = useCallback(async (paksa: boolean): Promise<void> => {
    if (sibuk.current) return;
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase || !navigator.onLine) { if (paksa) catat(false, 'Tidak ada koneksi ke Supabase.'); return; }
    const p = bacaPengaturan();
    sibuk.current = true;
    try {
      if (!paksa) {
        if (!p.aktif) return;
        if (!perluCadangan(await daftarCadangan(supabase), getTodayDateString(), p.interval)) return;
      }
      const r = await jalankanCadangan(supabase, profilSekolah?.nama || 'SMP Negeri 9 Banjar', p.simpanTerakhir);
      const total = Object.values(r.jumlah).reduce((a, b) => a + b, 0);
      catat(true, `Tersimpan ${r.nama} (${r.jumlah.siswa ?? 0} siswa, ${r.jumlah.absensi ?? 0} scan, ${total} baris).`);
    } catch (e) {
      catat(false, pesanGalatCadangan(e instanceof Error ? e.message : String(e)));
    } finally { sibuk.current = false; }
  }, [supabaseConfig, profilSekolah?.nama]);

  const bolehOtomatis = jalankanOtomatis && currentUser?.role === 'admin';
  useEffect(() => {
    if (!bolehOtomatis) return;
    const awal = setTimeout(() => { void cadangkan(false); }, 15_000);
    const tiap = setInterval(() => { void cadangkan(false); }, 60 * 60 * 1000);
    return () => { clearTimeout(awal); clearInterval(tiap); };
  }, [bolehOtomatis, cadangkan]);

  return { status, cadangkan };
}

/** Komponen tak terlihat yang menjalankan cadangan otomatis di latar belakang. */
export const CadanganRunner: React.FC = () => { useCadanganOtomatis(true); return null; };

export const CadanganOtomatisPanel: React.FC = () => {
  const { supabaseConfig, currentUser } = useApp();
  const { status, cadangkan } = useCadanganOtomatis();
  const [p, setP] = useState<PengaturanCadangan>(() => bacaPengaturan());
  const [berkas, setBerkas] = useState<BerkasCadangan[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const ubah = (patch: Partial<PengaturanCadangan>) => { const n = { ...p, ...patch }; setP(n); simpanPengaturan(n); };

  const muat = useCallback(async () => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) return;
    try { setBerkas(await daftarCadangan(supabase)); setGalat(null); }
    catch (e) { setGalat(pesanGalatCadangan(e instanceof Error ? e.message : String(e))); }
  }, [supabaseConfig]);
  useEffect(() => { void muat(); }, [muat, status?.at]);

  const sekarang = async () => { setSibuk(true); await cadangkan(true); await muat(); setSibuk(false); };
  const unduh = async (nama: string) => {
    const supabase = getSupabaseClient(supabaseConfig);
    if (supabase) try { await unduhCadangan(supabase, nama); } catch (e) { setGalat(e instanceof Error ? e.message : String(e)); }
  };

  const terbaru = berkas?.[0];
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 md:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600"><CloudUpload className="w-6 h-6" /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Cadangan Otomatis ke Supabase</h3>
            <p className="text-xs text-slate-500">Dibuat otomatis saat admin membuka aplikasi. Isinya data lengkap dari database (siswa, kelas, scan, catatan izin/sakit), tanpa token WhatsApp dan sandi.</p>
          </div>
        </div>
        <button type="button" onClick={sekarang} disabled={sibuk || currentUser?.role !== 'admin'}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl cursor-pointer">
          {sibuk ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />} Cadangkan Sekarang
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={p.aktif} onChange={(e) => ubah({ aktif: e.target.checked })} className="w-4 h-4 accent-sky-600" /> Otomatis aktif
        </label>
        <select value={p.interval} onChange={(e) => ubah({ interval: e.target.value as PengaturanCadangan['interval'] })} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-700">
          <option value="harian">Setiap hari</option>
          <option value="mingguan">Setiap minggu</option>
        </select>
        <select value={p.simpanTerakhir} onChange={(e) => ubah({ simpanTerakhir: Number(e.target.value) })} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-700">
          {[4, 8, 12, 24].map((n) => <option key={n} value={n}>Simpan {n} cadangan terakhir</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span className="text-slate-600">
          {terbaru ? <>Cadangan terakhir di server: <b>{terbaru.tanggal}</b> ({berkas?.length} tersimpan)</> : berkas ? 'Belum ada cadangan di server.' : 'Memeriksa...'}
        </span>
        <button type="button" onClick={muat} className="ml-auto text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Segarkan</button>
      </div>

      {status && (
        <div className={`text-xs font-semibold rounded-xl px-3 py-2 border ${status.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
          {new Date(status.at).toLocaleString('id-ID')} — {status.teks}
        </div>
      )}
      {galat && (
        <div className="flex items-start gap-2 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {galat}
        </div>
      )}

      {berkas && berkas.length > 0 && (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {berkas.slice(0, 6).map((b) => (
            <div key={b.name} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="font-mono text-slate-700">{b.name}{b.ukuran ? ` · ${(b.ukuran / 1024).toFixed(0)} KB` : ''}</span>
              <button type="button" onClick={() => unduh(b.name)} className="flex items-center gap-1 font-bold text-sky-700 hover:text-sky-900 cursor-pointer"><Download className="w-3.5 h-3.5" /> Unduh</button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500">
        Berkas .json.gz dapat dibuka dengan 7-Zip/WinRAR. Cadangan ini jaring pengaman bila data Supabase rusak atau terhapus; pemulihannya dilakukan dengan bantuan pengembang. Untuk perlindungan ekstra, tetap unduh cadangan manual ke flashdisk setiap akhir semester.
      </p>
    </div>
  );
};
