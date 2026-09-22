import React, { lazy, Suspense, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import CommandPalette from './components/CommandPalette';
import LoginModal from './components/LoginModal';

// Modul dimuat saat dibuka agar halaman utama dan perangkat dengan koneksi terbatas tetap ringan.
const PublicPortal = lazy(() => import('./pages/PublicPortal'));
const AttendanceView = lazy(() => import('./pages/AttendanceView'));
const CbtExamView = lazy(() => import('./pages/CbtExamView'));
const AcademicView = lazy(() => import('./pages/AcademicView'));
const SppPaymentView = lazy(() => import('./pages/SppPaymentView'));
const BukuIndukView = lazy(() => import('./pages/BukuIndukView'));
const FinanceView = lazy(() => import('./pages/FinanceView'));
const PayrollView = lazy(() => import('./pages/PayrollView'));
const BlogView = lazy(() => import('./pages/BlogView'));
const AgendaView = lazy(() => import('./pages/AgendaView'));
const BroadcastView = lazy(() => import('./pages/BroadcastView'));
const ViolationsView = lazy(() => import('./pages/ViolationsView'));
const GalleryView = lazy(() => import('./pages/GalleryView'));
const AlumniView = lazy(() => import('./pages/AlumniView'));
const PpdbView = lazy(() => import('./pages/PpdbView'));
const ArchiveView = lazy(() => import('./pages/ArchiveView'));
const ElearningView = lazy(() => import('./pages/ElearningView'));
const ApkGuideView = lazy(() => import('./pages/ApkGuideView'));
const ParentPortalView = lazy(() => import('./pages/ParentPortalView'));
const EraporView = lazy(() => import('./pages/EraporView'));
const LibraryView = lazy(() => import('./pages/LibraryView'));
const ExtracurricularView = lazy(() => import('./pages/ExtracurricularView'));
const CounselingView = lazy(() => import('./pages/CounselingView'));
const SupportCenterView = lazy(() => import('./pages/SupportCenterView'));
const CareerCenterView = lazy(() => import('./pages/CareerCenterView'));
const FeedbackView = lazy(() => import('./pages/FeedbackView'));
const CanteenView = lazy(() => import('./pages/CanteenView'));
const WalletTopupView = lazy(() => import('./pages/WalletTopupView'));
const PemilosView = lazy(() => import('./pages/PemilosView'));
const WaliKelasView = lazy(() => import('./pages/WaliKelasView'));
const HealthCenterView = lazy(() => import('./pages/HealthCenterView'));
const AuditLogView = lazy(() => import('./pages/AuditLogView'));

function PageLoading() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#f4a024] border-t-[#002147]" />
        Memuat layanan sekolah…
      </div>
    </div>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const { activeModule, setActiveModule, canAccess, isAuthenticated, openLogin } = useAuth();

  const renderModule = () => {
    if (!canAccess(activeModule)) {
      return (
        <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">🔒</span>
          <h2 className="mt-5 text-xl font-bold text-[#002147]">Layanan perlu hak akses</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{isAuthenticated ? 'Akun Anda tidak memiliki wewenang untuk membuka menu ini. Gunakan akun staf yang sesuai.' : 'Silakan masuk dengan akun staf untuk menggunakan layanan ini.'}</p>
          {!isAuthenticated && <button onClick={openLogin} className="mt-5 rounded-lg bg-[#002147] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0a2f5c]">Masuk sebagai staf</button>}
        </section>
      );
    }
    switch (activeModule) {
      case 'portal':
        return <PublicPortal />;
      case 'attendance':
        return <AttendanceView />;
      case 'cbt':
        return <CbtExamView />;
      case 'academic':
        return <AcademicView />;
      case 'spp':
        return <SppPaymentView />;
      case 'buku_induk':
        return <BukuIndukView />;
      case 'finance':
        return <FinanceView />;
      case 'payroll':
        return <PayrollView />;
      case 'blog':
        return <BlogView />;
      case 'agenda':
        return <AgendaView />;
      case 'broadcast':
        return <BroadcastView />;
      case 'violations':
        return <ViolationsView />;
      case 'gallery':
        return <GalleryView />;
      case 'alumni':
        return <AlumniView />;
      case 'ppdb':
        return <PpdbView />;
      case 'archive':
        return <ArchiveView />;
      case 'elearning':
        return <ElearningView />;
      case 'apk':
        return <ApkGuideView />;
      case 'ortu_dashboard':
        return <ParentPortalView />;
      case 'erapor':
        return <EraporView />;
      case 'library':
        return <LibraryView />;
      case 'extracurricular':
        return <ExtracurricularView />;
      case 'counseling':
        return <CounselingView />;
      case 'support':
        return <SupportCenterView />;
      case 'career':
        return <CareerCenterView />;
      case 'feedback':
        return <FeedbackView />;
      case 'kantin':
        return <CanteenView />;
      case 'topup':
        return <WalletTopupView />;
      case 'pemilos':
        return <PemilosView />;
      case 'walikelas':
        return <WaliKelasView />;
      case 'uks':
        return <HealthCenterView />;
      case 'audit':
        return <AuditLogView />;
      default:
        return <PublicPortal />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        isSidebarCollapsed={sidebarCollapsed}
        onOpenQuickNav={() => setQuickNavOpen(true)}
      />

      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
        />

        {/* Main Content Area - shifts right when sidebar is expanded */}
        <main className={`flex-1 transition-all duration-300 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto ${sidebarCollapsed ? '' : 'lg:pl-72'}`}>
          <Suspense fallback={<PageLoading />}>{renderModule()}</Suspense>
        </main>
      </div>

      {/* Floating Toast Notification */}
      <Toast />
      <LoginModal />

      <CommandPalette
        isOpen={quickNavOpen}
        onOpen={() => setQuickNavOpen(true)}
        onClose={() => setQuickNavOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
