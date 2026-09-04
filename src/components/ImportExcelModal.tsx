import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  downloadExcelTemplate,
  downloadCsvTemplate,
  parseExcelFile,
  ParsedSiswaRow,
} from '../lib/excelHelper';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Info,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({ isOpen, onClose }) => {
  const { kelasList, addKelas, importSiswaBatch } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSiswaRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [autoCreateKelas, setAutoCreateKelas] = useState(true);
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);

    try {
      const rows = await parseExcelFile(selectedFile);
      setParsedRows(rows);
    } catch (err: any) {
      setParseError(err.message || 'Gagal membaca file Excel.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    setFile(droppedFile);
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);

    try {
      const rows = await parseExcelFile(droppedFile);
      setParsedRows(rows);
    } catch (err: any) {
      setParseError(err.message || 'Gagal membaca file Excel.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleExecuteImport = () => {
    if (validRows.length === 0) return;

    // 1. Create missing classes if enabled
    const existingClassNames = new Set(kelasList.map((k) => k.nama_kelas.toLowerCase().trim()));
    const classIdMap: Record<string, string> = {};
    kelasList.forEach((k) => {
      classIdMap[k.nama_kelas.toLowerCase().trim()] = k.id;
    });

    if (autoCreateKelas) {
      const uniqueNewClasses: string[] = Array.from(
        new Set<string>(
          validRows
            .map((r) => r.nama_kelas.trim())
            .filter((className) => Boolean(className) && !existingClassNames.has(className.toLowerCase()))
        )
      );

      uniqueNewClasses.forEach((newClassName: string) => {
        const upper = newClassName.toUpperCase();
        const tingkat: '7' | '8' | '9' = upper.startsWith('8') || upper.startsWith('VIII')
          ? '8'
          : upper.startsWith('9') || upper.startsWith('IX')
          ? '9'
          : '7';

        const newId = 'k-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
        addKelas({
          nama_kelas: newClassName,
          tingkat,
          wali_kelas: 'Wali Kelas ' + newClassName,
          ruang: 'R. ' + newClassName,
        });
        classIdMap[newClassName.toLowerCase()] = newId;
      });
    }

    // 2. Prepare student objects
    const studentsToImport = validRows.map((row, idx) => {
      const targetClassId =
        classIdMap[row.nama_kelas.toLowerCase().trim()] || kelasList[0]?.id || 'k-7a';

      // Ensure barcode
      const cleanBarcode =
        row.kode_barcode ||
        `SMP9-${row.nama_kelas.replace(/[^a-zA-Z0-9]/g, '')}-${String(idx + 1).padStart(3, '0')}`;

      return {
        nama: row.nama,
        kode_barcode: cleanBarcode,
        nisn: row.nisn,
        kelas_id: targetClassId,
        nomor_wa_ortu: row.nomor_wa_ortu,
        nama_ortu: row.nama_ortu,
        jenis_kelamin: row.jenis_kelamin,
        tempat_lahir: row.tempat_lahir,
        tanggal_lahir: row.tanggal_lahir,
        alamat: row.alamat,
        foto_url: row.foto_url,
        status_aktif: true,
      };
    });

    const result = importSiswaBatch(studentsToImport, importMode);
    setImportResult(result);
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>Impor Data Siswa dari Excel</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  SMP NEGERI 9 BANJAR
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Unduh format template, isi kolom siswa, dan unggah kembali untuk impor massal.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* STEP 1: DOWNLOAD TEMPLATE BOX */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">
                  Langkah 1: Unduh Format Template Excel (.xlsx)
                </h3>
                <p className="text-xs text-emerald-700/90 mt-0.5">
                  Format resmi sudah mencakup kolom <strong>Nama, NISN, Kelas, TTL, Alamat, dan No. WA Ortu</strong> yang langsung disesuaikan dengan Kartu Pelajar SMPN 9 Banjar.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                id="btn-download-template-excel"
                type="button"
                onClick={() => downloadExcelTemplate(kelasList)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Template (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadCsvTemplate()}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                title="Unduh versi CSV (format teks pemisah koma)"
              >
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* STEP 2: UPLOAD AREA */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-black">
                2
              </span>
              <span>Unggah File Excel yang Telah Diisi</span>
            </h3>

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 rounded-2xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Klik untuk memilih file Excel atau seret & lepas ke sini
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Mendukung format file <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 truncate">{file.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} baris data terdeteksi
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ganti File</span>
                  </button>
                </div>
              </div>
            )}

            {isParsing && (
              <div className="mt-3 p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent animate-spin rounded-full" />
                <span>Memproses dan memvalidasi baris data Excel...</span>
              </div>
            )}

            {parseError && (
              <div className="mt-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Terjadi Kesalahan Pembacaan File:</div>
                  <div>{parseError}</div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: PREVIEW & IMPORT CONTROLS */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Pratinjau Data Siswa</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {validRows.length} Siap Diimpor
                    </span>
                    {invalidRows.length > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {invalidRows.length} Baris Tidak Lengkap
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Periksa sampel data yang dibaca dari file Excel sebelum disimpan ke database.
                  </p>
                </div>

                {/* Import Mode Options */}
                <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Gabung & Perbarui</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Ganti Semua</span>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">No</th>
                      <th className="px-3 py-2">Nama Siswa</th>
                      <th className="px-3 py-2">Kelas</th>
                      <th className="px-3 py-2">NISN</th>
                      <th className="px-3 py-2">Kode Barcode</th>
                      <th className="px-3 py-2">Tempat, Tanggal Lahir</th>
                      <th className="px-3 py-2">Alamat</th>
                      <th className="px-3 py-2">No. WA Ortu</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/60'}>
                        <td className="px-3 py-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.nama || '-'}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                            {r.nama_kelas || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.nisn}</td>
                        <td className="px-3 py-2 font-mono font-bold text-emerald-700">
                          {r.kode_barcode || <span className="text-slate-400 italic">Auto-generate</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.tempat_lahir}, {r.tanggal_lahir}
                        </td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]">
                          {r.alamat}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.nomor_wa_ortu}</td>
                        <td className="px-3 py-2">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-rose-700 font-bold"
                              title={r.errors.join(', ')}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Error</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Options */}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  id="auto-create-kelas"
                  checked={autoCreateKelas}
                  onChange={(e) => setAutoCreateKelas(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="auto-create-kelas" className="cursor-pointer">
                  Otomatis buat kelas baru jika nama kelas pada Excel belum ada di sistem
                </label>
              </div>

              {/* Result confirmation */}
              {importResult && (
                <div className="p-4 bg-emerald-100/80 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <span>
                      Berhasil mengimpor data! {importResult.added} siswa baru ditambahkan,{' '}
                      {importResult.updated} siswa diperbarui.
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition cursor-pointer"
                  >
                    Tutup & Lihat Data
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Kartu Pelajar siap langsung dicetak setelah data tersimpan.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>

            {parsedRows.length > 0 && !importResult && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={validRows.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan {validRows.length} Siswa ke Aplikasi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
