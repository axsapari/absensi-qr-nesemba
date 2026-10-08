import React, { useMemo, useState } from 'react';
import { CreditCard, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CatatanKehadiran, Kelas, Siswa } from '../types';
import { sortSiswaByKelas, sortKelas } from '../lib/classUtils';

/**
 * v22 — Laporan "Sering Tidak Bawa Kartu".
 * Mengikuti filter periode & kelas di Dashboard Rekap. Tujuannya membantu wali kelas/kesiswaan
 * menemukan siswa yang berulang kali lupa kartu (untuk pembinaan atau pencetakan kartu pengganti).
 */
interface Props {
  siswaList: Siswa[]; // sudah difilter peran/kelas/pencarian oleh dashboard
  kelasList: Kelas[];
  catatanKehadiranList: CatatanKehadiran[];
  isDateInActiveFilter: (dateStr: string) => boolean;
  periodeLabel: string;
  hariEfektif: number;
}

export const LaporanTanpaKartu: React.FC<Props> = ({
  siswaList,
  kelasList,
  catatanKehadiranList,
  isDateInActiveFilter,
  periodeLabel,
  hariEfektif,
}) => {
  const [minKejadian, setMinKejadian] = useState<number>(2);

  const semua = useMemo(() => {
    const idSiswa = new Set(siswaList.map((s) => s.id));
    const perSiswa = new Map<string, CatatanKehadiran[]>();
    catatanKehadiranList.forEach((c) => {
      if (c.status !== 'tidak_bawa_kartu' || !idSiswa.has(c.siswa_id) || !isDateInActiveFilter(c.tanggal)) return;
      const arr = perSiswa.get(c.siswa_id) || [];
      arr.push(c);
      perSiswa.set(c.siswa_id, arr);
    });
    return sortSiswaByKelas(siswaList, kelasList)
      .map((siswa) => {
        const kejadian = (perSiswa.get(siswa.id) || []).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        return { siswa, kelas: kelasList.find((k) => k.id === siswa.kelas_id), kejadian };
      })
      .filter((r) => r.kejadian.length > 0);
  }, [siswaList, kelasList, catatanKehadiranList, isDateInActiveFilter]);

  const ditampilkan = useMemo(
    () =>
      semua
        .filter((r) => r.kejadian.length >= minKejadian)
        .sort((a, b) => b.kejadian.length - a.kejadian.length || a.siswa.nama.localeCompare(b.siswa.nama, 'id')),
    [semua, minKejadian]
  );

  const ringkasanKelas = useMemo(
    () =>
      sortKelas(kelasList)
        .map((k) => {
          const rows = semua.filter((r) => r.siswa.kelas_id === k.id);
          return {
            kelas: k,
            siswa: rows.length,
            kejadian: rows.reduce((n, r) => n + r.kejadian.length, 0),
          };
        })
        .filter((r) => r.kejadian > 0),
    [semua, kelasList]
  );

  const totalKejadian = semua.reduce((n, r) => n + r.kejadian.length, 0);

  const fmtTanggal = (t: string) =>
    new Date(`${t}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  const exportExcel = () => {
    const rows = ditampilkan.map((r, i) => ({
      No: i + 1,
      NISN: r.siswa.nisn,
      'Nama Siswa': r.siswa.nama,
      Kelas: r.kelas?.nama_kelas || '-',
      'Jumlah Lupa Kartu': r.kejadian.length,
      'Persen dari Hari Efektif': hariEfektif > 0 ? `${Math.round((r.kejadian.length / hariEfektif) * 100)}%` : '-',
      Tanggal: r.kejadian.map((k) => k.tanggal).join(', '),
      Keterangan: r.kejadian.map((k) => k.keterangan).filter(Boolean).join('; '),
    }));
    if (!rows.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sering_Tidak_Bawa_Kartu');
    XLSX.writeFile(wb, `Laporan_Tidak_Bawa_Kartu_${periodeLabel.replace(/[^\w-]+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" />
              Siswa Sering Tidak Bawa Kartu
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {periodeLabel} &bull; {totalKejadian} kejadian oleh {semua.length} siswa
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              Tampilkan yang lupa kartu minimal
              <input
                type="number"
                min={1}
                max={30}
                value={minKejadian}
                onChange={(e) => setMinKejadian(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-bold focus:outline-none"
              />
              kali
            </label>
            <button
              type="button"
              onClick={exportExcel}
              disabled={!ditampilkan.length}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-40 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
            </button>
          </div>
        </div>

        {ringkasanKelas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {ringkasanKelas.map((r) => (
              <span key={r.kelas.id} className="text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-100 rounded-lg px-2.5 py-1">
                {r.kelas.nama_kelas}: {r.kejadian}x ({r.siswa} siswa)
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 w-10">No</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3 text-center">Lupa Kartu</th>
                <th className="px-4 py-3">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ditampilkan.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                    {semua.length === 0
                      ? 'Tidak ada catatan "Tidak Bawa Kartu" pada periode ini.'
                      : `Tidak ada siswa dengan ${minKejadian} kali lupa kartu atau lebih. Turunkan batas minimal di atas.`}
                  </td>
                </tr>
              ) : (
                ditampilkan.map((r, i) => {
                  const parah = r.kejadian.length >= 3;
                  return (
                    <tr key={r.siswa.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.siswa.nama}</div>
                        <div className="text-[11px] text-slate-400">{r.siswa.nisn}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{r.kelas?.nama_kelas || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-full text-xs ${
                            parah ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {parah && <AlertTriangle className="w-3.5 h-3.5" />}
                          {r.kejadian.length}x
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {r.kejadian.map((k) => fmtTanggal(k.tanggal)).join(', ')}
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
  );
};
