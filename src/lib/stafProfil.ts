import type { UserAccount } from '../types';

/** Baris tabel public.staf_profil di Supabase. Kata sandi TIDAK disimpan di sini (itu tugas Supabase Auth). */
export interface StafRow {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserAccount['role'];
  wali_kelas_id: string | null;
  is_super_admin: boolean;
  nip: string | null;
  avatar: string | null;
}

export const toStafRow = (u: UserAccount): StafRow => ({
  id: u.id,
  username: u.username.trim().toLowerCase(),
  name: u.name,
  email: (u.email || '').trim().toLowerCase(),
  role: u.role,
  wali_kelas_id: u.wali_kelas_id ?? null,
  is_super_admin: !!u.isSuperAdmin,
  nip: u.nip ?? null,
  avatar: u.avatar ?? null,
});

export const fromStafRow = (r: StafRow): UserAccount => ({
  id: r.id,
  username: r.username,
  name: r.name,
  email: r.email,
  role: r.role,
  ...(r.wali_kelas_id ? { wali_kelas_id: r.wali_kelas_id } : {}),
  isSuperAdmin: !!r.is_super_admin,
  ...(r.nip ? { nip: r.nip } : {}),
  ...(r.avatar ? { avatar: r.avatar } : {}),
});

const em = (u: { email?: string }) => (u.email || '').trim().toLowerCase();

export interface HasilGabungStaf {
  users: UserAccount[];
  /** akun lokal yang belum ada di Supabase dan perlu diunggah (hanya pada penarikan pertama) */
  unggah: UserAccount[];
}

/**
 * Gabungkan profil lokal dengan profil di Supabase.
 *  - Supabase menang, KECUALI untuk akun yang punya perubahan tertunda di antrean (lokal menang).
 *  - Penarikan pertama di perangkat ini (sudahDiunggah=false): akun yang hanya ada lokal ikut diunggah.
 *  - Sesudahnya: akun lokal yang tidak ada lagi di Supabase dianggap sudah dihapus (kecuali @agus),
 *    dan hanya bila Supabase mengembalikan data (daftar kosong tidak boleh menghapus apa pun).
 */
export function gabungStaf(
  lokal: UserAccount[],
  remote: StafRow[],
  tertunda: { upsertEmail: ReadonlySet<string>; hapusId: ReadonlySet<string> },
  sudahDiunggah: boolean,
): HasilGabungStaf {
  const remoteUsers = remote.map(fromStafRow).filter((u) => !tertunda.hapusId.has(u.id));
  const remoteByEmail = new Map(remoteUsers.map((u) => [em(u), u]));
  const unggah: UserAccount[] = [];
  const hasil: UserAccount[] = [];
  const dipakai = new Set<string>();

  for (const l of lokal) {
    const e = em(l);
    const r = remoteByEmail.get(e);
    if (tertunda.upsertEmail.has(e)) { hasil.push(l); dipakai.add(e); continue; }
    if (r) {
      hasil.push({ ...l, ...r, avatar: r.avatar ?? l.avatar, lastLogin: l.lastLogin, password: l.password });
      dipakai.add(e);
      continue;
    }
    if (!sudahDiunggah) { hasil.push(l); unggah.push(l); continue; }
    if (remote.length > 0 && l.username.toLowerCase() !== 'agus') continue; // dihapus dari perangkat lain
    hasil.push(l);
  }
  for (const r of remoteUsers) if (!dipakai.has(em(r))) hasil.push(r);
  return { users: hasil, unggah };
}
