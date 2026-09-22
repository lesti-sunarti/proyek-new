import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard, 
  ShieldAlert, 
  Phone, 
  BookOpen,
  ArrowRight,
  GraduationCap,
  ClipboardList,
  HeartPulse,
  RefreshCw,
  Search,
  LogIn
} from 'lucide-react';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const METHOD_LABELS = { self_scan: 'Scan HP Mandiri', kiosk_card: 'Kiosk Kartu Gerbang', manual: 'Input Manual Petugas' };
const ATTENDANCE_STATUS_LABELS = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa (Tanpa Keterangan)' };
const PERMISSION_STATUS = {
  disetujui: { label: 'Disetujui', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ditolak: { label: 'Ditolak', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  menunggu: { label: 'Menunggu', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};
const DISPOSITION_LABELS = {
  kembali_kelas: 'Kembali ke kelas',
  istirahat: 'Istirahat di UKS',
  pulang: 'Dipulangkan',
  dipulangkan: 'Dipulangkan',
  rujuk: 'Dirujuk ke faskes',
  dirujuk: 'Dirujuk ke faskes',
};
const VIOLATION_CATEGORY_CLASS = {
  ringan: 'bg-amber-50 text-amber-700 border-amber-200',
  sedang: 'bg-orange-50 text-orange-700 border-orange-200',
  berat: 'bg-rose-50 text-rose-700 border-rose-200',
};

const formatRupiah = (value) => `Rp ${(Number(value) || 0).toLocaleString('id-ID')}`;
const formatTime = (value) => (value ? String(value).slice(0, 5) : '-');
const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};
const methodLabel = (method) => METHOD_LABELS[method] || 'Input Manual Petugas';
const attendanceStatusLabel = (status) => ATTENDANCE_STATUS_LABELS[status] || status || '-';
const permissionStatus = (status) => PERMISSION_STATUS[status] || { label: status || '-', className: 'bg-slate-100 text-slate-600 border-slate-200' };
const dispositionLabel = (value) => DISPOSITION_LABELS[value] || (value ? String(value).replace(/_/g, ' ') : '-');
const sppStatusLabel = (status) => (status === 'lunas' ? 'Lunas' : status === 'menunggu' ? 'Menunggu Verifikasi' : 'Belum Dibayar');

const LateBadge = () => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold leading-none">
    Terlambat
  </span>
);

const LOAD_STATE_TITLES = {
  unauthorized: 'Sesi login berakhir',
  forbidden: 'Akses ditolak',
  unlinked: 'Akun belum terhubung dengan data siswa',
  error: 'Data belum dapat dimuat',
};
// Teks cadangan bila server tidak menyertakan `message`.
const LOAD_STATE_FALLBACKS = {
  unauthorized: 'Sesi Anda sudah tidak aktif.',
  forbidden: 'Akun ini tidak memiliki hak akses ke Portal Orang Tua.',
  unlinked: 'Akun ini belum terhubung dengan data siswa. Hubungi tata usaha sekolah.',
  error: 'Silakan coba beberapa saat lagi.',
};

export default function ParentPortalView() {
  const { currentUser, currentRole, isAuthenticated, canAccess, setActiveModule, showToast, openLogin } = useAuth();
  // Akun ortu terhubung ke anaknya melalui related_student_id; server sendiri yang menentukan siswa dari sesi login.
  const linkedStudentId = currentUser?.related_student_id ? Number(currentUser.related_student_id) : null;
  // Staf berwenang (bukan ortu/siswa) tanpa anak tertaut → mode peninjauan lewat ?student_id= (didukung server untuk staf).
  const isReviewer = isAuthenticated && !linkedStudentId && !['ortu', 'siswa', 'publik'].includes(currentRole);

  const [reviewInput, setReviewInput] = useState('1');
  const [reviewStudentId, setReviewStudentId] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  // loading | ok | unauthorized (401) | forbidden (403) | unlinked (404) | error
  const [loadState, setLoadState] = useState('loading');
  const [loadMessage, setLoadMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const url = isReviewer ? `/api/ortu/dashboard?student_id=${encodeURIComponent(reviewStudentId)}` : '/api/ortu/dashboard';
    setLoadState('loading');
    setLoadMessage('');

    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || data.success === false) {
          setDashboard(null);
          setLoadMessage(data.message || 'Gagal memuat data ananda.');
          if (res.status === 401) setLoadState('unauthorized');
          else if (res.status === 403) setLoadState('forbidden');
          else if (res.status === 404) setLoadState('unlinked');
          else setLoadState('error');
          return;
        }
        setDashboard(data);
        setLoadState('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setDashboard(null);
        setLoadMessage('Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.');
        setLoadState('error');
      });

    return () => { cancelled = true; };
    // currentUser?.id ikut dipantau agar data dimuat ulang saat berganti akun tanpa memuat ulang halaman.
  }, [isReviewer, reviewStudentId, reloadKey, currentUser?.id]);

  const reload = () => setReloadKey((key) => key + 1);

  const handleReviewSubmit = (event) => {
    event.preventDefault();
    const parsed = Number.parseInt(reviewInput, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      showToast('Masukkan ID siswa yang valid (angka positif).', 'error');
      return;
    }
    if (parsed === reviewStudentId) reload();
    else setReviewStudentId(parsed);
  };

  // ---- Data turunan (aman saat dashboard masih null) ----
  const isReady = loadState === 'ok' && Boolean(dashboard);
  const student = dashboard?.student || null;
  const parent = dashboard?.parent || null;
  const attendanceToday = Array.isArray(dashboard?.attendance?.today) ? dashboard.attendance.today : [];
  const attendanceRecent = Array.isArray(dashboard?.attendance?.recent) ? dashboard.attendance.recent : [];
  const lateCutoff = dashboard?.attendance?.late_cutoff ? formatTime(dashboard.attendance.late_cutoff) : null;
  const violationRecords = Array.isArray(dashboard?.violations?.records) ? dashboard.violations.records : [];
  const totalPoints = Number(dashboard?.violations?.totalPoints) || 0;
  const sppBills = Array.isArray(dashboard?.spp?.sppBills) ? dashboard.spp.sppBills : [];
  const otherBills = Array.isArray(dashboard?.spp?.otherBills) ? dashboard.spp.otherBills : [];
  const grades = Array.isArray(dashboard?.grades) ? dashboard.grades : [];
  const permissions = Array.isArray(dashboard?.permissions) ? dashboard.permissions : [];
  const uksVisits = Array.isArray(dashboard?.uks_visits) ? dashboard.uks_visits : [];

  const studentMeta = [student?.class_name ? `Kelas ${student.class_name}` : null, student?.nisn ? `NISN: ${student.nisn}` : null]
    .filter(Boolean)
    .join(' - ');

  // Presensi hari ini: scan masuk/pulang, presensi mapel, dan status non-hadir (izin/sakit/alpa).
  const scanMasuk = attendanceToday.find((log) => log.type === 'masuk') || null;
  const scanPulang = attendanceToday.find((log) => log.type === 'pulang') || null;
  const mapelToday = attendanceToday.filter((log) => log.type === 'mapel');
  const absentToday = attendanceToday.find((log) => log.status && log.status !== 'hadir') || null;
  const headlineLog = scanMasuk || absentToday || attendanceToday[0] || null;
  const todayIsHadir = headlineLog?.status === 'hadir';
  const isLateToday = Boolean(Number(scanMasuk?.is_late));
  const todayPositive = todayIsHadir && !isLateToday;
  const recentLogs = attendanceRecent.slice(0, 6);

  // SPP: bulan ini / tagihan berikutnya dan ringkasan yang belum lunas.
  const paidCount = sppBills.filter((bill) => bill.status === 'lunas').length;
  const unpaidBills = sppBills.filter((bill) => bill.status !== 'lunas');
  const unpaidSpp = Number.isFinite(Number(dashboard?.spp?.unpaid)) ? Number(dashboard.spp.unpaid) : unpaidBills.length;
  const unpaidSppAmount = unpaidBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const unpaidOther = otherBills.filter((bill) => bill.status !== 'lunas');
  const now = new Date();
  const currentBill = sppBills.find((bill) => bill.month === MONTH_NAMES[now.getMonth()] && Number(bill.year) === now.getFullYear()) || null;
  const nextUnpaid = unpaidBills[0] || null;
  const highlightedBill = currentBill || nextUnpaid;
  const sppTone = highlightedBill && highlightedBill.status !== 'lunas' ? 'text-amber-600' : 'text-emerald-600';

  const latestViolation = violationRecords[0] || null;
  const visibleGrades = grades.slice(0, 12);

  const bannerStatus = isReady
    ? (
      <>
        {isReviewer ? 'Meninjau: ' : 'Memantau: '}
        <strong className="text-white">{student?.name || `Siswa ID ${student?.id ?? reviewStudentId}`}</strong>
        {studentMeta ? ` (${studentMeta})` : ''}
        {parent?.phone ? ` · Kontak wali: ${parent.phone}` : ''}
      </>
    )
    : loadState === 'loading'
      ? 'Memuat data ananda…'
      : isReviewer
        ? 'Mode peninjauan staf: masukkan ID siswa untuk melihat ringkasan portal orang tua.'
        : loadState === 'unlinked'
          ? 'Akun ini belum terhubung dengan data siswa. Hubungi Tata Usaha untuk menautkan akun wali.'
          : 'Data ananda belum dapat ditampilkan saat ini.';

  return (
    <div className="space-y-6 pb-12">
      
      {/* Welcome Banner Orang Tua */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-500/50 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 ring-2 ring-amber-500/50 flex items-center justify-center text-2xl font-black text-amber-300">
              {String(currentUser?.name || 'W').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase mb-1">
              {isReviewer ? 'Portal Orang Tua · Mode Peninjauan Staf' : 'Portal Orang Tua / Wali Murid'}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">{currentUser?.name}</h2>
            <p className="text-xs text-slate-300">{bannerStatus}</p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          {isReviewer && (
            <form onSubmit={handleReviewSubmit} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
              <Search className="w-4 h-4 text-amber-300" />
              <label htmlFor="ortu-review-student-id" className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">ID siswa</label>
              <input
                id="ortu-review-student-id"
                type="number"
                min="1"
                value={reviewInput}
                onChange={(event) => setReviewInput(event.target.value)}
                className="w-20 bg-slate-900/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold">
                Tinjau
              </button>
            </form>
          )}
          <button
            onClick={() => showToast('Membuka chat WhatsApp dengan Wali Kelas (Drs. Budi Santoso)', 'info')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Phone className="w-4 h-4" /> Hubungi Wali Kelas
          </button>
        </div>
      </div>

      {/* Status pemuatan: loading / 401 / 403 / 404 / error */}
      {!isReady && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          {loadState === 'loading' ? (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" /> Memuat data ananda dari server…
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 shrink-0 ${loadState === 'error' ? 'text-rose-500' : 'text-amber-500'}`} />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {loadState === 'unlinked' && isReviewer ? 'Siswa tidak ditemukan' : LOAD_STATE_TITLES[loadState] || 'Data belum dapat dimuat'}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {loadState === 'unlinked' && isReviewer
                      ? `Siswa dengan ID ${reviewStudentId} tidak ditemukan atau belum terdaftar. Periksa ID siswa lalu tinjau kembali.`
                      : loadMessage || LOAD_STATE_FALLBACKS[loadState] || 'Silakan coba beberapa saat lagi.'}
                    {loadState === 'unauthorized' ? ' Silakan masuk kembali untuk melanjutkan.' : ''}
                    {loadState === 'forbidden' ? ' Portal ini hanya tersedia untuk akun wali murid.' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {loadState === 'unauthorized' && (
                  <button
                    onClick={openLogin}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" /> Masuk
                  </button>
                )}
                {loadState !== 'forbidden' && (
                  <button
                    onClick={reload}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Coba Lagi
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isReady && (
        <>
          {/* 3 Status Utama: Kehadiran, Poin Pelanggaran, dan Tagihan SPP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Status Presensi Hari Ini */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Presensi Hari Ini</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>

              {headlineLog ? (
                <div className={`p-4 rounded-2xl border space-y-3 ${todayPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`flex items-center gap-2 font-bold text-sm ${todayPositive ? 'text-emerald-700' : 'text-amber-800'}`}>
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{todayIsHadir ? 'Hadir di Sekolah' : `Tercatat: ${attendanceStatusLabel(headlineLog.status)}`}</span>
                    {isLateToday && <LateBadge />}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/70 border border-white">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan Masuk</div>
                      <div className="font-mono font-bold text-slate-900">{scanMasuk ? `${formatTime(scanMasuk.time)} WIB` : '-'}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/70 border border-white">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan Pulang</div>
                      <div className="font-mono font-bold text-slate-900">{scanPulang ? `${formatTime(scanPulang.time)} WIB` : 'Belum scan'}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Metode: {methodLabel(headlineLog.method)}
                    {mapelToday.length ? ` · ${mapelToday.length} presensi mapel` : ''}
                    {lateCutoff ? ` · Batas terlambat ${lateCutoff}` : ''}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Belum tercatat presensi untuk hari ini atau hari libur akademik.
                </div>
              )}

              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Riwayat terakhir</div>
                {recentLogs.length === 0 ? (
                  <p className="text-[11px] text-slate-500">Belum ada catatan presensi.</p>
                ) : recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span className="font-mono whitespace-nowrap">{formatDate(log.date)} {formatTime(log.time)}</span>
                    <span className="flex items-center gap-1.5 text-right">
                      <span className="capitalize">{log.type}{log.type === 'mapel' && log.subject_name ? ` (${log.subject_name})` : ''}</span>
                      · <strong className={log.status === 'hadir' ? 'text-emerald-600' : 'text-amber-700'}>{attendanceStatusLabel(log.status)}</strong>
                      {Number(log.is_late) ? <LateBadge /> : null}
                    </span>
                  </div>
                ))}
              </div>

              {canAccess('attendance') && (
                <button
                  onClick={() => setActiveModule('attendance')}
                  className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold flex items-center gap-1"
                >
                  Lihat Rekap Kehadiran Lengkap <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Poin Pelanggaran BK */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Buku Disiplin BK</span>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${
                totalPoints > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Total Akumulasi Poin:</span>
                  <span className={`text-lg font-black ${totalPoints > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {totalPoints} Poin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {violationRecords.length === 0
                    ? 'Ananda berperilaku sangat tertib dan belum memiliki catatan sanksi.'
                    : `${violationRecords.length} catatan pembinaan kedisiplinan tercatat${latestViolation?.incident_date ? `, terakhir ${formatDate(latestViolation.incident_date)}` : ''}.`}
                </p>
              </div>

              {canAccess('violations') && (
                <button
                  onClick={() => setActiveModule('violations')}
                  className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold flex items-center gap-1"
                >
                  Buka Buku Sanksi BK <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tagihan SPP */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Pembayaran SPP</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Status Lunas:</span>
                  <span className="text-emerald-600 font-bold">
                    {sppBills.length ? `${paidCount} dari ${sppBills.length} Bulan` : 'Belum ada tagihan'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-500">{currentBill ? 'SPP Bulan Ini:' : nextUnpaid ? 'Tagihan Berikutnya:' : 'Tagihan:'}</span>
                  <span className={`font-bold text-right ${sppTone}`}>
                    {currentBill
                      ? `${sppStatusLabel(currentBill.status)} · ${formatRupiah(currentBill.amount)}`
                      : nextUnpaid
                        ? `${nextUnpaid.month} ${nextUnpaid.year} · ${sppStatusLabel(nextUnpaid.status)}`
                        : sppBills.length ? 'Semua tagihan lunas' : 'Belum ada tagihan'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-500">Belum Lunas:</span>
                  <span className={`font-bold text-right ${unpaidSpp > 0 || unpaidOther.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {unpaidSpp > 0 ? `${unpaidSpp} tagihan SPP (${formatRupiah(unpaidSppAmount)})` : 'Tidak ada tunggakan SPP'}
                    {unpaidOther.length > 0 ? ` · ${unpaidOther.length} tagihan lain` : ''}
                  </span>
                </div>
              </div>

              {canAccess('spp') && (
                <button
                  onClick={() => setActiveModule('spp')}
                  className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold flex items-center gap-1"
                >
                  Buka Kartu SPP & Bayar Online <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Catatan Pelanggaran Detail Jika Ada */}
          {violationRecords.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Catatan Pelanggaran Siswa yang Perlu Diketahui Orang Tua
              </h3>
              <div className="space-y-2">
                {violationRecords.map((v) => (
                  <div key={v.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                        {v.violation_name}
                        {v.category && (
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${VIOLATION_CATEGORY_CLASS[v.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {v.category}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Tanggal: {formatDate(v.incident_date)} | Tindakan: {v.action_taken || '-'}{v.status ? ` | Status: ${v.status}` : ''}
                      </div>
                    </div>
                    <div className="text-rose-400 font-bold font-mono shrink-0">+{Number(v.points) || 0} Poin</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ringkasan Nilai E-Rapor */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" /> Ringkasan Nilai E-Rapor Ananda
              </h3>
              {canAccess('erapor') && (
                <button onClick={() => setActiveModule('erapor')} className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold flex items-center gap-1">
                  Buka E-Rapor <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {grades.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada nilai yang direkap untuk semester berjalan.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {visibleGrades.map((grade, index) => (
                    <div key={`${grade.subject_name}-${grade.academic_year}-${grade.semester}-${index}`} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{grade.subject_name}</div>
                        <div className="text-[11px] text-slate-500">{grade.semester} · {grade.academic_year}</div>
                        {grade.teacher_notes ? <div className="text-[11px] text-slate-500 italic mt-0.5">"{grade.teacher_notes}"</div> : null}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-slate-900">{grade.final_grade ?? '-'}</div>
                        <div className="text-[10px] font-bold text-emerald-600">Predikat {grade.predicate || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {grades.length > visibleGrades.length && (
                  <p className="text-[11px] text-slate-500">
                    Menampilkan {visibleGrades.length} dari {grades.length} nilai terbaru{canAccess('erapor') ? '; rincian lengkap tersedia di E-Rapor.' : '.'}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Izin/Dispensasi & Kunjungan UKS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-400" /> Izin / Dispensasi Terakhir
              </h3>
              {permissions.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada catatan.</p>
              ) : (
                <div className="space-y-2">
                  {permissions.map((item) => {
                    const status = permissionStatus(item.status);
                    return (
                      <div key={item.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">
                            <span className="capitalize">{item.permission_type || 'Izin'}</span> · <span className="font-mono">{formatDate(item.permission_date)}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.reason || 'Tanpa keterangan'}{item.reviewed_by ? ` · Ditinjau: ${item.reviewed_by}` : ''}
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${status.className}`}>{status.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-400" /> Kunjungan UKS
                </h3>
                {canAccess('uks') && (
                  <button onClick={() => setActiveModule('uks')} className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold flex items-center gap-1">
                    Buka UKS <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {uksVisits.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada catatan.</p>
              ) : (
                <div className="space-y-2">
                  {uksVisits.map((visit) => (
                    <div key={visit.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{visit.complaint || 'Keluhan tidak dicatat'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono">{formatDate(visit.visit_date)}{visit.visit_time ? ` ${formatTime(visit.visit_time)}` : ''}</span>
                          {' · '}Tindakan: {visit.action_taken || '-'}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600 text-[10px] font-bold">
                        {dispositionLabel(visit.disposition)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Informasi Ujian CBT Anak */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" /> Informasi Jadwal Evaluasi CBT Anti-Nyontek Siswa
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Ujian Tengah Semester (PTS) berbasis web secure dengan sistem proteksi Anti-Nyontek (Fullscreen lock & tab switch tracking). 
          Mohon bimbingan orang tua agar putra/putri mempersiapkan perangkat smartphone dengan baterai penuh dan kuota internet lancar.
        </p>
      </div>

    </div>
  );
}
