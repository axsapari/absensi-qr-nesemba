import React, { useState } from 'react';
import { X, GraduationCap } from 'lucide-react';
import type { Siswa } from '../types';
import { getTodayDateString } from '../data/initialData';
import { LABEL_ALASAN_KELUAR, type AlasanKeluar } from '../lib/mutasi';

interface Props {
  siswa: Siswa;
  onClose: () => void;
  onSimpan: (data: Pick<Siswa, 'tanggal_keluar' | 'alasan_keluar' | 'keterangan_keluar'>) => void;
}

export const MutasiSiswaDialog: React.FC<Props> = ({ siswa, onClose, onSimpan }) => {
  const [alasan, setAlasan] = useState<AlasanKeluar>('pindah');
  const [tanggal, setTanggal] = useState(getTodayDateString());
  const [ket, setKet] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-600" /> Nonaktifkan Siswa
            </h3>
            <p className="text-sm text-slate-500 mt-1">{siswa.nama}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Tutup"><X className="w-5 h-5" /></button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Alasan</label>
            <select value={alasan} onChange={(e) => setAlasan(e.target.value as AlasanKeluar)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900">
              {(Object.keys(LABEL_ALASAN_KELUAR) as AlasanKeluar[]).map((k) => (
                <option key={k} value={k}>{LABEL_ALASAN_KELUAR[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hari terakhir siswa dihitung</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900" />
            <p className="text-xs text-slate-500 mt-1">
              Rekap bulan sebelum dan sampai tanggal ini tetap memuat siswa ini. Setelahnya ia tidak dihitung
              (tidak jadi alpa, tidak masuk porsi makan siang).
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Keterangan <span className="normal-case font-normal text-slate-400">(opsional, mis. sekolah tujuan)</span>
            </label>
            <input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Contoh: SMPN 1 Pataruman"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Batal</button>
          <button
            disabled={!tanggal}
            onClick={() => onSimpan({ tanggal_keluar: tanggal, alasan_keluar: alasan, keterangan_keluar: ket.trim() || undefined })}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl cursor-pointer"
          >
            Nonaktifkan
          </button>
        </div>
      </div>
    </div>
  );
};
