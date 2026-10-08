import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Utensils, Calendar, Scissors, History, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../data/initialData';
import { hitungRekapMakanSiang, jumlahkanRekap, RekapKelasMakan } from '../lib/lunchRecap';

/**
 * Rekap Makan Siang (cetak F4, dipotong per kelas). Aturan hitung ada di lib/lunchRecap.ts.
 *
 * Riwayat: rekap tanggal HARI INI tersimpan otomatis di perangkat (localStorage) setiap data berubah,
 * dan snapshot final tersimpan saat tombol cetak ditekan. Tanggal lampau yang sudah punya riwayat
 * dapat dibuka kembali persis seperti saat dicetak.
 */

type RekapKelas = RekapKelasMakan;

interface SnapshotRekap {
  tanggal: string;
  kurangiBelumScan: boolean;
  kelas: RekapKelas[];
  disimpan_at: string; // ISO
  dicetak_at?: string; // ISO, terisi bila pernah dicetak
}

const STORAGE_KEY_RIWAYAT = 'absensi_rekap_makan_siang_v1';
const MAX_RIWAYAT_HARI = 150;

const bacaRiwayat = (): Record<string, SnapshotRekap> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RIWAYAT);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const tulisRiwayat = (data: Record<string, SnapshotRekap>) => {
  try {
    const keys = Object.keys(data).sort();
    const trimmed: Record<string, SnapshotRekap> = {};
    keys.slice(-MAX_RIWAYAT_HARI).forEach((k) => { trimmed[k] = data[k]; });
    localStorage.setItem(STORAGE_KEY_RIWAYAT, JSON.stringify(trimmed));
  } catch {
    /* penyimpanan penuh/diblokir: abaikan, cetak tetap berjalan */
  }
};

const jamLabel = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

interface Props {
  onClose: () => void;
}

