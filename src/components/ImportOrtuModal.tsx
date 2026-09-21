import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { parseOrtuExcelFile, ParsedOrtuRow } from '../lib/excelHelper';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const ImportOrtuModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { siswaList, updateOrtuBatch } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedOrtuRow[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ updated: number; notFound: string[]; invalid: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const readFile = async (selected: File) => {
    setFile(selected); setError(''); setResult(null);
    try { setRows(await parseOrtuExcelFile(selected)); }
    catch (e: any) { setRows([]); setError(e?.message || 'Gagal membaca file Excel.'); }
  };

  const valid = rows.filter((r) => r.isValid);
  const invalid = rows.filter((r) => !r.isValid);
  const known = new Set(siswaList.map((s) => s.nisn));
  const knownCount = valid.filter((r) => known.has(r.nisn)).length;

  const execute = () => {
    if (!valid.length) return;
    const r = updateOrtuBatch(valid.map(({ nisn, nama_ortu, nomor_wa_ortu }) => ({ nisn, nama_ortu, nomor_wa_ortu })));
    setResult(r);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center"><FileSpreadsheet className="w-6 h-6 text-emerald-300" /></div>
            <div><h2 className="font-black text-lg">Timpa Data Nama & Nomor Ortu</h2><p className="text-xs text-slate-400">Update massal berdasarkan NISN tanpa mengubah kolom database.</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2"><Info className="w-5 h-5 shrink-0 mt-0.5" /><div>
              <strong>Gunakan NISN sebagai kunci.</strong> Isi Excel dengan kolom <b>NISN</b>, <b>Nama Ibu</b>, dan <b>No WA Ibu</b>. Nilainya akan menimpa <code>nama_ortu</code> dan <code>nomor_wa_ortu</code> pada siswa yang NISN-nya cocok. Data siswa lain tidak diubah.
            </div></div>
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-emerald-500 cursor-pointer" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f) void readFile(f); }}>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f=e.target.files?.[0]; if(f) void readFile(f); }} />
            <Upload className="w-10 h-10 mx-auto text-emerald-600 mb-2" />
            <div className="font-bold">Klik atau seret file Excel/CSV ke sini</div>
            <div className="text-xs text-slate-500 mt-1">Format minimal: NISN | Nama Ibu | No WA Ibu</div>
          </div>
          {file && <div className="text-xs text-slate-600">File: <b>{file.name}</b> • {rows.length} baris • cocok dengan database: <b>{knownCount}</b></div>}
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
          {rows.length > 0 && <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="max-h-72 overflow-auto"><table className="w-full text-xs"><thead className="bg-slate-50 sticky top-0"><tr><th className="p-2 text-left">NISN</th><th className="p-2 text-left">Nama Ibu</th><th className="p-2 text-left">No WA Ibu</th><th className="p-2 text-left">Status</th></tr></thead><tbody>{rows.slice(0,100).map((r,i)=><tr key={i} className="border-t"><td className="p-2 font-mono">{r.nisn}</td><td className="p-2">{r.nama_ortu}</td><td className="p-2 font-mono">{r.nomor_wa_ortu}</td><td className="p-2">{r.isValid ? (known.has(r.nisn) ? <span className="text-emerald-700">Siap ditimpa</span> : <span className="text-amber-700">NISN tidak ditemukan</span>) : <span className="text-red-600">{r.errors.join(', ')}</span>}</td></tr>)}</tbody></table></div>
          </div>}
          {result && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-900"><div className="flex gap-2"><CheckCircle2 className="w-5 h-5" /><b>{result.updated} data berhasil ditimpa.</b></div><div className="mt-1">NISN tidak ditemukan: {result.notFound.length}. Data tidak valid: {invalid.length}.</div></div>}
        </div>
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border bg-white text-sm font-bold">Tutup</button>
          <button disabled={!valid.length || knownCount === 0} onClick={execute} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold">Timpa {knownCount} Data</button>
        </div>
      </div>
    </div>
  );
};
