import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  QrCode, 
  Camera, 
  CheckCircle2, 
  Clock, 
  Users, 
  ShieldCheck, 
  Calendar, 
  Smartphone, 
  AlertCircle,
  Search,
  BellRing,
  Printer,
  Video,
  VideoOff,
  TrendingUp,
  RefreshCw,
  UserRoundCheck,
  AlertTriangle
} from 'lucide-react';
import QRModal from '../components/QRModal';

const DEFAULT_LATE_CUTOFF = '07:15:00';
const METHOD_LABELS = { self_scan: '📱 HP Mandiri', kiosk_card: '💳 Kiosk Kartu', manual: '⌨️ Input Manual' };

// Pola fetch standar: lempar Error berisi pesan server untuk respons non-OK.
const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan');
  return data;
};

export default function AttendanceView() {
  const { currentUser, currentRole, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('scan'); // 'scan', 'history', 'insights'
  const [scanMode, setScanMode] = useState('self_scan'); // 'self_scan' or 'kiosk_card'
  const [attendanceType, setAttendanceType] = useState('masuk'); // 'masuk', 'pulang', 'mapel'
  const [selectedSubject, setSelectedSubject] = useState('Matematika Wajib');
  const [manualCode, setManualCode] = useState('');
  const [todayLogs, setTodayLogs] = useState([]);
  const [logError, setLogError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [qrModalData, setQrModalData] = useState({ open: false, title: '', value: '', subtitle: '' });
  const [intelligence, setIntelligence] = useState(null);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('semua'); // 'semua' | 'siswa' | 'guru'
  const [myHistory, setMyHistory] = useState([]);

  // Real Camera Webcam State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const loadingRef = useRef(false);

  // Akun siswa/ortu terhubung ke satu siswa; dipakai untuk riwayat pribadi & QR kartu pelajar.
  const relatedStudentId = (currentRole === 'siswa' || currentRole === 'ortu') ? (currentUser.related_student_id || null) : null;

  const fetchLogs = () => {
    fetchJson('/api/attendance/today')
      .then(data => { setTodayLogs(Array.isArray(data) ? data : []); setLogError(''); })
      .catch(err => { setTodayLogs([]); setLogError(err.message || 'Log presensi tidak dapat dimuat.'); });
  };

  const fetchMyHistory = () => {
    if (!relatedStudentId) return;
    fetchJson(`/api/attendance/history?person_id=${relatedStudentId}&user_type=siswa&limit=10`)
      .then(data => setMyHistory(Array.isArray(data) ? data : []))
      .catch(() => setMyHistory([]));
  };

  const fetchIntelligence = () => {
    setIsIntelligenceLoading(true);
    fetchJson('/api/attendance/intelligence?days=30')
      .then(data => setIntelligence(data && typeof data === 'object' ? data : null))
      .catch((error) => showToast(error.message || 'Insight presensi belum dapat dimuat.', 'error'))
      .finally(() => setIsIntelligenceLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    fetchIntelligence();
    fetchMyHistory();
    return () => {
      // Pastikan kamera dimatikan saat komponen dilepas (unmount).
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Elemen <video> baru dirender setelah isCameraActive = true, jadi stream dipasang di sini
  // (bukan di startCamera, saat videoRef.current masih null).
  useEffect(() => {
    if (!isCameraActive || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    const playPromise = videoRef.current.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
  }, [isCameraActive]);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Browser ini tidak mendukung akses kamera langsung. Gunakan input barcode/preset.', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: scanMode === 'self_scan' ? 'user' : 'environment' }
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      showToast('Kamera aktif. Arahkan QR Code atau Barcode ke area fokus.', 'info');
    } catch (err) {
      console.error('Camera access error:', err);
      showToast('Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan simulasi barcode di bawah.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  };

  const handleScanSubmit = async (codeToScan) => {
    const code = (typeof codeToScan === 'string' ? codeToScan : manualCode).trim();
    if (!code) {
      showToast('Masukkan barcode/QR atau NISN/NIP terlebih dahulu!', 'error');
      return;
    }
    if (loadingRef.current) return; // cegah kirim ganda (Enter + klik / preset beruntun)

    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await fetchJson('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_string: code,
          type: attendanceType,
          method: scanMode,
          subject_name: attendanceType === 'mapel' ? selectedSubject : null,
          notes: `Absensi ${attendanceType} via ${scanMode === 'self_scan' ? 'HP Smartphone' : 'Mesin Kiosk Gerbang'}`
        })
      });
      const record = data.record || null;
      showToast(data.message || 'Presensi berhasil dicatat.', record?.is_late ? 'info' : 'success');
      setLastScanResult(record ? { ...record, type: attendanceType } : null);
      setManualCode('');
      fetchLogs();
      fetchIntelligence();
      fetchMyHistory();
    } catch (err) {
      showToast(err.message || 'Gagal memproses absensi', 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const lateCutoff = intelligence?.late_cutoff || DEFAULT_LATE_CUTOFF;
  // Aturan yang sama dengan server: siswa, tipe masuk, hadir, lewat batas waktu.
  const isLateLog = (log) => log.user_type === 'siswa' && log.type === 'masuk' && log.status === 'hadir' && String(log.time || '') > lateCutoff;

  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredLogs = todayLogs.filter(log => {
    const matchType = historyTypeFilter === 'semua' || log.user_type === historyTypeFilter;
    const haystack = `${log.person_name || ''} ${log.person_identifier || ''} ${log.subject_name || ''}`.toLowerCase();
    return matchType && (!normalizedHistorySearch || haystack.includes(normalizedHistorySearch));
  });

  // Hitung orang unik yang sudah scan masuk (bukan jumlah baris log masuk/pulang/mapel).
  const countCheckins = (userType) => new Set(todayLogs.filter(l => l.user_type === userType && l.type === 'masuk').map(l => l.person_id)).size;
  const studentCheckins = countCheckins('siswa');
  const teacherCheckins = countCheckins('guru');
  const lateToday = todayLogs.filter(isLateLog).length;

  // Bentuk respons insight dijaga aman (objek {today, trend, classes, followups}).
  const insightToday = intelligence?.today || {};
  const insightTrend = intelligence?.trend || {};
  const insightClasses = Array.isArray(intelligence?.classes) ? intelligence.classes : [];
  const insightFollowups = Array.isArray(intelligence?.followups) ? intelligence.followups : [];

  // QR kartu pelajar diturunkan dari identitas (NISN) pada catatan presensi milik siswa yang login.
  const myIdentifier = myHistory.find(item => item.person_identifier)?.person_identifier
    || todayLogs.find(item => item.user_type === 'siswa' && item.person_id === relatedStudentId)?.person_identifier
    || null;
  const myQrValue = myIdentifier ? `SISWA-${myIdentifier}` : null;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <QrCode className="w-3.5 h-3.5" /> Modul 2: Absensi Guru & Siswa
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Sistem Presensi Barcode & QR Code Pintar</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mendukung 2 metode: Scan kamera mandiri di HP masing-masing dan scan Kartu Pelajar di Pos Kiosk Satpam.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'scan' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Scanner Kamera
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Log Presensi Hari Ini ({todayLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'insights' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Insight
          </button>
        </div>
      </div>

      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Scanner & Controls */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
            
            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
              <button
                onClick={() => { setScanMode('self_scan'); stopCamera(); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  scanMode === 'self_scan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4" /> Mode 1: HP Smartphone Mandiri
              </button>
              <button
                onClick={() => { setScanMode('kiosk_card'); stopCamera(); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  scanMode === 'kiosk_card' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" /> Mode 2: Kiosk Tap Kartu Pelajar
              </button>
            </div>

            {/* Attendance Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Tipe Presensi:</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'masuk', label: 'Absen Masuk Pagi', desc: '06:00 - 07:15' },
                  { key: 'pulang', label: 'Absen Pulang', desc: '14:00 - 17:00' },
                  { key: 'mapel', label: 'Per Mata Pelajaran', desc: 'Presensi KBM Kelas' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setAttendanceType(t.key)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      attendanceType === t.key 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 ring-2 ring-emerald-500/20' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{t.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mapel selector if Mapel */}
            {attendanceType === 'mapel' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Mata Pelajaran KBM:</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                >
                  <option value="Matematika Wajib">Matematika Wajib (Drs. Budi Santoso)</option>
                  <option value="Informatika & Coding">Informatika & Coding (Dewi Lestari, M.Kom)</option>
                  <option value="Fisika Peminatan">Fisika Peminatan (Ahmad Fauzi, S.Si)</option>
                  <option value="Bahasa Indonesia">Bahasa Indonesia (Siti Rahmawati, S.Pd)</option>
                </select>
              </div>
            )}

            {/* Scanner Viewport with Real Camera Video Support */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-50 border-2 border-dashed border-emerald-500/30 p-6 text-center flex flex-col items-center justify-center min-h-[260px]">
              
              {isCameraActive ? (
                <div className="w-full max-w-sm space-y-3">
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-emerald-500/50 shadow-xl">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <div className="absolute inset-0 border-2 border-emerald-400/60 rounded-2xl pointer-events-none animate-pulse"></div>
                  </div>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-rose-400 text-xs font-semibold flex items-center gap-1.5 mx-auto"
                  >
                    <VideoOff className="w-3.5 h-3.5" /> Matikan Kamera
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 mb-1">Scanner Kamera & Barcode Reader Siap</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mb-4">
                    {scanMode === 'self_scan' 
                      ? 'Nyalakan kamera ponsel atau gunakan tap cepat di bawah untuk simulasi presensi instan.' 
                      : 'Arahkan Kartu Pelajar ber-barcode siswa ke arah webcam kiosk gerbang.'}
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 mb-4 shadow"
                  >
                    <Video className="w-3.5 h-3.5" /> Nyalakan Kamera Langsung (Webcam/HP)
                  </button>
                </>
              )}

              {/* Quick Preset Buttons for Immediate Testing */}
              <div className="space-y-2 w-full max-w-sm pt-2 border-t border-slate-900">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Simulasi Tap Kartu / Scan Cepat:</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => handleScanSubmit('SISWA-0061234561')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold"
                  >
                    Tap: Aditya Pratama (Siswa)
                  </button>
                  <button
                    onClick={() => handleScanSubmit('SISWA-0061234562')}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[11px] font-semibold"
                  >
                    Tap: Anisa Maharani (Siswa)
                  </button>
                  <button
                    onClick={() => handleScanSubmit('197503122000031001')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold"
                  >
                    Tap: Drs. Budi Santoso (Guru)
                  </button>
                </div>
              </div>

              {/* Input Manual / Barcode Gun Reader */}
              <div className="mt-4 flex gap-2 w-full max-w-sm">
                <input
                  type="text"
                  placeholder="Input Barcode Scanner / NISN / NIP..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
                <button
                  onClick={() => handleScanSubmit()}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-all disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Proses'}
                </button>
              </div>
            </div>

          </div>

          {/* Right Panel: Last Scan Notification & Live Info */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Scan Status Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Hasil Scan Terakhir
              </h3>

              {lastScanResult ? (
                <div className={`p-4 rounded-2xl border space-y-3 animate-in zoom-in-95 duration-150 ${lastScanResult.is_late ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${lastScanResult.is_late ? 'bg-amber-200 text-amber-900' : 'bg-emerald-500/20 text-emerald-700'}`}>
                      {lastScanResult.is_late ? <><AlertTriangle className="w-3 h-3" /> Terlambat - perlu verifikasi</> : 'Presensi Sukses'}
                    </span>
                    <span className="text-xs font-mono text-emerald-700">{lastScanResult.time} WIB</span>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900">{lastScanResult.person_name}</div>
                    <div className="text-xs text-slate-600 capitalize">
                      Status: {lastScanResult.user_type} - {lastScanResult.is_late ? `Hadir (melewati batas ${lateCutoff.slice(0, 5)})` : 'Hadir'}{lastScanResult.type ? ` • ${lastScanResult.type}` : ''}
                    </div>
                  </div>

                  {lastScanResult.parent_phone && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2 text-amber-800">
                      <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Notifikasi otomatis terkirim ke Orang Tua ({lastScanResult.parent_phone})</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  Belum ada presensi yang diproses pada sesi ini. Silakan scan barcode kartu atau klik preset di samping.
                </div>
              )}

              {/* QR Code Kartu Pelajar Saya */}
              {currentRole === 'siswa' && (
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900">Kartu Pelajar Digital Saya:</div>
                  <p className="text-[11px] text-slate-500">Tunjukkan QR Code ini ke petugas satpam atau kamera kiosk untuk absensi.</p>
                  <button
                    disabled={!myQrValue}
                    onClick={() => myQrValue && setQrModalData({
                      open: true,
                      title: 'QR Code Kartu Absensi Siswa',
                      value: myQrValue,
                      subtitle: `${currentUser.name} - NISN ${myIdentifier}`
                    })}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-emerald-700 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <QrCode className="w-4 h-4" /> {myQrValue ? 'Buka QR Code Kartu Saya' : 'QR kartu belum tersedia (belum ada catatan presensi)'}
                  </button>
                </div>
              )}
            </div>

            {/* Rekap Cepat Hari Ini */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ringkasan Presensi Hari Ini</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Siswa Masuk</div>
                  <div className="text-lg font-black text-emerald-600 mt-1">
                    {studentCheckins} Orang
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Guru Masuk</div>
                  <div className="text-lg font-black text-blue-600 mt-1">
                    {teacherCheckins} Orang
                  </div>
                </div>
              </div>
              {lateToday > 0 && (
                <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {lateToday} scan masuk siswa melewati batas {lateCutoff.slice(0, 5)} hari ini
                </p>
              )}
              {logError && <p className="text-[11px] text-rose-600 font-semibold">{logError}</p>}
            </div>

          </div>

        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Log Riwayat Presensi Hari Ini ({filteredLogs.length} dari {todayLogs.length} Data)
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Cari nama / NISN / NIP..."
                    className="pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147]"
                  />
                </div>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                >
                  <option value="semua">Semua Peran</option>
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                </select>
                <button
                  onClick={fetchLogs}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang
                </button>
                <button
                  onClick={() => window.print()}
                  disabled={filteredLogs.length === 0}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Rekap
                </button>
              </div>
            </div>

            {logError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{logError}</div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">Waktu</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Peran</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {todayLogs.length === 0 ? 'Belum ada presensi tercatat hari ini.' : 'Tidak ada log yang cocok dengan pencarian/filter.'}
                      </td>
                    </tr>
                  )}
                  {filteredLogs.map((log) => {
                    const late = isLateLog(log);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className={`py-3 px-4 font-mono ${late ? 'text-amber-700 font-bold' : 'text-emerald-600'}`}>{log.time}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {log.person_name}
                          {log.person_identifier && <div className="text-[10px] font-mono font-normal text-slate-400">{log.person_identifier}</div>}
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px]">{log.user_type}</td>
                        <td className="py-3 px-4 capitalize">{log.type}</td>
                        <td className="py-3 px-4 text-slate-500">{log.subject_name || '-'}</td>
                        <td className="py-3 px-4 text-slate-500">{METHOD_LABELS[log.method] || log.method || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            late ? 'bg-amber-100 text-amber-800' : log.status === 'hadir' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {late ? 'TERLAMBAT' : String(log.status || '-').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {relatedStudentId && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserRoundCheck className="w-4 h-4 text-emerald-600" /> Riwayat Presensi Saya (10 terakhir)
              </h3>
              {myHistory.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada catatan presensi untuk akun ini.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myHistory.map((item) => {
                    const late = isLateLog(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                        <div>
                          <span className="font-mono text-slate-700">{item.date}</span>
                          <span className="mx-2 text-slate-300">•</span>
                          <span className="font-mono text-slate-500">{item.time}</span>
                          <span className="ml-2 capitalize text-slate-600">{item.type}{item.subject_name ? ` (${item.subject_name})` : ''}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${late ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                          {late ? 'TERLAMBAT' : String(item.status || '-').toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rekap cetak: CSS global menyembunyikan seluruh halaman saat print kecuali .printable-area */}
          <div className="printable-area hidden bg-white text-black p-6">
            <h2 className="text-lg font-bold uppercase">Rekap Presensi Harian - SMAN 1 Harapan Bangsa</h2>
            <p className="text-xs">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {filteredLogs.length} catatan{historyTypeFilter !== 'semua' ? ` (${historyTypeFilter})` : ''}{historySearch.trim() ? ` • pencarian "${historySearch.trim()}"` : ''}
            </p>
            <div className="mt-4 text-xs">
              <div className="flex gap-3 py-1 border-b border-black font-bold uppercase">
                <span className="w-20">Waktu</span>
                <span className="flex-1">Nama</span>
                <span className="w-24">Tipe</span>
                <span className="w-36">Mapel</span>
                <span className="w-24">Status</span>
              </div>
              {filteredLogs.map((log) => (
                <div key={`print-${log.id}`} className="flex gap-3 py-1 border-b border-slate-300">
                  <span className="w-20 font-mono">{log.time}</span>
                  <span className="flex-1 font-semibold">{log.person_name} ({log.user_type})</span>
                  <span className="w-24 capitalize">{log.type}</span>
                  <span className="w-36">{log.subject_name || '-'}</span>
                  <span className="w-24 uppercase">{isLateLog(log) ? 'TERLAMBAT' : String(log.status || '-').toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700"><TrendingUp className="h-4 w-4" /> Attendance Intelligence</div><h3 className="mt-1 text-xl font-bold text-slate-900">Pola presensi yang perlu diperiksa</h3><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Insight ini hanya merangkum catatan presensi. Gunakan sebagai bahan verifikasi petugas, bukan kesimpulan tentang kondisi siswa.</p></div>
            <button onClick={fetchIntelligence} disabled={isIntelligenceLoading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-[#002147] transition hover:border-[#002147] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${isIntelligenceLoading ? 'animate-spin' : ''}`} />Perbarui insight</button>
          </div>

          {isIntelligenceLoading && !intelligence ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Menganalisis catatan presensi…</div> : intelligence && <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border-l-4 border-emerald-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Scan siswa hari ini</p><p className="mt-1 text-2xl font-bold text-slate-900">{insightToday.student_checkins ?? 0}<span className="ml-1 text-sm font-medium text-slate-400">/ {insightToday.total_active_students ?? 0}</span></p></div>
              <div className="border-l-4 border-blue-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Scan guru hari ini</p><p className="mt-1 text-2xl font-bold text-slate-900">{insightToday.teacher_checkins ?? 0}</p></div>
              <div className="border-l-4 border-amber-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Scan lewat batas waktu</p><p className="mt-1 text-2xl font-bold text-amber-700">{insightTrend.late_checkins ?? 0}<span className="ml-1 text-sm font-medium text-slate-400">/ {intelligence.window_days ?? 30} hari</span></p></div>
              <div className="border-l-4 border-rose-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Perlu verifikasi</p><p className="mt-1 text-2xl font-bold text-rose-700">{insightTrend.followups ?? 0}</p></div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h4 className="text-sm font-bold text-slate-900">Cakupan scan kelas hari ini</h4><p className="mt-0.5 text-[11px] text-slate-500">Persentase scan masuk yang tercatat, bukan status kehadiran final.</p></div><Calendar className="h-4 w-4 text-emerald-600" /></div><div className="divide-y divide-slate-100">{insightClasses.length ? insightClasses.map((item) => <div key={item.class_name} className="flex items-center gap-4 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{item.class_name}</p><p className="mt-0.5 text-[11px] text-slate-500">{item.checkins} dari {item.students} siswa memiliki scan masuk</p></div><div className="w-28"><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.checkin_coverage}%` }} /></div><p className="mt-1 text-right text-[11px] font-bold text-slate-600">{item.checkin_coverage}%</p></div></div>) : <p className="px-5 py-8 text-center text-sm text-slate-500">Belum ada data kelas aktif.</p>}</div></section>
              <section className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><UserRoundCheck className="h-4 w-4 text-amber-600" /><div><h4 className="text-sm font-bold text-slate-900">Daftar tindak lanjut</h4><p className="mt-0.5 text-[11px] text-slate-500">Berbasis pola log {intelligence.window_days ?? 30} hari terakhir.</p></div></div><div className="max-h-[340px] overflow-y-auto p-3">{insightFollowups.length ? insightFollowups.map((student) => <div key={student.id} className="rounded-xl p-3 hover:bg-slate-50"><p className="text-sm font-bold text-slate-800">{student.name}</p><p className="mt-0.5 text-[11px] font-medium text-slate-500">{student.class_name}</p>{(student.reasons || []).map((reason) => <p key={reason} className="mt-2 flex gap-1.5 text-xs leading-relaxed text-amber-800"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{reason}</p>)}</div>) : <div className="px-4 py-10 text-center"><ShieldCheck className="mx-auto h-6 w-6 text-emerald-600" /><p className="mt-2 text-sm font-semibold text-slate-700">Tidak ada pola yang perlu diverifikasi</p><p className="mt-1 text-xs text-slate-500">Berdasarkan aturan insight saat ini.</p></div>}</div></section>
            </div>
          </>}
        </section>
      )}

      {/* QR Modal for Student Card */}
      <QRModal
        isOpen={qrModalData.open}
        onClose={() => setQrModalData({ ...qrModalData, open: false })}
        title={qrModalData.title}
        value={qrModalData.value}
        subtitle={qrModalData.subtitle}
      />

    </div>
  );
}
