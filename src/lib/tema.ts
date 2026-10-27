export type Tema = 'terang' | 'gelap' | 'neo' | 'clay' | 'retro' | 'glass' | 'win98';
export const KUNCI_TEMA = 'absensi_tema';
export const DAFTAR_TEMA: Tema[] = ['gelap', 'neo', 'clay', 'retro', 'glass', 'win98'];

const VALID: string[] = ['terang', 'gelap', 'neo', 'clay', 'retro', 'glass', 'win98'];

/** Tema tersimpan; bila belum ada pilihan, ikuti prefers-color-scheme. */
export function bacaTema(): Tema {
  try {
    const v = localStorage.getItem(KUNCI_TEMA);
    if (v && VALID.includes(v)) return v as Tema;
  } catch {
    /* diabaikan */
  }
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'gelap';
  } catch {
    /* diabaikan */
  }
  return 'terang';
}

/** Kelas pada <html>: gelap=dark, neo, clay, retro=dark+retro. */
export function kelasTema(tema: Tema): string[] {
  if (tema === 'gelap') return ['dark'];
  if (tema === 'retro') return ['dark', 'retro'];
  if (tema === 'glass') return ['dark', 'glass'];
  if (tema === 'neo' || tema === 'clay' || tema === 'win98') return [tema];
  return [];
}

export function terapkanTema(tema: Tema, simpan = true): void {
  const el = document.documentElement;
  el.classList.remove('dark', 'neo', 'clay', 'retro', 'glass', 'win98');
  kelasTema(tema).forEach(k => el.classList.add(k));
  if (!simpan) return;
  try {
    localStorage.setItem(KUNCI_TEMA, tema);
  } catch {
    /* penyimpanan diblokir: tema tetap berlaku untuk sesi ini */
  }
}
