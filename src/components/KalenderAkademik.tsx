import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { CalendarRange, Download, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../data/initialData';
import {
  JENIS_KEGIATAN,
  TEMPLATE_KEGIATAN,
  formatRentangId,
  kategoriDariJenis,
  kelompokkanKegiatan,
  rentangTahunAjaran,
  ringkasanTahunAjaran,
  tahunAjaranDariTanggal,
  tanggalUntukDitandai,
  type JenisKegiatan,
} from '../lib/kalenderAkademik';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500';
const labelCls = 'block text-xs font-bold text-slate-700 uppercase mb-1';

export const KalenderAkademik: React.FC = () => {
  const { customSchoolDays, getDateHariInfo, terapkanHariKhususBanyak, profilSekolah } = useApp();
  const tahunIni = tahunAjaranDariTanggal(getTodayDateString());
  const [tahun, setTahun] = useState(tahunIni);
  const [jenis, setJenis] = useState<JenisKegiatan>('libur');
  const [nama, setNama] = useState('');
  const [mulai, setMulai] = useState('');
  const [selesai, setSelesai] = useState('');
  const [jamPulang, setJamPulang] = useState('10:30');
  const [catatan, setCatatan] = useState('');
  const [pesan, setPesan] = useState<string | null>(null);

  const rentang = rentangTahunAjaran(tahun);
  const ringkasan = useMemo(() => ringkasanTahunAjaran(tahun, getDateHariInfo), [tahun, getDateHariInfo]);

  const kegiatan = useMemo(
    () => kelompokkanKegiatan(customSchoolDays.filter((h) => h.tanggal >= rentang.mulai && h.tanggal <= rentang.selesai), getDateHariInfo),
    [customSchoolDays, rentang.mulai, rentang.selesai, getDateHariInfo]
  );

  const tanggalDitandai = useMemo(
    () => (mulai && selesai && mulai <= selesai ? tanggalUntukDitandai(mulai, selesai, jenis, getDateHariInfo) : []),
    [mulai, selesai, jenis, getDateHariInfo]
  );

  const terapkan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || tanggalDitandai.length === 0) return;
    const { kategori, isEfektifKBM } = kategoriDariJenis(jenis);
    const r = terapkanHariKhususBanyak(
      tanggalDitandai.map((tanggal) => ({
        tanggal, nama: nama.trim(), kategori, isEfektifKBM,
        keterangan: catatan, jamPulangKustom: jenis === 'pulang_cepat' ? jamPulang : undefined,
      }))
    );
    setPesan(`${nama.trim()}: ${r.message}`);
    setNama(''); setMulai(''); setSelesai(''); setCatatan('');
  };

  const eksporExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      ...ringkasan.bulan.map((b) => ({
        Semester: b.semester === 'ganjil' ? 'Ganjil' : 'Genap',
        Bulan: b.label,
        'Hari Kalender': b.hariKalender,
        'Sabtu/Minggu': b.akhirPekan,
        'Libur Nasional': b.liburNasional,
        'Libur/Non-KBM Sekolah': b.liburSekolah,
        'Hari Efektif': b.efektif,
      })),
      { Semester: '', Bulan: 'Total Semester Ganjil', 'Hari Efektif': ringkasan.totalGanjil },
      { Semester: '', Bulan: 'Total Semester Genap', 'Hari Efektif': ringkasan.totalGenap },
      { Semester: '', Bulan: 'Total Tahun Ajaran', 'Hari Efektif': ringkasan.totalSetahun },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Hari Efektif');
    const ws2 = XLSX.utils.json_to_sheet(
      kegiatan.map((k) => ({ Kegiatan: k.nama, Jenis: k.label, Tanggal: formatRentangId(k.mulai, k.selesai), 'Jumlah Hari': k.jumlahHari }))
    );
    XLSX.utils.book_append_sheet(wb, ws2, 'Kegiatan');
    XLSX.writeFile(wb, `Kalender_Akademik_${tahun}-${tahun + 1}_${(profilSekolah?.namaSekolah || 'Sekolah').replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-emerald-600" /> Kalender Akademik
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tandai libur semester, class meeting, PTS/PAS, dan kegiatan lain sekaligus per rentang tanggal. Hari efektif di dashboard rekap mengikuti kalender ini.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold">
              {[tahunIni - 1, tahunIni, tahunIni + 1].map((t) => (
                <option key={t} value={t}>TA {t}/{t + 1}</option>
              ))}
            </select>
            <button type="button" onClick={eksporExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        <form onSubmit={terapkan} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <label className={labelCls}>Nama kegiatan</label>
            <input required list="template-kegiatan" value={nama} onChange={(e) => {
              setNama(e.target.value);
              const t = TEMPLATE_KEGIATAN.find((x) => x.nama === e.target.value);
              if (t) setJenis(t.jenis);
            }} placeholder="Pilih atau ketik, mis. Libur Semester Ganjil" className={inputCls} />
            <datalist id="template-kegiatan">
              {TEMPLATE_KEGIATAN.map((t) => <option key={t.nama} value={t.nama} />)}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Jenis</label>
            <select value={jenis} onChange={(e) => setJenis(e.target.value as JenisKegiatan)} className={inputCls}>
              {(Object.keys(JENIS_KEGIATAN) as JenisKegiatan[]).map((j) => <option key={j} value={j}>{JENIS_KEGIATAN[j].label}</option>)}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">{JENIS_KEGIATAN[jenis].deskripsi}</p>
          </div>
          <div><label className={labelCls}>Tanggal mulai</label><input type="date" required value={mulai} min={rentang.mulai} max={rentang.selesai} onChange={(e) => { setMulai(e.target.value); if (!selesai) setSelesai(e.target.value); }} className={inputCls} /></div>
          <div><label className={labelCls}>Tanggal selesai</label><input type="date" required value={selesai} min={mulai || rentang.mulai} max={rentang.selesai} onChange={(e) => setSelesai(e.target.value)} className={inputCls} /></div>
          {jenis === 'pulang_cepat' && (
            <div><label className={labelCls}>Jam pulang</label><input type="time" required value={jamPulang} onChange={(e) => setJamPulang(e.target.value)} className={inputCls} /></div>
          )}
          <div className={jenis === 'pulang_cepat' ? '' : 'md:col-span-2'}>
            <label className={labelCls}>Keterangan (opsional)</label>
            <input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Mis. sesuai kalender pendidikan Disdik" className={inputCls} />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-600">
              {mulai && selesai ? (
                tanggalDitandai.length > 0
                  ? <>Akan menandai <strong>{tanggalDitandai.length} hari</strong> (Sabtu/Minggu, libur nasional, dan tanggal yang sudah ditandai dilewati).</>
                  : 'Tidak ada tanggal baru yang perlu ditandai pada rentang ini.'
              ) : 'Pilih rentang tanggal untuk melihat pratinjau.'}
            </span>
            <button type="submit" disabled={!nama.trim() || tanggalDitandai.length === 0} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl cursor-pointer">
              <Plus className="w-4 h-4" /> Terapkan ke Kalender
            </button>
          </div>
          {pesan && <div className="md:col-span-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{pesan}</div>}
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 font-black text-slate-800">Hari Efektif per Bulan — TA {tahun}/{tahun + 1}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
              <tr>
                <th className="px-4 py-2.5">Bulan</th>
                <th className="px-3 py-2.5 text-center">Hari</th>
                <th className="px-3 py-2.5 text-center">Sabtu/Minggu</th>
                <th className="px-3 py-2.5 text-center">Libur Nasional</th>
                <th className="px-3 py-2.5 text-center">Libur/Non-KBM</th>
                <th className="px-3 py-2.5 text-center bg-emerald-50 text-emerald-800">Efektif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ringkasan.bulan.map((b, i) => (
                <React.Fragment key={b.label}>
                  <tr>
                    <td className="px-4 py-2 font-semibold text-slate-800">{b.label}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{b.hariKalender}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{b.akhirPekan}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{b.liburNasional}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{b.liburSekolah}</td>
                    <td className="px-3 py-2 text-center font-black text-emerald-700 bg-emerald-50/40">{b.efektif}</td>
                  </tr>
                  {(i === 5 || i === 11) && (
                    <tr className="bg-slate-50 font-bold text-slate-800">
                      <td className="px-4 py-2" colSpan={5}>Total Semester {i === 5 ? 'Ganjil' : 'Genap'}</td>
                      <td className="px-3 py-2 text-center text-emerald-800">{i === 5 ? ringkasan.totalGanjil : ringkasan.totalGenap}</td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              <tr className="bg-emerald-600 text-white font-black">
                <td className="px-4 py-2.5" colSpan={5}>Total Tahun Ajaran</td>
                <td className="px-3 py-2.5 text-center">{ringkasan.totalSetahun}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 font-black text-slate-800">Kegiatan yang Sudah Ditandai</div>
        {kegiatan.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">Belum ada kegiatan pada tahun ajaran ini.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {kegiatan.map((k) => (
              <div key={k.ids[0]} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800">{k.nama}</div>
                  <div className="text-xs text-slate-500">
                    {formatRentangId(k.mulai, k.selesai)} · {k.jumlahHari} hari · {k.label}
                    {k.jamPulangKustom ? ` · pulang ${k.jamPulangKustom}` : ''}{k.keterangan ? ` · ${k.keterangan}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  title="Hapus kegiatan"
                  onClick={() => { if (confirm(`Hapus "${k.nama}" (${k.jumlahHari} hari)?`)) { const r = terapkanHariKhususBanyak([], k.ids); setPesan(r.message); } }}
                  className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
