import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, MousePointerClick, Usb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Siswa } from '../types';
import { getFotoSiswaUrl } from '../lib/fotoHelper';
import { tafsirkanDiagnosaFoto, ujiFotoSiswa, type HasilFotoSiswa } from '../lib/diagnosaFoto';
import { periksaTanpaScan, pilihSampel } from '../lib/kesehatanKiosk';

/**
 * Pemantau layar scan: memberi tahu petugas bila (1) halaman kehilangan fokus sehingga scanner USB tidak
 * lagi mengetik ke halaman, (2) tidak ada scan di jam sibuk (scanner kemungkinan terlepas), dan
 * (3) foto siswa tidak bisa dimuat (dites otomatis sekali saat halaman dibuka).
 */
export const KioskKesehatan: React.FC<{
  sekarang: string;
  hariEfektif: boolean;
  jamPulang: string;
  /** panggil untuk memindahkan fokus kembali ke kolom scanner */
  fokuskan: () => void;
}> = ({ sekarang, hariEfektif, jamPulang, fokuskan }) => {
  const { absensiList, pengaturanJam, siswaList, supabaseConfig, currentActiveDateStr } = useApp();
  const [fokusHilang, setFokusHilang] = useState(false);
  const [foto, setFoto] = useState<{ tingkat: 'peringatan' | 'galat'; pesan: string } | null>(null);
  const sudahTesFoto = useRef(false);

  // 1. Fokus: periksa tiap 2 detik; bila jendela tidak fokus lebih dari 2 pemeriksaan berturut-turut, tampilkan.
  useEffect(() => {
    let berturut = 0;
    const id = window.setInterval(() => {
      const fokus = document.hasFocus() && document.visibilityState === 'visible';
      berturut = fokus ? 0 : berturut + 1;
      setFokusHilang(berturut >= 2);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  // 2. Tanpa scan di jam sibuk
  const scanTerakhir = useMemo(() => {
    let maks: string | null = null;
    for (const a of absensiList) {
      if (a.tanggal !== currentActiveDateStr) continue;
      if (!maks || a.waktu_scan > maks) maks = a.waktu_scan;
    }
    return maks;
  }, [absensiList, currentActiveDateStr]);

  const tanpaScan = periksaTanpaScan({
    sekarang,
    scanTerakhir,
    jamBuka: (pengaturanJam.jam_buka_pos || '06:00').slice(0, 5),
    batasTepatWaktu: (pengaturanJam.batas_tepat_waktu || '07:15').slice(0, 5),
    jamPulang,
    hariEfektif,
  });

  // 3. Tes foto otomatis sekali saat dibuka (3 siswa acak), hanya bila Supabase dikonfigurasi dan online.
  useEffect(() => {
    if (sudahTesFoto.current || !supabaseConfig.url || siswaList.length === 0 || !navigator.onLine) return;
    sudahTesFoto.current = true;
    const t = window.setTimeout(async () => {
      const cek = async (url: string): Promise<number | 'galat'> => {
        try {
          const ctrl = new AbortController();
          const timer = window.setTimeout(() => ctrl.abort(), 8000);
          const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
          window.clearTimeout(timer);
          return res.status;
        } catch {
          return 'galat';
        }
      };
      const sampel = pilihSampel<Siswa>(siswaList.filter((s) => s.status_aktif !== false && s.nisn), 3);
      const hasil: HasilFotoSiswa[] = [];
      for (const s of sampel) hasil.push(await ujiFotoSiswa({ nama: s.nama, nisn: s.nisn }, getFotoSiswaUrl(s, supabaseConfig.url), cek));
      const tafsir = tafsirkanDiagnosaFoto(hasil, supabaseConfig.url);
      if (tafsir.tingkat !== 'ok') setFoto({ tingkat: tafsir.tingkat, pesan: tafsir.pesan });
    }, 4000);
    return () => window.clearTimeout(t);
  }, [siswaList, supabaseConfig.url]);

  if (!fokusHilang && !tanpaScan && !foto) return null;

  return (
    <div className="mt-3 space-y-2" role="status">
      {fokusHilang && (
        <button
          type="button"
          onClick={fokuskan}
          className="w-full text-left flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-sm cursor-pointer"
        >
          <MousePointerClick className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span>
            <b>Layar scan tidak sedang aktif.</b> Scan kartu tidak akan tercatat. Klik di halaman ini
            (atau jendela/tab-nya) agar scanner kembali bekerja.
          </span>
        </button>
      )}
      {tanpaScan && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-200 text-sm">
          <Usb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <b>Belum ada scan selama {tanpaScan.menit} menit</b> pada jam {tanpaScan.sesi === 'masuk' ? 'masuk' : 'pulang'}.
            Periksa kabel/baterai scanner dan colokan USB, lalu coba scan satu kartu.
          </span>
        </div>
      )}
      {foto && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-200 text-sm">
          <Camera className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <AlertTriangle className="w-4 h-4 inline -mt-0.5 mr-1" />
            <b>Foto siswa mungkin tidak tampil.</b> {foto.pesan}
          </span>
        </div>
      )}
    </div>
  );
};
