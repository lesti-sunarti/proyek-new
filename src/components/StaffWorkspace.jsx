import React from 'react';
import { ArrowRight, BookOpen, CalendarCheck2, ClipboardList, Landmark, Library, MessageSquareHeart, ShieldCheck, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const roleWorkspaces = {
  kepala_sekolah: [
    { key: 'academic', label: 'Pantau akademik', desc: 'Rombel, jadwal, dan pembelajaran', icon: BookOpen },
    { key: 'finance', label: 'Laporan keuangan', desc: 'Kas dan ringkasan transaksi', icon: Landmark },
    { key: 'broadcast', label: 'Buat pengumuman', desc: 'Informasi resmi sekolah', icon: ClipboardList },
  ],
  kepala_tu: [
    { key: 'buku_induk', label: 'Buku induk', desc: 'Data siswa dan tenaga pendidik', icon: UsersRound },
    { key: 'finance', label: 'Keuangan sekolah', desc: 'Kas, SPP, dan administrasi', icon: Landmark },
    { key: 'attendance', label: 'Rekap presensi', desc: 'Kehadiran harian warga sekolah', icon: CalendarCheck2 },
  ],
  kepala_perpus: [
    { key: 'library', label: 'Perpustakaan digital', desc: 'Katalog dan peminjaman buku', icon: Library },
    { key: 'archive', label: 'Arsip digital', desc: 'Dokumen dan surat sekolah', icon: ClipboardList },
    { key: 'feedback', label: 'Aspirasi layanan', desc: 'Tindak lanjut masukan warga', icon: MessageSquareHeart },
  ],
  kepala_bk: [
    { key: 'counseling', label: 'Konseling BK', desc: 'Jadwal dan catatan konseling', icon: MessageSquareHeart },
    { key: 'violations', label: 'Poin pelanggaran', desc: 'Pembinaan dan tata tertib', icon: ShieldCheck },
    { key: 'uks', label: 'UKS & izin siswa', desc: 'Pantau kebutuhan siswa', icon: CalendarCheck2 },
  ],
  guru_walikelas: [
    { key: 'walikelas', label: 'Administrasi kelas', desc: 'Data, piket, dan denah siswa', icon: UsersRound },
    { key: 'attendance', label: 'Presensi kelas', desc: 'Kehadiran dan tindak lanjut', icon: CalendarCheck2 },
    { key: 'elearning', label: 'E-learning', desc: 'Materi, tugas, dan diskusi', icon: BookOpen },
  ],
};

export default function StaffWorkspace() {
  const { currentUser, isAuthenticated, setActiveModule } = useAuth();
  if (!isAuthenticated || !roleWorkspaces[currentUser.role]) return null;

  const actions = roleWorkspaces[currentUser.role];
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4a024]">Ruang kerja Anda</p><h2 className="mt-0.5 text-lg font-bold text-[#002147]">Selamat bertugas, {currentUser.name.split(',')[0]}</h2></div>
        <span className="w-fit rounded-full border border-[#002147]/10 bg-white px-3 py-1 text-xs font-semibold text-[#002147]">{currentUser.badge}</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return <button key={action.key} onClick={() => setActiveModule(action.key)} className="group rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#f4a024] hover:shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-[#002147]"><Icon className="h-5 w-5" /></span><span className="mt-3 block text-sm font-bold text-[#002147]">{action.label}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{action.desc}</span><span className="mt-3 flex items-center gap-1 text-xs font-bold text-[#002147] opacity-0 transition group-hover:opacity-100">Buka layanan <ArrowRight className="h-3.5 w-3.5" /></span></button>;
        })}
      </div>
    </section>
  );
}
