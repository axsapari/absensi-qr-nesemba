import { SupabaseClient } from '@supabase/supabase-js';
import { LogNotifikasiWA, Siswa, Kelas, Absensi, WAGatewayConfig } from '../types';

export const DEFAULT_WA_CONFIG: WAGatewayConfig = {
  provider: 'fonnte',
  endpointUrl: 'https://api.fonnte.com/send',
  apiToken: '', // TIDAK LAGI DIPAKAI dari sisi client -- token diatur sebagai Secret di Supabase Edge Function
  senderPhone: '',
  active: true,
  templateMasuk: 'Yth. Bapak/Ibu {nama_ortu}, ananda *{nama}* (Kelas {kelas}) telah tiba di sekolah dan tercatat *HADIR TEPAT WAKTU* pada hari {hari}, {tanggal} pukul *{waktu} WIB*. Terima kasih. - Pos Absensi SMP NEGERI 9 BANJAR',
  templateTerlambat: 'PEMBERITAHUAN KETERLAMBATAN:\nYth. Bapak/Ibu {nama_ortu}, ananda *{nama}* (Kelas {kelas}) tercatat hadir *TERLAMBAT* di sekolah pada {hari}, {tanggal} pukul *{waktu} WIB*. Mohon pendampingan dan perhatian terhadap kedisiplinan waktu kedatangan sekolah. Terima kasih. - SMP NEGERI 9 BANJAR',
  templatePulang: 'Yth. Bapak/Ibu {nama_ortu}, ananda *{nama}* (Kelas {kelas}) telah tercatat *PULANG* dari sekolah pada hari {hari}, {tanggal} pukul *{waktu} WIB*. Semoga sampai di rumah dengan selamat. Terima kasih. - Pos Absensi SMP NEGERI 9 BANJAR',
};

// Format phone number to Indonesian international format (e.g. 0812... -> 62812...)
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('+62')) {
    cleaned = cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatHariTanggal(dateStr: string): { hari: string; tanggalFormatted: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const hari = isNaN(d.getDay()) ? 'Hari ini' : NAMA_HARI[d.getDay()];
  const bulanList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tgl = d.getDate();
  const bln = bulanList[d.getMonth()];
  const thn = d.getFullYear();
  return {
    hari,
    tanggalFormatted: `${tgl} ${bln} ${thn}`,
  };
}

export function buildWhatsAppMessage(
  template: string,
  siswa: Siswa,
  kelas: Kelas | undefined,
  absensi: Absensi
): string {
  const { hari, tanggalFormatted } = formatHariTanggal(absensi.tanggal);
  const namaKelas = kelas ? kelas.nama_kelas : '-';
  const waktuStr = absensi.waktu_scan.substring(0, 5); // HH:mm

  return template
    .replace(/{nama}/g, siswa.nama)
    .replace(/{kelas}/g, namaKelas)
    .replace(/{nama_ortu}/g, siswa.nama_ortu || 'Orang Tua / Wali')
    .replace(/{waktu}/g, waktuStr)
    .replace(/{tanggal}/g, tanggalFormatted)
    .replace(/{hari}/g, hari)
    .replace(/{jenis}/g, absensi.jenis === 'masuk' ? 'Kedatangan' : 'Kepulangan')
    .replace(/{status}/g, absensi.status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu');
}

export async function sendWhatsAppNotification(
  config: WAGatewayConfig,
  siswa: Siswa,
  kelas: Kelas | undefined,
  absensi: Absensi,
  supabase: SupabaseClient | null
): Promise<LogNotifikasiWA> {
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const jenisPesan = absensi.status === 'terlambat' ? 'terlambat' : absensi.jenis;

  let template = config.templateMasuk;
  if (absensi.status === 'terlambat') {
    template = config.templateTerlambat;
  } else if (absensi.jenis === 'pulang') {
    template = config.templatePulang;
  }

  const messageText = buildWhatsAppMessage(template, siswa, kelas, absensi);
  const targetPhone = formatPhoneNumber(siswa.nomor_wa_ortu);

  // Kalau fitur WA dimatikan dari Pengaturan, catat sebagai simulasi tanpa memanggil apa pun
  if (!config.active) {
    return {
      id: logId,
      absensi_id: absensi.id,
      siswa_id: siswa.id,
      nomor_tujuan: targetPhone,
      jenis_pesan: jenisPesan,
      pesan: messageText,
      status_kirim: 'simulasi',
      waktu_kirim: new Date().toISOString(),
      response_payload: 'Mode Simulasi (Notifikasi WA dimatikan di Pengaturan). Pesan berhasil di-generate sesuai template.',
    };
  }

  // Supabase belum dikonfigurasi -- tidak ada Edge Function yang bisa dipanggil,
  // jadi catat sebagai simulasi dengan pesan yang jelas (bukan pura-pura berhasil)
  if (!supabase) {
    return {
      id: logId,
      absensi_id: absensi.id,
      siswa_id: siswa.id,
      nomor_tujuan: targetPhone,
      jenis_pesan: jenisPesan,
      pesan: messageText,
      status_kirim: 'simulasi',
      waktu_kirim: new Date().toISOString(),
      response_payload: 'Mode Simulasi (Supabase belum dikonfigurasi). Notifikasi WA memerlukan Edge Function di Supabase untuk benar-benar terkirim.',
    };
  }

  // Dispatch lewat Supabase Edge Function -- token gateway TIDAK PERNAH dikirim dari
  // browser, hanya provider/endpoint (tidak sensitif) + nomor tujuan + isi pesan.
  // Token asli tersimpan sebagai Secret di sisi Supabase dan hanya dipakai server-side.
  try {
    const { data, error } = await supabase.functions.invoke('send-wa-notification', {
      body: {
        provider: config.provider,
        endpointUrl: config.endpointUrl,
        targetPhone,
        message: messageText,
      },
    });

    if (error) {
      return {
        id: logId,
        absensi_id: absensi.id,
        siswa_id: siswa.id,
        nomor_tujuan: targetPhone,
        jenis_pesan: jenisPesan,
        pesan: messageText,
        status_kirim: 'gagal',
        waktu_kirim: new Date().toISOString(),
        response_payload: `Gagal memanggil Edge Function: ${error.message}`,
      };
    }

    const isSuccess = data?.success === true;

    return {
      id: logId,
      absensi_id: absensi.id,
      siswa_id: siswa.id,
      nomor_tujuan: targetPhone,
      jenis_pesan: jenisPesan,
      pesan: messageText,
      status_kirim: isSuccess ? 'terkirim' : 'gagal',
      waktu_kirim: new Date().toISOString(),
      response_payload: JSON.stringify(data),
    };
  } catch (err) {
    return {
      id: logId,
      absensi_id: absensi.id,
      siswa_id: siswa.id,
      nomor_tujuan: targetPhone,
      jenis_pesan: jenisPesan,
      pesan: messageText,
      status_kirim: 'gagal',
      waktu_kirim: new Date().toISOString(),
      response_payload: err instanceof Error ? err.message : 'Kesalahan tak terduga saat menghubungi Edge Function',
    };
  }
}
