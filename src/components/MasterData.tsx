import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Siswa, Kelas } from '../types';
import { ImportExcelModal } from './ImportExcelModal';
import { downloadExcelTemplate, exportStudentsToExcel } from '../lib/excelHelper';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  Sparkles,
  Check,
  X,
  QrCode,
  FileSpreadsheet,
  Download,
  Upload,
} from 'lucide-react';

export const MasterData: React.FC<{ onSelectCetakSiswa?: (siswaId: string) => void }> = ({
  onSelectCetakSiswa,
}) => {
  const {
    siswaList,
    kelasList,
    addSiswa,
    updateSiswa,
    deleteSiswa,
    addKelas,
    updateKelas,
    deleteKelas,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'siswa' | 'kelas'>('siswa');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'aktif' | 'nonaktif' | 'all'>('aktif');

  // Excel Modal State
  const [showImportModal, setShowImportModal] = useState(false);

  // Modal State for Siswa
  const [showSiswaModal, setShowSiswaModal] = useState(false);
  const [editingSiswaId, setEditingSiswaId] = useState<string | null>(null);
  const [siswaForm, setSiswaForm] = useState<Omit<Siswa, 'id'>>({
    nama: '',
    kode_barcode: '',
    nisn: '',
    kelas_id: kelasList[0]?.id || '',
    nomor_wa_ortu: '',
    nama_ortu: '',
    jenis_kelamin: 'L',
    tempat_lahir: 'Banjar',
    tanggal_lahir: '12 Mei 2012',
    alamat: 'Jl. Tentara Pelajar No. 45, Banjar',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    status_aktif: true,
  });

  // Modal State for Kelas
  const [showKelasModal, setShowKelasModal] = useState(false);
  const [editingKelasId, setEditingKelasId] = useState<string | null>(null);
  const [kelasForm, setKelasForm] = useState<Omit<Kelas, 'id'>>({
    nama_kelas: '',
    tingkat: '7',
    wali_kelas: '',
    ruang: '',
  });

  // Filtered Siswa
  const filteredSiswa = siswaList.filter((s) => {
    if (selectedKelasFilter !== 'all' && s.kelas_id !== selectedKelasFilter) return false;
    if (statusFilter === 'aktif' && !s.status_aktif) return false;
    if (statusFilter === 'nonaktif' && s.status_aktif) return false;
    if (searchSiswa.trim()) {
      const q = searchSiswa.toLowerCase();
      return (
        s.nama.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.kode_barcode.toLowerCase().includes(q) ||
        (s.alamat && s.alamat.toLowerCase().includes(q)) ||
        s.nama_ortu.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle Open Create Siswa
  const handleOpenAddSiswa = () => {
    setEditingSiswaId(null);
    const nextBarcodeNumber = String(siswaList.length + 1).padStart(3, '0');
    setSiswaForm({
      nama: '',
      kode_barcode: `SMP9-7A-${nextBarcodeNumber}`,
      nisn: `0098234${nextBarcodeNumber}`,
      kelas_id: kelasList[0]?.id || '',
      nomor_wa_ortu: '081234567890',
      nama_ortu: '',
      jenis_kelamin: 'L',
      tempat_lahir: 'Banjar',
      tanggal_lahir: '12 Mei 2012',
      alamat: 'Jl. Tentara Pelajar No. 45, Banjar',
      foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
      status_aktif: true,
    });
    setShowSiswaModal(true);
  };

  // Handle Open Edit Siswa
  const handleOpenEditSiswa = (siswa: Siswa) => {
    setEditingSiswaId(siswa.id);
    setSiswaForm({
      nama: siswa.nama,
      kode_barcode: siswa.kode_barcode,
      nisn: siswa.nisn,
      kelas_id: siswa.kelas_id,
      nomor_wa_ortu: siswa.nomor_wa_ortu,
      nama_ortu: siswa.nama_ortu,
      jenis_kelamin: siswa.jenis_kelamin,
      tempat_lahir: siswa.tempat_lahir || 'Banjar',
      tanggal_lahir: siswa.tanggal_lahir || '12 Mei 2012',
      alamat: siswa.alamat || 'Kota Banjar',
      foto_url: siswa.foto_url,
      status_aktif: siswa.status_aktif,
    });
    setShowSiswaModal(true);
  };

  // Save Siswa
  const handleSaveSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaForm.nama.trim() || !siswaForm.kode_barcode.trim()) return;

    let nisn = siswaForm.nisn.trim();
    // Normalisasi: kalau semua digit tapi kurang dari 10 karakter, tambahkan nol di depan
    // (mengantisipasi NISN yang tanpa sengaja diketik/ditempel tanpa angka nol di depan)
    if (/^\d+$/.test(nisn) && nisn.length < 10) {
      nisn = nisn.padStart(10, '0');
    }
    if (!/^\d{10}$/.test(nisn)) {
      alert('NISN harus tepat 10 digit angka. NISN ini akan dicetak sebagai QR untuk scan absensi, jadi harus benar.');
      return;
    }
    const isDuplicate = siswaList.some(
      (s) => s.nisn === nisn && s.id !== editingSiswaId
    );
    if (isDuplicate) {
      alert(`NISN ${nisn} sudah dipakai siswa lain. Setiap siswa harus punya NISN unik.`);
      return;
    }

    const finalForm = { ...siswaForm, nisn };

    if (editingSiswaId) {
      updateSiswa(editingSiswaId, finalForm);
    } else {
      addSiswa(finalForm);
    }
    setShowSiswaModal(false);
  };

  // Handle Save Kelas
  const handleSaveKelas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelasForm.nama_kelas.trim()) return;

    if (editingKelasId) {
      updateKelas(editingKelasId, kelasForm);
    } else {
      addKelas(kelasForm);
    }
    setShowKelasModal(false);
  };

  return (
    <div id="master-data-page" className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              SMP NEGERI 9 BANJAR
            </span>
            <span className="text-xs font-semibold text-slate-400">• Database Terpadu</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Manajemen Data Siswa & Kelas
          </h1>
          <p className="text-sm text-slate-500">
            Kelola data siswa, nomor barcode scanner, pencetakan kartu pelajar resmi, dan integrasi WhatsApp wali murid.
          </p>
        </div>

        {/* Buttons Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'siswa' ? (
            <>
              {/* Download Template Excel */}
              <button
                id="btn-download-template"
                onClick={() => downloadExcelTemplate(kelasList)}
                title="Unduh Format Excel untuk diisi data siswa"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Format Template Excel</span>
              </button>

              {/* Import Excel */}
              <button
                id="btn-open-import-excel"
                onClick={() => setShowImportModal(true)}
                title="Impor data siswa dari file Excel / Spreadsheet"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Impor dari Excel</span>
              </button>

              {/* Export to Excel */}
              <button
                onClick={() => exportStudentsToExcel(siswaList, kelasList)}
                title="Ekspor seluruh data siswa ke file Excel"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                <span>Ekspor (.xlsx)</span>
              </button>

              {/* Add Student Manually */}
              <button
                id="add-siswa-btn"
                onClick={handleOpenAddSiswa}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Siswa</span>
              </button>
            </>
          ) : (
            <button
              id="add-kelas-btn"
              onClick={() => {
                setEditingKelasId(null);
                setKelasForm({ nama_kelas: '', tingkat: '7', wali_kelas: '', ruang: '' });
                setShowKelasModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="tab-master-siswa"
          onClick={() => setActiveTab('siswa')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'siswa'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Data Siswa ({siswaList.length})</span>
        </button>
        <button
          id="tab-master-kelas"
          onClick={() => setActiveTab('kelas')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'kelas'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Data Kelas ({kelasList.length})</span>
        </button>
      </div>

      {/* TAB SISWA */}
      {activeTab === 'siswa' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 w-full md:w-auto">
              <span>Filter Kelas:</span>
              <select
                value={selectedKelasFilter}
                onChange={(e) => setSelectedKelasFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Kelas ({kelasList.length})</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold shrink-0">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'aktif' | 'nonaktif' | 'all')}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="aktif">Aktif Saja</option>
                <option value="nonaktif">Nonaktif / Lulus Saja</option>
                <option value="all">Semua</option>
              </select>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSiswa}
                onChange={(e) => setSearchSiswa(e.target.value)}
                placeholder="Cari nama, NISN, barcode, atau alamat..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Foto</th>
                    <th className="px-4 py-3.5">Nama & Jenis Kelamin</th>
                    <th className="px-4 py-3.5">Kode Barcode</th>
                    <th className="px-4 py-3.5">NISN</th>
                    <th className="px-4 py-3.5">Kelas</th>
                    <th className="px-4 py-3.5">TTL & Alamat</th>
                    <th className="px-4 py-3.5">Kontak WhatsApp Ortu</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSiswa.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                        Tidak ada data siswa yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredSiswa.map((s) => {
                      const k = kelasList.find((item) => item.id === s.kelas_id);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3">
                            <img
                              src={s.foto_url}
                              alt={s.nama}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  s.jenis_kelamin === 'P'
                                    ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                                    : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200';
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div className="text-sm">{s.nama}</div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              Jenis Kelamin: {s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                            <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {s.kode_barcode}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 font-semibold">
                            {s.nisn}
                            {!s.status_aktif && (
                              <span className="ml-1.5 inline-block bg-slate-200 text-slate-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                                Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {k?.nama_kelas || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="font-medium text-slate-800">
                              {s.tempat_lahir || 'Banjar'}, {s.tanggal_lahir || '-'}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {s.alamat || 'Kota Banjar'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 font-mono">{s.nomor_wa_ortu}</div>
                            <div className="text-slate-400">{s.nama_ortu}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onSelectCetakSiswa && (
                                <button
                                  title="Cetak Kartu Siswa ini"
                                  onClick={() => onSelectCetakSiswa(s.id)}
                                  className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                title={s.status_aktif ? 'Tandai Lulus / Nonaktifkan' : 'Aktifkan Kembali'}
                                onClick={() => {
                                  const aksi = s.status_aktif ? 'menonaktifkan (lulus/pindah)' : 'mengaktifkan kembali';
                                  if (confirm(`Yakin ingin ${aksi} siswa ${s.nama}?`)) {
                                    updateSiswa(s.id, { status_aktif: !s.status_aktif });
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  s.status_aktif
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                }`}
                              >
                                <GraduationCap className="w-4 h-4" />
                              </button>
                              <button
                                title="Edit Siswa"
                                onClick={() => handleOpenEditSiswa(s)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                title="Hapus Siswa"
                                onClick={() => {
                                  if (confirm(`Yakin ingin menghapus data siswa ${s.nama}?`)) {
                                    deleteSiswa(s.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB KELAS */}
      {activeTab === 'kelas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kelasList.map((k) => {
            const countSiswa = siswaList.filter((s) => s.kelas_id === k.id).length;
            return (
              <div key={k.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Tingkat {k.tingkat}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingKelasId(k.id);
                        setKelasForm({
                          nama_kelas: k.nama_kelas,
                          tingkat: k.tingkat,
                          wali_kelas: k.wali_kelas,
                          ruang: k.ruang || '',
                        });
                        setShowKelasModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus kelas ${k.nama_kelas}?`)) {
                          deleteKelas(k.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900">Kelas {k.nama_kelas}</h3>
                <div className="text-xs text-slate-500 space-y-1">
                  <div>
                    Wali Kelas: <strong>{k.wali_kelas}</strong>
                  </div>
                  <div>Ruang Belajar: {k.ruang || '-'}</div>
                  <div className="text-emerald-700 font-semibold pt-1">
                    Total Siswa Terdaftar: {countSiswa} Orang
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FORM SISWA */}
      {showSiswaModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingSiswaId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setShowSiswaModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSiswa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={siswaForm.nama}
                  onChange={(e) => setSiswaForm({ ...siswaForm, nama: e.target.value })}
                  placeholder="Contoh: Cahaya Dewi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kode Barcode Scanner *
                  </label>
                  <input
                    type="text"
                    required
                    value={siswaForm.kode_barcode}
                    onChange={(e) => setSiswaForm({ ...siswaForm, kode_barcode: e.target.value })}
                    placeholder="Contoh: SMP9-7A-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    NISN *
                  </label>
                  <input
                    type="text"
                    required
                    value={siswaForm.nisn}
                    onChange={(e) => setSiswaForm({ ...siswaForm, nisn: e.target.value })}
                    placeholder="Contoh: 0098234101"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kelas *
                  </label>
                  <select
                    value={siswaForm.kelas_id}
                    onChange={(e) => setSiswaForm({ ...siswaForm, kelas_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kelas}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={siswaForm.jenis_kelamin}
                    onChange={(e) =>
                      setSiswaForm({ ...siswaForm, jenis_kelamin: e.target.value as 'L' | 'P' })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* TTL (Tempat, Tanggal Lahir) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={siswaForm.tempat_lahir || ''}
                    onChange={(e) => setSiswaForm({ ...siswaForm, tempat_lahir: e.target.value })}
                    placeholder="Contoh: Banjar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="text"
                    value={siswaForm.tanggal_lahir || ''}
                    onChange={(e) => setSiswaForm({ ...siswaForm, tanggal_lahir: e.target.value })}
                    placeholder="Contoh: 12 Mei 2012"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Alamat Siswa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alamat Lengkap Siswa
                </label>
                <textarea
                  rows={2}
                  value={siswaForm.alamat || ''}
                  onChange={(e) => setSiswaForm({ ...siswaForm, alamat: e.target.value })}
                  placeholder="Contoh: Jl. Tentara Pelajar No. 45, Banjar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* WA Ortu & Nama Ortu */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nomor WhatsApp Ortu *
                  </label>
                  <input
                    type="text"
                    required
                    value={siswaForm.nomor_wa_ortu}
                    onChange={(e) => setSiswaForm({ ...siswaForm, nomor_wa_ortu: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    value={siswaForm.nama_ortu}
                    onChange={(e) => setSiswaForm({ ...siswaForm, nama_ortu: e.target.value })}
                    placeholder="Contoh: Bpk. Hendra Gunawan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Foto URL Siswa
                </label>
                <input
                  type="url"
                  value={siswaForm.foto_url}
                  onChange={(e) => setSiswaForm({ ...siswaForm, foto_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSiswaModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM KELAS */}
      {showKelasModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingKelasId ? 'Edit Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button
                onClick={() => setShowKelasModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKelas} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Kelas *
                </label>
                <input
                  type="text"
                  required
                  value={kelasForm.nama_kelas}
                  onChange={(e) => setKelasForm({ ...kelasForm, nama_kelas: e.target.value })}
                  placeholder="Contoh: VII-C atau IX-A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tingkat
                  </label>
                  <select
                    value={kelasForm.tingkat}
                    onChange={(e) =>
                      setKelasForm({ ...kelasForm, tingkat: e.target.value as '7' | '8' | '9' })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ruangan
                  </label>
                  <input
                    type="text"
                    value={kelasForm.ruang}
                    onChange={(e) => setKelasForm({ ...kelasForm, ruang: e.target.value })}
                    placeholder="Contoh: R. 104"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Wali Kelas *
                </label>
                <input
                  type="text"
                  required
                  value={kelasForm.wali_kelas}
                  onChange={(e) => setKelasForm({ ...kelasForm, wali_kelas: e.target.value })}
                  placeholder="Contoh: Bpk. Ahmad Yani, M.Pd."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowKelasModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT EXCEL MODAL */}
      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
};
