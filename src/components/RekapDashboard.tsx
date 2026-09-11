import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../data/initialData';
import {
  Calendar,
  Filter,
  Download,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  LogOut,
  Search,
  MessageSquare,
  FileSpreadsheet,
  Trash2,
  Printer,
  TrendingUp,
  Award,
  ChevronRight,
  BarChart3,
  CalendarDays,
  ListFilter,
  Check,
  X,
  Building2,
  Phone,
  Eye,
  FileText,
  Cloud,
  HardDrive,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SchoolLogo, LogoTutWuri, CityLogo } from './SchoolLogos';
import { getFotoSiswaUrl, getFotoPlaceholder } from '../lib/fotoHelper';

type FilterMode = 'harian' | 'bulanan' | 'rentang';

export const RekapDashboard: React.FC = () => {
  const { absensiList, siswaList, kelasList, logNotifikasiList, deleteAbsensi, profilSekolah, supabaseConfig } = useApp();

  // Mode Tarik Data
  const [filterMode, setFilterMode] = useState<FilterMode>('harian');

  // Dates
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(getTodayDateString());

  // Class & Status Filter
  const [selectedKelasId, setSelectedKelasId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active view tab
  const [activeTab, setActiveTab] = useState<'rekap' | 'matriks' | 'siswa' | 'analisis' | 'log_wa'>('rekap');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(siswaList[0]?.id || '');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Month names in Indonesian
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Helper: check if a record falls within the active filter
  const isDateInActiveFilter = (dateStr: string): boolean => {
    if (filterMode === 'harian') {
      return dateStr === selectedDate;
    } else if (filterMode === 'bulanan') {
      const d = new Date(dateStr);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    } else if (filterMode === 'rentang') {
      return dateStr >= startDate && dateStr <= endDate;
    }
    return true;
  };

  // Human-readable period label
  const activePeriodLabel = useMemo(() => {
    if (filterMode === 'harian') {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (filterMode === 'bulanan') {
      return `Bulan ${monthNames[selectedMonth]} ${selectedYear}`;
    } else {
      return `Periode ${startDate} s/d ${endDate}`;
    }
  }, [filterMode, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  // Selected Class object
  const activeClassObj = useMemo(() => {
    if (selectedKelasId === 'all') return null;
    return kelasList.find((k) => k.id === selectedKelasId) || null;
  }, [kelasList, selectedKelasId]);

  // Distinct dates in the active filter period that have attendance
  const distinctAttendanceDates = useMemo(() => {
    const dates = new Set<string>();
    absensiList.forEach((a) => {
      if (isDateInActiveFilter(a.tanggal)) {
        dates.add(a.tanggal);
      }
    });
    // Sort ascending
    return Array.from(dates).sort();
  }, [absensiList, filterMode, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  // 1. HARIAN: Filtered Daily List
  const dailyAttendanceList = useMemo(() => {
    return siswaList
      .filter((siswa) => {
        if (selectedKelasId !== 'all' && siswa.kelas_id !== selectedKelasId) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = siswa.nama.toLowerCase().includes(q);
          const matchNisn = siswa.nisn.toLowerCase().includes(q);
          if (!matchName && !matchNisn) return false;
        }
        return true;
      })
      .map((siswa) => {
        const studentClass = kelasList.find((k) => k.id === siswa.kelas_id);
        const scanMasuk = absensiList.find(
          (a) => a.siswa_id === siswa.id && a.tanggal === selectedDate && a.jenis === 'masuk'
        );
        const scanPulang = absensiList.find(
          (a) => a.siswa_id === siswa.id && a.tanggal === selectedDate && a.jenis === 'pulang'
        );

        let overallStatus: 'tepat_waktu' | 'terlambat' | 'belum_absen' = 'belum_absen';
        if (scanMasuk) {
          overallStatus = scanMasuk.status;
        }

        return {
          siswa,
          kelas: studentClass,
          scanMasuk,
          scanPulang,
          overallStatus,
        };
      })
      .filter((item) => {
        if (selectedStatusFilter === 'all') return true;
        if (selectedStatusFilter === 'tepat_waktu') return item.overallStatus === 'tepat_waktu';
        if (selectedStatusFilter === 'terlambat') return item.overallStatus === 'terlambat';
        if (selectedStatusFilter === 'belum_absen') return item.overallStatus === 'belum_absen';
        if (selectedStatusFilter === 'pulang') return !!item.scanPulang;
        return true;
      });
  }, [siswaList, kelasList, absensiList, selectedDate, selectedKelasId, searchQuery, selectedStatusFilter]);

  // 2. BULANAN & RENTANG: Aggregated Student Metrics across the period
  const periodicStudentMetrics = useMemo(() => {
    // Total effective recorded dates
    const totalDaysRecorded = Math.max(1, distinctAttendanceDates.length);

    return siswaList
      .filter((siswa) => {
        if (selectedKelasId !== 'all' && siswa.kelas_id !== selectedKelasId) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = siswa.nama.toLowerCase().includes(q);
          const matchNisn = siswa.nisn.toLowerCase().includes(q);
          if (!matchName && !matchNisn) return false;
        }
        return true;
      })
      .map((siswa) => {
        const studentClass = kelasList.find((k) => k.id === siswa.kelas_id);
        
        // Filter scans for this student in current period
        const periodScans = absensiList.filter(
          (a) => a.siswa_id === siswa.id && isDateInActiveFilter(a.tanggal)
        );

        // Count unique dates attended
        const attendedDates = new Set(periodScans.filter((a) => a.jenis === 'masuk').map((a) => a.tanggal));
        const totalHadir = attendedDates.size;

        const totalTepatWaktu = periodScans.filter((a) => a.jenis === 'masuk' && a.status === 'tepat_waktu').length;
        const totalTerlambat = periodScans.filter((a) => a.jenis === 'masuk' && a.status === 'terlambat').length;
        const totalPulang = periodScans.filter((a) => a.jenis === 'pulang').length;
        
        const totalTanpaKeterangan = Math.max(0, totalDaysRecorded - totalHadir);
        const persentase = Math.round((totalHadir / totalDaysRecorded) * 100);

        let predikat = 'Sangat Baik';
        if (persentase >= 90) predikat = 'Sangat Disiplin';
        else if (persentase >= 75) predikat = 'Baik';
        else if (persentase >= 50) predikat = 'Cukup';
        else predikat = 'Perlu Pembinaan';

        return {
          siswa,
          kelas: studentClass,
          totalHadir,
          totalTepatWaktu,
          totalTerlambat,
          totalPulang,
          totalTanpaKeterangan,
          totalDaysRecorded,
          persentase,
          predikat,
        };
      })
      .sort((a, b) => b.persentase - a.persentase);
  }, [siswaList, kelasList, absensiList, selectedKelasId, searchQuery, distinctAttendanceDates, filterMode, selectedMonth, selectedYear, startDate, endDate]);

  // Overall Period KPIs
  const periodKpi = useMemo(() => {
    const targetStudents = siswaList.filter((s) => selectedKelasId === 'all' || s.kelas_id === selectedKelasId);
    const totalSiswa = targetStudents.length;

    if (filterMode === 'harian') {
      const todayAbsensi = absensiList.filter((a) => a.tanggal === selectedDate);
      const studentIdsInClass = new Set(targetStudents.map((s) => s.id));
      const classAbsensi = todayAbsensi.filter((a) => studentIdsInClass.has(a.siswa_id));

      const masukScans = classAbsensi.filter((a) => a.jenis === 'masuk');
      const tepatWaktuCount = masukScans.filter((a) => a.status === 'tepat_waktu').length;
      const terlambatCount = masukScans.filter((a) => a.status === 'terlambat').length;
      const pulangCount = classAbsensi.filter((a) => a.jenis === 'pulang').length;
      const hadirTotal = new Set(masukScans.map((a) => a.siswa_id)).size;
      const belumAbsenCount = Math.max(0, totalSiswa - hadirTotal);
      const kehadiranPercentage = totalSiswa > 0 ? Math.round((hadirTotal / totalSiswa) * 100) : 0;

      return {
        totalSiswa,
        hadirTotal,
        tepatWaktuCount,
        terlambatCount,
        pulangCount,
        belumAbsenCount,
        kehadiranPercentage,
        totalHariSekolah: 1,
      };
    } else {
      // Periodic Aggregate
      const effectiveDays = Math.max(1, distinctAttendanceDates.length);
      const totalPossibleAttendances = totalSiswa * effectiveDays;
      let totalHadirAccum = 0;
      let totalTepatWaktuAccum = 0;
      let totalTerlambatAccum = 0;
      let totalPulangAccum = 0;

      periodicStudentMetrics.forEach((m) => {
        totalHadirAccum += m.totalHadir;
        totalTepatWaktuAccum += m.totalTepatWaktu;
        totalTerlambatAccum += m.totalTerlambat;
        totalPulangAccum += m.totalPulang;
      });

      const avgPercentage =
        totalPossibleAttendances > 0 ? Math.round((totalHadirAccum / totalPossibleAttendances) * 100) : 0;

      return {
        totalSiswa,
        hadirTotal: totalHadirAccum,
        tepatWaktuCount: totalTepatWaktuAccum,
        terlambatCount: totalTerlambatAccum,
        pulangCount: totalPulangAccum,
        belumAbsenCount: Math.max(0, totalPossibleAttendances - totalHadirAccum),
        kehadiranPercentage: avgPercentage,
        totalHariSekolah: effectiveDays,
      };
    }
  }, [siswaList, absensiList, selectedKelasId, filterMode, selectedDate, distinctAttendanceDates, periodicStudentMetrics]);

  // Per-Class Comparison Insights
  const classComparisonStats = useMemo(() => {
    return kelasList.map((k) => {
      const studentsInClass = siswaList.filter((s) => s.kelas_id === k.id);
      const studentIds = new Set(studentsInClass.map((s) => s.id));
      const totalStudents = studentsInClass.length;

      let attendances = 0;
      let lateCount = 0;

      if (filterMode === 'harian') {
        const todayScans = absensiList.filter((a) => a.tanggal === selectedDate && a.jenis === 'masuk' && studentIds.has(a.siswa_id));
        attendances = todayScans.length;
        lateCount = todayScans.filter((a) => a.status === 'terlambat').length;
      } else {
        const periodScans = absensiList.filter((a) => isDateInActiveFilter(a.tanggal) && a.jenis === 'masuk' && studentIds.has(a.siswa_id));
        attendances = periodScans.length;
        lateCount = periodScans.filter((a) => a.status === 'terlambat').length;
      }

      const totalPossible = filterMode === 'harian' ? totalStudents : totalStudents * Math.max(1, distinctAttendanceDates.length);
      const rate = totalPossible > 0 ? Math.round((attendances / totalPossible) * 100) : 0;

      return {
        kelas: k,
        totalStudents,
        attendances,
        lateCount,
        rate,
      };
    });
  }, [kelasList, siswaList, absensiList, filterMode, selectedDate, distinctAttendanceDates]);

  // Top disciplined students & Top late students
  const studentRankings = useMemo(() => {
    const list = [...periodicStudentMetrics];
    const topPunctual = [...list].sort((a, b) => b.totalTepatWaktu - a.totalTepatWaktu).slice(0, 5);
    const topLate = [...list].filter((s) => s.totalTerlambat > 0).sort((a, b) => b.totalTerlambat - a.totalTerlambat).slice(0, 5);
    return { topPunctual, topLate };
  }, [periodicStudentMetrics]);

  // Individual Student History
  const selectedStudentData = useMemo(() => {
    const student = siswaList.find((s) => s.id === selectedStudentId);
    const studentClass = student ? kelasList.find((k) => k.id === student.kelas_id) : undefined;
    const studentScans = absensiList
      .filter((a) => a.siswa_id === selectedStudentId && isDateInActiveFilter(a.tanggal))
      .sort((a, b) => b.timestamp - a.timestamp);

    const totalMasuk = studentScans.filter((a) => a.jenis === 'masuk').length;
    const totalTepatWaktu = studentScans.filter((a) => a.jenis === 'masuk' && a.status === 'tepat_waktu').length;
    const totalTerlambat = studentScans.filter((a) => a.jenis === 'masuk' && a.status === 'terlambat').length;
    const totalPulang = studentScans.filter((a) => a.jenis === 'pulang').length;

    return {
      student,
      studentClass,
      studentScans,
      totalMasuk,
      totalTepatWaktu,
      totalTerlambat,
      totalPulang,
    };
  }, [siswaList, kelasList, absensiList, selectedStudentId, filterMode, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  // Export to Excel (.xlsx) Function
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (filterMode === 'harian') {
      const data = dailyAttendanceList.map((item, idx) => ({
        No: idx + 1,
        Tanggal: selectedDate,
        NISN: item.siswa.nisn,
        'Nama Siswa': item.siswa.nama,
        Kelas: item.kelas?.nama_kelas || '-',
        'Wali Kelas': item.kelas?.wali_kelas || '-',
        'Jam Masuk': item.scanMasuk ? item.scanMasuk.waktu_scan : '-',
        'Status Kedatangan': item.scanMasuk
          ? item.scanMasuk.status === 'terlambat'
            ? 'Terlambat'
            : 'Tepat Waktu'
          : 'Belum Hadir / Alfa',
        'Jam Pulang': item.scanPulang ? item.scanPulang.waktu_scan : '-',
        'No WA Ortu': item.siswa.nomor_wa_ortu,
        'Nama Ortu': item.siswa.nama_ortu,
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Harian');
      XLSX.writeFile(workbook, `Rekap_Absensi_SMPN9Banjar_${selectedDate}_${selectedKelasId}.xlsx`);
    } else {
      // Periodic Summary Excel
      const data = periodicStudentMetrics.map((item, idx) => ({
        No: idx + 1,
        NISN: item.siswa.nisn,
        'Nama Siswa': item.siswa.nama,
        Kelas: item.kelas?.nama_kelas || '-',
        'Wali Kelas': item.kelas?.wali_kelas || '-',
        'Total Hari Efektif': item.totalDaysRecorded,
        'Hadir (H)': item.totalHadir,
        'Tepat Waktu (T)': item.totalTepatWaktu,
        'Terlambat (TL)': item.totalTerlambat,
        'Pulang Tercatat (P)': item.totalPulang,
        'Tanpa Keterangan (A)': item.totalTanpaKeterangan,
        'Persentase Kehadiran (%)': `${item.persentase}%`,
        Predikat: item.predikat,
        'No WA Wali': item.siswa.nomor_wa_ortu,
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Bulanan');
      const filename =
        filterMode === 'bulanan'
          ? `Rekap_Presensi_SMPN9Banjar_${monthNames[selectedMonth]}_${selectedYear}_${selectedKelasId}.xlsx`
          : `Rekap_Presensi_SMPN9Banjar_${startDate}_sd_${endDate}_${selectedKelasId}.xlsx`;
      XLSX.writeFile(workbook, filename);
    }
  };

  // Export to CSV Function
  const exportToCSV = () => {
    if (filterMode === 'harian') {
      const headers = [
        'Tanggal',
        'NISN',
        'Nama Siswa',
        'Kelas',
        'Jam Masuk',
        'Status Kedatangan',
        'Jam Pulang',
        'No WA Ortu',
      ];
      const rows = dailyAttendanceList.map((item) => [
        selectedDate,
        `"${item.siswa.nisn}"`,
        `"${item.siswa.nama}"`,
        `"${item.kelas?.nama_kelas || '-'}"`,
        item.scanMasuk ? item.scanMasuk.waktu_scan : '-',
        item.scanMasuk
          ? item.scanMasuk.status === 'terlambat'
            ? 'Terlambat'
            : 'Tepat Waktu'
          : 'Belum Hadir',
        item.scanPulang ? item.scanPulang.waktu_scan : '-',
        `"${item.siswa.nomor_wa_ortu}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rekap_Absensi_${selectedDate}_Kelas_${selectedKelasId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      const headers = [
        'Periode',
        'NISN',
        'Nama Siswa',
        'Kelas',
        'Total Hari',
        'Hadir (H)',
        'Tepat Waktu (T)',
        'Terlambat (TL)',
        'Alfa (A)',
        '% Kehadiran',
        'Predikat',
      ];
      const rows = periodicStudentMetrics.map((item) => [
        `"${activePeriodLabel}"`,
        `"${item.siswa.nisn}"`,
        `"${item.siswa.nama}"`,
        `"${item.kelas?.nama_kelas || '-'}"`,
        item.totalDaysRecorded,
        item.totalHadir,
        item.totalTepatWaktu,
        item.totalTerlambat,
        item.totalTanpaKeterangan,
        `"${item.persentase}%"`,
        `"${item.predikat}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rekap_Presensi_Periodik_${selectedKelasId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div id="rekap-dashboard-page" className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER UTAMA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard Rekap Presensi
            </h1>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
              SMPN 9 BANJAR
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitoring kehadiran siswa terintegrasi per kelas, per bulan, dan rentang tanggal dengan analisis kedisiplinan.
          </p>
        </div>

        {/* Action Export & Print Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-print-laporan"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Cetak Laporan Resmi</span>
          </button>

          <button
            id="export-excel-btn"
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            id="export-csv-btn"
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            title="Ekspor CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL CANGGIH */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Row 1: Mode Tarik Data Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Mode Tarik Data:</span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterMode('harian')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'harian'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Harian (Tanggal Tertentu)</span>
              </button>

              <button
                onClick={() => setFilterMode('bulanan')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'bulanan'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Per Bulan</span>
              </button>

              <button
                onClick={() => setFilterMode('rentang')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'rentang'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Rentang Tanggal Custom</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Periode Aktif: </span>
            <span className="font-bold text-slate-800">{activePeriodLabel}</span>
          </div>
        </div>

        {/* Row 2: Dynamic Selectors Based on Mode */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Dynamic Date Inputs based on FilterMode */}
          <div className="md:col-span-5 flex items-center gap-2">
            {filterMode === 'harian' && (
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs flex-1">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer w-full text-xs"
                  />
                </div>
                <button
                  onClick={() => setSelectedDate(getTodayDateString())}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                >
                  Hari Ini
                </button>
              </div>
            )}

            {filterMode === 'bulanan' && (
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={idx} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>
            )}

            {filterMode === 'rentang' && (
              <div className="flex items-center gap-1.5 w-full text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-2.5 py-2 w-full text-xs focus:outline-none"
                />
                <span className="text-slate-400 font-bold">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-2.5 py-2 w-full text-xs focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Filter Kelas */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer w-full"
              >
                <option value="all">Semua Kelas ({kelasList.length} Rombel)</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama_kelas} ({k.wali_kelas})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Status (hanya saat mode harian) */}
          {filterMode === 'harian' ? (
            <div className="md:col-span-2">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="tepat_waktu">Tepat Waktu</option>
                <option value="terlambat">Terlambat</option>
                <option value="pulang">Sudah Pulang</option>
                <option value="belum_absen">Belum Hadir</option>
              </select>
            </div>
          ) : (
            <div className="md:col-span-2 text-xs text-slate-500 font-semibold flex items-center gap-1">
              <span>Hari Efektif:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {distinctAttendanceDates.length} Hari
              </span>
            </div>
          )}

          {/* Quick Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa/NISN..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Selected Class Highlight Banner (If specific class selected) */}
        {activeClassObj && (
          <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs text-emerald-900 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-emerald-900">
                Data Khusus Rombel: {activeClassObj.nama_kelas}
              </span>
              <span>•</span>
              <span>Wali Kelas: <strong>{activeClassObj.wali_kelas}</strong></span>
              {activeClassObj.ruang && <span>• Ruangan: {activeClassObj.ruang}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span>Total: <strong>{periodKpi.totalSiswa} Siswa</strong></span>
              <span>Rata-rata Kehadiran: <strong className="text-emerald-700 font-bold">{periodKpi.kehadiranPercentage}%</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* KPI METRIC CARDS (Dinamis sesuai Mode) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Total Siswa / Target Siswa */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Siswa</span>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900">{periodKpi.totalSiswa}</div>
          <div className="text-xs text-slate-500 mt-1">
            {selectedKelasId === 'all' ? 'Seluruh Kelas' : `Kelas ${activeClassObj?.nama_kelas}`}
          </div>
        </div>

        {/* Tepat Waktu */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tepat Waktu</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-700">{periodKpi.tepatWaktuCount}</div>
          <div className="text-xs text-emerald-600/80 mt-1">
            {filterMode === 'harian' ? 'Kedatangan pagi' : 'Total kedatangan disiplin'}
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Terlambat</span>
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-amber-700">{periodKpi.terlambatCount}</div>
          <div className="text-xs text-amber-600/80 mt-1">Melewati batas waktu</div>
        </div>

        {/* Pulang Tercatat */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sudah Pulang</span>
            <LogOut className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-blue-700">{periodKpi.pulangCount}</div>
          <div className="text-xs text-blue-600/80 mt-1">Scan kepulangan siswa</div>
        </div>

        {/* Tingkat Kehadiran % */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">% Kehadiran</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-purple-700">{periodKpi.kehadiranPercentage}%</div>
          <div className="text-xs text-purple-600/80 mt-1">
            {filterMode === 'harian'
              ? `${periodKpi.hadirTotal} hadir / ${periodKpi.belumAbsenCount} belum`
              : `${periodKpi.totalHariSekolah} hari efektif belajar`}
          </div>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="tab-rekap-utama"
          onClick={() => setActiveTab('rekap')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'rekap'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Rekap Kehadiran {filterMode === 'harian' ? 'Harian' : 'Periodik'}</span>
        </button>

        {filterMode !== 'harian' && (
          <button
            id="tab-rekap-matriks"
            onClick={() => setActiveTab('matriks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'matriks'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Matriks Tanggal ({distinctAttendanceDates.length} Hari)</span>
          </button>
        )}

        <button
          id="tab-rekap-siswa"
          onClick={() => setActiveTab('siswa')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'siswa'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Riwayat Per Siswa</span>
        </button>

        <button
          id="tab-rekap-analisis"
          onClick={() => setActiveTab('analisis')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'analisis'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analisis & Perbandingan Kelas</span>
        </button>

        <button
          id="tab-log-wa"
          onClick={() => setActiveTab('log_wa')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ml-auto ${
            activeTab === 'log_wa'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Log WhatsApp ({logNotifikasiList.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: REKAP KEHADIRAN UTAMA */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          {/* HARIAN VIEW */}
          {filterMode === 'harian' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">
                  Data Presensi Tanggal: {selectedDate} ({dailyAttendanceList.length} Siswa)
                </span>
                <span className="text-xs text-slate-400">
                  Kriteria Waktu Masuk & Pulang otomatis terdeteksi POS
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">No</th>
                      <th className="px-4 py-3.5">Siswa</th>
                      <th className="px-4 py-3.5">Kelas</th>
                      <th className="px-4 py-3.5">Scan Masuk</th>
                      <th className="px-4 py-3.5">Status Kedatangan</th>
                      <th className="px-4 py-3.5">Scan Pulang</th>
                      <th className="px-4 py-3.5">Kontak Ortu (WA)</th>
                      <th className="px-4 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyAttendanceList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                          Tidak ada data absensi yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      dailyAttendanceList.map((item, idx) => (
                        <tr key={item.siswa.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={getFotoSiswaUrl(item.siswa, supabaseConfig.url)}
                                alt={item.siswa.nama}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getFotoPlaceholder(item.siswa.jenis_kelamin);
                                }}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-slate-900">{item.siswa.nama}</div>
                                <div className="text-xs text-slate-500 font-mono">
                                  NISN: {item.siswa.nisn}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                              {item.kelas?.nama_kelas || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.scanMasuk ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800">
                                  {item.scanMasuk.waktu_scan.substring(0, 5)} WIB
                                </span>
                                {item.scanMasuk.synced ? (
                                  <span title="Tersinkron ke database" className="text-emerald-600">
                                    <Cloud className="w-3.5 h-3.5 inline" />
                                  </span>
                                ) : (
                                  <span title="Tersimpan lokal di perangkat" className="text-amber-600">
                                    <HardDrive className="w-3.5 h-3.5 inline" />
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.scanMasuk ? (
                              item.scanMasuk.status === 'terlambat' ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-xs">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Terlambat
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-xs">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Tepat Waktu
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-full text-xs">
                                Belum Hadir
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.scanPulang ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md text-xs">
                                  {item.scanPulang.waktu_scan.substring(0, 5)} WIB
                                </span>
                                {item.scanPulang.synced ? (
                                  <span title="Tersinkron ke database" className="text-emerald-600">
                                    <Cloud className="w-3.5 h-3.5 inline" />
                                  </span>
                                ) : (
                                  <span title="Tersimpan lokal di perangkat" className="text-amber-600">
                                    <HardDrive className="w-3.5 h-3.5 inline" />
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-medium text-slate-800">{item.siswa.nomor_wa_ortu}</div>
                            <div className="text-slate-400">{item.siswa.nama_ortu}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                title="Lihat detail riwayat siswa"
                                onClick={() => {
                                  setSelectedStudentId(item.siswa.id);
                                  setActiveTab('siswa');
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {item.scanMasuk && (
                                <button
                                  title="Hapus record absensi ini"
                                  onClick={() => {
                                    if (confirm(`Hapus data absensi masuk untuk ${item.siswa.nama}?`)) {
                                      deleteAbsensi(item.scanMasuk!.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* PERIODIC / BULANAN SUMMARY VIEW */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-sm text-slate-800">
                  Rekapitulasi Kehadiran: {activePeriodLabel} ({periodicStudentMetrics.length} Siswa)
                </span>
                <div className="text-xs text-slate-500">
                  Total Hari Efektif: <strong className="text-slate-900">{distinctAttendanceDates.length} Hari</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">No</th>
                      <th className="px-4 py-3.5">Siswa</th>
                      <th className="px-4 py-3.5">Kelas</th>
                      <th className="px-4 py-3.5 text-center">Hadir (H)</th>
                      <th className="px-4 py-3.5 text-center">Tepat (T)</th>
                      <th className="px-4 py-3.5 text-center">Terlambat (TL)</th>
                      <th className="px-4 py-3.5 text-center">Alfa (A)</th>
                      <th className="px-4 py-3.5 text-center">% Kehadiran</th>
                      <th className="px-4 py-3.5">Predikat</th>
                      <th className="px-4 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {periodicStudentMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">
                          Tidak ada data absensi yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      periodicStudentMetrics.map((item, idx) => (
                        <tr key={item.siswa.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={getFotoSiswaUrl(item.siswa, supabaseConfig.url)}
                                alt={item.siswa.nama}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getFotoPlaceholder(item.siswa.jenis_kelamin);
                                }}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-slate-900">{item.siswa.nama}</div>
                                <div className="text-xs text-slate-500 font-mono">NISN: {item.siswa.nisn}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                              {item.kelas?.nama_kelas || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-900">
                            {item.totalHadir}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-emerald-700 bg-emerald-50/40">
                            {item.totalTepatWaktu}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-amber-700 bg-amber-50/40">
                            {item.totalTerlambat}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-rose-700 bg-rose-50/40">
                            {item.totalTanpaKeterangan}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-2">
                              <span className="font-black text-xs text-slate-900">{item.persentase}%</span>
                              <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full ${
                                    item.persentase >= 85
                                      ? 'bg-emerald-500'
                                      : item.persentase >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, item.persentase)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                item.predikat === 'Sangat Disiplin'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.predikat === 'Baik'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.predikat === 'Cukup'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.predikat}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudentId(item.siswa.id);
                                setActiveTab('siswa');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: MATRIKS KALENDER HARIAN (BULANAN/RENTANG) */}
      {activeTab === 'matriks' && filterMode !== 'harian' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Matriks Presensi Harian Siswa</h3>
              <p className="text-xs text-slate-500">
                Peta kedatangan siswa per tanggal dalam periode {activePeriodLabel}.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Tepat Waktu (H)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Terlambat (TL)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" /> Alfa / Belum (A)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-600">
                <tr>
                  <th className="p-2 border-r border-slate-200 w-10 text-center">No</th>
                  <th className="p-2 border-r border-slate-200 min-w-44">Nama Siswa</th>
                  <th className="p-2 border-r border-slate-200 w-20 text-center">Kelas</th>
                  {distinctAttendanceDates.map((dateStr) => {
                    const dayNum = dateStr.slice(-2);
                    return (
                      <th
                        key={dateStr}
                        className="p-1.5 border-r border-slate-200 text-center w-8 font-mono"
                        title={dateStr}
                      >
                        {dayNum}
                      </th>
                    );
                  })}
                  <th className="p-2 border-r border-slate-200 text-center w-12 bg-emerald-50 text-emerald-800">H</th>
                  <th className="p-2 border-r border-slate-200 text-center w-12 bg-amber-50 text-amber-800">TL</th>
                  <th className="p-2 border-r border-slate-200 text-center w-12 bg-rose-50 text-rose-800">A</th>
                  <th className="p-2 text-center w-14 font-black">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periodicStudentMetrics.map((item, idx) => (
                  <tr key={item.siswa.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                      {item.siswa.nama}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                      {item.kelas?.nama_kelas}
                    </td>
                    {distinctAttendanceDates.map((dateStr) => {
                      const scan = absensiList.find(
                        (a) => a.siswa_id === item.siswa.id && a.tanggal === dateStr && a.jenis === 'masuk'
                      );

                      return (
                        <td
                          key={dateStr}
                          className="p-1 border-r border-slate-200 text-center"
                          title={`${item.siswa.nama} - ${dateStr}: ${scan ? scan.status : 'Alfa'}`}
                        >
                          {scan ? (
                            scan.status === 'tepat_waktu' ? (
                              <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold inline-flex items-center justify-center text-[10px]">
                                ✓
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-bold inline-flex items-center justify-center text-[10px]">
                                T
                              </span>
                            )
                          ) : (
                            <span className="w-5 h-5 rounded bg-rose-50 text-rose-500 font-bold inline-flex items-center justify-center text-[10px]">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      {item.totalHadir}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-amber-700 bg-amber-50/20">
                      {item.totalTerlambat}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-rose-700 bg-rose-50/20">
                      {item.totalTanpaKeterangan}
                    </td>
                    <td className="p-2 text-center font-black text-slate-900">
                      {item.persentase}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: RIWAYAT PER SISWA */}
      {activeTab === 'siswa' && (
        <div className="space-y-6">
          {/* Student Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-96">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Pilih Siswa:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                {siswaList
                  .filter((s) => selectedKelasId === 'all' || s.kelas_id === selectedKelasId)
                  .map((s) => {
                    const k = kelasList.find((item) => item.id === s.kelas_id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({k?.nama_kelas || '-'}) - {s.nisn}
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Quick Profile Summary */}
            {selectedStudentData.student && (
              <div className="flex items-center gap-4 w-full md:w-auto">
                <img
                  src={getFotoSiswaUrl(selectedStudentData.student, supabaseConfig.url)}
                  alt={selectedStudentData.student.nama}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getFotoPlaceholder(selectedStudentData.student!.jenis_kelamin);
                  }}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                />
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedStudentData.student.nama}</h3>
                  <p className="text-xs text-slate-500">
                    Kelas {selectedStudentData.studentClass?.nama_kelas} • Wali Kelas:{' '}
                    {selectedStudentData.studentClass?.wali_kelas}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    NISN: {selectedStudentData.student.nisn} • WA Ortu: {selectedStudentData.student.nomor_wa_ortu}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Student Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Kehadiran</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {selectedStudentData.totalMasuk} Hari
              </div>
              <div className="text-xs text-slate-400 mt-1">{activePeriodLabel}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30">
              <div className="text-xs text-emerald-700 font-semibold uppercase">Tepat Waktu</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {selectedStudentData.totalTepatWaktu}
              </div>
              <div className="text-xs text-emerald-600/80 mt-1">Sesuai jam tata tertib</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30">
              <div className="text-xs text-amber-700 font-semibold uppercase">Terlambat</div>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {selectedStudentData.totalTerlambat}
              </div>
              <div className="text-xs text-amber-600/80 mt-1">Melewati batas pos</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30">
              <div className="text-xs text-blue-700 font-semibold uppercase">Scan Kepulangan</div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {selectedStudentData.totalPulang}
              </div>
              <div className="text-xs text-blue-600/80 mt-1">Sesi kepulangan</div>
            </div>
          </div>

          {/* Individual History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 font-bold text-slate-800 flex items-center justify-between">
              <span>Log Riwayat Scan Siswa ({activePeriodLabel})</span>
              <span className="text-xs font-normal text-slate-400">
                {selectedStudentData.studentScans.length} Catatan tercatat
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Waktu Scan</th>
                    <th className="px-4 py-3">Jenis Absensi</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedStudentData.studentScans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                        Belum ada riwayat scan untuk siswa ini pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    selectedStudentData.studentScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{scan.tanggal}</td>
                        <td className="px-4 py-3 font-mono">{scan.waktu_scan} WIB</td>
                        <td className="px-4 py-3 uppercase font-bold text-xs">
                          {scan.jenis === 'masuk' ? (
                            <span className="text-emerald-700">Kedatangan</span>
                          ) : (
                            <span className="text-blue-700">Kepulangan</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {scan.status === 'terlambat' ? (
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                              Terlambat
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                              Tepat Waktu
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{scan.catatan || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ANALISIS & PERBANDINGAN KELAS */}
      {activeTab === 'analisis' && (
        <div className="space-y-6">
          {/* Class Comparison Grid */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Perbandingan Tingkat Kehadiran Antar Kelas</h3>
              <p className="text-xs text-slate-500">
                Peringkat dan persentase kehadiran per rombongan belajar pada {activePeriodLabel}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {classComparisonStats.map((item) => (
                <div
                  key={item.kelas.id}
                  onClick={() => {
                    setSelectedKelasId(item.kelas.id);
                    setActiveTab('rekap');
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition cursor-pointer bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900 text-base">Kelas {item.kelas.nama_kelas}</span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        item.rate >= 85
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.rate >= 65
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.rate}% Hadir
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mb-3">Wali Kelas: {item.kelas.wali_kelas}</div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${
                        item.rate >= 85 ? 'bg-emerald-500' : item.rate >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, item.rate)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.totalStudents} Siswa</span>
                    <span>{item.lateCount} Kasus Terlambat</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaders & Discipline Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Punctual Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <Award className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Siswa Paling Disiplin (Top Tepat Waktu)</h3>
              </div>
              <p className="text-xs text-slate-500">
                Siswa dengan frekuensi scan masuk tepat waktu tertinggi pada periode ini.
              </p>

              <div className="divide-y divide-slate-100">
                {studentRankings.topPunctual.map((item, idx) => (
                  <div key={item.siswa.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{item.siswa.nama}</div>
                        <div className="text-xs text-slate-400">Kelas {item.kelas?.nama_kelas}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-emerald-700">{item.totalTepatWaktu} Kali</div>
                      <div className="text-[11px] text-slate-400">{item.persentase}% Kehadiran</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Students Needing Guidance (Frequently Late) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Siswa Perlu Pembinaan (Sering Terlambat)</h3>
              </div>
              <p className="text-xs text-slate-500">
                Siswa dengan catatan kedatangan melebihi batas toleransi jam pos gerbang.
              </p>

              <div className="divide-y divide-slate-100">
                {studentRankings.topLate.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    Luar biasa! Tidak ada siswa dengan rekor keterlambatan pada periode ini.
                  </div>
                ) : (
                  studentRankings.topLate.map((item, idx) => (
                    <div key={item.siswa.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{item.siswa.nama}</div>
                          <div className="text-xs text-slate-400">
                            Kelas {item.kelas?.nama_kelas} • WA Ortu: {item.siswa.nomor_wa_ortu}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-amber-700">{item.totalTerlambat} Kali Terlambat</div>
                        <button
                          onClick={() => {
                            setSelectedStudentId(item.siswa.id);
                            setActiveTab('siswa');
                          }}
                          className="text-[11px] text-emerald-600 hover:underline cursor-pointer"
                        >
                          Lihat Riwayat
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: AUDIT LOG WHATSAPP */}
      {activeTab === 'log_wa' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Riwayat Pengiriman Pesan WhatsApp</h3>
              <p className="text-xs text-slate-500">
                Log audit setiap notifikasi kehadiran yang dipicu saat siswa scan QR/NISN di gerbang.
              </p>
            </div>
            <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              Total Log: {logNotifikasiList.length}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">No. Tujuan Ortu</th>
                    <th className="px-4 py-3">Jenis Pesan</th>
                    <th className="px-4 py-3">Status Pengiriman</th>
                    <th className="px-4 py-3">Isi Pesan WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logNotifikasiList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                        Belum ada log WhatsApp. Notifikasi akan tercatat otomatis saat siswa melakukan scan.
                      </td>
                    </tr>
                  ) : (
                    logNotifikasiList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">
                          {log.waktu_kirim.substring(11, 19)} WIB
                        </td>
                        <td className="px-4 py-3 font-semibold text-xs text-slate-800">
                          {log.nomor_tujuan}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              log.jenis_pesan === 'terlambat'
                                ? 'bg-amber-100 text-amber-800'
                                : log.jenis_pesan === 'pulang'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.jenis_pesan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              log.status_kirim === 'terkirim'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status_kirim === 'simulasi'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status_kirim === 'simulasi' ? 'Simulasi Gateway' : log.status_kirim}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-md">
                          <p className="line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            {log.pesan}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK LAPORAN RESMI (A4 PRINTABLE PREVIEW) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Pratinjau Cetak Laporan Presensi Resmi</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Paper Canvas */}
            <div className="p-8 overflow-y-auto bg-slate-200/50 flex-1 flex justify-center">
              <div className="bg-white w-full max-w-[800px] p-8 rounded-lg shadow-sm border border-slate-300 text-slate-900 font-serif printable-report">
                {/* KOP SURAT RESMI */}
                <div className="flex items-center justify-between border-b-4 border-double border-black pb-3 mb-6">
                  <div className="w-16 h-16 flex items-center justify-center shrink-0" title="Logo Pemerintah Kota Banjar">
                    <CityLogo className="w-14 h-14" />
                  </div>
                  <div className="text-center flex-1 px-4">
                    <div className="text-sm uppercase tracking-wider font-bold">Pemerintah Kota Banjar</div>
                    <div className="text-xs uppercase font-bold">Dinas Pendidikan dan Kebudayaan</div>
                    <div className="text-lg font-black uppercase tracking-tight text-emerald-950 font-sans mt-0.5">
                      {profilSekolah.nama || 'SMP NEGERI 9 BANJAR'}
                    </div>
                    <div className="text-[11px] text-slate-600 font-sans">
                      {profilSekolah.alamat}, {profilSekolah.kota} • NPSN: {profilSekolah.npsn}
                    </div>
                  </div>
                  <div className="w-16 h-16 flex items-center justify-center shrink-0" title="Logo SMP Negeri 9 Banjar">
                    <SchoolLogo className="w-14 h-14" />
                  </div>
                </div>

                {/* JUDUL LAPORAN */}
                <div className="text-center mb-6 font-sans">
                  <h2 className="text-base font-bold uppercase tracking-wider underline">
                    LAPORAN REKAPITULASI PRESENSI SISWA
                  </h2>
                  <div className="text-xs text-slate-600 mt-1">
                    Periode: <strong>{activePeriodLabel}</strong>
                  </div>
                  {activeClassObj && (
                    <div className="text-xs text-slate-700 font-semibold mt-0.5">
                      Rombel: Kelas {activeClassObj.nama_kelas} (Wali Kelas: {activeClassObj.wali_kelas})
                    </div>
                  )}
                </div>

                {/* TABEL DATA FORMAL */}
                <div className="mb-8 font-sans">
                  <table className="w-full border-collapse border border-black text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-1.5 text-center w-8">No</th>
                        <th className="border border-black p-1.5 text-left">NISN</th>
                        <th className="border border-black p-1.5 text-left">Nama Lengkap Siswa</th>
                        <th className="border border-black p-1.5 text-center">Kelas</th>
                        {filterMode === 'harian' ? (
                          <>
                            <th className="border border-black p-1.5 text-center">Masuk</th>
                            <th className="border border-black p-1.5 text-center">Status</th>
                            <th className="border border-black p-1.5 text-center">Pulang</th>
                          </>
                        ) : (
                          <>
                            <th className="border border-black p-1.5 text-center">Hadir</th>
                            <th className="border border-black p-1.5 text-center">Tepat</th>
                            <th className="border border-black p-1.5 text-center">Terlambat</th>
                            <th className="border border-black p-1.5 text-center">% Kehadiran</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filterMode === 'harian'
                        ? dailyAttendanceList.map((item, i) => (
                            <tr key={item.siswa.id}>
                              <td className="border border-black p-1.5 text-center">{i + 1}</td>
                              <td className="border border-black p-1.5">{item.siswa.nisn}</td>
                              <td className="border border-black p-1.5 font-medium">{item.siswa.nama}</td>
                              <td className="border border-black p-1.5 text-center">{item.kelas?.nama_kelas}</td>
                              <td className="border border-black p-1.5 text-center">
                                {item.scanMasuk ? item.scanMasuk.waktu_scan : '-'}
                              </td>
                              <td className="border border-black p-1.5 text-center">
                                {item.scanMasuk
                                  ? item.scanMasuk.status === 'terlambat'
                                    ? 'Terlambat'
                                    : 'Tepat Waktu'
                                  : 'Alfa'}
                              </td>
                              <td className="border border-black p-1.5 text-center">
                                {item.scanPulang ? item.scanPulang.waktu_scan : '-'}
                              </td>
                            </tr>
                          ))
                        : periodicStudentMetrics.map((item, i) => (
                            <tr key={item.siswa.id}>
                              <td className="border border-black p-1.5 text-center">{i + 1}</td>
                              <td className="border border-black p-1.5">{item.siswa.nisn}</td>
                              <td className="border border-black p-1.5 font-medium">{item.siswa.nama}</td>
                              <td className="border border-black p-1.5 text-center">{item.kelas?.nama_kelas}</td>
                              <td className="border border-black p-1.5 text-center">{item.totalHadir} Hari</td>
                              <td className="border border-black p-1.5 text-center">{item.totalTepatWaktu}</td>
                              <td className="border border-black p-1.5 text-center">{item.totalTerlambat}</td>
                              <td className="border border-black p-1.5 text-center font-bold">
                                {item.persentase}%
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>

                {/* TANDA TANGAN RESMI */}
                <div className="flex justify-between items-start text-xs font-sans mt-8 pt-4">
                  <div className="text-center w-64">
                    <div>Mengetahui,</div>
                    <div className="font-bold">Kepala SMP Negeri 9 Banjar</div>
                    <div className="h-20" />
                    <div className="font-bold underline">H. DEDI SUPRIYADI, M.Pd.</div>
                    <div className="text-[11px] text-slate-600">NIP. 19740315 199802 1 004</div>
                  </div>

                  <div className="text-center w-64">
                    <div>Banjar, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="font-bold">
                      {activeClassObj ? `Wali Kelas ${activeClassObj.nama_kelas}` : 'Koordinator Presensi & Kesiswaan'}
                    </div>
                    <div className="h-20" />
                    <div className="font-bold underline">
                      {activeClassObj ? activeClassObj.wali_kelas : 'AGUS SAPARI, S.Pd.'}
                    </div>
                    <div className="text-[11px] text-slate-600">NIP. 19820512 201001 1 018</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
