import React, { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getFotoSiswaUrl } from '../lib/fotoHelper';
import { HasilFotoSiswa, tafsirkanDiagnosaFoto, ujiFotoSiswa } from '../lib/diagnosaFoto';

/** Kartu "Diagnosa Foto Siswa" di Panel Admin > Pemeliharaan. Hanya membaca (HEAD), tidak mengubah data. */
export const DiagnosaFoto: React.FC = () => {
  const { siswaList, supabaseConfig } = useApp();
  const [jalan, setJalan] = useState(false);
  const [hasil, setHasil] = useState<HasilFotoSiswa[] | null>(null);

  const cekStatus = async (url: string): Promise<number | 'galat'> => {
    try {
      const ctrl = new AbortController();
      const t = window.setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
      window.clearTimeout(t);
      return res.status;
    } catch {
      return 'galat';
    }
  };

  const jalankan = async () => {
    setJalan(true);
    setHasil(null);
    const sampel = siswaList.filter((s) => s.status_aktif !== false && s.nisn).slice(0, 5);
    const out: HasilFotoSiswa[] = [];
    for (const s of sampel) {
      out.push(await ujiFotoSiswa({ nama: s.nama, nisn: s.nisn }, getFotoSiswaUrl(s, supabaseConfig.url), cekStatus));
    }
    setHasil(out);
    setJalan(false);
  };

  const tafsir = hasil ? tafsirkanDiagnosaFoto(hasil, supabaseConfig.url) : null;
  const warna = tafsir?.tingkat === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
    : tafsir?.tingkat === 'peringatan' ? 'bg-amber-50 border-amber-200 text-amber-900'
    : 'bg-rose-50 border-rose-200 text-rose-900';

  return (
    <div id="diagnosa-foto" className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-700" />
            Diagnosa Foto Siswa
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Menguji 5 siswa pertama: apakah berkas foto ada di Storage, apa ekstensinya, dan apakah bucket dapat diakses.
          </p>
        </div>
        <button
          type="button"
          onClick={jalankan}
          disabled={jalan}
          className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          {jalan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {jalan ? 'Menguji...' : 'Jalankan Tes'}
        </button>
      </div>

      {tafsir && <div className={`text-xs font-semibold border rounded-xl px-3 py-2 ${warna}`}>{tafsir.pesan}</div>}

      {hasil && (
        <ul className="text-[11px] text-slate-600 space-y-1">
          {hasil.map((h) => (
            <li key={h.nisn} className="font-mono">
              {h.nama} ({h.nisn}): {h.ditemukan ? `ditemukan .${h.ditemukan}` : 'tidak ditemukan'}
              {' — '}
              {h.percobaan.slice(0, 3).map((p) => `${p.ext}:${p.status}`).join(' ')}
              {h.percobaan.length > 3 ? ' …' : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
