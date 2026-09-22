import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Globe,
  QrCode,
  ShieldAlert,
  BookOpen,
  CreditCard,
  Users,
  Wallet,
  Receipt,
  FileText,
  Calendar,
  Radio,
  AlertOctagon,
  Image,
  Award,
  UserPlus,
  Archive,
  GraduationCap,
  Smartphone,
  HeartHandshake,
  FileCheck2,
  Library,
  Trophy,
  MessagesSquare,
  LifeBuoy,
  Briefcase,
  Lightbulb,
  ShoppingBag,
  Vote,
  Stethoscope,
  X,
  LockKeyhole
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed }) {
  const { activeModule, setActiveModule, currentRole, canAccess, isAuthenticated, openLogin, showToast } = useAuth();

  const handleSelect = (key) => {
    if (!canAccess(key)) {
      showToast(isAuthenticated ? 'Menu ini tidak termasuk dalam hak akses jabatan Anda.' : 'Silakan masuk untuk membuka layanan ini.', 'error');
      if (!isAuthenticated) openLogin();
      return;
    }
    setActiveModule(key);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const navSections = [
    {
      title: 'Portal & Publik',
      items: [
        { key: 'portal', label: 'Website Sekolah', icon: Globe, desc: 'Profil, visi misi, & berita' },
        ...(currentRole === 'ortu' ? [
          { 
            key: 'ortu_dashboard', 
            label: 'Portal Orang Tua', 
            icon: HeartHandshake, 
            desc: 'Pantau presensi, SPP & poin anak',
            highlightAmber: true
          }
        ] : []),
        { key: 'ppdb', label: 'PPDB Online', icon: UserPlus, desc: 'Pendaftaran siswa baru' },
        { key: 'gallery', label: 'Galeri Sekolah', icon: Image, desc: 'Foto sarpras & kegiatan' },
        { key: 'agenda', label: 'Agenda Kegiatan', icon: Calendar, desc: 'Kalender acara sekolah' },
        { key: 'blog', label: 'Mading & Blog Siswa', icon: FileText, desc: 'Karya literasi digital' },
        { key: 'alumni', label: 'Tracer Study Alumni', icon: Award, desc: 'Data sebaran lulusan' },
      ]
    },
    {
      title: 'Akademik & Pembelajaran',
      items: [
        { 
          key: 'cbt', 
          label: 'Ujian CBT Online', 
          icon: ShieldAlert, 
          desc: 'Ujian terintegrasi anti-nyontek', 
          highlight: true 
        },
        { 
          key: 'erapor', 
          label: 'E-Rapor & Transkrip', 
          icon: FileCheck2, 
          desc: 'Nilai semester & cetak rapor',
          highlightNavy: true 
        },
        { key: 'attendance', label: 'Absensi QR & Kartu', icon: QrCode, desc: 'Presensi HP & barcode kiosk' },
        { key: 'elearning', label: 'E-Learning LMS', icon: GraduationCap, desc: 'Materi, tugas & forum diskusi' },
        { key: 'academic', label: 'Rombel & Jadwal KBM', icon: BookOpen, desc: 'Tahun ajaran, kelas & jadwal' },
        { key: 'career', label: 'Pusat Karier & Magang', icon: Briefcase, desc: 'Magang, beasiswa, & kesiapan karier', highlightAmber: true },
        {
          key: 'walikelas',
          label: 'Sistem Wali Kelas',
          icon: GraduationCap,
          desc: 'Administrasi, siswa, piket & denah',
          highlightNavy: true,
        },
      ]
    },
    {
      title: 'Kesiswaan & Bimbingan',
      items: [
        { key: 'buku_induk', label: 'Buku Induk Siswa/Guru', icon: Users, desc: 'NISN, NIP & cetak KTP kartu' },
        { 
          key: 'extracurricular', 
          label: 'Ekstrakurikuler & Prestasi', 
          icon: Trophy, 
          desc: 'Kegiatan ekskul & kejuaraan',
          highlightAmber: true
        },
        { 
          key: 'counseling', 
          label: 'Konseling BK Online', 
          icon: MessagesSquare, 
          desc: 'Jadwal konsultasi privat BK' 
        },
        { key: 'uks', label: 'UKS & Izin Siswa', icon: Stethoscope, desc: 'Kunjungan, izin, & tindak lanjut' },
        { key: 'violations', label: 'Poin Pelanggaran BK', icon: AlertOctagon, desc: 'Buku sanksi & tata tertib' },
        { 
          key: 'pemilos', 
          label: 'E-Pemilos (Pemilu OSIS)', 
          icon: Vote, 
          desc: 'Bilik suara & quick count OSIS',
          highlightAmber: true 
        },
        { key: 'broadcast', label: 'Broadcast Pengumuman', icon: Radio, desc: 'Informasi kilat sekolah' },
        { key: 'feedback', label: 'Ruang Aspirasi Sekolah', icon: Lightbulb, desc: 'Saran aman & tindak lanjut', highlightNavy: true },
      ]
    },
    {
      title: 'Kantin & Transaksi Digital',
      items: [
        { 
          key: 'kantin', 
          label: 'Kantin & Toko Sekolah', 
          icon: ShoppingBag, 
          desc: 'Makanan, pulsa, token PLN & atribut',
          highlightAmber: true
        },
        { 
          key: 'topup', 
          label: 'Dompet Digital & Top-Up', 
          icon: Wallet, 
          desc: 'Saldo kartu pintar, QRIS & mutasi',
          highlightNavy: true
        }
      ]
    },
    {
      title: 'Administrasi & Keuangan',
      items: [
        { 
          key: 'library', 
          label: 'Perpustakaan Digital', 
          icon: Library, 
          desc: 'Katalog buku & peminjaman',
          highlightNavy: true
        },
        { key: 'spp', label: 'Pembayaran SPP', icon: CreditCard, desc: 'Tagihan 12 bulan & kuitansi' },
        { key: 'finance', label: 'Keuangan & Buku Kas', icon: Wallet, desc: 'Kas masuk/keluar & neraca' },
        { key: 'payroll', label: 'Penggajian & Slip Gaji', icon: Receipt, desc: 'Slip gaji digital guru/staf' },
        { key: 'archive', label: 'Arsip Digital & SK', icon: Archive, desc: 'Repositori dokumen resmi' },
      ]
    },
    {
      title: 'Sistem & Keamanan',
      items: [
        { key: 'audit', label: 'Jejak Aktivitas', icon: ShieldAlert, desc: 'Audit akses dan perubahan penting', highlightNavy: true },
      ]
    },
    {
      title: 'Aplikasi Mobile',
      items: [
        { 
          key: 'apk', 
          label: 'Panduan APK Android', 
          icon: Smartphone, 
          desc: 'Pasang PWA & build file APK',
          highlightAmber: true
        }
      ]
    },
    {
      title: 'Dukungan',
      items: [
        {
          key: 'support',
          label: 'Pusat Bantuan & Layanan',
          icon: LifeBuoy,
          desc: 'Panduan, kontak, & tiket bantuan'
        }
      ]
    }
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-[97px] sm:top-[90px] bottom-0 left-0 z-30 w-72 bg-white border-r border-slate-200 
        overflow-y-auto transition-transform duration-300 ease-in-out shadow-xs
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'}
      `}>
        <div className="p-4 space-y-5">

          {/* Quick Role Banner */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#002147] text-[#f4a024] flex items-center justify-center font-bold text-xs shrink-0">
                {currentRole.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Hak Akses Saat Ini</div>
                <div className="text-xs font-bold text-[#002147] capitalize truncate">{currentRole}</div>
              </div>
            </div>
            {/* Close button for mobile inside sidebar */}
            <button 
              onClick={onClose} 
              className="lg:hidden p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Sections */}
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.key;
                  const isLocked = !canAccess(item.key);
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleSelect(item.key)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs font-medium transition-all group
                        ${isActive && !isLocked
                          ? 'bg-[#002147] text-white font-semibold shadow-xs' 
                          : item.highlight
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : item.highlightAmber
                              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                              : item.highlightNavy
                                ? 'bg-slate-100 text-[#002147] hover:bg-slate-200 border border-slate-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-[#002147]'
                        } ${isLocked ? 'opacity-60 grayscale-[.25]' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive && !isLocked
                            ? 'text-[#f4a024]' 
                            : item.highlight 
                              ? 'text-rose-600' 
                              : item.highlightAmber 
                                ? 'text-amber-600' 
                                : item.highlightNavy
                                  ? 'text-[#002147]'
                                  : 'text-slate-400 group-hover:text-[#002147]'
                        }`} />
                        <div className="truncate">
                          <div className="truncate font-semibold">{item.label}</div>
                          <div className={`text-[10px] truncate ${isActive && !isLocked ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-500'}`}>{item.desc}</div>
                        </div>
                      </div>
                      {item.highlight && !isActive && (
                        <span className="shrink-0 flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}
                      {isLocked && <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Memerlukan akses" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Version / System info */}
          <div className="pt-3 border-t border-slate-100 px-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>SekolahApp v2.0</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </span>
          </div>

        </div>
      </aside>
    </>
  );
}