export const RekapMakanSiangModal: React.FC<Props> = ({ onClose }) => {
  const { siswaList, kelasList, absensiList, catatanKehadiranList } = useApp();
  const [tanggal, setTanggal] = useState<string>(getTodayDateString());
  const [kurangiBelumScan, setKurangiBelumScan] = useState<boolean>(true);
  const [riwayat, setRiwayat] = useState<Record<string, SnapshotRekap>>(() => bacaRiwayat());
  const [tampilRiwayat, setTampilRiwayat] = useState(false);
  // snapshot tersimpan yang sedang ditampilkan (null = hitung langsung dari data terkini)
  const [dibekukan, setDibekukan] = useState<SnapshotRekap | null>(null);

  const rekapLive: RekapKelas[] = useMemo(
    () =>
      hitungRekapMakanSiang({
        siswaList,
        kelasList,
        absensiList,
        catatanList: catatanKehadiranList,
        tanggal,
        kurangiBelumScan,
      }),
    [siswaList, kelasList, absensiList, catatanKehadiranList, tanggal, kurangiBelumScan]
  );

  // Yang ditampilkan/dicetak: snapshot tersimpan bila dipilih, selain itu hitungan langsung.
  const rekap: RekapKelas[] = dibekukan ? dibekukan.kelas : rekapLive;
  const kurangiAktif = dibekukan ? dibekukan.kurangiBelumScan : kurangiBelumScan;
  const tanggalAktif = dibekukan ? dibekukan.tanggal : tanggal;

  const grand = useMemo(() => jumlahkanRekap(rekap), [rekap]);

  // ---- Riwayat otomatis -------------------------------------------------
  const hariIni = getTodayDateString();
  const adaDataTanggal = useMemo(
    () =>
      absensiList.some((a) => a.tanggal === tanggal) ||
      catatanKehadiranList.some((c) => c.tanggal === tanggal),
    [absensiList, catatanKehadiranList, tanggal]
  );

  const simpanSnapshot = (tandaiDicetak: boolean) => {
    const semua = bacaRiwayat();
    const lama = semua[tanggal];
    semua[tanggal] = {
      tanggal,
      kurangiBelumScan,
      kelas: rekapLive,
      disimpan_at: new Date().toISOString(),
      dicetak_at: tandaiDicetak ? new Date().toISOString() : lama?.dicetak_at,
    };
    tulisRiwayat(semua);
    setRiwayat(bacaRiwayat());
  };

  // Simpan otomatis HANYA untuk hari ini (data hari lampau tidak ditimpa diam-diam).
  useEffect(() => {
    if (dibekukan || tanggal !== hariIni || !adaDataTanggal || rekapLive.length === 0) return;
    const t = window.setTimeout(() => simpanSnapshot(false), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rekapLive, kurangiBelumScan, tanggal, dibekukan, adaDataTanggal]);

  const handleCetak = () => {
    if (!dibekukan && adaDataTanggal) simpanSnapshot(true);
    window.print();
  };

  const daftarRiwayat = useMemo(
    () => (Object.values(riwayat) as SnapshotRekap[]).sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [riwayat]
  );

  const unduhRiwayat = () => {
    const rows = daftarRiwayat.flatMap((snap) =>
      snap.kelas.map((k) => ({
        Tanggal: snap.tanggal,
        Kelas: k.namaKelas,
        'Jumlah Siswa': k.total,
        Sakit: k.sakit,
        Izin: k.izin,
        Alpa: k.alpa,
        Bolos: k.bolos ?? 0,
        'Belum Scan': k.belumScan,
        'Tidak Bawa Kartu (hadir)': k.tanpaKartu,
        'Porsi Makan Siang': k.porsi,
        'Belum Scan Dikurangi': snap.kurangiBelumScan ? 'Ya' : 'Tidak',
        'Disimpan Pukul': jamLabel(snap.disimpan_at),
        'Dicetak Pukul': jamLabel(snap.dicetak_at),
      }))
    );
    if (!rows.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Riwayat_Makan_Siang');
    XLSX.writeFile(wb, 'Riwayat_Rekap_Makan_Siang_SMPN9Banjar.xlsx');
  };

  // Jumlah kotak = semua kelas + 1 kotak total keseluruhan.
  const jumlahKotak = rekap.length + 1;
  const kolom = jumlahKotak <= 8 ? 2 : jumlahKotak <= 21 ? 3 : 4;
  const baris = Math.max(1, Math.ceil(jumlahKotak / kolom));
  // Ukuran huruf dihitung dari ukuran kotak pada halaman F4 (area cetak 201 x 314 mm), sehingga
  // semua isi, terutama kotak PORSI, selalu muat berapa pun jumlah kelasnya.
  const tinggiKotakMm = 314 / baris;
  const lebarKotakMm = 201 / kolom;
  const fontMm = Math.max(
    2.2,
    Math.min((tinggiKotakMm - 4) / 12.5, (lebarKotakMm - 4) / 17.8, 4.4)
  );

  const tanggalLabel = new Date(`${tanggalAktif}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const renderKotak = (
    key: string,
    judul: string,
    data: { total: number; sakit: number; izin: number; alpa: number; bolos: number; belumScan: number; tanpaKartu: number; porsi: number },
    labelPorsi: string,
    total = false
  ) => (
    <div className={`lunch-cell ${total ? 'lunch-cell-total' : ''}`} key={key}>
      <div className="lunch-cell-head">
        <div className="lunch-class">{judul}</div>
        <div className="lunch-date">{tanggalLabel}</div>
      </div>
      <div className="lunch-body">
        <div className="lunch-row lunch-row-full"><span>Jumlah siswa seharusnya</span><b>{data.total}</b></div>
        <div className="lunch-pair">
          <div className="lunch-row"><span>Sakit</span><b>{data.sakit}</b></div>
          <div className="lunch-row"><span>Izin</span><b>{data.izin}</b></div>
          <div className="lunch-row"><span>Alpa</span><b>{data.alpa}</b></div>
          <div className="lunch-row"><span>Bolos</span><b>{data.bolos}</b></div>
          <div className={`lunch-row ${kurangiAktif ? '' : 'lunch-row-muted'}`}><span>Belum scan</span><b>{data.belumScan}</b></div>
          <div className="lunch-row lunch-row-muted"><span>Tdk bawa kartu</span><b>{data.tanpaKartu}</b></div>
        </div>
      </div>
      <div className="lunch-porsi">
        <span>{labelPorsi}</span>
        <b>{data.porsi}</b>
      </div>
    </div>
  );

  const kotakKelas = (r: RekapKelas) => renderKotak(r.kelasId, `KELAS ${r.namaKelas}`, r, 'PORSI MAKAN SIANG');
  const kotakTotal = renderKotak('total', 'TOTAL SELURUH KELAS', grand, 'TOTAL PORSI', true);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="print-lunch-modal"
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <style>{`
        /* ---------- Tampilan layar ---------- */
        #print-lunch-modal .lunch-sheet {
          --f: ${fontMm.toFixed(2)}mm;
          width: 201mm;
          height: 314mm;
          display: grid;
          grid-template-columns: repeat(${kolom}, minmax(0, 1fr));
          grid-template-rows: repeat(${baris}, minmax(0, 1fr));
          background: #fff;
          color: #000;
          border-top: 0.3mm dashed #000;
          border-left: 0.3mm dashed #000;
          box-sizing: border-box;
          zoom: 0.5;
        }
        #print-lunch-modal .lunch-cell {
          border-right: 0.3mm dashed #000;
          border-bottom: 0.3mm dashed #000;
          padding: 1.5mm 2mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          min-height: 0;
          min-width: 0;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          font-size: var(--f);
          line-height: 1.22;
        }
        #print-lunch-modal .lunch-cell-total { background: #f1f1f1; }
        #print-lunch-modal .lunch-cell-head { border-bottom: 0.3mm solid #000; padding-bottom: 0.4em; }
        #print-lunch-modal .lunch-class { font-weight: 800; font-size: 1.3em; }
        #print-lunch-modal .lunch-date { font-size: 0.72em; color: #222; }
        #print-lunch-modal .lunch-body { display: flex; flex-direction: column; gap: 0.15em; }
        #print-lunch-modal .lunch-pair { display: grid; grid-template-columns: 1fr 1fr; column-gap: 0.9em; }
        #print-lunch-modal .lunch-row { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 0.15mm dotted #888; gap: 0.3em; white-space: nowrap; }
        #print-lunch-modal .lunch-row b { text-align: right; }
        #print-lunch-modal .lunch-row-full { font-weight: 600; }
        #print-lunch-modal .lunch-row-muted { color: #444; font-style: italic; }
        #print-lunch-modal .lunch-porsi { display: flex; justify-content: space-between; align-items: center; border: 0.5mm solid #000; padding: 0.25em 0.7em; font-weight: 800; font-size: 0.95em; }
        #print-lunch-modal .lunch-porsi b { font-size: 2em; line-height: 1; }

        /* ---------- Cetak: F4 portrait, hanya lembar potong ---------- */
        @page { size: 215.9mm 330.2mm; margin: 7mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body > #root { display: none !important; }
          body * { visibility: hidden !important; }
          #print-lunch-modal, #print-lunch-modal * { visibility: visible !important; }
          #print-lunch-modal {
            position: static !important; inset: auto !important; display: block !important;
            padding: 0 !important; margin: 0 !important; background: #fff !important; overflow: visible !important;
          }
          #print-lunch-modal > div {
            display: block !important; position: static !important; width: auto !important; max-width: none !important;
            max-height: none !important; padding: 0 !important; margin: 0 !important; background: #fff !important;
            box-shadow: none !important; border: 0 !important; border-radius: 0 !important; overflow: visible !important;
          }
          #print-lunch-modal .lunch-toolbar,
          #print-lunch-modal .lunch-controls { display: none !important; }
          #print-lunch-modal .lunch-stage { display: block !important; padding: 0 !important; margin: 0 !important; background: #fff !important; overflow: visible !important; }
          #print-lunch-modal .lunch-sheet { zoom: 1 !important; width: 201mm !important; height: 314mm !important; margin: 0 !important; break-inside: avoid; page-break-inside: avoid; }
          #print-lunch-modal .lunch-cell { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="lunch-toolbar px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Utensils className="w-4 h-4 text-amber-600" />
            <span>Rekap Porsi Makan Siang (Cetak F4 &amp; Gunting)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCetak}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="lunch-controls px-6 py-3 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              value={tanggal}
              onChange={(e) => {
                if (!e.target.value) return;
                setDibekukan(null);
                setTanggal(e.target.value);
              }}
              className="bg-transparent focus:outline-none cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={kurangiAktif}
              disabled={!!dibekukan}
              onChange={(e) => setKurangiBelumScan(e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            Kurangi juga siswa yang belum scan &amp; belum ada keterangan
          </label>
          <button
            type="button"
            onClick={() => setTampilRiwayat((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 cursor-pointer"
          >
            <History className="w-4 h-4 text-amber-600" />
            Riwayat ({daftarRiwayat.length})
          </button>
          <span className="flex items-center gap-1.5 text-slate-500">
            <Scissors className="w-3.5 h-3.5" />
            {rekap.length} kelas &bull; {kolom} kolom &times; {baris} baris &bull; Total porsi{' '}
            <b className="text-slate-800">{grand.porsi}</b>
          </span>
        </div>

        {dibekukan && (
          <div className="lunch-controls px-6 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex flex-wrap items-center gap-3">
            <span>
              Menampilkan data <b>tersimpan</b> tanggal {dibekukan.tanggal} (disimpan pukul {jamLabel(dibekukan.disimpan_at)}
              {dibekukan.dicetak_at ? `, dicetak pukul ${jamLabel(dibekukan.dicetak_at)}` : ''}).
            </span>
            <button
              type="button"
              onClick={() => { setDibekukan(null); setTanggal(dibekukan.tanggal); }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold cursor-pointer"
            >
              Hitung ulang dari data terkini
            </button>
          </div>
        )}

        {tampilRiwayat && (
          <div className="lunch-controls px-6 py-3 border-b border-slate-200 bg-white max-h-48 overflow-auto text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700">Riwayat rekap makan siang (tersimpan di perangkat ini)</span>
              <button
                type="button"
                onClick={unduhRiwayat}
                disabled={!daftarRiwayat.length}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-40 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Unduh Excel
              </button>
            </div>
            {daftarRiwayat.length === 0 ? (
              <div className="text-slate-400 py-2">Belum ada riwayat. Rekap hari ini tersimpan otomatis begitu ada data kehadiran.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="text-slate-500">
                  <tr><th className="py-1">Tanggal</th><th>Total porsi</th><th>Disimpan</th><th>Dicetak</th><th /></tr>
                </thead>
                <tbody>
                  {daftarRiwayat.map((snap) => (
                    <tr key={snap.tanggal} className="border-t border-slate-100">
                      <td className="py-1.5 font-semibold">
                        {new Date(`${snap.tanggal}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="font-bold">{snap.kelas.reduce((n, k) => n + k.porsi, 0)}</td>
                      <td>{jamLabel(snap.disimpan_at)}</td>
                      <td>{snap.dicetak_at ? jamLabel(snap.dicetak_at) : '-'}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => { setDibekukan(snap); setTanggal(snap.tanggal); }}
                          className="px-2 py-0.5 rounded-md border border-slate-200 hover:bg-slate-50 font-bold cursor-pointer"
                        >
                          Buka
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="lunch-stage flex-1 overflow-auto bg-slate-200 p-4 flex justify-center">
          {rekap.length === 0 ? (
            <div className="text-slate-500 text-sm py-12">Belum ada data kelas.</div>
          ) : (
            <div className="lunch-sheet">
              {rekap.map(kotakKelas)}
              {kotakTotal}
            </div>
          )}
        </div>

        <div className="lunch-controls px-6 py-2.5 border-t border-slate-200 text-[11px] text-slate-500 bg-slate-50">
          Porsi = jumlah siswa &minus; (sakit + izin + alpa + bolos{kurangiAktif ? ' + belum scan' : ''}). Siswa &ldquo;tidak bawa kartu&rdquo;
          tetap dihitung hadir. Gunting mengikuti garis putus-putus.
        </div>
      </div>
    </div>,
    document.body
  );
};
