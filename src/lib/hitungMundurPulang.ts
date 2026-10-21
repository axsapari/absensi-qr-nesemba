/** Logika murni bar hitung mundur menuju scan pulang. Semua jam dalam detik sejak 00:00. */
export function keDetik(jam: string): number {
  const [h = '0', m = '0', d = '0'] = jam.split(':');
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(d) || 0);
}

export function formatHitungMundur(detik: number): string {
  const n = Math.max(0, Math.floor(detik));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const d = n % 60;
  const dua = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${dua(m)}:${dua(d)}` : `${dua(m)}:${dua(d)}`;
}

export type FaseHitungMundur = 'sebelum_buka' | 'menunggu' | 'segera' | 'pulang';

export interface HasilHitungMundur {
  fase: FaseHitungMundur;
  sisaDetik: number;
  /** 0–100: porsi waktu dari jam buka pos sampai jam pulang yang sudah berjalan */
  persen: number;
}

export function hitungMundurPulang(sekarang: string, mulai: string, pulang: string, ambangSegaiMenit = 30): HasilHitungMundur {
  const now = keDetik(sekarang);
  const awal = keDetik(mulai);
  const akhir = keDetik(pulang);
  const sisaDetik = Math.max(0, akhir - now);
  if (now >= akhir) return { fase: 'pulang', sisaDetik: 0, persen: 100 };
  const rentang = Math.max(1, akhir - awal);
  const persen = Math.min(100, Math.max(0, ((now - awal) / rentang) * 100));
  if (now < awal) return { fase: 'sebelum_buka', sisaDetik, persen: 0 };
  return { fase: sisaDetik <= ambangSegaiMenit * 60 ? 'segera' : 'menunggu', sisaDetik, persen };
}
