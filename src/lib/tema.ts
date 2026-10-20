export type Tema = 'terang' | 'gelap';
export const KUNCI_TEMA = 'absensi_tema';

export function bacaTema(): Tema {
  try {
    return localStorage.getItem(KUNCI_TEMA) === 'gelap' ? 'gelap' : 'terang';
  } catch {
    return 'terang';
  }
}

export function terapkanTema(tema: Tema, simpan = true): void {
  document.documentElement.classList.toggle('dark', tema === 'gelap');
  if (!simpan) return;
  try {
    localStorage.setItem(KUNCI_TEMA, tema);
  } catch {
    /* penyimpanan diblokir: tema tetap berlaku untuk sesi ini */
  }
}
