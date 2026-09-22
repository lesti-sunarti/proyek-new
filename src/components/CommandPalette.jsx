import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  CircleHelp,
  CreditCard,
  FileCheck2,
  FileText,
  Globe,
  GraduationCap,
  Image,
  Library,
  Lightbulb,
  MessageSquareHeart,
  QrCode,
  Radio,
  Receipt,
  Search,
  ShieldAlert,
  ShoppingBag,
  Stethoscope,
  Trophy,
  UserPlus,
  Users,
  Vote,
  Wallet,
  LockKeyhole,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const destinations = [
  { key: 'portal', label: 'Website Sekolah', group: 'Portal & Publik', icon: Globe },
  { key: 'ppdb', label: 'PPDB Online', group: 'Portal & Publik', icon: UserPlus },
  { key: 'gallery', label: 'Galeri Sekolah', group: 'Portal & Publik', icon: Image },
  { key: 'agenda', label: 'Agenda Kegiatan', group: 'Portal & Publik', icon: Calendar },
  { key: 'blog', label: 'Mading & Blog Siswa', group: 'Portal & Publik', icon: FileText },
  { key: 'alumni', label: 'Tracer Study Alumni', group: 'Portal & Publik', icon: Award },
  { key: 'cbt', label: 'Ujian CBT Online', group: 'Akademik', icon: ShieldAlert },
  { key: 'erapor', label: 'E-Rapor & Transkrip', group: 'Akademik', icon: FileCheck2 },
  { key: 'attendance', label: 'Absensi QR & Kartu', group: 'Akademik', icon: QrCode },
  { key: 'elearning', label: 'E-Learning LMS', group: 'Akademik', icon: GraduationCap },
  { key: 'academic', label: 'Rombel & Jadwal KBM', group: 'Akademik', icon: BookOpen },
  { key: 'career', label: 'Pusat Karier & Magang', group: 'Akademik', icon: Briefcase },
  { key: 'buku_induk', label: 'Buku Induk Siswa/Guru', group: 'Kesiswaan', icon: Users },
  { key: 'extracurricular', label: 'Ekstrakurikuler & Prestasi', group: 'Kesiswaan', icon: Trophy },
  { key: 'counseling', label: 'Konseling BK Online', group: 'Kesiswaan', icon: MessageSquareHeart },
  { key: 'uks', label: 'UKS & Izin Siswa', group: 'Kesiswaan', icon: Stethoscope },
  { key: 'broadcast', label: 'Broadcast Pengumuman', group: 'Kesiswaan', icon: Radio },
  { key: 'pemilos', label: 'E-Pemilos (Pemilu OSIS)', group: 'Kesiswaan', icon: Vote },
  { key: 'feedback', label: 'Ruang Aspirasi Sekolah', group: 'Kesiswaan', icon: Lightbulb },
  { key: 'kantin', label: 'Kantin & Toko Sekolah', group: 'Kantin', icon: ShoppingBag },
  { key: 'topup', label: 'Dompet Digital & Top-Up', group: 'Kantin', icon: Wallet },
  { key: 'library', label: 'Perpustakaan Digital', group: 'Administrasi', icon: Library },
  { key: 'spp', label: 'Pembayaran SPP', group: 'Administrasi', icon: CreditCard },
  { key: 'finance', label: 'Keuangan & Buku Kas', group: 'Administrasi', icon: Wallet },
  { key: 'payroll', label: 'Penggajian & Slip Gaji', group: 'Administrasi', icon: Receipt },
  { key: 'archive', label: 'Arsip Digital & SK', group: 'Administrasi', icon: Archive },
  { key: 'support', label: 'Pusat Bantuan & Layanan', group: 'Dukungan', icon: CircleHelp },
  { key: 'walikelas', label: 'Sistem Wali Kelas', group: 'Akademik', icon: GraduationCap },
  { key: 'audit', label: 'Jejak Aktivitas', group: 'Sistem & Keamanan', icon: ShieldAlert },
];

export default function CommandPalette({ isOpen, onOpen, onClose }) {
  const { setActiveModule, canAccess, isAuthenticated, openLogin, showToast } = useAuth();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!isOpen) onOpen?.();
      }
      if (event.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('id-ID');
    if (!term) return destinations.slice(0, 8);
    return destinations.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase('id-ID').includes(term));
  }, [query]);

  const selectDestination = (key) => {
    if (!canAccess(key)) {
      showToast(isAuthenticated ? 'Menu ini tidak tersedia untuk jabatan Anda.' : 'Silakan masuk untuk membuka layanan ini.', 'error');
      if (!isAuthenticated) openLogin();
      onClose();
      return;
    }
    setActiveModule(key);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/35 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <section
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/25"
        role="dialog"
        aria-modal="true"
        aria-label="Akses cepat menu sekolah"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches[0]) selectDestination(matches[0].key);
            }}
            className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Cari menu atau layanan…"
            aria-label="Cari menu"
          />
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup akses cepat">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[54vh] overflow-y-auto p-2">
          {matches.length ? matches.map((item) => {
            const Icon = item.icon;
            const isLocked = !canAccess(item.key);
            return (
              <button
                key={item.key}
                onClick={() => selectDestination(item.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${isLocked ? 'opacity-60' : ''}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#002147]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                  <span className="block text-[11px] text-slate-500">{item.group}</span>
                </span>
                {isLocked ? <LockKeyhole className="h-3.5 w-3.5 text-slate-400" /> : <span className="text-xs text-slate-300">↵</span>}
              </button>
            );
          }) : (
            <div className="px-3 py-10 text-center text-sm text-slate-500">Menu tidak ditemukan. Coba kata kunci lain.</div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-medium text-slate-400">
          <span>Ketik untuk mencari</span>
          <span><kbd className="rounded border border-slate-200 bg-white px-1 py-0.5">Esc</kbd> untuk menutup</span>
        </div>
      </section>
    </div>
  );
}
