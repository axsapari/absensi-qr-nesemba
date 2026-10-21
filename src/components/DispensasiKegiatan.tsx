import React, { useMemo, useState } from 'react';
import { X, Award, Search } from 'lucide-react';
import { Siswa } from '../types';
import { useApp } from '../context/AppContext';
import { sortKelas, sortSiswaByKelas } from '../lib/classUtils';
import { siswaAktif } from '../lib/rekapKehadiran';
import { rencanakanDispensasi, tanggalDispensasi } from '../lib/dispensasi';

interface Props {
  tanggalAwal: string;
  onClose: () => void;
  /** batasi pada kelas tertentu (wali kelas) */
  kelasTerbatas?: Set<string> | null;
}

export const DispensasiKegiatan: React.FC<Props> = ({ tanggalAwal, onClose, kelasTerbatas }) => {
  const { siswaList, kelasList, catatanKehadiranList, setCatatanIzinSakit, getDateHariInfo } = useApp();
  const [kegiatan, setKegiatan] = useState('');
  const [mulai, setMulai] = useState(tanggalAwal);
  const [selesai, setSelesai] = useState(tanggalAwal);
  const [kelasId, setKelasId] = useState('all');
  const [cari, setCari] = useState('');
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());
  const [hasil, setHasil] = useState<string | null>(null);

  const kelasTampil = useMemo(
    () => sortKelas(kelasList).filter((k) => !kelasTerbatas || kelasTerbatas.has(k.id)),
    [kelasList, kelasTerbatas]
  );
  const kelasMap = useMemo(() => new Map(kelasList.map((k) => [k.id, k.nama_kelas])), [kelasList]);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return sortSiswaByKelas(
      siswaAktif<Siswa>(siswaList).filter((s) => {
        if (kelasTerbatas && !kelasTerbatas.has(s.kelas_id)) return false;
        if (kelasId !== 'all' && s.kelas_id !== kelasId) return false;
        if (q && !s.nama.toLowerCase().includes(q) && !s.nisn.includes(q)) return false;
        return true;
      }),
      kelasList
    );
  }, [siswaList, kelasList, kelasId, cari, kelasTerbatas]);

  const tanggal = useMemo(
    () => tanggalDispensasi(mulai, selesai, (d) => getDateHariInfo(d).isHariEfektif),
    [mulai, selesai, getDateHariInfo]
  );
  const rencana = useMemo(
    () => rencanakanDispensasi([...dipilih], tanggal, catatanKehadiranList),
    [dipilih, tanggal, catatanKehadiranList]
  );

  const toggle = (id: string) =>
    setDipilih((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const pilihSemuaTampil = () =>
    setDipilih((prev) => {
      const n = new Set(prev);
      const semua = daftar.every((s) => n.has(s.id));
      daftar.forEach((s) => (semua ? n.delete(s.id) : n.add(s.id)));
      return n;
    });

  const rentangValid = !!mulai && !!selesai && mulai <= selesai;
  const bisaSimpan = kegiatan.trim().length > 0 && dipilih.size > 0 && tanggal.length > 0 && rentangValid;

  const simpan = () => {
    if (!bisaSimpan) return;
    if (rencana.menimpa.length > 0 &&
        !confirm(`${rencana.menimpa.length} catatan izin/sakit/bolos/alpa/tanpa kartu pada siswa & tanggal ini akan diganti menjadi dispensasi. Lanjutkan?`)) return;
    for (const id of dipilih) for (const d of tanggal) setCatatanIzinSakit(id, d, 'dispensasi', kegiatan.trim());
    setHasil(`Dispensasi "${kegiatan.trim()}" tersimpan: ${dipilih.size} siswa × ${tanggal.length} hari.`);
    setDipilih(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-teal-600" /> Dispensasi Kegiatan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Siswa mengikuti kegiatan sekolah (lomba, tugas, dll). Dihitung <b>hadir</b>, bukan izin/sakit/alpa, dan
              <b> tidak masuk porsi makan siang kelas</b> (makannya dipisah).
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Tutup"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama kegiatan <span className="text-rose-500">*</span></label>
            <input
              value={kegiatan}
              onChange={(e) => setKegiatan(e.target.value)}
              placeholder="Contoh: Lomba O2SN tingkat kota"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mulai</label>
              <input type="date" value={mulai} onChange={(e) => { setMulai(e.target.value); if (e.target.value > selesai) setSelesai(e.target.value); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Selesai</label>
              <input type="date" value={selesai} min={mulai} onChange={(e) => setSelesai(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900" />
            </div>
          </div>
          <p className="text-xs text-slate-500 -mt-2">
            {rentangValid ? `${tanggal.length} hari efektif akan diberi dispensasi (akhir pekan & libur dilewati).` : 'Rentang tanggal tidak valid.'}
          </p>

          <div className="border border-slate-200 rounded-xl">
            <div className="p-3 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <select value={kelasId} onChange={(e) => setKelasId(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-2 py-1.5">
                <option value="all">Semua kelas</option>
                {kelasTampil.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
              </select>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5 flex-1 min-w-40">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama / NISN"
                  className="text-xs text-slate-900 bg-transparent focus:outline-none w-full" />
              </div>
              <button type="button" onClick={pilihSemuaTampil}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer">
                {daftar.length > 0 && daftar.every((s) => dipilih.has(s.id)) ? 'Batal pilih yang tampil' : 'Pilih semua yang tampil'}
              </button>
            </div>
            <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {daftar.length === 0 && <li className="p-4 text-xs text-slate-400 italic">Tidak ada siswa.</li>}
              {daftar.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={dipilih.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 accent-teal-600" />
                    <span className="flex-1 text-slate-800">{s.nama}</span>
                    <span className="text-xs text-slate-500">{kelasMap.get(s.kelas_id)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-xs text-slate-600">
            Dipilih: <b>{dipilih.size}</b> siswa
            {rencana.menimpa.length > 0 && (
              <span className="ml-2 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                {rencana.menimpa.length} catatan lain akan ditimpa
              </span>
            )}
          </div>
          {hasil && <div className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">{hasil}</div>}
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Tutup</button>
          <button onClick={simpan} disabled={!bisaSimpan}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl cursor-pointer">
            Simpan Dispensasi
          </button>
        </div>
      </div>
    </div>
  );
};
