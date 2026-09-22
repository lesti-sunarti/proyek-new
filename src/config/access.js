// Satu sumber kebenaran hak akses untuk React dan API server.
export const PUBLIC_MODULES = new Set(['portal', 'ppdb', 'gallery', 'agenda', 'blog', 'alumni', 'apk', 'support']);

export const ROLE_PERMISSIONS = {
  kepala_sekolah: ['*'],
  kepala_tu: ['attendance', 'academic', 'spp', 'buku_induk', 'finance', 'payroll', 'broadcast', 'archive', 'erapor', 'library', 'extracurricular', 'career', 'feedback', 'kantin', 'topup', 'pemilos', 'walikelas', 'uks', 'ppdb_admin', 'support_admin'],
  kepala_perpus: ['library', 'archive', 'buku_induk', 'attendance', 'feedback'],
  kepala_bk: ['attendance', 'buku_induk', 'extracurricular', 'counseling', 'uks', 'violations', 'broadcast', 'feedback', 'career'],
  guru_walikelas: ['attendance', 'cbt', 'academic', 'elearning', 'erapor', 'extracurricular', 'counseling', 'uks', 'career', 'feedback', 'walikelas'],
  // Kompatibilitas akun lokal lama.
  admin: ['*'],
  guru: ['attendance', 'cbt', 'academic', 'elearning', 'erapor', 'extracurricular', 'counseling', 'uks', 'career', 'feedback', 'walikelas'],
  // Siswa & orang tua: data pribadi (SPP, presensi, nilai, izin UKS) dibatasi server hanya ke siswa terkait akun.
  siswa: ['attendance', 'cbt', 'elearning', 'erapor', 'extracurricular', 'career', 'feedback', 'kantin', 'topup', 'spp', 'uks'],
  ortu: ['attendance', 'spp', 'ortu_dashboard', 'erapor', 'feedback', 'uks'],
};

export function roleCanAccess(role, moduleKey) {
  if (PUBLIC_MODULES.has(moduleKey)) return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(moduleKey);
}
