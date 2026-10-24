import React, { useMemo, useState } from 'react';
import { GraduationCap, AlertTriangle, CheckCircle2, ArrowRight, Undo2, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../data/initialData';
import { safeSetItem } from '../lib/storageUsage';
import {
  buatDataUrungkan,
  cekKesiapan,
  perubahanUrungkan,
  rencanakanNaikKelas,
  type CatatanArsip,
  type DataUrungkan,
} from '../lib/naikKelas';

export const ARSIP_KEY = 'absensi_arsip_riwayat_v1';
export const URUNGKAN_KEY = 'absensi_naikkelas_urungkan_v1';
export const KATA_KONFIRMASI = 'NAIK KELAS';

const bacaArsip = (): CatatanArsip => {
  try { return JSON.parse(localStorage.getItem(ARSIP_KEY) || '{}'); } catch { return {}; }
};
const bacaUrungkan = (): DataUrungkan | null => {
  try {
    const raw = localStorage.getItem(URUNGKAN_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && Array.isArray(d.siswa) ? d : null;
  } catch { return null; }
};

export const NaikKelas: React.FC = () => {
  const { siswaList, kelasList, pendingSyncCount, updateSiswaBatch, createLocalSnapshot } = useApp();
  const today = getTodayDateString();

  const [kecualikan, setKecualikan] = useState<Set<string>>(new Set());
  const [paham, setPaham] = useState(false);
  const [ketik, setKetik] = useState('');
  const [urungkan, setUrungkan] = useState<DataUrungkan | null>(() => bacaUrungkan());
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [konfirmUrungkan, setKonfirmUrungkan] = useState(false);

  const rencana = useMemo(() => rencanakanNaikKelas(siswaList, kelasList, kecualikan, getTodayDateString()), [siswaList, kelasList, kecualikan]);
  const kesiapan = useMemo(
    () => cekKesiapan({
      today,
      catatanArsip: bacaArsip(),
      belumSinkron: pendingSyncCount,
      tahunAjaranTerakhirDiterapkan: urungkan?.tahunAjaran ?? null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, pendingSyncCount, urungkan, pesan],
  );

  const butuhPaham = kesiapan.peringatan.length > 0;
  const siap = rencana.bisaDiterapkan && kesiapan.blokir.length === 0 && (!butuhPaham || paham) && ketik.trim().toUpperCase() === KATA_KONFIRMASI;

  const toggleKecuali = (id: string) => {
    setKecualikan((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const terapkan = () => {
    if (!siap) return;
    // 1) Cadangan otomatis sebelum mengubah apa pun
    createLocalSnapshot(`Sebelum naik kelas ${kesiapan.tahunAjaranBaru}`);
    // 2) Simpan data untuk "Urungkan"
    const dataUrungkan = buatDataUrungkan(siswaList, rencana.perubahan, Date.now(), kesiapan.tahunAjaranBaru);
    safeSetItem(URUNGKAN_KEY, JSON.stringify(dataUrungkan));
    setUrungkan(dataUrungkan);
    // 3) Terapkan sekaligus
    const n = updateSiswaBatch(rencana.perubahan);
    setKetik('');
    setPaham(false);
    setKecualikan(new Set());
    setPesan({ ok: true, teks: `Selesai: ${rencana.jumlahNaik} siswa naik kelas dan ${rencana.jumlahLulus} siswa dinyatakan lulus (${n} data diubah). Data akan tersinkron otomatis.` });
  };

  const batalkan = () => {
    if (!urungkan) return;
    const n = updateSiswaBatch(perubahanUrungkan(urungkan, siswaList));
    try { localStorage.removeItem(URUNGKAN_KEY); } catch { /* abaikan */ }
    setUrungkan(null);
    setKonfirmUrungkan(false);
    setPesan({ ok: true, teks: `Naik kelas dibatalkan: ${n} siswa dikembalikan ke kelas semula.` });
  };

  const perKelas = useMemo(() => {
    const m = new Map<string, typeof rencana.baris>();
    for (const b of rencana.baris) {
      if (!b.dariKelas) continue;
      const arr = m.get(b.dariKelas.id) ?? [];
      arr.push(b);
      m.set(b.dariKelas.id, arr);
    }
    return [...m.values()].sort((a, b) => a[0].dariKelas!.nama_kelas.localeCompare(b[0].dariKelas!.nama_kelas, 'id', { numeric: true }));
  }, [rencana]);

  return (
    <div className="space-y-5" id="naik-kelas">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><GraduationCap className="w-5 h-5" /></div>
          <div>
            <h3 className="font-bold text-slate-800">Naik Kelas & Kelulusan — TA {kesiapan.tahunAjaranBaru}</h3>
            <p className="text-xs text-slate-500">VII → VIII, VIII → IX (rombel sama), kelas IX → lulus (dinonaktifkan, riwayat tetap tersimpan).</p>
          </div>
        </div>
      </div>

      {pesan && (
        <div id="naik-kelas-pesan" className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2 ${pesan.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> <span>{pesan.teks}</span>
        </div>
      )}

      {/* KESIAPAN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-800 text-sm">Pemeriksaan sebelum mulai</h4>
        <ul className="space-y-2 text-sm">
          <li className={`flex items-start gap-2 ${kesiapan.arsipLengkap ? 'text-emerald-700' : 'text-amber-700'}`}>
            {kesiapan.arsipLengkap ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
            <span>Arsip {kesiapan.semesterWajib.label}: {kesiapan.arsipLengkap ? 'sudah diunduh (JSON + Excel)' : 'BELUM diunduh lengkap'}</span>
          </li>
          <li className={`flex items-start gap-2 ${kesiapan.belumSinkron === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {kesiapan.belumSinkron === 0 ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <ShieldAlert className="w-4 h-4 mt-0.5" />}
            <span>{kesiapan.belumSinkron === 0 ? 'Semua data sudah tersinkron' : `${kesiapan.belumSinkron} data belum tersinkron`}</span>
          </li>
        </ul>
        {kesiapan.blokir.map((t) => (
          <div key={t} className="p-3 rounded-lg bg-rose-50 text-rose-800 text-xs font-medium border border-rose-200" data-testid="blokir">{t}</div>
        ))}
        {kesiapan.peringatan.map((t) => (
          <div key={t} className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200" data-testid="peringatan">{t}</div>
        ))}
        {butuhPaham && (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
            <input id="naik-kelas-paham" type="checkbox" checked={paham} onChange={(e) => setPaham(e.target.checked)} />
            Saya sudah membaca peringatan di atas dan tetap ingin melanjutkan
          </label>
        )}
      </div>

      {/* MASALAH */}
      {rencana.masalah.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-2" id="naik-kelas-masalah">
          <h4 className="font-bold text-rose-800 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Perlu dibereskan dulu ({rencana.masalah.length} siswa)</h4>
          <ul className="text-xs text-rose-700 list-disc pl-5 space-y-1">
            {[...new Set(rencana.masalah.map((m) => m.keterangan))].slice(0, 8).map((k) => <li key={k}>{k}</li>)}
          </ul>
          <p className="text-xs text-rose-700">Buat kelas yang kurang di menu Kelas, lalu kembali ke sini. Tidak ada data yang diubah sebelum semuanya beres.</p>
        </div>
      )}

      {/* PRATINJAU */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="font-bold text-emerald-700" id="naik-kelas-jumlah-naik">{rencana.jumlahNaik} naik</span>
          <span className="font-bold text-indigo-700" id="naik-kelas-jumlah-lulus">{rencana.jumlahLulus} lulus</span>
          <span className="font-bold text-slate-600" id="naik-kelas-jumlah-tetap">{rencana.jumlahTetap} tetap</span>
          {rencana.jumlahNonaktifDiabaikan > 0 && <span className="text-slate-400">{rencana.jumlahNonaktifDiabaikan} nonaktif diabaikan</span>}
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b"><th className="py-2">Dari</th><th /><th>Ke</th><th className="text-right">Siswa</th></tr></thead>
          <tbody>
            {rencana.ringkasan.map((r) => (
              <tr key={`${r.dariKelasId}-${r.keNama}`} className="border-b border-slate-100">
                <td className="py-2 font-semibold">{r.dariNama}</td>
                <td><ArrowRight className="w-3.5 h-3.5 text-slate-400" /></td>
                <td className={r.keNama === 'Lulus' ? 'text-indigo-700 font-semibold' : ''}>{r.keNama}</td>
                <td className="text-right font-bold">{r.jumlah}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-slate-700">Ada siswa yang tinggal kelas? Kecualikan di sini{kecualikan.size > 0 ? ` (${kecualikan.size} dikecualikan)` : ''}</summary>
          <div className="mt-3 space-y-3 max-h-80 overflow-auto">
            {perKelas.map((baris) => (
              <div key={baris[0].dariKelas!.id}>
                <div className="text-xs font-bold text-slate-500 mb-1">{baris[0].dariKelas!.nama_kelas}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {baris.map((b) => (
                    <label key={b.siswa.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                      <input type="checkbox" aria-label={`Tinggal kelas: ${b.siswa.nama}`} checked={b.dikecualikan} onChange={() => toggleKecuali(b.siswa.id)} />
                      <span className={b.dikecualikan ? 'text-amber-700 font-semibold' : ''}>{b.siswa.nama}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* KONFIRMASI */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <p className="text-xs text-slate-600">
          Sebelum diterapkan, sistem otomatis membuat Snapshot Cepat. Setelah itu Anda bisa memakai tombol “Urungkan” di bawah. Siswa baru kelas VII ditambahkan <b>setelah</b> proses ini (menu Siswa → impor).
        </p>
        <label className="block text-sm font-semibold text-slate-700">
          Ketik <code className="px-1 bg-slate-100 rounded">{KATA_KONFIRMASI}</code> untuk mengonfirmasi
          <input id="naik-kelas-ketik" value={ketik} onChange={(e) => setKetik(e.target.value)} className="mt-1 block w-full max-w-xs border border-slate-300 rounded-lg px-3 py-2" />
        </label>
        <button id="naik-kelas-terapkan" onClick={terapkan} disabled={!siap} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed">
          Terapkan Naik Kelas
        </button>
      </div>

      {/* URUNGKAN */}
      {urungkan && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl space-y-2" id="naik-kelas-urungkan">
          <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2"><Undo2 className="w-4 h-4" /> Naik kelas terakhir dijalankan {new Date(urungkan.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} ({urungkan.siswa.length} siswa)</h4>
          {!konfirmUrungkan ? (
            <button id="naik-kelas-urungkan-btn" onClick={() => setKonfirmUrungkan(true)} className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white cursor-pointer">Urungkan naik kelas terakhir</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-800">Kembalikan semua siswa ke kelas semula?</span>
              <button id="naik-kelas-urungkan-ya" onClick={batalkan} className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white cursor-pointer">Ya, urungkan</button>
              <button onClick={() => setKonfirmUrungkan(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 cursor-pointer">Batal</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
