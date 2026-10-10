import React, { useMemo, useState } from 'react';
import { Archive, FileJson, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, HardDrive, Trash2, CloudDownload, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp, DataSemester } from '../context/AppContext';
import { getTodayDateString } from '../data/initialData';
import { daftarSemester, Semester, semesterSudahBerakhir, tanggalDalam } from '../lib/semester';
import { bangunJsonArsip, bangunWorkbook, hitungArsip, namaBerkasArsip } from '../lib/arsipSemester';
import { formatUkuran, safeSetItem, ukurPenyimpanan } from '../lib/storageUsage';

const RIWAYAT_ARSIP_KEY = 'absensi_arsip_riwayat_v1';
const RIWAYAT_MAKAN_SIANG_KEY = 'absensi_rekap_makan_siang_v1';

type CatatanArsip = Record<string, { json?: string; xlsx?: string; dibersihkan?: string }>;
const bacaCatatanArsip = (): CatatanArsip => { try { return JSON.parse(localStorage.getItem(RIWAYAT_ARSIP_KEY) || '{}'); } catch { return {}; } };
const waktuLabel = (iso?: string) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '');

export const ArsipSemester: React.FC = () => {
  const { siswaList, kelasList, profilSekolah, ambilDataSemester, hapusDataLokalRentang, pullFullHistory, isSyncing } = useApp();
  const today = getTodayDateString();
  const semesters = useMemo(() => daftarSemester(today, 6), [today]);
  const [pilihId, setPilihId] = useState<string>(semesters[1]?.id || semesters[0].id);
  const semester: Semester = semesters.find((s) => s.id === pilihId) || semesters[0];
  const berakhir = semesterSudahBerakhir(semester, today);

  const [catatanArsip, setCatatanArsip] = useState<CatatanArsip>(() => bacaCatatanArsip());
  const [memuat, setMemuat] = useState(false);
  const [data, setData] = useState<{ sem: Semester; hasil: DataSemester } | null>(null);
  const [diunduh, setDiunduh] = useState<{ json: boolean; xlsx: boolean }>({ json: false, xlsx: false });
  const [konfirmasi, setKonfirmasi] = useState('');
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [pakaiPenyimpanan, setPakaiPenyimpanan] = useState(() => ukurPenyimpanan());
  const [tarikKonfirmasi, setTarikKonfirmasi] = useState(false);

  const segarkanPenyimpanan = () => setPakaiPenyimpanan(ukurPenyimpanan());
  const simpanCatatan = (id: string, patch: CatatanArsip[string]) => {
    const next = { ...bacaCatatanArsip(), [id]: { ...bacaCatatanArsip()[id], ...patch } };
    safeSetItem(RIWAYAT_ARSIP_KEY, JSON.stringify(next));
    setCatatanArsip(next);
  };

  const ringkasan = useMemo(() => {
    if (!data || data.sem.id !== semester.id) return null;
    return hitungArsip({
      siswaList, kelasList, absensi: data.hasil.absensi, catatan: data.hasil.catatan,
      resolveNisn: (id) => data.hasil.nisnById[id],
    });
  }, [data, semester.id, siswaList, kelasList]);

  const riwayatMakanSiang = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(RIWAYAT_MAKAN_SIANG_KEY) || '{}') as Record<string, any>;
      return Object.values(raw).filter((r: any) => r?.tanggal && tanggalDalam(r.tanggal, semester)).sort((a: any, b: any) => a.tanggal.localeCompare(b.tanggal));
    } catch { return []; }
  };

  const siapkan = async () => {
    setMemuat(true); setPesan(null); setDiunduh({ json: false, xlsx: false }); setKonfirmasi('');
    const hasil = await ambilDataSemester(semester.mulai, semester.selesai);
    setData({ sem: semester, hasil });
    setMemuat(false);
  };

  const unduhJson = () => {
    if (!data || !ringkasan) return;
    const json = bangunJsonArsip({
      semester, sekolah: profilSekolah.nama, dibuatAt: new Date().toISOString(), sumber: data.hasil.sumber,
      siswaList, kelasList, absensi: data.hasil.absensi, catatan: data.hasil.catatan, riwayatMakanSiang: riwayatMakanSiang(),
    });
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = namaBerkasArsip(semester, 'json');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setDiunduh((d) => ({ ...d, json: true }));
    simpanCatatan(semester.id, { json: new Date().toISOString() });
  };

  const unduhExcel = () => {
    if (!data || !ringkasan) return;
    const wb = bangunWorkbook({
      semester, sekolah: profilSekolah.nama, dibuatAt: new Date().toLocaleString('id-ID'), sumber: data.hasil.sumber,
      hasil: ringkasan, riwayatMakanSiang: riwayatMakanSiang() as any,
    });
    XLSX.writeFile(wb, namaBerkasArsip(semester, 'xlsx'));
    setDiunduh((d) => ({ ...d, xlsx: true }));
    simpanCatatan(semester.id, { xlsx: new Date().toISOString() });
  };

  const bolehBersihkan = berakhir && !!data && data.sem.id === semester.id && data.hasil.sumber === 'supabase' && diunduh.json && diunduh.xlsx;
  const bersihkan = () => {
    if (!bolehBersihkan || konfirmasi.trim().toUpperCase() !== 'HAPUS') return;
    const r = hapusDataLokalRentang(semester.mulai, semester.selesai);
    simpanCatatan(semester.id, { dibersihkan: new Date().toISOString() });
    setKonfirmasi('');
    setPesan({ ok: true, teks: `Data lokal dibersihkan: ${r.absensi} absensi, ${r.catatan} catatan, ${r.log} log WA. Data di Supabase tidak diubah.` });
    setTimeout(segarkanPenyimpanan, 300);
  };

  const tarikRiwayat = async () => {
    setTarikKonfirmasi(false);
    const r = await pullFullHistory();
    setPesan({ ok: r.success, teks: r.message });
    setTimeout(segarkanPenyimpanan, 300);
  };

  const warnaLevel = pakaiPenyimpanan.level === 'kritis' ? 'bg-rose-500' : pakaiPenyimpanan.level === 'waspada' ? 'bg-amber-500' : 'bg-emerald-500';
  const adaPeringatan = data?.hasil.peringatan;

  return (
    <div id="arsip-semester" className="space-y-6">
      {/* PENYIMPANAN */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><HardDrive className="w-5 h-5 text-slate-500" /> Penyimpanan Browser di Perangkat Ini</h3>
          <button type="button" onClick={segarkanPenyimpanan} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Segarkan</button>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${warnaLevel}`} style={{ width: `${Math.max(2, pakaiPenyimpanan.persen)}%` }} />
        </div>
        <div className="text-xs text-slate-600">
          Terpakai <b>{formatUkuran(pakaiPenyimpanan.totalChars)}</b> dari ±{formatUkuran(pakaiPenyimpanan.limitChars)} ({pakaiPenyimpanan.persen}%)
          {pakaiPenyimpanan.level !== 'aman' && <span className="ml-2 font-bold text-amber-700">Segera arsipkan semester lama lalu bersihkan data lokal.</span>}
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          {pakaiPenyimpanan.perKunci.slice(0, 4).map((k) => `${k.key.replace('absensi_', '').replace('_v1', '')}: ${formatUkuran(k.chars)}`).join('  •  ')}
        </div>
      </div>

      {/* LANGKAH 1 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Archive className="w-5 h-5 text-emerald-600" /> Arsip Semester (JSON + Excel)</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Dilakukan setiap akhir semester: <b>1)</b> siapkan data lengkap dari Supabase, <b>2)</b> unduh JSON dan Excel, <b>3)</b> bila perlu bersihkan data lokal agar penyimpanan browser tidak penuh.
          Data di Supabase <b>tidak dihapus</b>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={pilihId}
            onChange={(e) => { setPilihId(e.target.value); setPesan(null); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800"
          >
            {semesters.map((s) => {
              const c = catatanArsip[s.id];
              const status = c?.json && c?.xlsx ? ' ✓ sudah diarsipkan' : semesterSudahBerakhir(s, today) ? ' • belum diarsipkan' : ' (berjalan)';
              return <option key={s.id} value={s.id}>{s.label}{status}</option>;
            })}
          </select>
          <button type="button" onClick={siapkan} disabled={memuat || isSyncing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer">
            {memuat ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
            {memuat ? 'Mengambil data...' : '1. Siapkan Data Semester'}
          </button>
          <span className="text-[11px] text-slate-500">{semester.mulai} s.d. {semester.selesai}</span>
        </div>

        {adaPeringatan && (
          <div className="flex items-start gap-2 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {adaPeringatan}
          </div>
        )}

        {ringkasan && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              {[
                ['Hari efektif', ringkasan.hariEfektif.length],
                ['Siswa', ringkasan.perSiswa.length],
                ['Data scan', data.hasil.absensi.length],
                ['Catatan', data.hasil.catatan.length],
                ['Sumber', data.hasil.sumber === 'supabase' ? 'Supabase' : 'Lokal'],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-slate-50 border border-slate-200 rounded-xl py-3">
                  <div className="text-lg font-black text-slate-900">{v}</div>
                  <div className="text-[11px] text-slate-500 font-semibold">{k}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={unduhJson} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer">
                <FileJson className="w-4 h-4" /> 2a. Unduh JSON {diunduh.json && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
              </button>
              <button type="button" onClick={unduhExcel} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" /> 2b. Unduh Excel {diunduh.xlsx && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
              </button>
              <span className="text-[11px] text-slate-500">Simpan kedua berkas di tempat aman (flashdisk / Google Drive sekolah).</span>
            </div>

            {/* LANGKAH 3 */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-600" /> 3. Bersihkan data lokal semester ini (opsional)</h4>
              {!berakhir ? (
                <p className="text-xs text-slate-500">Semester yang masih berjalan tidak dapat dibersihkan karena masih dipakai Dashboard Rekap.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Membebaskan penyimpanan browser dengan membuang data semester ini <b>dari perangkat ini saja</b>. Rekap semester ini tidak lagi tampil di Dashboard (gunakan arsip), kecuali Anda memakai <i>Tarik Seluruh Riwayat</i>.
                    Hanya aktif jika data diambil dari Supabase <b>dan</b> JSON + Excel sudah diunduh.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} placeholder='Ketik HAPUS'
                      disabled={!bolehBersihkan}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono w-36 disabled:opacity-50"
                    />
                    <button type="button" onClick={bersihkan} disabled={!bolehBersihkan || konfirmasi.trim().toUpperCase() !== 'HAPUS'}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl disabled:opacity-40 cursor-pointer">
                      Bersihkan Data Lokal
                    </button>
                    {!bolehBersihkan && <span className="text-[11px] text-slate-500">Belum aktif: selesaikan langkah 1 dan 2 (data harus dari Supabase).</span>}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {pesan && (
          <div className={`text-xs font-semibold rounded-xl px-3 py-2 border ${pesan.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>{pesan.teks}</div>
        )}

        {catatanArsip[semester.id]?.json && (
          <div className="text-[11px] text-slate-500">
            Riwayat arsip {semester.label}: JSON {waktuLabel(catatanArsip[semester.id].json)}
            {catatanArsip[semester.id].xlsx ? `, Excel ${waktuLabel(catatanArsip[semester.id].xlsx)}` : ''}
            {catatanArsip[semester.id].dibersihkan ? `, data lokal dibersihkan ${waktuLabel(catatanArsip[semester.id].dibersihkan)}` : ''}.
          </div>
        )}
      </div>

      {/* RIWAYAT */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Tarik Seluruh Riwayat dari Supabase</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Sinkron biasa hanya menarik data semester berjalan/2 minggu terakhir agar cepat. Gunakan ini bila perlu melihat semester lama di Dashboard (mis. perangkat baru). Dapat memakan banyak ruang penyimpanan.
        </p>
        {!tarikKonfirmasi ? (
          <button type="button" onClick={() => setTarikKonfirmasi(true)} disabled={isSyncing} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-bold rounded-xl disabled:opacity-50 cursor-pointer">Tarik Seluruh Riwayat...</button>
        ) : (
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-amber-800">Yakin? Data lama akan diunduh ulang dan memenuhi penyimpanan.</span>
            <button type="button" onClick={tarikRiwayat} className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg cursor-pointer">Ya, tarik</button>
            <button type="button" onClick={() => setTarikKonfirmasi(false)} className="px-3 py-1.5 text-slate-500 font-bold cursor-pointer">Batal</button>
          </div>
        )}
      </div>
    </div>
  );
};
