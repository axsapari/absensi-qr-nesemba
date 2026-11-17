import { describe, it, expect } from 'vitest';
import { hitungRekapMakanSiang, BOLOS_TETAP_DAPAT_PORSI } from '../lunchRecap';

describe('rekap makan siang: bolos', () => {
  const siswaList: any[] = [
    { id: 's1', kelas_id: 'k1', status_aktif: true },
    { id: 's2', kelas_id: 'k1', status_aktif: true },
    { id: 's3', kelas_id: 'k1', status_aktif: true },
  ];
  const kelasList: any[] = [{ id: 'k1', nama_kelas: '7A', tingkat: 7 }];
  const absensiList: any[] = [{ siswa_id: 's1', tanggal: '2026-11-17', jenis: 'masuk' }];
  const catatanList: any[] = [
    { siswa_id: 's2', tanggal: '2026-11-17', status: 'bolos' },
    { siswa_id: 's3', tanggal: '2026-11-17', status: 'sakit' },
  ];
  it('bolos tetap tercatat; porsi sesuai saklar sementara', () => {
    const [r] = hitungRekapMakanSiang({ siswaList, kelasList, absensiList, catatanList, tanggal: '2026-11-17', kurangiBelumScan: true });
    expect(r.bolos).toBe(1);
    expect(r.sakit).toBe(1);
    expect(r.porsi).toBe(BOLOS_TETAP_DAPAT_PORSI ? 2 : 1);
  });
});
