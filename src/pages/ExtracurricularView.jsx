import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  UserCheck, 
  Award, 
  Shield, 
  Compass, 
  Cpu, 
  HeartPulse, 
  BookOpen, 
  Sparkles 
} from 'lucide-react';

export default function ExtracurricularView() {
  const { currentUser, showToast } = useAuth();
  const [ekskulList, setEkskulList] = useState([]);
  const [joinModal, setJoinModal] = useState({ open: false, ekskul: null });
  const [studentName, setStudentName] = useState(currentUser?.name || '');
  const [studentClass, setStudentClass] = useState('');
  const [reason, setReason] = useState('Ingin mengasah minat, bakat, dan disiplin diri.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nama pendaftar mengikuti akun yang sedang login (bukan nama demo statis) dan tetap dapat diubah.
  useEffect(() => {
    setStudentName(currentUser?.name || '');
  }, [currentUser?.name]);

  const fetchEkskuls = () => {
    fetch('/api/extracurriculars')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.message || 'Daftar ekstrakurikuler belum dapat dimuat.');
        setEkskulList(Array.isArray(data) ? data : []);
      })
      .catch((error) => { setEkskulList([]); showToast(error.message, 'error'); });
  };

  useEffect(() => {
    fetchEkskuls();
  }, []);

  const totalMembers = ekskulList.reduce((sum, item) => sum + (Number(item.member_count) || 0), 0);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinModal.ekskul) return;
    if (!studentName.trim() || !studentClass.trim()) return showToast('Nama siswa dan kelas wajib diisi', 'error');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/extracurriculars/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracurricular_id: joinModal.ekskul.id,
          student_name: studentName.trim(),
          class_name: studentClass.trim(),
          reason: reason.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal mendaftar ekskul');
      showToast(data.message || 'Pendaftaran ekstrakurikuler berhasil', 'success');
      setJoinModal({ open: false, ekskul: null });
      fetchEkskuls();
    } catch (error) {
      showToast(error.message || 'Gagal mendaftar ekskul', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
            <Sparkles className="w-4 h-4 text-[#f4a024]" /> {ekskulList.length} Cabang Ekskul Unggulan
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
            <div className="text-xl font-black text-[#f4a024]">{totalMembers.toLocaleString('id-ID')}</div>
            <div className="text-[10px] text-slate-300">Anggota Aktif</div>
          </div>
        </div>
      </div>

      {/* GRID DAFTAR EKSTRAKURIKULER */}
      {ekskulList.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">Belum ada ekstrakurikuler yang terdaftar.</div>
      )}
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
                <span className="font-semibold text-slate-700">{Number(e.member_count) || 0} Siswa</span>
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
                  placeholder="Nama lengkap siswa"
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
                  placeholder="Contoh: X MIPA 1"
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
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] text-white font-semibold disabled:opacity-60"
                >
                  {isSubmitting ? 'Mengirim…' : 'Kirim Pendaftaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
