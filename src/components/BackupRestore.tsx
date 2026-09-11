import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AppBackupPayload, LocalSnapshot } from '../types';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  Trash2,
  ShieldCheck,
  Clock,
  HardDrive,
  Users,
  Building2,
  Calendar,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const BackupRestore: React.FC = () => {
  const {
    siswaList,
    kelasList,
    absensiList,
    logNotifikasiList,
    localSnapshots,
    getBackupPayload,
    restoreBackupData,
    createLocalSnapshot,
    restoreLocalSnapshot,
    deleteLocalSnapshot,
    reloadInitialData,
    resetTodayAttendance,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'backup' | 'restore' | 'snapshots' | 'danger'>('backup');
  const [snapshotLabelInput, setSnapshotLabelInput] = useState('');
  
  // Restore file state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<AppBackupPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreStatus, setRestoreStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Download Full System Backup (JSON)
  const handleDownloadFullBackup = () => {
    const payload = getBackupPayload();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `backup_smpn9banjar_${dateStr}_${timeStr}.json`;

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // Also auto-create a local snapshot for safety
    createLocalSnapshot(`Auto Backup Unduhan (${dateStr} ${timeStr})`);
  };

  // Download Attendance in Excel
  const handleDownloadAttendanceExcel = () => {
    const data = absensiList.map((a, idx) => {
      const s = siswaList.find((item) => item.id === a.siswa_id);
      const k = s ? kelasList.find((item) => item.id === s.kelas_id) : undefined;
      return {
        No: idx + 1,
        Tanggal: a.tanggal,
        'Waktu Scan': a.waktu_scan,
        NISN: s?.nisn || '-',
        'Nama Siswa': s?.nama || 'Siswa Terhapus',
        Kelas: k?.nama_kelas || '-',
        'Jenis Absensi': a.jenis === 'masuk' ? 'Kedatangan (Pagi)' : 'Kepulangan (Siang)',
        Status: a.status === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat',
        Catatan: a.catatan || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Absensi');
    XLSX.writeFile(workbook, `Rekap_Absensi_SMPN9Banjar_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Handle File Input for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    setParseError(null);
    setParsedBackup(null);
    setRestoreStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        // Validation check
        if (!json.data || !Array.isArray(json.data.siswa)) {
          setParseError('File bukan file backup sistem yang valid (data siswa tidak ditemukan).');
          return;
        }

        setParsedBackup(json as AppBackupPayload);
      } catch (err) {
        setParseError('Gagal membaca file JSON. Pastikan file tidak rusak atau korup: ' + String(err));
      }
    };
    reader.onerror = () => {
      setParseError('Gagal membaca file dari perangkat.');
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    const confirmMsg =
      restoreMode === 'replace'
        ? `PERINGATAN: Mode Timpa Total akan menggantikan seluruh data saat ini dengan data dari cadangan (${parsedBackup.data.siswa.length} siswa, ${parsedBackup.data.absensi.length} absensi). Lanjutkan?`
        : `Mode Penggabungan akan menyatukan data cadangan dengan data yang sudah ada tanpa menghapus data saat ini. Lanjutkan?`;

    if (!window.confirm(confirmMsg)) return;

    const result = restoreBackupData(parsedBackup, restoreMode);
    setRestoreStatus(result);

    if (result.success) {
      setParsedBackup(null);
      setImportedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div id="backup-restore-page" className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Pusat Cadangan & Pemulihan (Backup & Restore)
              </h1>
              <p className="text-sm text-slate-500">
                Amankan seluruh basis data SMP NEGERI 9 BANJAR ke file offline atau pulihkan data kapan saja.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <button
          id="btn-quick-backup"
          onClick={handleDownloadFullBackup}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Backup Lengkap (.json)</span>
        </button>
      </div>

      {/* SYSTEM HEALTH & CURRENT CAPACITY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Data Siswa</div>
            <div className="text-2xl font-black text-slate-900">{siswaList.length}</div>
            <div className="text-[11px] text-slate-400">Terdaftar aktif</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Kelas</div>
            <div className="text-2xl font-black text-slate-900">{kelasList.length}</div>
            <div className="text-[11px] text-slate-400">Rombel aktif</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Log Absensi</div>
            <div className="text-2xl font-black text-slate-900">{absensiList.length}</div>
            <div className="text-[11px] text-slate-400">Record kehadiran</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Snapshot Lokal</div>
            <div className="text-2xl font-black text-slate-900">{localSnapshots.length}</div>
            <div className="text-[11px] text-slate-400">Tersimpan di browser</div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="tab-btn-backup"
          onClick={() => setActiveSubTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
            activeSubTab === 'backup'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Cadangkan Data (Backup)</span>
        </button>

        <button
          id="tab-btn-restore"
          onClick={() => setActiveSubTab('restore')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
            activeSubTab === 'restore'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4" />
          <span>Pulihkan Cadangan (Restore)</span>
        </button>

        <button
          id="tab-btn-snapshots"
          onClick={() => setActiveSubTab('snapshots')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
            activeSubTab === 'snapshots'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Snapshot Cepat ({localSnapshots.length})</span>
        </button>

        <button
          id="tab-btn-danger"
          onClick={() => setActiveSubTab('danger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ml-auto ${
            activeSubTab === 'danger'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-600 hover:bg-rose-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Reset Sistem</span>
        </button>
      </div>

      {/* TAB 1: BACKUP */}
      {activeSubTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Full Backup */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <FileJson className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cadangan Penuh (.JSON)</h3>
                <p className="text-xs text-slate-500">Direkomendasikan untuk backup berkala & migrasi server</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 space-y-2 border border-slate-200">
              <div className="font-semibold text-slate-800">Paket cadangan ini mencakup:</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Database seluruh Siswa ({siswaList.length} siswa)</li>
                <li>Daftar Rombongan Belajar ({kelasList.length} kelas)</li>
                <li>Seluruh Riwayat Absensi & Log Scan ({absensiList.length} record)</li>
                <li>Audit Log Pesan WhatsApp Gateway ({logNotifikasiList.length} log)</li>
                <li>Pengaturan Jam Belajar, Jam Masuk & Pulang</li>
                <li>Konfigurasi Gateway & API Token</li>
              </ul>
            </div>

            <button
              onClick={handleDownloadFullBackup}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File Cadangan Penuh (.json)</span>
            </button>
          </div>

          {/* Card Modular Export */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Ekspor Data per Format Excel</h3>
                <p className="text-xs text-slate-500">Dapat dibuka di Microsoft Excel, Google Sheets, atau WPS</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-sm text-slate-800">Riwayat Absensi Lengkap</div>
                  <div className="text-xs text-slate-500">{absensiList.length} catatan scan masuk & pulang</div>
                </div>
                <button
                  onClick={handleDownloadAttendanceExcel}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>

              <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-sm text-slate-800">Data Master Siswa & Ortu</div>
                  <div className="text-xs text-slate-500">{siswaList.length} siswa dengan nomor WhatsApp wali</div>
                </div>
                <button
                  onClick={() => {
                    const data = siswaList.map((s, i) => {
                      const k = kelasList.find((item) => item.id === s.kelas_id);
                      return {
                        No: i + 1,
                        NISN: s.nisn,
                        'Nama Lengkap': s.nama,
                        Kelas: k?.nama_kelas || '-',
                        'Jenis Kelamin': s.jenis_kelamin,
                        'Tempat Lahir': s.tempat_lahir || '-',
                        'Tanggal Lahir': s.tanggal_lahir || '-',
                        Alamat: s.alamat || '-',
                        'No WA Ortu': s.nomor_wa_ortu,
                        'Nama Ortu': s.nama_ortu,
                      };
                    });
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Master_Siswa');
                    XLSX.writeFile(wb, `Master_Siswa_SMPN9Banjar_${new Date().toISOString().slice(0, 10)}.xlsx`);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>

              <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-sm text-slate-800">Daftar Kelas & Wali Kelas</div>
                  <div className="text-xs text-slate-500">{kelasList.length} kelas aktif terdaftar</div>
                </div>
                <button
                  onClick={() => {
                    const data = kelasList.map((k, i) => ({
                      No: i + 1,
                      'Nama Kelas': k.nama_kelas,
                      Tingkat: `Kelas ${k.tingkat}`,
                      'Wali Kelas': k.wali_kelas,
                      'Ruangan': k.ruang || '-',
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Kelas');
                    XLSX.writeFile(wb, `Data_Kelas_SMPN9Banjar_${new Date().toISOString().slice(0, 10)}.xlsx`);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESTORE */}
      {activeSubTab === 'restore' && (
        <div className="space-y-6">
          {/* Status Message */}
          {restoreStatus && (
            <div
              className={`p-4 rounded-2xl flex items-start gap-3 ${
                restoreStatus.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {restoreStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm">{restoreStatus.success ? 'Pemulihan Berhasil!' : 'Pemulihan Gagal'}</div>
                <div className="text-xs mt-0.5">{restoreStatus.message}</div>
              </div>
            </div>
          )}

          {/* File Picker Zone */}
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
              <Upload className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">Pilih File Cadangan Sistem (.JSON)</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Unggah file cadangan yang sebelumnya diunduh dari menu Backup aplikasi ini.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="file-backup-picker"
            />

            <label
              htmlFor="file-backup-picker"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <FileJson className="w-4 h-4" />
              <span>{importedFile ? 'Pilih File Lain' : 'Pilih File Backup (.json)'}</span>
            </label>

            {importedFile && (
              <div className="text-xs text-slate-600 font-mono mt-2">
                File terpilih: <span className="font-bold text-emerald-700">{importedFile.name}</span> (
                {(importedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Error Message */}
          {parseError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* File Preview & Mode Configuration */}
          {parsedBackup && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-5">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-900">Validasi File Cadangan Terverifikasi</span>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  Versi {parsedBackup.version || '2.0'}
                </span>
              </div>

              {/* Data Summary in Backup */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500">Sekolah</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{parsedBackup.sekolah || 'SMP NEGERI 9 BANJAR'}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500">Jumlah Siswa</div>
                  <div className="font-black text-slate-900 text-lg mt-0.5">{parsedBackup.data.siswa.length}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500">Jumlah Kelas</div>
                  <div className="font-black text-slate-900 text-lg mt-0.5">{parsedBackup.data.kelas.length}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500">Data Absensi</div>
                  <div className="font-black text-slate-900 text-lg mt-0.5">{parsedBackup.data.absensi.length}</div>
                </div>
              </div>

              {/* Choose Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pilih Cara Pemulihan:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition ${
                      restoreMode === 'replace'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'replace'}
                      onChange={() => setRestoreMode('replace')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Mode Timpa Total (Replace All)</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Menghapus data saat ini dan menggantikannya tepat seperti isi file cadangan. Sangat disarankan saat pemulihan bencana.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition ${
                      restoreMode === 'merge'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Mode Gabungkan (Merge)</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Menambahkan data baru dari file backup ke database yang sudah ada tanpa menghapus rekaman lama.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setParsedBackup(null);
                    setImportedFile(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-execute-restore"
                  onClick={handleExecuteRestore}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Jalankan Pemulihan Sekarang</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SNAPSHOTS */}
      {activeSubTab === 'snapshots' && (
        <div className="space-y-6">
          {/* Create Snapshot Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Buat Snapshot Cepat Baru</h3>
              <p className="text-xs text-slate-500">
                Snapshot langsung disimpan di memori browser lokal (LocalStorage) tanpa perlu mengunduh file fisik.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={snapshotLabelInput}
                onChange={(e) => setSnapshotLabelInput(e.target.value)}
                placeholder="Catatan label snapshot (opsional)..."
                className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-800 w-full md:w-64 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  createLocalSnapshot(snapshotLabelInput.trim() || undefined);
                  setSnapshotLabelInput('');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer"
              >
                + Buat Snapshot
              </button>
            </div>
          </div>

          {/* Snapshots List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 font-bold text-slate-800 flex items-center justify-between">
              <span>Daftar Titik Pemulihan Snapshot ({localSnapshots.length})</span>
              <span className="text-xs font-normal text-slate-400">Maksimal 10 titik snapshot otomatis tersimpan</span>
            </div>

            {localSnapshots.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada snapshot lokal. Klik tombol &ldquo;Buat Snapshot&rdquo; di atas untuk membuat titik pemulihan.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {localSnapshots.map((snap) => (
                  <div key={snap.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{snap.label}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                        <span>Waktu: {snap.timestamp}</span>
                        <span>•</span>
                        <span>{snap.stats.total_siswa} Siswa</span>
                        <span>•</span>
                        <span>{snap.stats.total_kelas} Kelas</span>
                        <span>•</span>
                        <span>{snap.stats.total_absensi} Catatan Absensi</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (confirm(`Pulihkan data dari snapshot "${snap.label}"? Data saat ini akan digantikan.`)) {
                            const success = restoreLocalSnapshot(snap.id);
                            if (success) {
                              alert('Snapshot berhasil dipulihkan!');
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Pulihkan</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Hapus snapshot "${snap.label}"?`)) {
                            deleteLocalSnapshot(snap.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus snapshot ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DANGER ZONE (RESET) */}
      {activeSubTab === 'danger' && (
        <div className="bg-white p-6 rounded-2xl border border-rose-200 space-y-6">
          <div className="flex items-center gap-3 text-rose-700 border-b border-rose-100 pb-4">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-base">Tindakan Khusus & Pembersihan Data</h3>
              <p className="text-xs text-rose-600">
                Gunakan fitur ini dengan hati-hati. Disarankan mengunduh backup sebelum menjalankan reset.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Reset Today Attendance */}
            <div className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-slate-900">Reset Absensi Hari Ini Saja</div>
                <div className="text-xs text-slate-500">
                  Menghapus catatan scan QR/NISN masuk dan pulang untuk hari ini saja. Data master siswa dan riwayat tanggal lain tetap aman.
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Yakin ingin mereset seluruh scan kehadiran untuk hari ini?')) {
                    resetTodayAttendance();
                    alert('Presensi hari ini telah direset.');
                  }
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer"
              >
                Reset Hari Ini
              </button>
            </div>

            {/* Reload Initial Sample Data */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-rose-900">Kembalikan ke Data Bawaan Sistem (Factory Sample Data)</div>
                <div className="text-xs text-rose-700">
                  Mengembalikan data siswa, kelas, dan jam operasional bawaan resmi SMP Negeri 9 Banjar.
                </div>
              </div>
              <button
                onClick={() => {
                  const input = prompt('Ketik "RESET" untuk mengonfirmasi pengembalian ke data contoh:');
                  if (input === 'RESET') {
                    reloadInitialData();
                    alert('Data sistem telah dikembalikan ke data awal.');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer"
              >
                Reset Pabrik
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
