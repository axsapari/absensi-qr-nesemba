import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, Award, CalendarDays, Clock, CreditCard, Download, MessageCircle, ShieldAlert, Trophy, UserX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../data/initialData';
import { formatPhoneNumber } from '../lib/whatsapp';
import { semesterDari } from '../lib/semester';
import { sortKelas } from '../lib/classUtils';
import { hitungTanggalEfektif } from '../lib/rekapKehadiran';
import {
  AMBANG, daftarApresiasi, daftarPerluTindakan, hitungMetrikTindakan, peringkat, polaHari, ringkasKelas, tautanWaWali,
  type KunciPeringkat, type MetrikTindakan, type Tingkat,
} from '../lib/rekapTindakan';

type Mode = 'tanggal' | 'semester' | 'rentang';

const WARNA_TINGKAT: Record<Tingkat, string> = {
  mendesak: 'bg-rose-100 text-rose-800 border-rose-200',
  waspada: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-sky-100 text-sky-800 border-sky-200',
};
const LABEL_TINGKAT: Record<Tingkat, string> = { mendesak: 'Mendesak', waspada: 'Waspada', info: 'Pengingat' };

const KARTU: { kunci: KunciPeringkat; judul: string; ikon: React.ReactNode; warna: string; nilai: (m: MetrikTindakan) => string; kosong: string }[] = [
  { kunci: 'terbaik', judul: 'Kehadiran Terbaik', ikon: <Trophy className="w-4 h-4" />, warna: 'text-emerald-700 bg-emerald-50 border-emerald-200', nilai: (m) => `${m.persentase}%`, kosong: 'Belum ada data.' },
  { kunci: 'terlambat', judul: 'Terlambat Terbanyak', ikon: <Clock className="w-4 h-4" />, warna: 'text-amber-700 bg-amber-50 border-amber-200', nilai: (m) => `${m.totalTerlambat}x`, kosong: 'Tidak ada yang terlambat.' },
  { kunci: 'tanpaKartu', judul: 'Tidak Bawa Kartu Terbanyak', ikon: <CreditCard className="w-4 h-4" />, warna: 'text-sky-700 bg-sky-50 border-sky-200', nilai: (m) => `${m.totalTanpaKartu}x`, kosong: 'Semua membawa kartu.' },
  { kunci: 'alfa', judul: 'Alpa Terbanyak', ikon: <UserX className="w-4 h-4" />, warna: 'text-rose-700 bg-rose-50 border-rose-200', nilai: (m) => `${m.totalAlfa} hari`, kosong: 'Tidak ada alpa.' },
  { kunci: 'bolos', judul: 'Bolos Terbanyak', ikon: <ShieldAlert className="w-4 h-4" />, warna: 'text-orange-700 bg-orange-50 border-orange-200', nilai: (m) => `${m.totalBolos} hari`, kosong: 'Tidak ada bolos.' },
];

