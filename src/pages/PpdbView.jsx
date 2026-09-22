import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  Printer, 
  Search, 
  Award, 
  FileCheck, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  Trash2, 
  AlertCircle, 
  Eye, 
  RefreshCw, 
  Loader2, 
  Sparkles, 
  X, 
  Phone, 
  MapPin, 
  School, 
  Calendar, 
  User,
  ExternalLink,
  BookOpen,
  HelpCircle
} from 'lucide-react';

export default function PpdbView() {
  const { canAccess, showToast } = useAuth();
  const canManageAdmissions = canAccess('ppdb_admin');
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'admin_list'
  const [ppdbList, setPpdbList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredCard, setRegisteredCard] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Form pendaftaran PPDB
  const [fullName, setFullName] = useState('');
  const [nisn, setNisn] = useState('');
  const [gender, setGender] = useState('Laki-laki');
  const [birthPlaceDate, setBirthPlaceDate] = useState('');
  const [track, setTrack] = useState('rapor');
  const [previousSchool, setPreviousSchool] = useState('');
  const [averageScore, setAverageScore] = useState('88.5');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [address, setAddress] = useState('');

  // Admin filter & search
  const [adminSearch, setAdminSearch] = useState('');
  const [adminTrackFilter, setAdminTrackFilter] = useState('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');

  const loadPpdb = async () => {
    if (!canManageAdmissions) return; // tamu tidak boleh memanggil endpoint privat (akan 401)
    try {
      setLoadingList(true);
      const res = await fetch('/api/ppdb/list');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.message || `HTTP ${res.status}`);
      setPpdbList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading PPDB list:', err);
      showToast('Gagal memuat daftar pendaftar: ' + err.message, 'error');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (canManageAdmissions) {
      loadPpdb();
    } else {
      // Hak akses hilang (misal logout): kosongkan data panitia & kembali ke tab publik
      setPpdbList([]);
      setActiveTab('register');
    }
  }, [canManageAdmissions]);

  const handleResetForm = () => {
    setFullName('');
    setNisn('');
    setGender('Laki-laki');
    setBirthPlaceDate('');
    setTrack('rapor');
    setPreviousSchool('');
    setAverageScore('88.5');
    setParentName('');
    setParentPhone('');
    setAddress('');
  };

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const cleanName = fullName.trim();
    const cleanNisn = nisn.trim();
    const cleanSchool = previousSchool.trim();

    if (!cleanName) {
      return showToast('Harap masukkan Nama Lengkap Calon Siswa', 'error');
    }
    if (!cleanNisn) {
      return showToast('Harap masukkan Nomor Induk Siswa Nasional (NISN)', 'error');
    }
    if (!cleanSchool) {
      return showToast('Harap masukkan Asal Sekolah SMP/MTs', 'error');
    }
    if (!/^\d{10}$/.test(cleanNisn)) {
      return showToast('NISN harus terdiri dari 10 digit angka', 'error');
    }
    const cleanBirth = birthPlaceDate.trim();
    const cleanParentName = parentName.trim();
    const cleanParentPhone = parentPhone.replace(/[^0-9+]/g, '');
    if (!cleanBirth) {
      return showToast('Harap isi Tempat, Tanggal Lahir calon siswa', 'error');
    }
    if (!cleanParentName) {
      return showToast('Harap isi Nama Orang Tua / Wali', 'error');
    }
    if (cleanParentPhone.length < 9) {
      return showToast('Nomor WhatsApp Orang Tua tidak valid (minimal 9 digit)', 'error');
    }

    const cleanScoreNum = Number(String(averageScore).replace(',', '.'));
    if (!Number.isFinite(cleanScoreNum) || cleanScoreNum < 0 || cleanScoreNum > 100) {
      return showToast('Rata-rata nilai rapor harus berupa angka 0 - 100', 'error');
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: cleanName,
        nisn: cleanNisn,
        gender,
        birth_place_date: cleanBirth,
        track,
        previous_school: cleanSchool,
        average_score: cleanScoreNum,
        parent_name: cleanParentName,
        parent_phone: cleanParentPhone,
        address: address.trim() || '-'
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/ppdb/register', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.registration_no) {
        throw new Error(data.message || 'Terjadi kesalahan saat memproses pendaftaran');
      }

      const cardData = {
        regNo: data.registration_no,
        fullName: cleanName,
        nisn: cleanNisn,
        gender,
        track,
        previousSchool: cleanSchool,
        averageScore: cleanScoreNum,
        birthPlaceDate: payload.birth_place_date,
        parentName: payload.parent_name,
        parentPhone: payload.parent_phone,
        address: payload.address,
        registeredAt: new Date().toLocaleString('id-ID')
      };

      setRegisteredCard(cardData);
      setShowSuccessModal(true);
      showToast(data.message || 'Formulir PPDB Berhasil Terkirim!', 'success');
      handleResetForm();
      if (canManageAdmissions) loadPpdb();
    } catch (err) {
      console.error('Registration failed:', err);
      const errMsg = err.name === 'AbortError' 
        ? 'Waktu pendaftaran habis (timeout 8 detik). Pastikan server backend sedang aktif.'
        : (err.message || 'Pastikan server terhubung');
      showToast('Gagal mengirim formulir: ' + errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/ppdb/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mengubah status');
      showToast(data.message || `Status diubah menjadi: ${newStatus.toUpperCase()}`, 'success');
      loadPpdb();
    } catch (err) {
      showToast('Gagal memperbarui status: ' + err.message, 'error');
    }
  };

  const handleDeletePpdb = async (id, studentName) => {
    if (!window.confirm(`Hapus data pendaftaran calon siswa: ${studentName}?`)) return;
    try {
      const res = await fetch(`/api/ppdb/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Gagal menghapus');
      showToast(data.message || 'Data pendaftar berhasil dihapus', 'success');
      loadPpdb();
    } catch (err) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard tidak tersedia');
      await navigator.clipboard.writeText(text);
      showToast(`${label} berhasil disalin ke clipboard!`, 'info');
    } catch {
      showToast(`Tidak dapat menyalin otomatis. ${label}: ${text}`, 'error');
    }
  };

  // Filtered admin list
  const filteredList = ppdbList.filter(item => {
    const query = adminSearch.toLowerCase();
    const matchQuery = !query || 
      item.full_name?.toLowerCase().includes(query) ||
      String(item.nisn ?? '').includes(query) ||
      item.registration_no?.toLowerCase().includes(query) ||
      item.previous_school?.toLowerCase().includes(query);

    const matchTrack = adminTrackFilter === 'all' || item.track === adminTrackFilter;
    const matchStatus = adminStatusFilter === 'all' || item.status === adminStatusFilter;

    return matchQuery && matchTrack && matchStatus;
  });

  const trackLabels = {
    rapor: 'Jalur Nilai Rapor Unggulan',
    prestasi: 'Jalur Prestasi Akademik/Lomba',
    zonasi: 'Jalur Domisili / Zonasi',
    afirmasi: 'Jalur Afirmasi / KIP'
  };

  const statusBadges = {
    menunggu: { bg: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Menunggu Verifikasi' },
    terverifikasi: { bg: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Berkas Terverifikasi' },
    diterima: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'LULUS / DITERIMA' },
    cadangan: { bg: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Cadangan' },
    ditolak: { bg: 'bg-rose-100 text-rose-800 border-rose-300', label: 'Tidak Lulus' }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#002147]/10 border border-[#002147]/20 text-[#002147] text-xs font-semibold uppercase mb-2">
            <UserPlus className="w-3.5 h-3.5 text-[#f4a024]" /> PPDB Online 2025/2026
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#002147]">Penerimaan Peserta Didik Baru Terpadu</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Pendaftaran calon siswa baru, seleksi jalur zonasi/prestasi/afirmasi/rapor, dan cetak kartu tanda bukti registrasi.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'register' ? 'bg-[#002147] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-[#f4a024]" /> Form Pendaftaran
          </button>
          {canManageAdmissions && (
            <button
              onClick={() => setActiveTab('admin_list')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'admin_list' ? 'bg-[#002147] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-[#f4a024]" /> Verifikasi Panitia ({ppdbList.length})
            </button>
          )}
        </div>
      </div>

      {/* FORM PENDAFTARAN TAB */}
      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Form */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#f4a024]" /> Formulir Registrasi Calon Siswa Baru
              </h3>
              <span className="text-xs text-slate-400 font-medium">* Kolom bertanda wajib diisi</span>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Calon Siswa: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama sesuai akta kelahiran..."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Induk Siswa Nasional (NISN): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="10 digit NISN..."
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin:</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jalur Pendaftaran:</label>
                  <select
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                  >
                    <option value="rapor">Jalur Nilai Rapor Unggulan</option>
                    <option value="prestasi">Jalur Prestasi Akademik/Lomba</option>
                    <option value="zonasi">Jalur Domisili / Zonasi</option>
                    <option value="afirmasi">Jalur Afirmasi / KIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rata-Rata Nilai Rapor SMP:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={averageScore}
                    onChange={(e) => setAverageScore(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asal Sekolah SMP/MTs: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SMP Negeri 1 Bangkalan"
                    value={previousSchool}
                    onChange={(e) => setPreviousSchool(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat, Tanggal Lahir: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bangkalan, 13 Maret 2008"
                    value={birthPlaceDate}
                    onChange={(e) => setBirthPlaceDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Orang Tua / Wali: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama ayah / ibu..."
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp Orang Tua: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    inputMode="tel"
                    placeholder="0838..."
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap Tempat Tinggal:</label>
                <textarea
                  rows={2}
                  placeholder="Jl. Raya / Dusun / Desa, RT/RW, Kecamatan, Kabupaten..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 transition-all font-medium"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3.5 rounded-xl bg-[#002147] hover:bg-[#002e62] active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-[#002147]/20 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isSubmitting ? 'opacity-80 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#f4a024] animate-spin" /> Sedang Mengirim Formulir...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-[#f4a024]" /> Kirim Formulir Pendaftaran PPDB
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-all"
                  title="Kosongkan formulir"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Right Info / Card Preview */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Bukti Pendaftaran Card (If generated) */}
            {registeredCard && (
              <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pendaftaran Berhasil
                  </span>
                  <button 
                    onClick={() => copyToClipboard(registeredCard.regNo, 'Nomor Registrasi')}
                    className="text-xs font-mono font-bold text-[#002147] hover:text-[#f4a024] flex items-center gap-1"
                    title="Salin No Registrasi"
                  >
                    {registeredCard.regNo} <Copy className="w-3 h-3" />
                  </button>
                </div>

                <div>
                  <div className="text-lg font-black text-slate-900">{registeredCard.fullName}</div>
                  <div className="text-xs text-slate-500 font-mono">NISN: {registeredCard.nisn}</div>
                  <div className="text-xs text-[#002147] font-semibold mt-1 uppercase flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#f4a024]" /> {trackLabels[registeredCard.track] || registeredCard.track}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <div>Asal Sekolah: <strong className="text-slate-800">{registeredCard.previousSchool}</strong></div>
                  <div>Rata-Rata Nilai: <strong className="text-emerald-600 font-mono">{registeredCard.averageScore}</strong></div>
                  <div>Status: <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Menunggu Verifikasi Berkas</span></div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSuccessModal(true)}
                    className="flex-1 py-2.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#f4a024]" /> Lihat Kartu Bukti
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    title="Cetak langsung"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak
                  </button>
                </div>
              </div>
            )}

            {/* Tahapan Alur PPDB */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#002147] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#f4a024]" /> Tahapan Alur PPDB 2025/2026
              </h4>
              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002147] text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>Isi formulir pendaftaran online secara lengkap & valid.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002147] text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span>Dapatkan Nomor Registrasi dan simpan/cetak kartu bukti pendaftaran.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002147] text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <span>Bawa dokumen fisik asli (Ijazah/SKL, Rapor, KK, Akta) ke ruang panitia.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002147] text-white flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                  <span>Pantau pengumuman hasil seleksi kelulusan di portal ini.</span>
                </div>
              </div>
            </div>

            {/* Bantuan / Help Box */}
            <div className="bg-gradient-to-br from-[#002147] to-[#003875] text-white rounded-3xl p-6 space-y-3 shadow-md">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#f4a024]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#f4a024]">Pusat Informasi & Bantuan</h4>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                Mengalami kendala dalam pengisian formulir atau NISN? Hubungi Tim Panitia PPDB melalui WhatsApp atau telepon panitia.
              </p>
              <div className="pt-2 text-xs space-y-1.5 font-medium text-slate-100">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#f4a024]" /> WhatsApp: <strong>0812-3456-7890</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#f4a024]" /> Jam Layanan: <strong>08.00 - 15.00 WIB</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VERIFIKASI ADMIN TAB (hanya panitia yang berhak) */}
      {activeTab === 'admin_list' && canManageAdmissions && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#f4a024]" /> Verifikasi Data Calon Siswa Baru ({filteredList.length} dari {ppdbList.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Kelola verifikasi berkas dan pengumuman status kelulusan peserta.</p>
            </div>
            <button
              onClick={loadPpdb}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} /> Muat Ulang
            </button>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari nama, NISN, No. Registrasi..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:bg-white transition-all font-medium"
              />
            </div>
            <div>
              <select
                value={adminTrackFilter}
                onChange={(e) => setAdminTrackFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#002147] focus:bg-white transition-all font-medium"
              >
                <option value="all">Semua Jalur Pendaftaran</option>
                <option value="rapor">Jalur Rapor</option>
                <option value="prestasi">Jalur Prestasi</option>
                <option value="zonasi">Jalur Zonasi</option>
                <option value="afirmasi">Jalur Afirmasi</option>
              </select>
            </div>
            <div>
              <select
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#002147] focus:bg-white transition-all font-medium"
              >
                <option value="all">Semua Status Seleksi</option>
                <option value="menunggu">Menunggu Verifikasi</option>
                <option value="terverifikasi">Berkas Terverifikasi</option>
                <option value="diterima">Lulus / Diterima</option>
                <option value="cadangan">Cadangan</option>
                <option value="ditolak">Tidak Lulus</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#002147] text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">No. Registrasi</th>
                  <th className="py-3 px-4">Nama Calon Siswa</th>
                  <th className="py-3 px-4">NISN</th>
                  <th className="py-3 px-4">Jalur</th>
                  <th className="py-3 px-4">Asal SMP</th>
                  <th className="py-3 px-4">Nilai</th>
                  <th className="py-3 px-4">Status Seleksi</th>
                  <th className="py-3 px-4 text-center">Tindakan Panitia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada data calon siswa yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((p) => {
                    const badge = statusBadges[p.status] || { bg: 'bg-slate-100 text-slate-700 border-slate-300', label: p.status };
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[#002147] font-bold whitespace-nowrap">
                          {p.registration_no}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {p.full_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{p.nisn}</td>
                        <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-700 whitespace-nowrap">
                          {p.track}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.previous_school}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600 font-mono">{p.average_score}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center gap-1.5 justify-center">
                            <button
                              onClick={() => setSelectedDetail(p)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                              title="Lihat Detail Biodata"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'terverifikasi')}
                              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                              title="Set Verifikasi Berkas Fisik"
                            >
                              Verif
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'diterima')}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                              title="Luluskan Siswa"
                            >
                              Lulus
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'cadangan')}
                              className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold"
                              title="Jadikan Cadangan"
                            >
                              Cadangan
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'ditolak')}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                              title="Tolak / Tidak Lulus"
                            >
                              Tolak
                            </button>
                            <button
                              onClick={() => handleDeletePpdb(p.id, p.full_name)}
                              className="p-1 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* POPUP MODAL BUKTI PENDAFTARAN (SUCCESS MODAL) */}
      {showSuccessModal && registeredCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Modal */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#002147]">
                Pendaftaran PPDB Berhasil Terkirim!
              </h3>
              <p className="text-xs text-slate-500">
                Simpan atau cetak kartu tanda bukti ini untuk ditunjukkan saat verifikasi berkas di sekolah.
              </p>
            </div>

            {/* Visual Card Proof */}
            <div className="bg-gradient-to-b from-[#002147] to-[#002e62] text-white rounded-2xl p-5 space-y-4 shadow-lg border border-[#002147]/50 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#f4a024]/10 blur-xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f4a024] text-[#002147] flex items-center justify-center font-black text-xs shadow-sm">
                    HB
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white">SMAN 1 HARAPAN BANGSA</div>
                    <div className="text-[10px] text-slate-300">KARTU BUKTI PENDAFTARAN PPDB 2025</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  DITERIMA SISTEM
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2 rounded-xl shrink-0 shadow-md">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(registeredCard.regNo)}`}
                    alt="QR Code Registrasi"
                    className="w-20 h-20"
                  />
                </div>

                <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                  <div className="text-[11px] text-[#f4a024] font-semibold uppercase tracking-wider">Nomor Registrasi Resmi:</div>
                  <div className="text-base font-black font-mono tracking-wide text-white flex items-center justify-center sm:justify-start gap-1.5">
                    {registeredCard.regNo}
                    <button 
                      onClick={() => copyToClipboard(registeredCard.regNo, 'Nomor Registrasi')}
                      className="text-slate-300 hover:text-white"
                      title="Salin"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-sm font-bold text-slate-100 truncate">{registeredCard.fullName}</div>
                  <div className="text-xs text-slate-300 font-mono">NISN: {registeredCard.nisn}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/5 rounded-xl p-3 border border-white/10">
                <div>
                  <span className="text-slate-300 block text-[10px]">Jalur:</span>
                  <strong className="text-[#f4a024] uppercase">{registeredCard.track}</strong>
                </div>
                <div>
                  <span className="text-slate-300 block text-[10px]">Nilai Rata-Rata:</span>
                  <strong className="text-emerald-300 font-mono">{registeredCard.averageScore}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-300 block text-[10px]">Asal SMP/MTs:</span>
                  <strong className="text-white truncate block">{registeredCard.previousSchool}</strong>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak / Simpan PDF Kartu Bukti Registrasi
              </button>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  handleResetForm();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#f4a024]" /> Daftarkan Calon Siswa Baru Lainnya
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DETAIL MODAL UNTUK PANITIA */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setSelectedDetail(null)}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#002147]/10 text-[#002147] flex items-center justify-center font-bold">
                <User className="w-5 h-5 text-[#f4a024]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#002147]">{selectedDetail.full_name}</h4>
                <p className="text-xs font-mono text-slate-500">{selectedDetail.registration_no} | NISN: {selectedDetail.nisn}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>Jenis Kelamin: <strong>{selectedDetail.gender}</strong></div>
                <div>Jalur: <strong className="uppercase">{selectedDetail.track}</strong></div>
                <div>Nilai Rata-Rata: <strong className="text-emerald-600">{selectedDetail.average_score}</strong></div>
                <div>Asal SMP: <strong>{selectedDetail.previous_school}</strong></div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>Tempat, Tanggal Lahir: <strong>{selectedDetail.birth_place_date || '-'}</strong></div>
                <div>Nama Orang Tua / Wali: <strong>{selectedDetail.parent_name || '-'}</strong></div>
                <div>Nomor WhatsApp: <strong>{selectedDetail.parent_phone || '-'}</strong></div>
                <div>Alamat Lengkap: <strong>{selectedDetail.address || '-'}</strong></div>
                <div>Waktu Mendaftar: <strong>{selectedDetail.registered_at}</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Official Card (Always ready for window.print()) */}
      {registeredCard && (
        <div className="printable-area hidden p-8 max-w-lg mx-auto bg-white text-black border-2 border-black rounded-xl">
          <div className="text-center pb-3 border-b-2 border-black">
            <h3 className="text-xs font-black uppercase tracking-wider">PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB)</h3>
            <h2 className="text-base font-black uppercase">SMAN 1 HARAPAN BANGSA</h2>
            <p className="text-[10px]">Jl. Pendidikan No. 45 Jakarta Selatan • Telp: (021) 7890-1234 • NPSN: 20108921</p>
            <h4 className="text-xs font-bold underline mt-2 uppercase">KARTU TANDA BUKTI PENDAFTARAN RESMI</h4>
          </div>

          <div className="py-4 space-y-2 text-xs">
            <div className="flex justify-between border-b border-dashed border-gray-400 pb-1">
              <span>Nomor Registrasi Resmi:</span>
              <span className="font-mono font-black text-sm">{registeredCard.regNo}</span>
            </div>
            <div className="flex justify-between">
              <span>Nama Lengkap:</span>
              <span className="font-bold">{registeredCard.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span>NISN:</span>
              <span className="font-mono">{registeredCard.nisn}</span>
            </div>
            <div className="flex justify-between">
              <span>Jenis Kelamin:</span>
              <span>{registeredCard.gender}</span>
            </div>
            <div className="flex justify-between">
              <span>Jalur Seleksi:</span>
              <span className="uppercase font-bold">{trackLabels[registeredCard.track] || registeredCard.track}</span>
            </div>
            <div className="flex justify-between">
              <span>Asal Sekolah SMP/MTs:</span>
              <span>{registeredCard.previousSchool}</span>
            </div>
            <div className="flex justify-between">
              <span>Rata-Rata Nilai Rapor:</span>
              <span className="font-bold">{registeredCard.averageScore}</span>
            </div>
            <div className="flex justify-between">
              <span>Tempat, Tanggal Lahir:</span>
              <span>{registeredCard.birthPlaceDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Nama Orang Tua / Wali:</span>
              <span>{registeredCard.parentName}</span>
            </div>
            <div className="flex justify-between">
              <span>No. WhatsApp Orang Tua:</span>
              <span>{registeredCard.parentPhone}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu Pendaftaran:</span>
              <span>{registeredCard.registeredAt}</span>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-black text-center text-[10px] space-y-1">
            <p className="font-bold">PERHATIAN PENTING BAGI CALON SISWA:</p>
            <p>1. Simpan dan cetak kartu bukti pendaftaran ini dengan baik.</p>
            <p>2. Bawalah kartu ini beserta dokumen asli (SKL/Ijazah, Rapor, Akta, KK) saat verifikasi fisik di SMAN 1 Harapan Bangsa.</p>
            <p>3. Informasi jadwal pengumuman seleksi dapat dilihat melalui portal resmi sekolah.</p>
          </div>
        </div>
      )}

    </div>
  );
}
