import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  UserCheck, 
  Award, 
  Plus, 
  CheckCircle2, 
  Shield, 
  Compass, 
  Cpu, 
  HeartPulse, 
  BookOpen, 
  Sparkles 
} from 'lucide-react';

export default function ExtracurricularView() {
  const { currentUser, currentRole, showToast } = useAuth();
  const [ekskulList, setEkskulList] = useState([]);
  const [joinModal, setJoinModal] = useState({ open: false, ekskul: null });
  const [studentName, setStudentName] = useState('Aditya Pratama Putra');
  const [studentClass, setStudentClass] = useState('X MIPA 1');
  const [reason, setReason] = useState('Ingin mengasah minat, bakat, dan disiplin diri.');

  const fetchEkskuls = () => {
    fetch('/api/extracurriculars')
      .then(res => res.json())
      .then(data => setEkskulList(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchEkskuls();
  }, []);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinModal.ekskul) return;

    fetch('/api/extracurriculars/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extracurricular_id: joinModal.ekskul.id,
        student_name: studentName,
        class_name: studentClass
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(data.message, 'success');
          setJoinModal({ open: false, ekskul: null });
          fetchEkskuls();
        }
      })
      .catch(() => showToast('Gagal mendaftar ekskul', 'error'));
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'Shield': return <Shield className="w-5 h-5 text-[#f4a024]" />;
      case 'Compass': return <Compass className="w-5 h-5 text-emerald-600" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-blue-600" />;
      case 'HeartPulse': return <HeartPulse className="w-5 h-5 text-rose-600" />;
      case 'Trophy': return <Trophy className="w-5 h-5 text-amber-600" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5 text-teal-600" />;
      default: return <Award className="w-5 h-5 text-[#f4a024]" />;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-[#002147] text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5 text-[#f4a024]" /> Kesiswaan & Pengembangan Diri
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#002147]">Ekstrakurikuler & Prestasi Siswa</h2>
          <p className="text-xs text-slate-500 mt-1">Wadah Pembinaan Minat, Bakat, Karakter Kepemimpinan, dan Kompetisi Juara</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-[#002147] border border-amber-200 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-[#f4a024]" /> 6 Cabang Ekskul Unggulan
          </span>
        </div>
      </div>

      {/* BANNER PRESTASI SEKOLAH */}
      <div className="bg-gradient-to-r from-[#002147] to-[#0a2f5c] text-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="text-xs font-bold text-[#f4a024] uppercase tracking-wider">Hall of Fame Prestasi 2024/2025</div>
          <h3 className="text-lg font-bold text-white">48+ Piala & Medali Kejuaraan Tingkat Kota, Provinsi & Nasional</h3>
          <p className="text-xs text-slate-300 max-w-2xl">
            Siswa didorong untuk berprestasi seimbang antara kemampuan akademik dan non-akademik melalui bimbingan pelatih profesional.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center backdrop-blur-xs border border-white/20">
            <div className="text-xl font-black text-[#f4a024]">100%</div>
            <div className="text-[10px] text-slate-300">Terbina Rutin</div>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center backdrop-blur-xs border border-white/20">
            <div className="text-xl font-black text-[#f4a024]">362</div>
            <div className="text-[10px] text-slate-300">Anggota Aktif</div>
          </div>
        </div>
      </div>

      {/* GRID DAFTAR EKSTRAKURIKULER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ekskulList.map((e) => (
          <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  {getIcon(e.icon_name)}
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#002147]">
                  {e.category}
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#002147] mb-1">{e.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{e.description}</p>

              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">Pembina: <strong>{e.coach_name}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">{e.schedule_day}, {e.schedule_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">{e.location}</span>
                </div>
              </div>

              {e.achievements && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mb-4 font-medium">
                  <Trophy className="w-3.5 h-3.5 text-[#f4a024] shrink-0 mt-0.5" />
                  <span>{e.achievements}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">{e.member_count} Siswa</span>
              </div>
              <button
                onClick={() => setJoinModal({ open: true, ekskul: e })}
                className="px-3.5 py-1.5 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Daftar Ekskul
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PENDAFTARAN EKSKUL */}
      {joinModal.open && joinModal.ekskul && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-[#002147] mb-2">Formulir Pendaftaran Ekstrakurikuler</h3>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4 text-xs">
              <div className="font-bold text-[#002147]">{joinModal.ekskul.name}</div>
              <div className="text-slate-600 text-[11px] mt-0.5">Jadwal: {joinModal.ekskul.schedule_day} ({joinModal.ekskul.schedule_time})</div>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Siswa</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Kelas / Rombel</label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Alasan Bergabung</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows="2"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJoinModal({ open: false, ekskul: null })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] text-white font-semibold"
                >
                  Kirim Pendaftaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
