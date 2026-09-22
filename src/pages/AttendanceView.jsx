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
  UserRoundCheck
} from 'lucide-react';
import QRModal from '../components/QRModal';

export default function AttendanceView() {
  const { currentUser, currentRole, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' or 'history'
  const [scanMode, setScanMode] = useState('self_scan'); // 'self_scan' or 'kiosk_card'
  const [attendanceType, setAttendanceType] = useState('masuk'); // 'masuk', 'pulang', 'mapel'
  const [selectedSubject, setSelectedSubject] = useState('Matematika Wajib');
  const [manualCode, setManualCode] = useState('');
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [qrModalData, setQrModalData] = useState({ open: false, title: '', value: '', subtitle: '' });
  const [intelligence, setIntelligence] = useState(null);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);

  // Real Camera Webcam State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fetchLogs = () => {
    fetch('/api/attendance/today')
      .then(res => res.json())
      .then(data => setTodayLogs(data))
      .catch(() => {});
  };

  const fetchIntelligence = () => {
    setIsIntelligenceLoading(true);
    fetch('/api/attendance/intelligence?days=30')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Insight presensi belum dapat dimuat.');
        return data;
      })
      .then(setIntelligence)
      .catch((error) => showToast(error.message, 'error'))
      .finally(() => setIsIntelligenceLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    fetchIntelligence();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: scanMode === 'self_scan' ? 'user' : 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraActive(true);
        showToast('Kamera aktif. Arahkan QR Code atau Barcode ke area fokus.', 'info');
      } else {
        showToast('Browser ini tidak mendukung akses kamera langsung. Gunakan input barcode/preset.', 'error');
      }
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
    setIsCameraActive(false);
  };

  const handleScanSubmit = (codeToScan) => {
    const code = codeToScan || manualCode;
    if (!code.trim()) {
      showToast('Masukkan barcode/QR atau NISN/NIP terlebih dahulu!', 'error');
      return;
    }

    setLoading(true);
    fetch('/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qr_string: code.trim(),
        type: attendanceType,
        method: scanMode,
        subject_name: attendanceType === 'mapel' ? selectedSubject : null,
        notes: `Absensi ${attendanceType} via ${scanMode === 'self_scan' ? 'HP Smartphone' : 'Mesin Kiosk Gerbang'}`
      })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.success) {
          showToast(data.message, 'success');
          setLastScanResult(data.record);
          setManualCode('');
          fetchLogs();
          fetchIntelligence();
        } else {
          showToast(data.message || 'Gagal memproses absensi', 'error');
        }
      })
      .catch(() => {
        setLoading(false);
        showToast('Koneksi server gagal', 'error');
      });
  };

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
                  scanMode === 'self_scan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" /> Mode 1: HP Smartphone Mandiri
              </button>
              <button
                onClick={() => { setScanMode('kiosk_card'); stopCamera(); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  scanMode === 'kiosk_card' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-white'
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
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Presensi Sukses
                    </span>
                    <span className="text-xs font-mono text-emerald-300">{lastScanResult.time} WIB</span>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900">{lastScanResult.person_name}</div>
                    <div className="text-xs text-slate-600 capitalize">Status: {lastScanResult.user_type} - Hadir</div>
                  </div>

                  {lastScanResult.parent_phone && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2 text-amber-300">
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
                    onClick={() => setQrModalData({
                      open: true,
                      title: 'QR Code Kartu Absensi Siswa',
                      value: 'SISWA-0061234561',
                      subtitle: 'Aditya Pratama Putra - X MIPA 1'
                    })}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" /> Buka QR Code Kartu Saya
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
                  <div className="text-lg font-black text-emerald-400 mt-1">
                    {todayLogs.filter(l => l.user_type === 'siswa').length} Orang
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Guru Masuk</div>
                  <div className="text-lg font-black text-blue-400 mt-1">
                    {todayLogs.filter(l => l.user_type === 'guru').length} Orang
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Log Riwayat Presensi Hari Ini ({todayLogs.length} Data)
            </h3>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Rekap
            </button>
          </div>

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
                {todayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-emerald-400">{log.time}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{log.person_name}</td>
                    <td className="py-3 px-4 uppercase text-[10px]">{log.user_type}</td>
                    <td className="py-3 px-4 capitalize">{log.type}</td>
                    <td className="py-3 px-4 text-slate-500">{log.subject_name || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{log.method === 'self_scan' ? '📱 HP Mandiri' : '💳 Kiosk Kartu'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <div className="border-l-4 border-emerald-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Scan siswa hari ini</p><p className="mt-1 text-2xl font-bold text-slate-900">{intelligence.today.student_checkins}<span className="ml-1 text-sm font-medium text-slate-400">/ {intelligence.today.total_active_students}</span></p></div>
              <div className="border-l-4 border-blue-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Scan guru hari ini</p><p className="mt-1 text-2xl font-bold text-slate-900">{intelligence.today.teacher_checkins}</p></div>
              <div className="border-l-4 border-amber-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Scan lewat batas waktu</p><p className="mt-1 text-2xl font-bold text-amber-700">{intelligence.trend.late_checkins}<span className="ml-1 text-sm font-medium text-slate-400">/ {intelligence.window_days} hari</span></p></div>
              <div className="border-l-4 border-rose-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Perlu verifikasi</p><p className="mt-1 text-2xl font-bold text-rose-700">{intelligence.trend.followups}</p></div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h4 className="text-sm font-bold text-slate-900">Cakupan scan kelas hari ini</h4><p className="mt-0.5 text-[11px] text-slate-500">Persentase scan masuk yang tercatat, bukan status kehadiran final.</p></div><Calendar className="h-4 w-4 text-emerald-600" /></div><div className="divide-y divide-slate-100">{intelligence.classes.length ? intelligence.classes.map((item) => <div key={item.class_name} className="flex items-center gap-4 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{item.class_name}</p><p className="mt-0.5 text-[11px] text-slate-500">{item.checkins} dari {item.students} siswa memiliki scan masuk</p></div><div className="w-28"><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.checkin_coverage}%` }} /></div><p className="mt-1 text-right text-[11px] font-bold text-slate-600">{item.checkin_coverage}%</p></div></div>) : <p className="px-5 py-8 text-center text-sm text-slate-500">Belum ada data kelas aktif.</p>}</div></section>
              <section className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><UserRoundCheck className="h-4 w-4 text-amber-600" /><div><h4 className="text-sm font-bold text-slate-900">Daftar tindak lanjut</h4><p className="mt-0.5 text-[11px] text-slate-500">Berbasis pola log {intelligence.window_days} hari terakhir.</p></div></div><div className="max-h-[340px] overflow-y-auto p-3">{intelligence.followups.length ? intelligence.followups.map((student) => <div key={student.id} className="rounded-xl p-3 hover:bg-slate-50"><p className="text-sm font-bold text-slate-800">{student.name}</p><p className="mt-0.5 text-[11px] font-medium text-slate-500">{student.class_name}</p>{student.reasons.map((reason) => <p key={reason} className="mt-2 flex gap-1.5 text-xs leading-relaxed text-amber-800"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{reason}</p>)}</div>) : <div className="px-4 py-10 text-center"><ShieldCheck className="mx-auto h-6 w-6 text-emerald-600" /><p className="mt-2 text-sm font-semibold text-slate-700">Tidak ada pola yang perlu diverifikasi</p><p className="mt-1 text-xs text-slate-500">Berdasarkan aturan insight saat ini.</p></div>}</div></section>
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
