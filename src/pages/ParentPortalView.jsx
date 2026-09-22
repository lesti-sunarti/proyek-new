import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard, 
  ShieldAlert, 
  Phone, 
  MessageSquare,
  BookOpen,
  ArrowRight
} from 'lucide-react';

export default function ParentPortalView() {
  const { currentUser, setActiveModule, showToast } = useAuth();
  const studentId = currentUser.studentId || 1;
  const [studentData, setStudentData] = useState(null);
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [violations, setViolations] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [sppBills, setSppBills] = useState([]);

  useEffect(() => {
    // Load student info
    fetch('/api/master/students')
      .then(r => r.json())
      .then(list => {
        const found = list.find(s => s.id === studentId) || list[0];
        setStudentData(found);
      })
      .catch(() => {});

    // Load attendance today
    fetch('/api/attendance/today')
      .then(r => r.json())
      .then(logs => {
        const todayLog = logs.find(l => l.person_id === studentId && l.user_type === 'siswa');
        setAttendanceToday(todayLog);
      })
      .catch(() => {});

    // Load violations
    fetch(`/api/violations/student/${studentId}`)
      .then(r => r.json())
      .then(data => {
        setViolations(data.records || []);
        setTotalPoints(data.totalPoints || 0);
      })
      .catch(() => {});

    // Load SPP
    fetch(`/api/spp/bills/${studentId}`)
      .then(r => r.json())
      .then(data => {
        setSppBills(data.sppBills || []);
      })
      .catch(() => {});
  }, [studentId]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Welcome Banner Orang Tua */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-500/50 shadow-md"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase mb-1">
              Portal Orang Tua / Wali Murid
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{currentUser.name}</h2>
            <p className="text-xs text-slate-500">
              Memantau: <strong className="text-white">{studentData?.name || 'Aditya Pratama Putra'}</strong> (Kelas {studentData?.class_name || 'X MIPA 1'} - NISN: {studentData?.nisn || '0061234561'})
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => showToast('Membuka chat WhatsApp dengan Wali Kelas (Drs. Budi Santoso)', 'info')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Phone className="w-4 h-4" /> Hubungi Wali Kelas
          </button>
        </div>
      </div>

      {/* 3 Status Utama: Kehadiran, Poin Pelanggaran, dan Tagihan SPP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Status Presensi Hari Ini */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Presensi Hari Ini</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>

          {attendanceToday ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" /> Hadir di Sekolah
              </div>
              <div className="text-xs text-slate-600">
                Waktu Tap Masuk: <strong className="text-white font-mono">{attendanceToday.time} WIB</strong>
              </div>
              <div className="text-[11px] text-slate-500">Metode: {attendanceToday.method === 'self_scan' ? 'Scan HP Mandiri' : 'Kiosk Kartu Gerbang'}</div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Belum tercatat presensi untuk hari ini atau hari libur akademik.
            </div>
          )}

          <button
            onClick={() => setActiveModule('attendance')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Lihat Rekap Kehadiran Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Poin Pelanggaran BK */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Buku Disiplin BK</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>

          <div className={`p-4 rounded-2xl border space-y-2 ${
            totalPoints > 0 ? 'bg-amber-950/30 border-amber-500/30' : 'bg-emerald-950/30 border-emerald-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total Akumulasi Poin:</span>
              <span className={`text-lg font-black ${totalPoints > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {totalPoints} Poin
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {totalPoints === 0 
                ? 'Ananda berperilaku sangat tertib dan belum memiliki catatan sanksi.' 
                : `${violations.length} catatan pembinaan kedisiplinan tercatat.`}
            </p>
          </div>

          <button
            onClick={() => setActiveModule('violations')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Buka Buku Sanksi BK <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
              <span className="text-emerald-400 font-bold">
                {sppBills.filter(b => b.status === 'lunas').length} dari 12 Bulan
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">SPP Bulan Ini:</span>
              <span className="text-amber-400 font-bold">Menunggu Bayar</span>
            </div>
          </div>

          <button
            onClick={() => setActiveModule('spp')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Buka Kartu SPP & Bayar Online <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Catatan Pelanggaran Detail Jika Ada */}
      {violations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Catatan Pelanggaran Siswa yang Perlu Diketahui Orang Tua
          </h3>
          <div className="space-y-2">
            {violations.map((v) => (
              <div key={v.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{v.violation_name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Tanggal: {v.incident_date} | Tindakan: {v.action_taken}
                  </div>
                </div>
                <div className="text-rose-400 font-bold font-mono">+{v.points} Poin</div>
              </div>
            ))}
          </div>
        </div>
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
