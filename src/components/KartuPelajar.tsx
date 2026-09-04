import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Siswa, Kelas } from '../types';
import QRCode from 'qrcode';
import { SchoolLogo, LogoOSIS } from './SchoolLogos';
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
  const { siswaList, kelasList, profilSekolah } = useApp();

  const [selectedKelasId, setSelectedKelasId] = useState<string>('all');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(
    initialSelectedId || (siswaList[0]?.id ?? '')
  );
  const [modeCetak, setModeCetak] = useState<'single' | 'batch'>('single');
  const [searchFilter, setSearchFilter] = useState('');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});

  // Generate QR codes for all students
  useEffect(() => {
    let isMounted = true;
    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      for (const s of siswaList) {
        try {
          const dataUrl = await QRCode.toDataURL(s.kode_barcode, {
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

      {/* Info Badge */}
      <div className="no-print bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-center justify-between text-xs text-indigo-900">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Desain kartu disesuaikan dengan template resmi <strong>SMP NEGERI 9 BANJAR</strong>: Logo Sekolah, Logo OSIS, NISN, Nama, Tempat Tanggal Lahir, Alamat, dan Media Sosial Resmi.
          </span>
        </div>
        <span className="font-bold text-indigo-700 hidden sm:inline">
          Format ID Card Portrait (54mm x 86mm)
        </span>
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
                <div key={siswa.id} className="card-wrapper">
                  <OfficialStudentCard siswa={siswa} kelas={k} qrCodeUrl={qrUrl} />
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
  const { profilSekolah } = useApp();
  return (
    <div
      className="w-[360px] h-[540px] rounded-3xl overflow-hidden relative shadow-xl border border-purple-200/80 flex flex-col justify-between font-sans text-slate-900 select-none print:shadow-none print:border print:border-slate-300"
      style={{
        background: 'linear-gradient(145deg, #fce7f3 0%, #ede9fe 35%, #e9d5ff 70%, #d8b4fe 100%)',
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
                src={siswa.foto_url}
                alt={siswa.nama}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback avatar
                  (e.target as HTMLImageElement).src =
                    siswa.jenis_kelamin === 'P'
                      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                      : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200';
                }}
              />
            </div>

            {/* Student Class Badge */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#1e1b4b] text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wider whitespace-nowrap">
              Kelas {kelas?.nama_kelas || '-'}
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
                alt={`QR ${siswa.kode_barcode}`}
                className="w-20 h-20 object-contain rounded-md"
              />
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded-md animate-pulse flex items-center justify-center text-[10px] text-slate-400">
                QR Code
              </div>
            )}
            <div className="text-[8px] font-mono font-bold text-slate-800 tracking-tighter mt-1 text-center truncate w-full">
              {siswa.kode_barcode}
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
