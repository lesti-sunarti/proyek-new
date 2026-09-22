import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  MessagesSquare, 
  UserCheck, 
  Calendar, 
  Clock, 
  Plus, 
  ShieldCheck, 
  HeartHandshake, 
  Compass, 
  GraduationCap, 
  CheckCircle2,
  FileText,
  MapPin
} from 'lucide-react';

const DEFAULT_COUNSELOR = 'Rina Marlina, S.Psi';

// Tanggal lokal (bukan UTC) agar konsisten dengan tanggal "hari ini" di server.
const toLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Pola fetch standar: lempar Error berisi pesan server untuk respons non-OK.
const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan');
  return data;
};

export default function CounselingView() {
  const { currentUser, currentRole, canAccess, showToast } = useAuth();
  const isStudentAccount = currentRole === 'siswa' || currentRole === 'ortu';
  // Daftar siswa dari Buku Induk hanya untuk peran yang berhak (kepala_bk/kepsek/admin); guru_walikelas mengisi manual.
  const canListStudents = canAccess('buku_induk');
  // Konselor: akun BK memakai namanya sendiri; peran lain mencatat atas nama guru BK.
  const counselorName = currentRole === 'kepala_bk' ? currentUser.name : DEFAULT_COUNSELOR;
  const [sessions, setSessions] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Booking (identitas siswa tidak lagi ditulis tetap)
  const [studentId, setStudentId] = useState(() => String(currentUser.related_student_id || (isStudentAccount ? '' : 1)));
  const [studentName, setStudentName] = useState(currentRole === 'siswa' ? currentUser.name : '');
  const [className, setClassName] = useState('');
  const [category, setCategory] = useState('karir');
  const [topic, setTopic] = useState('');
  const [sessionDate, setSessionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return toLocalDateString(d);
  });
  const [sessionTime, setSessionTime] = useState('09:30');
  const [notes, setNotes] = useState('');

  const fetchSessions = () => {
    fetchJson('/api/counseling/sessions')
      .then(data => { setSessions(Array.isArray(data) ? data : []); setLoadError(''); })
      .catch(err => { setSessions([]); setLoadError(err.message || 'Data sesi konseling tidak dapat dimuat.'); });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const loadStudents = () => {
    if (!canListStudents || studentsLoaded) return;
    fetchJson('/api/master/students')
      .then(data => setStudents(Array.isArray(data) ? data.filter(s => String(s.status || 'aktif').toLowerCase() === 'aktif') : []))
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoaded(true));
  };

  const openModal = () => {
    setShowModal(true);
    loadStudents();
  };

  const handleStudentPick = (value) => {
    setStudentId(value);
    const student = students.find(s => String(s.id) === String(value));
    if (student) {
      setStudentName(student.name);
      setClassName(student.class_name || '');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const cleanTopic = topic.trim();
    const cleanName = studentName.trim();
    const cleanClass = className.trim();
    const numericStudentId = Number(studentId);
    if (!cleanTopic) return showToast('Topik konsultasi wajib diisi.', 'error');
    if (!cleanName || !cleanClass) return showToast('Nama siswa dan kelas wajib diisi.', 'error');
    if (!Number.isInteger(numericStudentId) || numericStudentId < 1) return showToast('Pilih siswa atau isi ID siswa (Buku Induk) yang valid.', 'error');
    if (!sessionDate || sessionDate < toLocalDateString()) return showToast('Tanggal sesi tidak boleh sebelum hari ini.', 'error');

    setIsSubmitting(true);
    try {
      const data = await fetchJson('/api/counseling/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: numericStudentId,
          student_name: cleanName,
          class_name: cleanClass,
          counselor_name: counselorName,
          session_date: sessionDate,
          session_time: sessionTime,
          category,
          topic: cleanTopic,
          notes: notes.trim()
        })
      });
      showToast(data.message || 'Jadwal konseling berhasil diajukan.', 'success');
      setShowModal(false);
      setTopic('');
      setNotes('');
      fetchSessions();
    } catch (err) {
      showToast(err.message || 'Gagal mengajukan jadwal konseling', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scheduledCount = sessions.filter(s => s.status === 'dijadwalkan').length;

  return (
    <div className="space-y-6 pb-16">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-[#002147] text-xs font-bold uppercase tracking-wider mb-2">
            <MessagesSquare className="w-3.5 h-3.5 text-[#f4a024]" /> Layanan Kesiswaan & Konseling
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#002147]">Bimbingan & Konseling Online (BK)</h2>
          <p className="text-xs text-slate-500 mt-1">Konsultasi Privat Masalah Belajar, Minat Bakat, Perguruan Tinggi, dan Bimbingan Pribadi</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[#f4a024]" /> Ajukan Jadwal Konsultasi
          </button>
        </div>
      </div>

      {/* JAMINAN KERAHASIAAN & PROFIL GURU BK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1 bg-gradient-to-br from-[#002147] to-[#0a2f5c] text-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#f4a024] uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-[#f4a024]" /> Asas Kerahasiaan Konseling
            </div>
            <h3 className="text-base font-bold text-white mb-2">Aman, Terpercaya, & Solutif</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Setiap sesi konseling antara siswa, orang tua, dan konselor dilindungi oleh kode etik profesi bimbingan konseling. Semua cerita dan privasi Anda tersimpan aman.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/20 text-xs text-slate-300">
            <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#f4a024]" /> Ruang BK Lantai 2 Gedung Utama</div>
            <div className="mt-1 text-[#f4a024] font-semibold">Konselor: {counselorName}</div>
          </div>
        </div>

        {/* 4 Pilar Konseling */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#002147]">Konseling Akademik</h4>
              <p className="text-[11px] text-slate-500 mt-1">Kesulitan belajar, strategi menyerap materi, dan motivasi berprestasi.</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-[#f4a024]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#002147]">Bimbingan Karir & Kuliah</h4>
              <p className="text-[11px] text-slate-500 mt-1">Pemilihan jurusan PTN (SNBP/SNBT), beasiswa, dan dunia industri.</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#002147]">Konseling Pribadi</h4>
              <p className="text-[11px] text-slate-500 mt-1">Pengelolaan stres, regulasi emosi, kepercayaan diri, dan kesehatan mental.</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#002147]">Konseling Sosial</h4>
              <p className="text-[11px] text-slate-500 mt-1">Adaptasi pertemanan sebaya, komunikasi keluarga, dan resolusi konflik.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIWAYAT SESI KONSELING */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#002147] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#f4a024]" /> Jadwal & Catatan Sesi Bimbingan Siswa
          </h3>
          <span className="text-xs text-slate-500 font-medium">Total: {sessions.length} Sesi • {scheduledCount} Dijadwalkan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#002147] text-white text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Peserta Didik</th>
                <th className="py-3 px-3 text-center">Kategori</th>
                <th className="py-3 px-4">Topik Konsultasi</th>
                <th className="py-3 px-3 text-center">Waktu Temu</th>
                <th className="py-3 px-3 text-center">Konselor</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Catatan Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">{loadError || 'Belum ada sesi konseling terdaftar.'}</td>
                </tr>
              )}
              {sessions.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#002147]">{s.student_name}</div>
                    <div className="text-[10px] text-slate-400">{s.class_name}</div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-[#002147]">
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{s.topic}</td>
                  <td className="py-3.5 px-3 text-center font-mono text-[11px]">
                    <div>{s.session_date}</div>
                    <div className="text-[10px] text-slate-400">{s.session_time} WIB</div>
                  </td>
                  <td className="py-3.5 px-3 text-center font-medium text-slate-700">{s.counselor_name}</td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.status === 'selesai' ? 'bg-emerald-100 text-emerald-800' : s.status === 'dibatalkan' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] text-slate-600 italic">
                    {s.notes || 'Menunggu pelaksanaan sesi temu'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PENGAJUAN KONSELING */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-[#002147] mb-3">Pengajuan Jadwal Konseling Privat</h3>
            <form onSubmit={handleBookingSubmit} className="space-y-3 text-xs">
              {canListStudents && students.length > 0 ? (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Peserta Didik</label>
                  <select
                    value={studentId}
                    onChange={(e) => handleStudentPick(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                    required
                  >
                    <option value="">-- Pilih siswa dari Buku Induk --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.class_name ? ` — ${s.class_name}` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nama Siswa</label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      readOnly={currentRole === 'siswa'}
                      placeholder="Nama lengkap siswa"
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 read-only:bg-slate-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Kelas</label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="Contoh: X MIPA 1"
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                      required
                    />
                  </div>
                  {!isStudentAccount && (
                    <div className="col-span-2">
                      <label className="block text-slate-600 font-semibold mb-1">ID Siswa (Buku Induk)</label>
                      <input
                        type="number"
                        min="1"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {canListStudents && !studentsLoaded ? 'Memuat daftar siswa Buku Induk…' : 'Daftar siswa Buku Induk tidak tersedia untuk peran Anda; isi ID siswa secara manual.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Bidang Layanan</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="karir">Bimbingan Karir & Perguruan Tinggi</option>
                  <option value="akademik">Konseling Akademik / Kesulitan Belajar</option>
                  <option value="pribadi">Konseling Pribadi & Motivasi Diri</option>
                  <option value="sosial">Konseling Sosial & Adaptasi Lingkungan</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Topik / Masalah yang Ingin Dikonsultasikan</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Contoh: Konsultasi pemilihan jurusan kuliah teknik informatika"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Rencana Tanggal</label>
                  <input
                    type="date"
                    value={sessionDate}
                    min={toLocalDateString()}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Pilihan Jam</label>
                  <select
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="08:30">08:30 WIB (Pagi)</option>
                    <option value="09:30">09:30 WIB (Pagi)</option>
                    <option value="11:00">11:00 WIB (Siang)</option>
                    <option value="13:30">13:30 WIB (Siang)</option>
                    <option value="15:00">15:00 WIB (Sore)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ceritakan latar belakang singkat masalah Anda..."
                  rows="2"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] disabled:opacity-50 text-white font-semibold"
                >
                  {isSubmitting ? 'Mengirim...' : 'Ajukan Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
