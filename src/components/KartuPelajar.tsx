import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Siswa, Kelas } from '../types';
import QRCode from 'qrcode';
import { SchoolLogo, LogoOSIS } from './SchoolLogos';
import { getFotoSiswaUrl, getFotoPlaceholder } from '../lib/fotoHelper';
import {
  Printer,
  Download,
  CreditCard,
  CheckCircle,
  Sparkles,
  Layers,
  Search,
  Share2,
} from 'lucide-react';

export const KartuPelajar: React.FC<{ initialSelectedId?: string }> = ({ initialSelectedId }) => {
  const { siswaList, kelasList, profilSekolah, updateProfilSekolah } = useApp();

  const [selectedKelasId, setSelectedKelasId] = useState<string>('all');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(
    initialSelectedId || (siswaList[0]?.id ?? '')
  );
  const [modeCetak, setModeCetak] = useState<'single' | 'batch'>('single');
  const [searchFilter, setSearchFilter] = useState('');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);

  const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran gambar terlalu besar (maks 4MB). Kompres dulu gambarnya, ya.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateProfilSekolah({ templateKartuUrl: reader.result as string });
      setShowTemplatePanel(true);
    };
    reader.readAsDataURL(file);
  };

  // Generate QR codes for all students
  useEffect(() => {
    let isMounted = true;
    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      for (const s of siswaList) {
        try {
          const dataUrl = await QRCode.toDataURL(s.nisn, {
            width: 320,
            margin: 1,
            color: {
              dark: '#1e1b4b',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
          urls[s.id] = dataUrl;
        } catch (e) {
          console.error('Error generating QR:', e);
        }
      }
      if (isMounted) {
        setQrCodeUrls(urls);
      }
    };

    generateQRs();
    return () => {
      isMounted = false;
    };
  }, [siswaList]);

  // Update selectedSiswaId if list changes
  useEffect(() => {
    if (!siswaList.some((s) => s.id === selectedSiswaId) && siswaList.length > 0) {
      setSelectedSiswaId(siswaList[0].id);
    }
  }, [siswaList, selectedSiswaId]);

  // Filter students for batch or single
  const filteredStudents = siswaList.filter((s) => {
    const matchesKelas = selectedKelasId === 'all' || s.kelas_id === selectedKelasId;
    const matchesSearch =
      !searchFilter ||
      s.nama.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.nisn.includes(searchFilter) ||
      s.kode_barcode.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesKelas && matchesSearch;
  });

  const studentsToPrint =
    modeCetak === 'single'
      ? siswaList.filter((s) => s.id === selectedSiswaId)
      : filteredStudents;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="kartu-pelajar-page" className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Print-specific style tag for high-resolution A4 layout */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: transparent !important;
            padding: 10px;
          }
          .no-print {
            display: none !important;
          }
          .card-wrapper {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 20px !important;
          }
        }
      `}</style>

      {/* Top Header Controls (Hidden during print) */}
      <div className="no-print bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
              Desain Resmi Sekolah
            </span>
            <span className="text-xs font-semibold text-slate-400">• SMP NEGERI 9 BANJAR</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            <span>Kartu Pelajar Barcode & QR Code</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Format resmi sesuai kartu identitas fisik SMP Negeri 9 Banjar. Dilengkapi QR Code & Barcode yang siap dipindai oleh scanner pos absensi.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Print Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-700">
            <button
              onClick={() => setModeCetak('single')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                modeCetak === 'single'
                  ? 'bg-white shadow-xs text-indigo-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Per Siswa
            </button>
            <button
              onClick={() => setModeCetak('batch')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                modeCetak === 'batch'
                  ? 'bg-white shadow-xs text-indigo-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Cetak Massal (Batch)
            </button>
          </div>

          {/* Selectors */}
          {modeCetak === 'single' ? (
            <div className="relative">
              <select
                value={selectedSiswaId}
                onChange={(e) => setSelectedSiswaId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none cursor-pointer pr-8"
              >
                {siswaList.map((s) => {
                  const k = kelasList.find((item) => item.id === s.kelas_id);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({k?.nama_kelas || '-'}) - {s.nisn}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Kelas ({siswaList.length} Siswa)</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama_kelas}
                  </option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari siswa..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 pl-8 focus:outline-none w-36"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          )}

          {/* Print Button */}
          <button
            id="print-cards-btn"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu ({studentsToPrint.length})</span>
          </button>
        </div>
      </div>

      {/* Info Badge + Template Upload Toggle */}
      <div className="no-print bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 text-xs text-indigo-900 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {profilSekolah.templateKartuUrl ? (
                <>Kartu memakai <strong>desain template kustom</strong> yang Anda upload sendiri.</>
              ) : (
                <>Desain kartu memakai template bawaan <strong>SMP NEGERI 9 BANJAR</strong>. Ingin pakai desain kartu OSIS Anda sendiri secara identik?</>
              )}
            </span>
          </div>
          <button
            onClick={() => setShowTemplatePanel((v) => !v)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer"
          >
            {showTemplatePanel ? 'Tutup Pengaturan Template' : 'Atur Template Kartu Sendiri'}
          </button>
        </div>

        {showTemplatePanel && (
          <div className="bg-white rounded-xl p-4 border border-indigo-200 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Upload + Preview */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                1. Upload Gambar Desain Kartu Depan (PNG/JPG)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleUploadTemplate}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 file:font-bold cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">
                Upload foto/scan desain kartu OSIS asli sekolah Anda (utuh, tanpa foto & QR -- itu akan
                ditimpakan otomatis oleh sistem di posisi yang Anda atur di sebelah kanan). Ukuran ideal
                mengikuti rasio kartu ID (lebar:tinggi ≈ 2:3), maks 4MB.
              </p>

              {profilSekolah.templateKartuUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={profilSekolah.templateKartuUrl}
                    alt="Template kartu"
                    className="w-20 h-30 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    onClick={() => {
                      if (confirm('Hapus template kustom dan kembali ke desain bawaan?')) {
                        updateProfilSekolah({ templateKartuUrl: null });
                      }
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Hapus Template, Kembali ke Desain Bawaan
                  </button>
                </div>
              )}
            </div>

            {/* Right: Position Calibration */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                2. Atur Posisi Foto & QR Code (dalam pixel, kanvas kartu 360 x 540)
              </label>
              <p className="text-[10px] text-slate-400 mb-2">
                Geser angka di bawah sambil melihat pratinjau kartu pertama di bawah, sampai kotak foto
                & QR pas menutupi area yang benar di desain Anda.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 mb-1.5">KOTAK FOTO</div>
                  {(['x', 'y', 'width', 'height'] as const).map((key) => (
                    <div key={key} className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 uppercase">{key}</span>
                      <input
                        type="number"
                        value={profilSekolah.templateFotoBox[key]}
                        onChange={(e) =>
                          updateProfilSekolah({
                            templateFotoBox: {
                              ...profilSekolah.templateFotoBox,
                              [key]: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-16 text-xs border border-slate-200 rounded px-1.5 py-0.5 text-right"
                      />
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 mb-1.5">KOTAK QR CODE</div>
                  {(['x', 'y', 'width', 'height'] as const).map((key) => (
                    <div key={key} className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 uppercase">{key}</span>
                      <input
                        type="number"
                        value={profilSekolah.templateQrBox[key]}
                        onChange={(e) =>
                          updateProfilSekolah({
                            templateQrBox: {
                              ...profilSekolah.templateQrBox,
                              [key]: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-16 text-xs border border-slate-200 rounded px-1.5 py-0.5 text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINT AREA / CARD RENDER CONTAINER */}
      <div id="print-area">
        {studentsToPrint.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
            Tidak ada data siswa yang cocok dengan pilihan kelas/pencarian.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
            {studentsToPrint.map((siswa) => {
              const k = kelasList.find((item) => item.id === siswa.kelas_id);
              const qrUrl = qrCodeUrls[siswa.id];

              return (
                <div key={siswa.id} className="card-wrapper flex flex-col items-center gap-4">
                  <OfficialStudentCard siswa={siswa} kelas={k} qrCodeUrl={qrUrl} />
                  <OfficialStudentCardBack />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// OFFICIAL STUDENT CARD COMPONENT (SMP NEGERI 9 BANJAR DESIGN)
// =========================================================================
interface OfficialStudentCardProps {
  siswa: Siswa;
  kelas: Kelas | undefined;
  qrCodeUrl?: string;
}

export const OfficialStudentCard: React.FC<OfficialStudentCardProps> = ({
  siswa,
  kelas,
  qrCodeUrl,
}) => {
  const { profilSekolah, supabaseConfig } = useApp();

  // MODE TEMPLATE KUSTOM: kalau sekolah sudah upload desain kartu asli, pakai itu sebagai
  // latar, lalu timpakan foto siswa & QR code di posisi yang sudah dikalibrasi -- hasilnya
  // identik dengan kartu OSIS fisik, bukan pendekatan/replika buatan sistem.
  if (profilSekolah.templateKartuUrl) {
    const fotoBox = profilSekolah.templateFotoBox;
    const qrBox = profilSekolah.templateQrBox;
    return (
      <div className="w-[360px] h-[540px] rounded-3xl overflow-hidden relative shadow-xl border border-slate-200 print:shadow-none print:border print:border-slate-300">
        <img
          src={profilSekolah.templateKartuUrl}
          alt="Template Kartu Pelajar"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <img
          src={getFotoSiswaUrl(siswa, supabaseConfig.url)}
          alt={siswa.nama}
          onError={(e) => {
            (e.target as HTMLImageElement).src = getFotoPlaceholder(siswa.jenis_kelamin);
          }}
          className="absolute object-cover"
          style={{
            left: fotoBox.x,
            top: fotoBox.y,
            width: fotoBox.width,
            height: fotoBox.height,
          }}
        />
        {qrCodeUrl && (
          <img
            src={qrCodeUrl}
            alt={`QR ${siswa.nisn}`}
            className="absolute object-contain bg-white p-1 rounded"
            style={{
              left: qrBox.x,
              top: qrBox.y,
              width: qrBox.width,
              height: qrBox.height,
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="w-[360px] h-[540px] rounded-3xl overflow-hidden relative shadow-xl border border-purple-200/80 flex flex-col justify-between font-sans text-slate-900 select-none print:shadow-none print:border print:border-slate-300"
      style={{
        background:
          'radial-gradient(circle at 25% 10%, #fde68a 0%, #fbcfe8 25%, #e9d5ff 55%, #c4b5fd 85%, #a78bfa 100%)',
      }}
    >
      {/* Decorative Pastel Wave Curves in Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90">
        <svg
          viewBox="0 0 360 540"
          className="w-full h-full"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Soft violet wave 1 */}
          <path
            d="M-20 180 C80 140 180 230 380 160 L380 0 L-20 0 Z"
            fill="#fae8ff"
            fillOpacity="0.6"
          />
          {/* Soft lilac wave 2 */}
          <path
            d="M-20 280 C120 220 220 340 380 290 L380 560 L-20 560 Z"
            fill="#c084fc"
            fillOpacity="0.35"
          />
          {/* Deep purple wave 3 */}
          <path
            d="M-20 380 C140 330 240 430 380 390 L380 560 L-20 560 Z"
            fill="#a855f7"
            fillOpacity="0.25"
          />
        </svg>
      </div>

      {/* CARD CONTENT LAYER */}
      <div className="relative z-10 p-5 flex flex-col h-full justify-between">
        {/* 1. TOP HEADER: LOGOS & TITLE */}
        <div>
          {/* Logos Row */}
          <div className="flex items-center justify-between px-1">
            {/* Left Spacer to keep school logo center */}
            <div className="w-11" />

            {/* School Logo Center */}
            <div className="flex flex-col items-center">
              <SchoolLogo className="w-14 h-14 drop-shadow-xs" />
            </div>

            {/* OSIS Logo Right */}
            <div className="w-11 flex justify-end">
              <LogoOSIS className="w-11 h-11 drop-shadow-xs" />
            </div>
          </div>

          {/* School Titles */}
          <div className="text-center mt-1">
            <h2 className="text-lg font-black tracking-widest text-[#1e1b4b] uppercase leading-none font-serif drop-shadow-xs">
              KARTU PELAJAR
            </h2>
            <h3 className="text-xs font-black tracking-wider text-[#1e1b4b] uppercase mt-1">
              {profilSekolah.nama || 'SMP NEGERI 9 BANJAR'}
            </h3>
          </div>
        </div>

        {/* 2. STUDENT PHOTO */}
        <div className="my-auto flex justify-center py-1">
          <div className="relative">
            {/* Photo frame with smooth rounded corners and shadow */}
            <div className="w-36 h-44 rounded-2xl overflow-hidden border-[3px] border-white shadow-md bg-white">
              <img
                src={getFotoSiswaUrl(siswa, supabaseConfig.url)}
                alt={siswa.nama}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback avatar kalau foto belum diupload ke Storage untuk NISN ini
                  (e.target as HTMLImageElement).src = getFotoPlaceholder(siswa.jenis_kelamin);
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. STUDENT DATA CONTAINER (LEFT) & QR CODE (RIGHT) */}
        <div className="grid grid-cols-12 gap-2.5 items-stretch mt-1">
          {/* Left Purple Rounded Container with White Text */}
          <div className="col-span-8 bg-[#8b5cf6] rounded-2xl p-3 shadow-md text-white flex flex-col justify-center space-y-1.5 border border-purple-400/40">
            {/* NISN */}
            <div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-purple-200 leading-none">
                NISN
              </div>
              <div className="text-xs font-black tracking-wider leading-tight">
                {siswa.nisn || '-'}
              </div>
            </div>

            {/* NAMA */}
            <div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-purple-200 leading-none">
                NAMA
              </div>
              <div className="text-xs font-black tracking-tight leading-tight truncate">
                {siswa.nama}
              </div>
            </div>

            {/* TEMPAT, TANGGAL LAHIR */}
            <div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-purple-200 leading-none">
                TEMPAT, TANGGAL LAHIR
              </div>
              <div className="text-[10px] font-bold leading-tight truncate">
                {siswa.tempat_lahir || 'Banjar'}, {siswa.tanggal_lahir || '-'}
              </div>
            </div>

            {/* ALAMAT */}
            <div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-purple-200 leading-none">
                ALAMAT
              </div>
              <div className="text-[9px] font-medium leading-tight line-clamp-2 text-purple-50">
                {siswa.alamat || 'Kota Banjar'}
              </div>
            </div>
          </div>

          {/* Right White Card Container with QR Code */}
          <div className="col-span-4 bg-white rounded-2xl p-2 shadow-md border border-slate-200 flex flex-col items-center justify-center">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR NISN ${siswa.nisn}`}
                className="w-20 h-20 object-contain rounded-md"
              />
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded-md animate-pulse flex items-center justify-center text-[10px] text-slate-400">
                QR Code
              </div>
            )}
            <div className="text-[8px] font-mono font-bold text-slate-800 tracking-tighter mt-1 text-center truncate w-full">
              {siswa.nisn}
            </div>
          </div>
        </div>

        {/* 4. BOTTOM SOCIAL MEDIA BAR */}
        <div className="mt-2.5 bg-[#1e1b4b] text-white rounded-xl py-1.5 px-3 flex items-center justify-between shadow-xs">
          {/* TikTok */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center text-white text-[8px] font-black shrink-0">
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.95-4.51V8.06a8.28 8.28 0 0 0 3.82.97V5.59a4.82 4.82 0 0 1-.3-.02v1.12z" />
              </svg>
            </div>
            <span className="text-[9px] font-bold tracking-tight text-slate-200">
              @smpn.9.banjar
            </span>
          </div>

          {/* Instagram */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-white text-[8px] shrink-0">
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <span className="text-[9px] font-bold tracking-tight text-slate-200">
              @smpn9banjar_official
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// CARD BACK -- VISI SEKOLAH & BRANDING (sama untuk semua siswa)
// =========================================================================
export const OfficialStudentCardBack: React.FC = () => {
  return (
    <div
      className="w-[360px] h-[540px] rounded-3xl overflow-hidden relative shadow-xl border border-purple-200/80 flex flex-col font-sans text-slate-900 select-none print:shadow-none print:border print:border-slate-300"
      style={{
        background:
          'radial-gradient(circle at 30% 15%, #fbcfe8 0%, #e9d5ff 32%, #c4b5fd 58%, #a78bfa 100%)',
      }}
    >
      {/* Decorative bottom-right triangle accent, echoing the original design */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg viewBox="0 0 360 540" className="w-full h-full" preserveAspectRatio="none">
          <path d="M360 540 L220 540 L360 380 Z" fill="#6d28d9" fillOpacity="0.55" />
          <path d="M360 540 L280 540 L360 440 Z" fill="#4c1d95" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center h-full px-6 pt-8 pb-5">
        {/* Logo */}
        <SchoolLogo className="w-24 h-24 drop-shadow-md" />

        {/* Title */}
        <h2
          className="mt-3 text-3xl italic font-black text-[#1e1b4b] tracking-wide"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Visi Sekolah
        </h2>

        {/* Visi Box */}
        <div className="mt-4 bg-[#8b5cf6]/90 rounded-2xl px-4 py-4 shadow-md border border-purple-300/50">
          <p className="text-white text-[13px] font-black leading-snug text-center uppercase tracking-tight">
            Terwujudnya peserta didik yang beriman, berkarakter, berprestasi, berbudaya, cinta
            lingkungan dan berkebhinekaan global
          </p>
        </div>

        {/* Tagline */}
        <div className="mt-6 flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-black italic text-[#4338ca] tracking-tight leading-none">
            WE ARE THE BEST!!!
          </p>
          <p className="text-5xl font-black italic text-[#1e1b4b] tracking-tight mt-1 drop-shadow-xs">
            YES!!!
          </p>
        </div>

        {/* Program Badges */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="text-center leading-none">
            <div className="text-[8px] font-bold text-slate-700 tracking-wider">KEMENDIKDASMEN</div>
            <div className="text-base font-black text-sky-500 tracking-wide">RAMAH</div>
          </div>
          <div className="w-px h-7 bg-slate-400/50" />
          <div className="flex items-center gap-1 text-left leading-tight">
            <span className="text-rose-600 font-black text-lg">#</span>
            <div>
              <div className="text-[10px] font-black text-rose-600">PENDIDIKAN</div>
              <div className="text-[10px] font-black text-indigo-700">BERMUTU UNTUK SEMUA</div>
            </div>
          </div>
        </div>

        {/* Bottom Social Bar */}
        <div className="w-full bg-[#1e1b4b] text-white rounded-xl py-2 px-3 flex items-center justify-center gap-2 shadow-xs">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-red-500">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span className="text-[10px] font-bold tracking-tight">@SMPN9BANJAR</span>
        </div>
      </div>
    </div>
  );
};
