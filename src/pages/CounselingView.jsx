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
  FileText
} from 'lucide-react';

export default function CounselingView() {
  const { currentUser, currentRole, showToast } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Form Booking
  const [category, setCategory] = useState('karir');
  const [topic, setTopic] = useState('');
  const [sessionDate, setSessionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [sessionTime, setSessionTime] = useState('09:30');
  const [notes, setNotes] = useState('');

  const fetchSessions = () => {
    fetch('/api/counseling/sessions')
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    fetch('/api/counseling/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: 1,
        student_name: 'Aditya Pratama Putra',
        class_name: 'X MIPA 1',
        counselor_name: 'Rina Marlina, S.Psi',
        session_date: sessionDate,
        session_time: sessionTime,
        category,
        topic,
        notes
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(data.message, 'success');
          setShowModal(false);
          setTopic('');
          setNotes('');
          fetchSessions();
        }
      })
      .catch(() => showToast('Gagal mengajukan jadwal konseling', 'error'));
  };

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
            onClick={() => setShowModal(true)}
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
            <div>?? Ruang BK Lantai 2 Gedung Utama</div>
            <div className="mt-1 text-[#f4a024] font-semibold">Konselor: Rina Marlina, S.Psi</div>
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
          <span className="text-xs text-slate-500 font-medium">Total: {sessions.length} Sesi Terdaftar</span>
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
                      s.status === 'selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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
                  className="px-4 py-1.5 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] text-white font-semibold"
                >
                  Ajukan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
