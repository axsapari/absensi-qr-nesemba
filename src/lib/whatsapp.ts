import { LogNotifikasiWA, Siswa, Kelas, Absensi, WAGatewayConfig } from '../types';

export const DEFAULT_WA_CONFIG: WAGatewayConfig = {
  provider: 'fonnte',
  endpointUrl: 'https://api.fonnte.com/send',
  apiToken: '',
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
  absensi: Absensi
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

  // If Gateway is not active or token is empty, save as Simulation mode
  if (!config.active || !config.apiToken.trim()) {
    return {
      id: logId,
      absensi_id: absensi.id,
      siswa_id: siswa.id,
      nomor_tujuan: targetPhone,
      jenis_pesan: jenisPesan,
      pesan: messageText,
      status_kirim: 'simulasi',
      waktu_kirim: new Date().toISOString(),
      response_payload: 'Mode Simulasi (Token Gateway belum diisi). Pesan berhasil di-generate sesuai template.',
    };
  }

  // Dispatch to real REST API
  try {
    let res: Response;

    if (config.provider === 'fonnte') {
      const formData = new FormData();
      formData.append('target', targetPhone);
      formData.append('message', messageText);
      if (config.senderPhone) {
        formData.append('countryCode', '62');
      }

      res = await fetch(config.endpointUrl || 'https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: config.apiToken.trim(),
        },
        body: formData,
      });
    } else if (config.provider === 'wablas') {
      res = await fetch(config.endpointUrl || 'https://phone.wablas.com/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: config.apiToken.trim(),
        },
        body: JSON.stringify({
          phone: targetPhone,
          message: messageText,
        }),
      });
    } else {
      // Custom Webhook REST API
      res = await fetch(config.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiToken.trim()}`,
        },
        body: JSON.stringify({
          to: targetPhone,
          message: messageText,
          student: {
            id: siswa.id,
            name: siswa.nama,
            class: kelas?.nama_kelas,
          },
          attendance: {
            type: absensi.jenis,
            status: absensi.status,
            time: absensi.waktu_scan,
            date: absensi.tanggal,
          },
        }),
      });
    }

    const resJson = await res.json().catch(() => ({ status: res.status, text: 'No JSON body' }));
    const isSuccess = res.ok && (resJson.status === true || resJson.status === 'success' || res.status === 200);

    return {
      id: logId,
      absensi_id: absensi.id,
      siswa_id: siswa.id,
      nomor_tujuan: targetPhone,
      jenis_pesan: jenisPesan,
      pesan: messageText,
      status_kirim: isSuccess ? 'terkirim' : 'gagal',
      waktu_kirim: new Date().toISOString(),
      response_payload: JSON.stringify(resJson),
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
      response_payload: err instanceof Error ? err.message : 'Network error saat menghubungi WhatsApp Gateway',
    };
  }
}
