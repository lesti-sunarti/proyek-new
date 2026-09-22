import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  Smartphone, 
  Menu, 
  X, 
  ChevronDown, 
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
  Phone,
  Mail,
  Clock,
  Award,
  Search,
  LogIn,
  LogOut,
  UserRound
} from 'lucide-react';

export default function Navbar({ toggleSidebar, isSidebarOpen, onToggleCollapse, isSidebarCollapsed, onOpenQuickNav }) {
  const { currentUser, isAuthenticated, urgentNotice, setUrgentNotice, setActiveModule, isServerOnline, checkServerOnline, openLogin, login, logout, showToast } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [headerUsername, setHeaderUsername] = useState('');
  const [headerPassword, setHeaderPassword] = useState('');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        setInstallPrompt(null);
      });
    } else {
      setActiveModule('apk');
    }
  };

  const handleHeaderLogin = async (event) => {
    event.preventDefault();
    if (!headerUsername || !headerPassword) return openLogin();
    const result = await login(headerUsername, headerPassword);
    if (!result.success) showToast(result.message, 'error');
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-slate-200">
      
      {/* Top Header Bar ala SMK Tunas Media (Oxford Navy #002147) */}
      <div className="bg-[#002147] text-white text-[11px] py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Phone className="w-3.5 h-3.5 text-[#f4a024]" /> (021) 7890-1234 / 0812-3456-7890
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-slate-200">
              <Mail className="w-3.5 h-3.5 text-[#f4a024]" /> info@harapanbangsa.sch.id
            </span>
            <span className="hidden lg:flex items-center gap-1.5 text-slate-200">
              <Clock className="w-3.5 h-3.5 text-[#f4a024]" /> Senin - Jumat: 07.00 - 15.30 WIB
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f4a024] text-[#002147] font-bold text-[10px] uppercase tracking-wider">
              <Award className="w-3 h-3" /> Akreditasi A (Unggul)
            </span>
            <span className="text-slate-300 hidden sm:inline">NPSN: 20108921</span>
          </div>
        </div>
      </div>

      {/* Offline Server Notice Bar if server is unreachable */}
      {!isServerOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs border-b border-amber-600">
          <div className="flex items-center gap-2 overflow-hidden">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            <span className="truncate">Koneksi Server Terputus: Backend belum berjalan di port 5000. Klik file JALANKAN_SEKOLAH_APP.bat di komputer Anda.</span>
          </div>
          <button 
            onClick={checkServerOnline}
            className="ml-2 px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[11px] shrink-0 font-bold flex items-center gap-1 transition-colors"
          >
            Hubungkan Ulang
          </button>
        </div>
      )}

      {/* Urgent Broadcast Notice Bar if present */}
      {urgentNotice && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce text-amber-300" />
            <span className="font-bold shrink-0">[PENGUMUMAN PENTING]:</span>
            <span className="truncate">{urgentNotice.title} - {urgentNotice.message}</span>
          </div>
          <button 
            onClick={() => setUrgentNotice(null)}
            className="ml-2 hover:bg-rose-700 rounded p-0.5 text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Navbar Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Mobile Toggle & Desktop Sidebar Collapse Button & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-slate-600 hover:text-[#002147] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f4a024] lg:hidden"
              aria-label="Toggle Menu Mobile"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop Toggle/Hide Sidebar Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center gap-1.5 p-2 rounded-lg text-slate-600 hover:text-[#002147] hover:bg-slate-100 border border-slate-200 transition-all text-xs font-medium"
              title={isSidebarCollapsed ? "Tampilkan Menu Navigasi" : "Sembunyikan Menu (Layar Penuh)"}
              aria-label="Toggle Menu Desktop"
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeft className="w-4 h-4 text-[#f4a024]" />
                  <span className="text-[#002147] font-semibold text-[11px]">Buka Menu</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-500 text-[11px]">Layar Penuh</span>
                </>
              )}
            </button>

            {/* Brand Logo & Name */}
            <div 
              onClick={() => setActiveModule('portal')}
              className="flex items-center gap-3 cursor-pointer group select-none ml-1"
            >
              <div className="w-10 h-10 rounded-xl bg-[#002147] flex items-center justify-center shadow-md shadow-[#002147]/20 group-hover:bg-[#0a2f5c] transition-colors border border-amber-400/30">
                <GraduationCap className="w-6 h-6 text-[#f4a024]" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-[#002147] tracking-tight flex items-center gap-2">
                  SMAN 1 HARAPAN BANGSA
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">School of Science, Technology & Character</p>
              </div>
            </div>
          </div>

          {/* Right: akses cepat, login, dan APK */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenQuickNav}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-[#002147]"
              title="Buka akses cepat (Ctrl + K)"
              aria-label="Buka akses cepat"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Akses cepat</span>
              <kbd className="hidden lg:inline rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-semibold text-slate-400">Ctrl K</kbd>
            </button>

            {!isAuthenticated && (
              <form onSubmit={handleHeaderLogin} className="hidden xl:flex items-center gap-1.5">
                <input value={headerUsername} onChange={(event) => setHeaderUsername(event.target.value)} className="h-8 w-28 rounded-md border border-slate-200 px-2 text-[11px] outline-none focus:border-[#002147]" placeholder="Username" aria-label="Username" />
                <input value={headerPassword} onChange={(event) => setHeaderPassword(event.target.value)} type="password" className="h-8 w-24 rounded-md border border-slate-200 px-2 text-[11px] outline-none focus:border-[#002147]" placeholder="Password" aria-label="Password" />
                <button className="flex h-8 items-center gap-1 rounded-md bg-[#002147] px-2.5 text-[11px] font-bold text-white hover:bg-[#0a2f5c]"><LogIn className="h-3.5 w-3.5" />Masuk</button>
              </form>
            )}
            
            {/* Install APK / PWA Button (Golden Amber #f4a024) */}
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#f4a024] hover:bg-[#e58e10] text-[#002147] text-xs font-bold transition-all shadow-sm hover:shadow"
              title="Pasang di HP atau Buat APK"
            >
              <Smartphone className="w-4 h-4 text-[#002147]" />
              <span className="hidden md:inline">Aplikasi APK</span>
              <span className="md:hidden">APK</span>
            </button>

            {/* Profil akun atau pintu masuk untuk tamu */}
            <div className="relative">
              <button
                onClick={() => isAuthenticated ? setDropdownOpen(!dropdownOpen) : openLogin()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition-all shadow-xs"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#002147] text-[10px] font-bold text-[#f4a024] ring-2 ring-[#f4a024]/40">{isAuthenticated ? currentUser.name.slice(0, 1) : <UserRound className="h-3.5 w-3.5" />}</span>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-[#002147] truncate max-w-[125px]">{isAuthenticated ? currentUser.name : 'Masuk staf'}</div>
                  <div className="text-[10px] text-slate-500">{isAuthenticated ? currentUser.badge : 'Username & password'}</div>
                </div>
                {isAuthenticated ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <LogIn className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sesi aktif</p>
                    <p className="text-sm font-bold text-[#002147] truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.title}</p>
                  </div>
                  <button onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50"><LogOut className="h-4 w-4" />Keluar dari sistem</button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