export const RekapTindakan: React.FC = () => {
  const { siswaList, kelasList, absensiList, catatanKehadiranList, currentUser, getDateHariInfo } = useApp();
  const today = getTodayDateString();
  const semester = useMemo(() => semesterDari(today), [today]);
  const isWali = currentUser?.role === 'wali_kelas';
  const waliKelasId = currentUser?.wali_kelas_id || '';

  const [mode, setMode] = useState<Mode>('semester');
  const [tanggal, setTanggal] = useState(today);
  const [mulai, setMulai] = useState(() => `${today.slice(0, 8)}01`);
  const [selesai, setSelesai] = useState(today);
  const [kelasId, setKelasId] = useState<string>(isWali ? waliKelasId : 'all');
  const [batas, setBatas] = useState(10);
  const [bukaSemua, setBukaSemua] = useState(false);

  const rentang = mode === 'tanggal' ? { start: tanggal, end: tanggal } : mode === 'semester' ? { start: semester.mulai, end: semester.selesai } : { start: mulai, end: selesai };
  const label = mode === 'tanggal' ? tanggal : mode === 'semester' ? semester.label : `${mulai} s/d ${selesai}`;

  const siswaTerlihat = useMemo(
    () => siswaList.filter((s) => s.status_aktif !== false && (!isWali || s.kelas_id === waliKelasId) && (kelasId === 'all' || s.kelas_id === kelasId)),
    [siswaList, isWali, waliKelasId, kelasId]
  );

  const tanggalEfektif = useMemo(() => {
    const ids = new Set(siswaTerlihat.map((s) => s.id));
    const ada = new Set<string>();
    absensiList.forEach((a) => { if (ids.has(a.siswa_id)) ada.add(a.tanggal); });
    catatanKehadiranList.forEach((c) => { if (ids.has(c.siswa_id)) ada.add(c.tanggal); });
    return hitungTanggalEfektif({ ...rentang, todayStr: today, isHariEfektif: (d) => getDateHariInfo(d).isHariEfektif, tanggalAdaData: ada });
  }, [siswaTerlihat, absensiList, catatanKehadiranList, rentang.start, rentang.end, today, getDateHariInfo]);

  const metrik = useMemo(
    () => hitungMetrikTindakan(siswaTerlihat, kelasList, absensiList, catatanKehadiranList, tanggalEfektif),
    [siswaTerlihat, kelasList, absensiList, catatanKehadiranList, tanggalEfektif]
  );
  const perluTindakan = useMemo(() => daftarPerluTindakan(metrik), [metrik]);
  const apresiasi = useMemo(() => daftarApresiasi(metrik), [metrik]);
  const kelasRingkas = useMemo(() => ringkasKelas(metrik, kelasList), [metrik, kelasList]);
  const hari = useMemo(() => polaHari(metrik, tanggalEfektif), [metrik, tanggalEfektif]);

  const rataHadir = metrik.length && tanggalEfektif.length
    ? Math.round((metrik.reduce((n, m) => n + m.totalHadir, 0) / (metrik.length * tanggalEfektif.length)) * 1000) / 10 : 0;
  const mendesak = perluTindakan.filter((x) => x.tingkat === 'mendesak').length;
  const tampil = bukaSemua ? perluTindakan : perluTindakan.slice(0, 15);

  const eksporExcel = () => {
    const wb = XLSX.utils.book_new();
    const baris = (m: MetrikTindakan) => ({
      Kelas: m.kelas?.nama_kelas ?? '-', NISN: m.siswa.nisn, Nama: m.siswa.nama, 'Hari Efektif': m.totalDaysRecorded, Hadir: m.totalHadir,
      Terlambat: m.totalTerlambat, 'Tidak Bawa Kartu': m.totalTanpaKartu, Izin: m.totalIzin, Sakit: m.totalSakit, Alpa: m.totalAlfa, Bolos: m.totalBolos,
      '% Hadir': m.persentase, 'Tidak Hadir Berturut (terkini)': m.streakTerkini,
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perluTindakan.map((x) => ({
      Tingkat: LABEL_TINGKAT[x.tingkat], ...baris(x.metrik), 'Saran Tindakan': x.saran.map((s) => s.teks).join('; '), 'No WA Wali': x.metrik.siswa.nomor_wa_ortu,
    }))), 'Perlu Tindakan');
    for (const k of KARTU) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(peringkat(metrik, k.kunci, batas).map((m, i) => ({ Peringkat: i + 1, ...baris(m) }))), k.judul.slice(0, 31));
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(apresiasi.map(baris)), 'Apresiasi');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kelasRingkas.map((r) => ({
      Kelas: r.kelas.nama_kelas, Siswa: r.jumlahSiswa, '% Hadir': r.persen, Terlambat: r.terlambat, 'Tidak Bawa Kartu': r.tanpaKartu, Alpa: r.alfa, Bolos: r.bolos, 'Perlu Tindakan': r.perluTindakan,
    }))), 'Per Kelas');
    XLSX.writeFile(wb, `Rekap_Tindakan_${label.replace(/[^\w-]+/g, '_')}.xlsx`);
  };

  const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800';
  return (
    <div className="space-y-5">
      {/* FILTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-600" /> Rekap Tindakan</h3>
            <p className="text-xs text-slate-500">Siswa yang perlu ditindaklanjuti atau diapresiasi, supaya sekolah bisa bertindak cepat.</p>
          </div>
          <button type="button" onClick={eksporExcel} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer">
            <Download className="w-4 h-4" /> Ekspor Excel
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl">
            {([['tanggal', 'Per Tanggal'], ['semester', 'Semester Ini'], ['rentang', 'Rentang Tanggal']] as [Mode, string][]).map(([k, t]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${mode === k ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}>{t}</button>
            ))}
          </div>
          {mode === 'tanggal' && <input type="date" value={tanggal} max={today} onChange={(e) => setTanggal(e.target.value)} className={inputCls} />}
          {mode === 'rentang' && (
            <>
              <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className={inputCls} />
              <span className="text-xs font-bold text-slate-400">s/d</span>
              <input type="date" value={selesai} onChange={(e) => setSelesai(e.target.value)} className={inputCls} />
            </>
          )}
          <select value={kelasId} onChange={(e) => setKelasId(e.target.value)} disabled={isWali} className={inputCls}>
            <option value="all">Semua Kelas</option>
            {sortKelas(kelasList).filter((k) => !isWali || k.id === waliKelasId).map((k) => <option key={k.id} value={k.id}>Kelas {k.nama_kelas}</option>)}
          </select>
          <select value={batas} onChange={(e) => setBatas(Number(e.target.value))} className={inputCls}>
            {[5, 10, 20].map((n) => <option key={n} value={n}>Tampilkan {n} teratas</option>)}
          </select>
          <span className="flex items-center gap-1 text-xs text-slate-500 font-semibold ml-auto"><CalendarDays className="w-3.5 h-3.5" /> {label}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[['Siswa', metrik.length, 'text-slate-900'], ['Hari efektif', tanggalEfektif.length, 'text-slate-900'], ['Rata-rata hadir', `${rataHadir}%`, 'text-emerald-700'], ['Perlu tindakan', `${perluTindakan.length} (${mendesak} mendesak)`, 'text-rose-700']].map(([k, v, c]) => (
            <div key={String(k)} className="bg-slate-50 border border-slate-200 rounded-xl py-2.5">
              <div className={`text-lg font-black ${c}`}>{v}</div>
              <div className="text-[11px] text-slate-500 font-semibold">{k}</div>
            </div>
          ))}
        </div>
        {tanggalEfektif.length === 0 && (
          <div className="text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2">
            Tidak ada hari efektif dengan data pada periode ini (mungkin akhir pekan, libur, atau belum ada scan).
          </div>
        )}
      </div>

      {/* PERLU TINDAKAN */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="font-black text-slate-800">Perlu Tindakan Segera ({perluTindakan.length})</span>
          <span className="text-[11px] text-slate-500">
            Ambang: alpa ≥{AMBANG.alfaWaspada} waspada, ≥{AMBANG.alfaMendesak} mendesak · tidak hadir berturut ≥{AMBANG.streakMendesak} hari · bolos ≥1 · terlambat ≥{AMBANG.terlambatWaspada}x · tanpa kartu ≥{AMBANG.tanpaKartuInfo}x
          </span>
        </div>
        {perluTindakan.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">Tidak ada siswa yang memenuhi ambang tindakan pada periode ini. 🎉</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tampil.map(({ metrik: m, saran, tingkat }) => (
              <div key={m.siswa.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${WARNA_TINGKAT[tingkat]}`}>{LABEL_TINGKAT[tingkat]}</span>
                    <span className="font-bold text-slate-900">{m.siswa.nama}</span>
                    <span className="text-xs text-slate-500">{m.kelas?.nama_kelas ?? '-'} · {m.persentase}% hadir</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Terlambat {m.totalTerlambat} · Tanpa kartu {m.totalTanpaKartu} · Izin {m.totalIzin} · Sakit {m.totalSakit} · Alpa {m.totalAlfa} · Bolos {m.totalBolos}
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {saran.map((s, i) => <li key={i} className="text-xs text-slate-700">• {s.teks}</li>)}
                  </ul>
                </div>
                {m.siswa.nomor_wa_ortu && (
                  <a
                    href={tautanWaWali(m, label, formatPhoneNumber(m.siswa.nomor_wa_ortu))} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200"
                  >
                    <MessageCircle className="w-4 h-4" /> WA Wali
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        {perluTindakan.length > 15 && (
          <button type="button" onClick={() => setBukaSemua(!bukaSemua)} className="w-full py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 border-t border-slate-100 cursor-pointer">
            {bukaSemua ? 'Ringkas daftar' : `Tampilkan semua (${perluTindakan.length})`}
          </button>
        )}
      </div>

      {/* PERINGKAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {KARTU.map((k) => {
          const rows = peringkat(metrik, k.kunci, batas);
          return (
            <div key={k.kunci} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className={`px-4 py-3 border-b flex items-center gap-2 text-sm font-black ${k.warna}`}>{k.ikon} {k.judul}</div>
              {rows.length === 0 ? <div className="p-4 text-xs text-slate-400">{k.kosong}</div> : (
                <ol className="divide-y divide-slate-100">
                  {rows.map((m, i) => (
                    <li key={m.siswa.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="w-5 text-xs font-black text-slate-400">{i + 1}</span>
                      <span className="flex-1 min-w-0 truncate font-semibold text-slate-800">{m.siswa.nama}</span>
                      <span className="text-[11px] text-slate-500">{m.kelas?.nama_kelas}</span>
                      <span className="text-xs font-black text-slate-900 w-14 text-right">{k.nilai(m)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}

        {/* APRESIASI */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2 text-sm font-black text-violet-700 bg-violet-50 border-violet-200"><Award className="w-4 h-4" /> Layak Diapresiasi ({apresiasi.length})</div>
          <p className="px-4 pt-2 text-[11px] text-slate-500">Hadir di semua hari efektif, tidak pernah terlambat, dan selalu membawa kartu (minimal 5 hari).</p>
          {apresiasi.length === 0 ? <div className="p-4 text-xs text-slate-400">Belum ada pada periode ini.</div> : (
            <ul className="p-4 pt-2 flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
              {apresiasi.map((m) => <li key={m.siswa.id} className="text-[11px] font-semibold bg-violet-50 text-violet-800 border border-violet-200 rounded-full px-2.5 py-1">{m.siswa.nama} · {m.kelas?.nama_kelas}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* POLA HARI & KELAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="font-black text-slate-800 mb-1">Hari Paling Rawan</div>
          <p className="text-[11px] text-slate-500 mb-3">Persentase siswa tidak hadir (alpa/bolos/tanpa keterangan) per hari dalam seminggu. Berguna untuk menentukan kapan piket atau pengawasan diperketat.</p>
          {hari.length === 0 ? <div className="text-xs text-slate-400">Belum ada data.</div> : (
            <div className="space-y-2">
              {(() => { const maks = Math.max(1, ...hari.map((h) => h.persenTidakHadir)); return hari.map((h) => (
                <div key={h.hari} className="flex items-center gap-3 text-xs">
                  <span className="w-14 font-semibold text-slate-700">{h.hari}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-rose-400" style={{ width: `${(h.persenTidakHadir / maks) * 100}%` }} /></div>
                  <span className="w-12 text-right font-black text-slate-900">{h.persenTidakHadir}%</span>
                  <span className="w-20 text-right text-slate-500">{h.terlambat} telat</span>
                </div>
              )); })()}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 font-black text-slate-800">Perbandingan Kelas</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                <tr><th className="px-4 py-2">Kelas</th><th className="px-2 py-2 text-right">% Hadir</th><th className="px-2 py-2 text-right">Telat</th><th className="px-2 py-2 text-right">Alpa</th><th className="px-2 py-2 text-right">Bolos</th><th className="px-3 py-2 text-right">Perlu tindakan</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kelasRingkas.map((r) => (
                  <tr key={r.kelas.id}>
                    <td className="px-4 py-2 font-bold text-slate-800">{r.kelas.nama_kelas}</td>
                    <td className="px-2 py-2 text-right font-black">{r.persen}%</td>
                    <td className="px-2 py-2 text-right">{r.terlambat}</td>
                    <td className="px-2 py-2 text-right">{r.alfa}</td>
                    <td className="px-2 py-2 text-right">{r.bolos}</td>
                    <td className="px-3 py-2 text-right font-bold text-rose-700">{r.perluTindakan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
