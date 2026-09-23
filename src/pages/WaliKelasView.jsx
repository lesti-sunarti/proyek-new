import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Users, UserCog, CalendarDays, Grid3X3, ScrollText,
  BookOpen, ClipboardCheck, Notebook, Star, AlertCircle, Leaf,
  Package, FolderOpen, Settings, Printer, ArrowLeftRight, Check,
  Plus, Save, TrendingUp, ShieldAlert, UserCheck, GraduationCap, Home,
  Search, Edit3, Trash2, X, RefreshCw, Eye, Award, CheckCircle2,
  Calendar, Phone, MapPin, User, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = '/api/walikelas';
async function apiFetch(path, opts = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${API}${path}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    clearTimeout(timeoutId);
    // Baca body sekali saja (res.json() lalu res.text() gagal karena stream sudah terpakai).
    const raw = await res.text();
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = null; }
    }
    if (!res.ok || (data && data.success === false)) {
      const fallback = res.status === 401
        ? 'Silakan masuk terlebih dahulu untuk mengakses modul Wali Kelas.'
        : res.status === 403
          ? 'Akun Anda tidak memiliki hak akses modul Wali Kelas.'
          : `Terjadi kesalahan pada server (HTTP ${res.status})`;
      throw new Error((data && data.message) || fallback);
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Koneksi timeout (8 detik). Pastikan server backend sedang aktif.');
    }
    throw err;
  }
}

const pad2 = (n) => String(n).padStart(2, '0');
// Tanggal hari ini dalam zona waktu lokal (bukan UTC) agar tidak bergeser sehari pada dini hari WIB.
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const todayDayName = () => DAY_NAMES_ID[new Date().getDay()];
// null/undefined/'' berarti siswa belum dinilai (server mengirim null bila grade_id null).
const hasScore = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v));
const formatScore = (v) => (hasScore(v) ? Number(v) : '-');
const isDocumentLink = (url) => typeof url === 'string' && url.trim() !== '' && url.trim() !== '#' && /^(https?:\/\/|\/)/i.test(url.trim());
const CASE_STATUSES = ['Dalam Pemantauan', 'Dalam Pembinaan', 'Selesai'];
const makeJournalForm = () => ({
  date: todayLocal(),
  period_range: 'Jam ke 1-2 (07.15 - 08.45)',
  subject_name: '',
  teacher_name: '',
  topic_material: '',
  attendance_summary: '',
  incident_notes: '',
  status: 'Terlaksana'
});
// Saran jabatan pengurus kelas (datalist; tetap boleh mengetik jabatan lain).
const OFFICER_POSITIONS = [
  'Ketua Kelas', 'Wakil Ketua Kelas', 'Sekretaris 1', 'Sekretaris 2', 'Bendahara 1', 'Bendahara 2',
  'Seksi Kebersihan', 'Seksi Keamanan', 'Seksi Keagamaan', 'Seksi Olahraga', 'Seksi Kesenian', 'Seksi Pembelajaran'
];
const makeOfficerForm = () => ({ position_title: '', student_id: '', student_name: '', phone: '', tasks: '', avatar: '' });
const makeScheduleForm = (day = 'Senin') => ({
  day_name: day, period_num: 1, time_start: '', time_end: '', subject_name: '', teacher_name: '', room: ''
});
// 'HH:MM' (input type=time) atau 'HH.MM' (data seed) → menit sejak 00:00; NaN bila format tidak dikenali.
const timeToMinutes = (t) => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(t || '').trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return NaN;
  return h * 60 + mi;
};
const INVENTORY_CONDITIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
const makeInventoryForm = () => ({ item_name: '', quantity: 1, unit: 'Unit', condition: 'Baik', notes: '' });

const DEFAULT_DASHBOARD_DATA = {
  success: true,
  info: {
    id: 1,
    class_name: 'X MIPA 1',
    academic_year: '2025/2026',
    semester: 'Ganjil',
    teacher_name: 'Dra. Hj. Nurhayati, M.M.',
    teacher_nip: '19750812 200212 2 001',
    room_name: 'Ruang 101 - Gedung A Lantai 2',
    slogan: 'Cerdas, Berkarakter, Disiplin, dan Berprestasi Unggul',
    vision: 'Membentuk generasi pembelajar yang berakhlak mulia, adaptif teknologi, dan berwawasan global.',
    target_attendance: 95.5,
    target_gpa: 85
  },
  stats: {
    totalStudents: 32,
    maleStudents: 15,
    femaleStudents: 17,
    attendanceToday: {
      present: 30,
      sick: 1,
      permitted: 1,
      absent: 0,
      percentage: 93.8
    },
    activeCasesCount: 1,
    inventory: {
      total: 60,
      damaged: 1,
      good: 59
    }
  },
  piketToday: {
    day: 'Rabu',
    members: ['Fariz Haidar Palah', 'Fatimah Husna Maulida', 'Firda Maulidah', 'Ilham Nur Alam Bachtiar', 'Isma Sahilla Rizkiana', 'Kiki Kardiman'],
    duties: ['Menyapu dan mengepel kelas', 'Merapikan letak meja & kursi sesuai denah', 'Membersihkan papan tulis & penghapus', 'Menyiram tanaman di pot depan kelas']
  },
  scheduleToday: [
    { id: 10, day_name: 'Rabu', period_num: 1, time_start: '07.00', time_end: '08.30', subject_name: 'Pendidikan Jasmani (Olahraga)', teacher_name: 'Guntur Wibowo, S.Pd.', room: 'GOR Sekolah' },
    { id: 11, day_name: 'Rabu', period_num: 2, time_start: '08.30', time_end: '10.00', subject_name: 'Sejarah Indonesia', teacher_name: 'Sri Wahyuni, M.Pd.', room: 'R-101' },
    { id: 12, day_name: 'Rabu', period_num: 3, time_start: '10.15', time_end: '11.45', subject_name: 'Pendidikan Pancasila & P5', teacher_name: 'Dra. Hj. Nurhayati, M.M.', room: 'R-101' },
    { id: 13, day_name: 'Rabu', period_num: 4, time_start: '12.30', time_end: '14.00', subject_name: 'Seni Budaya & Keterampilan', teacher_name: 'Dewi Sartika, S.Sn.', room: 'R-101' }
  ],
  journalToday: [],
  recentCases: []
};

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
  </div>
);

const Badge = ({ children, color = 'gray' }) => {
  const cls = {
    green:  'bg-emerald-100 text-emerald-800 border border-emerald-200',
    red:    'bg-red-100 text-red-800 border border-red-200',
    yellow: 'bg-amber-100 text-amber-800 border border-amber-200',
    blue:   'bg-blue-100 text-blue-800 border border-blue-200',
    gray:   'bg-gray-100 text-gray-800 border border-gray-200',
    purple: 'bg-purple-100 text-purple-800 border border-purple-200',
    navy:   'bg-[#002147] text-white',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls[color] || cls.gray}`}>
      {children}
    </span>
  );
};

const SectionTitle = ({ icon: Icon, title, desc, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-[#002147] text-white shadow-sm">
        <Icon size={20} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
        {desc && <p className="text-xs text-gray-500">{desc}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const StatCard = ({ icon: Icon, label, value, sub, color = 'emerald' }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    navy:    'bg-blue-50 text-blue-800 border-blue-200',
    amber:   'bg-amber-50 text-amber-800 border-amber-200',
    red:     'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 transition-shadow hover:shadow-sm ${colors[color]}`}>
      <div className="p-2.5 rounded-lg bg-white shadow-xs">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
        <p className="text-2xl font-extrabold leading-none mt-1">{value}</p>
        {sub && <p className="text-xs mt-1 font-medium opacity-85">{sub}</p>}
      </div>
    </div>
  );
};

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
// Roster pelajaran menerima Senin s/d Sabtu (kontrak server); DAYS (Senin-Jumat) tetap dipakai jadwal piket.
const SCHEDULE_DAYS = [...DAYS, 'Sabtu'];

// ============================================================================
// 1. DASHBOARD TAB
// ============================================================================
function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    apiFetch('/dashboard')
      .then(res => {
        if (res && res.success) {
          setData(res);
        } else {
          setData(DEFAULT_DASHBOARD_DATA);
        }
      })
      .catch(err => {
        console.warn('WaliKelas Dashboard load warning:', err.message);
        setError(err.message || 'Tidak dapat menghubungi server backend');
        setData(prev => prev || DEFAULT_DASHBOARD_DATA);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  if (loading && !data) return <Spinner />;

  const currentData = data || DEFAULT_DASHBOARD_DATA;
  const info = currentData.info || DEFAULT_DASHBOARD_DATA.info;
  const stats = currentData.stats || DEFAULT_DASHBOARD_DATA.stats;
  const att = stats.attendanceToday || DEFAULT_DASHBOARD_DATA.stats.attendanceToday;
  const inv = stats.inventory || DEFAULT_DASHBOARD_DATA.stats.inventory;
  const piketToday = currentData.piketToday;
  const scheduleToday = Array.isArray(currentData.scheduleToday) ? currentData.scheduleToday : [];

  return (
    <div className="space-y-6">
      {/* Offline / Connection Alert */}
      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 text-xs text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-950">Pemberitahuan Sinkronisasi Server</p>
              <p className="text-[11px] text-amber-800">{error} — Data sementara ditampilkan dari memori lokal.</p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold shadow-xs transition-colors shrink-0 disabled:opacity-50 text-xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Menghubungkan...' : 'Hubungkan Ulang'}</span>
          </button>
        </div>
      )}

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#002147] via-[#003366] to-[#0a4b8f] text-white p-6 relative overflow-hidden shadow-lg">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400 text-emerald-950 uppercase tracking-wide">
                Ruang Kelas Aktif
              </span>
              <span className="text-xs text-blue-200">T.A. {info.academic_year} — Semester {info.semester}</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Kelas {info.class_name}</h1>
            <p className="text-blue-100 text-sm mt-1 flex items-center gap-1.5">
              <Home size={14} /> {info.room_name}
            </p>
            {info.slogan && (
              <p className="mt-3 text-xs italic text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg inline-block">
                “{info.slogan}”
              </p>
            )}
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 min-w-[240px]">
            <p className="text-xs text-blue-200 font-medium">Wali Kelas</p>
            <p className="text-base font-bold text-white mt-0.5">{info.teacher_name}</p>
            <p className="text-xs text-emerald-300 font-mono mt-0.5">NIP {info.teacher_nip}</p>
            <div className="mt-2 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-blue-200">
              <span>Target Hadir: <b className="text-white">≥{info.target_attendance}%</b></span>
              <span>Target KKM: <b className="text-white">≥{info.target_gpa}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Siswa" value={stats.totalStudents} sub={`L: ${stats.maleStudents} | P: ${stats.femaleStudents}`} color="navy" />
        <StatCard icon={UserCheck} label="Kehadiran Hari Ini" value={att.present} sub={`${att.percentage}% Siswa Hadir`} color="emerald" />
        <StatCard icon={ShieldAlert} label="Kasus Aktif" value={stats.activeCasesCount} sub="Perlu pembinaan BK" color="red" />
        <StatCard icon={Package} label="Inventaris" value={`${inv.total} unit`} sub={`${inv.good} baik / ${inv.damaged} rusak`} color="amber" />
      </div>

      {/* Attendance Detail Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Hadir', count: att.present, color: 'green', desc: 'Di kelas' },
          { label: 'Sakit', count: att.sick, color: 'yellow', desc: 'Surat dokter' },
          { label: 'Izin', count: att.permitted, color: 'blue', desc: 'Izin ortu' },
          { label: 'Alpa', count: att.absent, color: 'red', desc: 'Tanpa kabar' },
        ].map(item => (
          <div key={item.label} className="rounded-xl bg-white border border-gray-200 p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{item.label}</p>
              <p className="text-2xl font-extrabold text-gray-800">{item.count}</p>
              <span className="text-[10px] text-gray-400">{item.desc}</span>
            </div>
            <Badge color={item.color}>{item.label}</Badge>
          </div>
        ))}
      </div>

      {/* Piket Today & Schedule Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Piket Hari Ini */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <CalendarDays size={16} className="text-emerald-600" />
              Petugas Piket Hari Ini ({piketToday?.day || 'Senin'})
            </h3>
            <Badge color="green">Aktif</Badge>
          </div>
          {piketToday?.members && piketToday.members.length > 0 ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Anggota Regu Piket:</p>
                <div className="grid grid-cols-2 gap-2">
                  {piketToday.members.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </div>
                      <span className="font-medium truncate">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
              {piketToday.duties && piketToday.duties.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Tugas Pokok:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {piketToday.duties.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4 text-center">Tidak ada jadwal piket hari ini.</p>
          )}
        </div>

        {/* Jadwal Pelajaran Hari Ini */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" />
              Jadwal KBM Hari Ini ({todayDayName()})
            </h3>
            <Badge color="blue">{scheduleToday?.length || 0} Mapel</Badge>
          </div>
          {scheduleToday && scheduleToday.length > 0 ? (
            <div className="space-y-2">
              {scheduleToday.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-[#002147] text-white font-bold flex items-center justify-center text-[10px]">
                      {s.period_num}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">{s.subject_name}</p>
                      <p className="text-[11px] text-gray-500">{s.teacher_name}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-gray-600">
                    <p>{s.time_start} - {s.time_end}</p>
                    <span className="text-[10px] text-gray-400">{s.room}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4 text-center">Tidak ada mata pelajaran dijadwalkan hari ini.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. DATA SISWA TAB (Search, Add, Edit, Delete)
// ============================================================================
function DataSiswaTab() {
  const { showToast } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState({
    nis: '', nisn: '', name: '', gender: 'L', phone_student: '', phone_parent: '', address: '', blood_type: 'O', birth_date: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const loadStudents = () => {
    setLoading(true);
    apiFetch('/students')
      .then(setStudents)
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStudents(); }, []);

  const openAddModal = () => {
    setEditStudent(null);
    setForm({
      nis: '', nisn: '', name: '', gender: 'L', phone_student: '', phone_parent: '', address: '', blood_type: 'O', birth_date: '', notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (s) => {
    setEditStudent(s);
    setForm({
      nis: s.nis || '',
      nisn: s.nisn || '',
      name: s.name || '',
      gender: s.gender || 'L',
      phone_student: s.phone_student || '',
      phone_parent: s.phone_parent || '',
      address: s.address || '',
      blood_type: s.blood_type || 'O',
      birth_date: s.birth_date || '',
      notes: s.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.nis.trim()) {
      showToast('Nama siswa dan NIS wajib diisi!', 'error');
      return;
    }
    setSaving(true);
    try {
      const optional = (value) => (String(value || '').trim() ? String(value).trim() : null);
      const payload = {
        nis: form.nis.trim(),
        nisn: optional(form.nisn),
        name: form.name.trim(),
        gender: form.gender || 'L',
        phone_student: optional(form.phone_student),
        phone_parent: optional(form.phone_parent),
        address: optional(form.address),
        blood_type: form.blood_type || 'O',
        birth_date: optional(form.birth_date),
        notes: optional(form.notes),
      };
      if (editStudent) {
        // Server menimpa semua kolom saat PUT; sertakan status & avatar lama agar tidak terhapus.
        const res = await apiFetch(`/students/${editStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...payload, status: editStudent.status || 'aktif', avatar: editStudent.avatar || null })
        });
        showToast(res?.message || 'Biodata siswa berhasil diperbarui', 'success');
      } else {
        const res = await apiFetch('/students', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast(res?.message || 'Siswa berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      loadStudents();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan siswa', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus data siswa "${name}" dari rombel?`)) return;
    try {
      const res = await apiFetch(`/students/${id}`, { method: 'DELETE' });
      showToast(res?.message || 'Siswa berhasil dihapus dari rombel', 'success');
      loadStudents();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus siswa', 'error');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      String(s.nis || '').toLowerCase().includes(q) ||
      String(s.nisn || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  return (
    <div>
      <SectionTitle
        icon={Users}
        title="Data Induk Siswa Rombel"
        desc={`Total ${students.length} siswa terdaftar di kelas ini`}
        action={
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={14} /> Tambah Siswa
          </button>
        }
      />

      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002147] focus:outline-none"
            placeholder="Ketik nama, NIS, NISN, atau alamat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Menampilkan <b>{filtered.length}</b> dari {students.length} siswa
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full text-xs">
            <thead className="bg-[#002147] text-white">
              <tr>
                <th className="px-3 py-2.5 text-center w-10">No</th>
                <th className="px-3 py-2.5 text-left">NIS / NISN</th>
                <th className="px-3 py-2.5 text-left">Nama Lengkap</th>
                <th className="px-3 py-2.5 text-center">L/P</th>
                <th className="px-3 py-2.5 text-left">Tgl Lahir</th>
                <th className="px-3 py-2.5 text-left">Kontak Ortu</th>
                <th className="px-3 py-2.5 text-left">Alamat</th>
                <th className="px-3 py-2.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s, idx) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 text-center font-bold text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-700 whitespace-nowrap">
                    <div><b>{s.nis}</b></div>
                    <div className="text-[10px] text-gray-400">{s.nisn || '-'}</div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-900 whitespace-nowrap">{s.name}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge color={s.gender === 'L' ? 'blue' : 'purple'}>{s.gender}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{s.birth_date || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                    {s.phone_parent || s.phone_student || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[180px] truncate" title={s.address}>
                    {s.address || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 hover:bg-blue-50 text-blue-700 rounded transition-colors"
                        title="Edit data siswa"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                        title="Hapus dari rombel"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    {students.length === 0
                      ? 'Belum ada siswa terdaftar di rombel ini. Klik "Tambah Siswa" untuk memulai.'
                      : `Tidak ada siswa ditemukan dengan kata kunci "${search}"`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users size={16} className="text-[#002147]" />
                {editStudent ? 'Edit Biodata Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">NIS *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    placeholder="20250101"
                    value={form.nis}
                    onChange={e => setForm({ ...form, nis: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">NISN</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    placeholder="0078123456"
                    value={form.nisn}
                    onChange={e => setForm({ ...form, nisn: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 mb-1 block">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="Nama lengkap sesuai akta lahir"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">Jenis Kelamin</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">Gol. Darah</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    value={form.blood_type}
                    onChange={e => setForm({ ...form, blood_type: e.target.value })}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">Tgl Lahir</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    value={form.birth_date}
                    onChange={e => setForm({ ...form, birth_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">No. HP Orang Tua / Wali</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    placeholder="0812-xxxx-xxxx"
                    value={form.phone_parent}
                    onChange={e => setForm({ ...form, phone_parent: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">No. HP Siswa</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    placeholder="0813-xxxx-xxxx"
                    value={form.phone_student}
                    onChange={e => setForm({ ...form, phone_student: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 mb-1 block">Alamat Domisili</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="Jl. Merpati No. 12, Kel. Sukamaju..."
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 mb-1 block">Catatan Tambahan</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="Alergi, bakat, prestasi..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1 px-5 py-2 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold"
                >
                  <Save size={13} /> {saving ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. PENGURUS KELAS TAB
// ============================================================================
function PengurusTab() {
  const { showToast } = useAuth();
  const [officers, setOfficers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOfficer, setEditOfficer] = useState(null);
  const [form, setForm] = useState(makeOfficerForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadOfficers = () => {
    setLoading(true);
    // Daftar siswa rombel dipakai untuk dropdown agar student_id & student_name terisi konsisten.
    Promise.all([apiFetch('/officers'), apiFetch('/students')])
      .then(([oList, sList]) => {
        setOfficers(Array.isArray(oList) ? oList : []);
        setStudents(Array.isArray(sList) ? sList : []);
      })
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOfficers(); }, []);

  const openAddModal = () => {
    setEditOfficer(null);
    setForm(makeOfficerForm());
    setShowModal(true);
  };

  const openEditModal = (o) => {
    setEditOfficer(o);
    // Semua nilai lama dimuat ke form karena PUT di server menimpa seluruh kolom.
    setForm({
      position_title: o.position_title || '',
      student_id: o.student_id ? String(o.student_id) : '',
      student_name: o.student_name || '',
      phone: o.phone || '',
      tasks: o.tasks || '',
      avatar: o.avatar || ''
    });
    setShowModal(true);
  };

  // Pilih siswa dari rombel → student_id & student_name terisi otomatis.
  // Opsi kosong = nama diisi manual (mis. wali kelas / pembina yang bukan siswa).
  const handleStudentSelect = (sid) => {
    if (!sid) {
      setForm(f => ({ ...f, student_id: '' }));
      return;
    }
    const st = students.find(s => String(s.id) === String(sid));
    setForm(f => ({
      ...f,
      student_id: String(sid),
      student_name: st?.name || f.student_name,
      phone: f.phone || st?.phone_student || ''
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const position_title = form.position_title.trim();
    const student_name = form.student_name.trim();
    if (!position_title) {
      showToast('Jabatan pengurus wajib diisi', 'error');
      return;
    }
    if (!student_name) {
      showToast('Pilih siswa dari rombel atau isi nama pengurus terlebih dahulu', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        position_title,
        student_id: form.student_id ? Number(form.student_id) : null,
        student_name,
        phone: form.phone.trim() || null,
        tasks: form.tasks.trim() || null,
        avatar: form.avatar.trim() || null,
      };
      if (editOfficer) {
        // Catatan: PUT server hanya memperbarui position_title, student_name, phone, tasks, avatar (student_id diabaikan).
        const res = await apiFetch(`/officers/${editOfficer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast(res?.message || 'Data pengurus kelas berhasil diperbarui', 'success');
      } else {
        const res = await apiFetch('/officers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast(res?.message || 'Pengurus kelas berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      loadOfficers();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan pengurus kelas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (o) => {
    if (!window.confirm(`Hapus ${o.position_title} "${o.student_name}" dari struktur pengurus kelas?`)) return;
    setDeletingId(o.id);
    try {
      const res = await apiFetch(`/officers/${o.id}`, { method: 'DELETE' });
      showToast(res?.message || 'Pengurus kelas berhasil dihapus', 'success');
      loadOfficers();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus pengurus kelas', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Spinner />;

  const selectedStudent = students.find(s => String(s.id) === String(form.student_id));

  return (
    <div>
      <SectionTitle
        icon={UserCog}
        title="Struktur Organisasi Kelas"
        desc={`Pengurus kelas masa bakti 2025/2026 — ${officers.length} jabatan tercatat`}
        action={
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={14} /> Tambah Pengurus
          </button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {officers.map(o => (
          <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex items-start gap-3.5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#002147] to-[#0a4b8f] text-white flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
              {o.student_name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                  {o.position_title}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => openEditModal(o)}
                    disabled={deletingId === o.id}
                    className="p-1.5 hover:bg-blue-50 text-blue-700 rounded transition-colors disabled:opacity-50"
                    title="Edit pengurus"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(o)}
                    disabled={deletingId === o.id}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors disabled:opacity-50"
                    title="Hapus pengurus"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="font-bold text-gray-900 text-sm truncate">{o.student_name}</p>
              {o.tasks && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{o.tasks}</p>}
              {o.phone && (
                <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                  <Phone size={11} /> {o.phone}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {officers.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
          Belum ada data pengurus kelas. Klik "Tambah Pengurus" untuk memulai.
        </div>
      )}

      {/* Modal Tambah/Edit Pengurus */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <UserCog size={16} className="text-[#002147]" />
                {editOfficer ? 'Edit Pengurus Kelas' : 'Tambah Pengurus Kelas'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Jabatan *</label>
                <input
                  type="text"
                  required
                  list="walikelas-officer-positions"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="Ketua Kelas, Sekretaris 1, Seksi Kebersihan..."
                  value={form.position_title}
                  onChange={e => setForm({ ...form, position_title: e.target.value })}
                />
                <datalist id="walikelas-officer-positions">
                  {OFFICER_POSITIONS.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Siswa Rombel</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  value={form.student_id}
                  onChange={e => handleStudentSelect(e.target.value)}
                >
                  <option value="">— Bukan siswa rombel / isi nama manual —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.nis ? ` (${s.nis})` : ''}
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="text-[10px] text-amber-700 mt-1">Belum ada siswa di rombel; isi nama pengurus secara manual.</p>
                )}
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Nama Pengurus *</label>
                <input
                  type="text"
                  required
                  readOnly={!!selectedStudent}
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none ${selectedStudent ? 'bg-gray-50 text-gray-600' : ''}`}
                  placeholder="Nama lengkap pengurus"
                  value={form.student_name}
                  onChange={e => setForm({ ...form, student_name: e.target.value })}
                />
                {selectedStudent && (
                  <p className="text-[10px] text-gray-400 mt-1">Nama diambil dari data siswa rombel (NIS {selectedStudent.nis || '-'}).</p>
                )}
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">No. HP / Kontak</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="0812-xxxx-xxxx"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Uraian Tugas</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="Memimpin kelas, mengkoordinir teman sekelas, menjadi jembatan komunikasi ke guru..."
                  value={form.tasks}
                  onChange={e => setForm({ ...form, tasks: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">URL Foto (opsional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="https://... atau /uploads/..."
                  value={form.avatar}
                  onChange={e => setForm({ ...form, avatar: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  <Save size={13} /> {saving ? 'Menyimpan...' : (editOfficer ? 'Simpan Perubahan' : 'Simpan Pengurus')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. JADWAL PIKET TAB (BUG FIX: uses day_name and members array!)
// ============================================================================
function PiketTab() {
  const { showToast } = useAuth();
  const [piketList, setPiketList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPiket, setEditPiket] = useState(null);
  const [membersInput, setMembersInput] = useState('');
  const [dutiesInput, setDutiesInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPiket = () => {
    setLoading(true);
    apiFetch('/piket')
      .then(setPiketList)
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPiket(); }, []);

  const openEditModal = (p) => {
    setEditPiket(p);
    setMembersInput((p.members || []).join('\n'));
    setDutiesInput((p.duties || []).join('\n'));
  };

  const handleSave = async () => {
    if (!editPiket) return;
    setSaving(true);
    try {
      const members = membersInput.split('\n').map(s => s.trim()).filter(Boolean);
      const duties = dutiesInput.split('\n').map(s => s.trim()).filter(Boolean);
      const res = await apiFetch(`/piket/${editPiket.id}`, {
        method: 'PUT',
        body: JSON.stringify({ members, duties })
      });
      showToast(res?.message || 'Jadwal piket berhasil diperbarui', 'success');
      setEditPiket(null);
      loadPiket();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan piket', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle
        icon={CalendarDays}
        title="Jadwal Piket Kebersihan Kelas"
        desc="Jadwal pembagian regu kerja kebersihan Senin s/d Jumat"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {DAYS.map(dayName => {
          const p = piketList.find(item => item.day_name === dayName);
          const members = p?.members || [];
          const duties = p?.duties || [];

          return (
            <div key={dayName} className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
              <div className="bg-[#002147] text-white px-4 py-2.5 flex items-center justify-between">
                <span className="font-bold text-sm tracking-wide">{dayName}</span>
                {p && (
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1 hover:bg-white/15 rounded text-blue-200 hover:text-white transition-colors"
                    title="Edit anggota piket"
                  >
                    <Edit3 size={13} />
                  </button>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Anggota Regu ({members.length}):
                  </p>
                  <ul className="space-y-1.5">
                    {members.map((name, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate font-medium">{name}</span>
                      </li>
                    ))}
                    {members.length === 0 && (
                      <li className="text-xs text-gray-400 italic py-2 text-center">Belum ada anggota</li>
                    )}
                  </ul>
                </div>

                {duties.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Tugas:</p>
                    <ul className="text-[11px] text-gray-500 space-y-0.5">
                      {duties.slice(0, 2).map((d, idx) => (
                        <li key={idx} className="truncate">• {d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Edit Piket */}
      {editPiket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                Edit Piket Hari {editPiket.day_name}
              </h3>
              <button onClick={() => setEditPiket(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nama Siswa Petugas (1 nama per baris):
                </label>
                <textarea
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg p-2.5 font-sans focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  value={membersInput}
                  onChange={e => setMembersInput(e.target.value)}
                  placeholder="Aditya Pratama Putra&#10;Anhar Azkiya&#10;Anna Riani..."
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Daftar Tugas (1 tugas per baris):
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2.5 font-sans focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  value={dutiesInput}
                  onChange={e => setDutiesInput(e.target.value)}
                  placeholder="Menyapu lantai&#10;Membersihkan papan tulis..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditPiket(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold flex items-center gap-1"
                >
                  <Save size={13} /> {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. DENAH DUDUK TAB (Interactive Click-to-Swap & Assign)
// ============================================================================
function DenahTab() {
  const { showToast } = useAuth();
  const [seats, setSeats] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  // Kursi kosong yang sedang diisi lewat modal "Tempatkan Siswa" + siswa yang dipilih di dropdown.
  const [assignSeat, setAssignSeat] = useState(null);
  const [assignStudentId, setAssignStudentId] = useState('');

  const loadSeats = () => {
    setLoading(true);
    Promise.all([apiFetch('/seating'), apiFetch('/students')])
      .then(([seatList, studentList]) => {
        setSeats(Array.isArray(seatList) ? seatList : []);
        setStudents(Array.isArray(studentList) ? studentList : []);
      })
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSeats(); }, []);

  const handleSeatClick = async (seat) => {
    if (!selectedSeat) {
      setSelectedSeat(seat);
      setMessage(`Kursi ${seat.desk_number} (${seat.student_name || 'Kosong'}) dipilih. Klik kursi lain untuk menukar posisi.`);
    } else if (selectedSeat.id === seat.id) {
      setSelectedSeat(null);
      setMessage('');
    } else {
      // Execute Swap
      setSaving(true);
      try {
        await apiFetch('/seating/swap', {
          method: 'POST',
          body: JSON.stringify({ seat1_id: selectedSeat.id, seat2_id: seat.id })
        });
        setMessage(`✅ Posisi duduk berhasil ditukar antara ${selectedSeat.student_name || 'Kursi ' + selectedSeat.desk_number} dan ${seat.student_name || 'Kursi ' + seat.desk_number}!`);
        setSelectedSeat(null);
        loadSeats();
      } catch (err) {
        showToast(err.message || 'Gagal menukar posisi duduk', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const openAssignModal = (seat) => {
    setSelectedSeat(null);
    setMessage('');
    setAssignStudentId('');
    setAssignSeat(seat);
  };

  // Tempatkan siswa pada kursi kosong → PUT /seating/:id {student_id, student_name}
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignSeat) return;
    const st = students.find(s => String(s.id) === String(assignStudentId));
    if (!st) {
      showToast('Pilih siswa yang akan ditempatkan terlebih dahulu', 'error');
      return;
    }
    const otherSeat = seats.find(s => s.id !== assignSeat.id && s.student_id != null && String(s.student_id) === String(st.id));
    if (otherSeat) {
      showToast(`${st.name} sudah duduk di Kursi ${otherSeat.desk_number}. Gunakan tukar posisi atau kosongkan kursi tersebut dahulu.`, 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/seating/${assignSeat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ student_id: Number(st.id), student_name: st.name })
      });
      showToast(res?.message || 'Tempat duduk berhasil diperbarui', 'success');
      setMessage(`✅ ${st.name} ditempatkan di Kursi ${assignSeat.desk_number}.`);
      setAssignSeat(null);
      loadSeats();
    } catch (err) {
      showToast(err.message || 'Gagal menempatkan siswa', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Kosongkan kursi → PUT /seating/:id dengan student_id & student_name null
  const handleClearSeat = async (seat) => {
    if (!window.confirm(`Kosongkan Kursi ${seat.desk_number} (${seat.student_name || 'tanpa nama'})?`)) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/seating/${seat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ student_id: null, student_name: null })
      });
      showToast(res?.message || 'Tempat duduk berhasil dikosongkan', 'success');
      if (selectedSeat?.id === seat.id) setSelectedSeat(null);
      setMessage(`Kursi ${seat.desk_number} kini kosong.`);
      loadSeats();
    } catch (err) {
      showToast(err.message || 'Gagal mengosongkan kursi', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  // Peta student_id → kursi yang ditempati, untuk menandai siswa yang sudah duduk di kursi lain pada dropdown.
  const seatByStudentId = new Map();
  (Array.isArray(seats) ? seats : []).forEach(s => {
    if (s.student_id !== null && s.student_id !== undefined) seatByStudentId.set(String(s.student_id), s);
  });

  // Di database, desk_number adalah NOMOR KURSI (1..32); satu meja = dua kursi dengan row_num & col_num sama.
  // Kelompokkan berdasarkan posisi (baris, kolom) agar seluruh kursi tampil, bukan hanya 16 kursi pertama.
  const seatList = Array.isArray(seats) ? seats : [];
  const deskMap = new Map();
  seatList.forEach(s => {
    const seatNo = Number(s.desk_number) || 0;
    const pairNo = Math.max(1, Math.ceil(seatNo / 2));
    const row = Number(s.row_num) || Math.ceil(pairNo / 4);
    const col = Number(s.col_num) || ((pairNo - 1) % 4) + 1;
    const key = `${row}-${col}`;
    if (!deskMap.has(key)) deskMap.set(key, { row, col, seats: [] });
    deskMap.get(key).seats.push(s);
  });
  const desks = [...deskMap.values()]
    .sort((a, b) => (a.row - b.row) || (a.col - b.col))
    .map((desk, idx) => ({
      deskNum: idx + 1,
      seats: [...desk.seats].sort((a, b) => (Number(a.desk_number) || 0) - (Number(b.desk_number) || 0))
    }));

  return (
    <div>
      <SectionTitle
        icon={Grid3X3}
        title="Denah Tempat Duduk Kelas"
        desc="Klik dua kursi berturut-turut untuk menukar posisi; pakai 'Tempatkan' pada kursi kosong atau 'Kosongkan' pada kursi terisi"
        action={
          <button
            onClick={() => { setSelectedSeat(null); loadSeats(); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
          >
            <RefreshCw size={12} /> Reset Pilihan
          </button>
        }
      />

      {/* Notification banner */}
      {message && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-blue-500 hover:text-blue-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Teacher Podium & Blackboard */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="w-full bg-gradient-to-r from-emerald-800 via-emerald-900 to-emerald-800 text-white rounded-xl p-3 text-center shadow-sm border-2 border-emerald-950">
          <p className="font-bold text-xs tracking-widest uppercase">📋 PAPAN TULIS & MEJA GURU / PODIUM DEPAN KELAS</p>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-1">↑ Bagian Depan Kelas ↑</p>
      </div>

      {/* 4 columns of 4 rows of double desks */}
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
        {desks.map(({ deskNum, seats: pair }) => (
          <div key={deskNum} className="bg-amber-50/50 rounded-xl border border-amber-200/70 p-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider mb-1 text-center">
              Meja {deskNum}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {pair.map(s => {
                const isSelected = selectedSeat?.id === s.id;
                const isOccupied = Boolean(s.student_name) || (s.student_id !== null && s.student_id !== undefined);
                return (
                  <div key={s.id} className="flex flex-col gap-1">
                    <button
                      onClick={() => handleSeatClick(s)}
                      disabled={saving}
                      title={isOccupied ? 'Klik untuk memilih/menukar posisi' : 'Kursi kosong — klik untuk memilih/menukar, atau gunakan "Tempatkan"'}
                      className={`min-h-[4.5rem] p-1 rounded-lg text-center flex flex-col items-center justify-center transition-all duration-150 border-2 ${
                        isSelected
                          ? 'bg-amber-400 border-amber-600 text-amber-950 scale-105 shadow-md font-bold'
                          : s.student_name
                          ? 'bg-white border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 text-gray-800'
                          : 'bg-gray-100 border-dashed border-gray-300 text-gray-400'
                      }`}
                    >
                      <User size={13} className={s.student_name ? 'text-emerald-700 mb-0.5' : 'text-gray-300 mb-0.5'} />
                      <span className="text-[10px] font-bold leading-tight line-clamp-2 px-0.5">
                        {s.student_name || 'Kosong'}
                      </span>
                      <span className="text-[9px] text-gray-400 mt-0.5">
                        Kursi {s.desk_number} · B{s.row_num}K{s.col_num}
                      </span>
                    </button>
                    {isOccupied ? (
                      <button
                        type="button"
                        onClick={() => handleClearSeat(s)}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md py-0.5 transition-colors disabled:opacity-50"
                        title="Kosongkan kursi ini"
                      >
                        <X size={10} /> Kosongkan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openAssignModal(s)}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-md py-0.5 transition-colors disabled:opacity-50"
                        title="Tempatkan siswa di kursi ini"
                      >
                        <Plus size={10} /> Tempatkan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {desks.length === 0 && (
        <div className="max-w-4xl mx-auto text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
          Belum ada data denah tempat duduk.
        </div>
      )}

      {/* Modal Tempatkan Siswa pada kursi kosong */}
      {assignSeat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Grid3X3 size={16} className="text-[#002147]" />
                Tempatkan Siswa — Kursi {assignSeat.desk_number}
              </h3>
              <button onClick={() => setAssignSeat(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAssign} className="space-y-3 text-xs">
              <p className="text-gray-500">
                Posisi: Baris {assignSeat.row_num}, Kolom {assignSeat.col_num}. Siswa yang sudah menempati kursi lain ditandai dan tidak dapat dipilih.
              </p>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Pilih Siswa *</label>
                <select
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  value={assignStudentId}
                  onChange={e => setAssignStudentId(e.target.value)}
                >
                  <option value="">— Pilih siswa rombel —</option>
                  {students.map(st => {
                    const occupiedSeat = seatByStudentId.get(String(st.id));
                    const seatedElsewhere = Boolean(occupiedSeat) && occupiedSeat.id !== assignSeat.id;
                    return (
                      <option key={st.id} value={st.id} disabled={seatedElsewhere}>
                        {st.name}{seatedElsewhere ? ` — sudah duduk di Kursi ${occupiedSeat.desk_number}` : ''}
                      </option>
                    );
                  })}
                </select>
                {students.length === 0 && (
                  <p className="text-[10px] text-amber-700 mt-1">Belum ada siswa di rombel. Tambahkan siswa pada tab Data Siswa terlebih dahulu.</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAssignSeat(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="flex items-center gap-1 px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  <Save size={13} /> {saving ? 'Menyimpan...' : 'Tempatkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. TATA TERTIB TAB
// ============================================================================
function TataTertibTab() {
  const { showToast } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'Disiplin', title: '', description: '', points: 5 });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadRules = () => {
    setLoading(true);
    apiFetch('/rules')
      .then(setRules)
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRules(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Bunyi aturan wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/rules', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description.trim() || null,
          points: Number(form.points) || 5
        })
      });
      showToast(res?.message || 'Tata tertib berhasil ditambahkan', 'success');
      setShowAdd(false);
      setForm({ category: 'Disiplin', title: '', description: '', points: 5 });
      loadRules();
    } catch (err) {
      showToast(err.message || 'Gagal menambah aturan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Hapus tata tertib "${r.title}"?`)) return;
    setDeletingId(r.id);
    try {
      const res = await apiFetch(`/rules/${r.id}`, { method: 'DELETE' });
      showToast(res?.message || 'Tata tertib berhasil dihapus', 'success');
      loadRules();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus aturan', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle
        icon={ScrollText}
        title="Tata Tertib & Norma Kelas"
        desc="Panduan kedisiplinan dan poin sanksi yang berlaku di kelas X MIPA 1"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-4 py-2 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold"
          >
            <Plus size={14} /> Tambah Aturan
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((r, i) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#002147] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Badge color={r.category === 'Disiplin' ? 'blue' : r.category === 'Kerapian' ? 'purple' : 'yellow'}>
                  {r.category}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    +{r.points} Poin
                  </span>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={deletingId === r.id}
                    className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                    title="Hapus aturan"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h4 className="font-bold text-gray-900 text-xs">{r.title}</h4>
              {r.description && <p className="text-xs text-gray-600 mt-1">{r.description}</p>}
            </div>
          </div>
        ))}
      </div>
      {rules.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
          Belum ada tata tertib yang dicatat.
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Tambah Aturan Tata Tertib</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Kategori</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Disiplin">Disiplin & Waktu</option>
                  <option value="Kerapian">Kerapian & Seragam</option>
                  <option value="Kebersihan">Kebersihan & Sarpras</option>
                  <option value="Akademik">Tugas & Ujian</option>
                  <option value="Etika">Etika & Sopan Santun</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Bunyi Aturan *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Dilarang membawa HP saat KBM berlangsung..."
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Penjelasan / Sanksi</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Konsekuensi atau pembinaan yang dilakukan..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Poin Pelanggaran</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.points}
                  onChange={e => setForm({ ...form, points: Number(e.target.value) })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Aturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. JADWAL PELAJARAN TAB
// ============================================================================
function JadwalTab() {
  const { showToast } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(() => makeScheduleForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadSchedule = () => {
    setLoading(true);
    apiFetch(`/schedule?day=${selectedDay}`)
      .then(list => setSchedule(Array.isArray(list) ? list : []))
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSchedule(); }, [selectedDay]);

  // Server hanya mengurutkan berdasarkan jam ke; pada tampilan "Semua Hari" urutkan per hari lalu jam ke.
  const sortedSchedule = useMemo(() => {
    const dayIndex = (d) => {
      const i = SCHEDULE_DAYS.indexOf(d);
      return i === -1 ? SCHEDULE_DAYS.length : i;
    };
    return [...schedule].sort((a, b) =>
      (dayIndex(a.day_name) - dayIndex(b.day_name)) ||
      ((Number(a.period_num) || 0) - (Number(b.period_num) || 0)) ||
      ((Number(a.id) || 0) - (Number(b.id) || 0))
    );
  }, [schedule]);

  const openAddModal = () => {
    setForm(makeScheduleForm(selectedDay !== 'all' ? selectedDay : 'Senin'));
    setShowAdd(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const subject_name = form.subject_name.trim();
    const teacher_name = form.teacher_name.trim();
    const period_num = Number(form.period_num);
    if (!SCHEDULE_DAYS.includes(form.day_name)) {
      showToast('Pilih hari yang valid (Senin s/d Sabtu)', 'error');
      return;
    }
    if (!Number.isInteger(period_num) || period_num < 1) {
      showToast('Jam ke harus berupa angka bulat minimal 1', 'error');
      return;
    }
    const start = timeToMinutes(form.time_start);
    const end = timeToMinutes(form.time_end);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      showToast('Jam mulai dan jam selesai wajib diisi dengan format HH:MM', 'error');
      return;
    }
    if (end <= start) {
      showToast('Jam selesai harus lebih besar dari jam mulai', 'error');
      return;
    }
    if (!subject_name || !teacher_name) {
      showToast('Mata pelajaran dan guru pengampu wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/schedule', {
        method: 'POST',
        body: JSON.stringify({
          day_name: form.day_name,
          period_num,
          time_start: form.time_start,
          time_end: form.time_end,
          subject_name,
          teacher_name,
          room: form.room.trim() || null
        })
      });
      showToast(res?.message || 'Jadwal pelajaran berhasil ditambahkan', 'success');
      setShowAdd(false);
      loadSchedule();
    } catch (err) {
      showToast(err.message || 'Gagal menambahkan jadwal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Hapus jadwal ${s.subject_name} (${s.day_name}, jam ke-${s.period_num})?`)) return;
    setDeletingId(s.id);
    try {
      const res = await apiFetch(`/schedule/${s.id}`, { method: 'DELETE' });
      showToast(res?.message || 'Jadwal pelajaran berhasil dihapus', 'success');
      loadSchedule();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus jadwal', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <SectionTitle
        icon={BookOpen}
        title="Jadwal Pelajaran KBM Rombel"
        desc="Roster jam pelajaran kelas X MIPA 1 per hari"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
              {['all', ...SCHEDULE_DAYS].map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedDay === d ? 'bg-[#002147] text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {d === 'all' ? 'Semua Hari' : d}
                </button>
              ))}
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus size={14} /> Tambah Jadwal
            </button>
          </div>
        }
      />

      {loading ? <Spinner /> : (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full text-xs">
          <thead className="bg-[#002147] text-white">
            <tr>
              <th className="px-3 py-2.5 text-center w-16">Hari</th>
              <th className="px-3 py-2.5 text-center w-14">Jam Ke</th>
              <th className="px-3 py-2.5 text-center w-28">Waktu</th>
              <th className="px-3 py-2.5 text-left">Mata Pelajaran</th>
              <th className="px-3 py-2.5 text-left">Guru Pengampu</th>
              <th className="px-3 py-2.5 text-center w-24">Ruang</th>
              <th className="px-3 py-2.5 text-center w-14">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedSchedule.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-center font-bold text-[#002147] whitespace-nowrap">{s.day_name}</td>
                <td className="px-3 py-2 text-center font-bold text-gray-700">{s.period_num}</td>
                <td className="px-3 py-2 text-center font-mono text-gray-500 whitespace-nowrap">
                  {s.time_start} - {s.time_end}
                </td>
                <td className="px-3 py-2 font-bold text-gray-900">{s.subject_name}</td>
                <td className="px-3 py-2 text-gray-600">{s.teacher_name}</td>
                <td className="px-3 py-2 text-center font-semibold text-gray-500">{s.room || '-'}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => handleDelete(s)}
                    disabled={deletingId === s.id}
                    className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                    title="Hapus jadwal"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {sortedSchedule.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Belum ada jadwal pelajaran{selectedDay !== 'all' ? ` untuk hari ${selectedDay}` : ''}. Klik "Tambah Jadwal" untuk menambahkan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Modal Tambah Jadwal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BookOpen size={16} className="text-[#002147]" />
                Tambah Jadwal Pelajaran
              </h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Hari *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    value={form.day_name}
                    onChange={e => setForm({ ...form, day_name: e.target.value })}
                  >
                    {SCHEDULE_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Jam Ke *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    step="1"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    value={form.period_num}
                    onChange={e => setForm({ ...form, period_num: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    value={form.time_start}
                    onChange={e => setForm({ ...form, time_start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    value={form.time_end}
                    onChange={e => setForm({ ...form, time_end: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="Matematika Peminatan..."
                  value={form.subject_name}
                  onChange={e => setForm({ ...form, subject_name: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Guru Pengampu *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="Bambang Sutedjo, M.Pd."
                  value={form.teacher_name}
                  onChange={e => setForm({ ...form, teacher_name: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Ruang</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  placeholder="R-101 (dipakai bila dikosongkan)"
                  value={form.room}
                  onChange={e => setForm({ ...form, room: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  <Save size={13} /> {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 8. PRESENSI HARIAN TAB (BUG FIX: 'Hadir'|'Sakit'|'Izin'|'Alpa')
// ============================================================================
function PresensiTab() {
  const { showToast } = useAuth();
  const [date, setDate] = useState(todayLocal());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadAttendance = (dt) => {
    setLoading(true);
    apiFetch(`/attendance?date=${dt}`)
      .then(res => {
        setRecords(Array.isArray(res?.records) ? res.records : []);
      })
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAttendance(date); }, [date]);

  const updateStatus = (student_id, status) => {
    setRecords(prev => prev.map(r => r.student_id === student_id ? { ...r, status } : r));
  };

  const updateNotes = (student_id, notes) => {
    setRecords(prev => prev.map(r => r.student_id === student_id ? { ...r, notes } : r));
  };

  const setAllPresent = () => {
    setRecords(prev => prev.map(r => ({ ...r, status: 'Hadir' })));
  };

  const handleSave = async () => {
    if (!date) { showToast('Pilih tanggal presensi terlebih dahulu', 'error'); return; }
    if (records.length === 0) { showToast('Belum ada siswa yang dapat dipresensi pada tanggal ini', 'error'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          date,
          records: records.map(r => ({ student_id: r.student_id, status: r.status || 'Hadir', notes: (r.notes || '').trim() || null }))
        })
      });
      setSavedMsg(res?.message ? `✅ ${res.message}` : `✅ Presensi tanggal ${date} berhasil disimpan ke database!`);
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan presensi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => {
    const c = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    records.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [records]);

  return (
    <div>
      <SectionTitle
        icon={UserCheck}
        title="Pencatatan Presensi Harian"
        desc="Input dan simpan presensi kehadiran rombel harian"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={setAllPresent}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold"
            >
              Set Semua Hadir
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan Presensi'}
            </button>
          </div>
        }
      />

      {/* Date picker and summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar size={16} className="text-[#002147]" />
          <span className="text-xs font-bold text-gray-700">Tanggal:</span>
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#002147] focus:outline-none"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Hadir: {counts.Hadir}</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">Sakit: {counts.Sakit}</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">Izin: {counts.Izin}</span>
          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800">Alpa: {counts.Alpa}</span>
        </div>
      </div>

      {savedMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {savedMsg}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full text-xs">
            <thead className="bg-[#002147] text-white">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">No</th>
                <th className="px-3 py-2.5 text-left w-28">NIS</th>
                <th className="px-3 py-2.5 text-left">Nama Siswa</th>
                <th className="px-3 py-2.5 text-center w-48">Status Kehadiran</th>
                <th className="px-3 py-2.5 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r, i) => (
                <tr key={r.student_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-center text-gray-500 font-medium">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{r.nis}</td>
                  <td className="px-3 py-2 font-bold text-gray-900">{r.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {[
                        { key: 'Hadir', label: 'H', cls: 'accent-emerald-600' },
                        { key: 'Sakit', label: 'S', cls: 'accent-amber-600' },
                        { key: 'Izin',  label: 'I', cls: 'accent-blue-600' },
                        { key: 'Alpa',  label: 'A', cls: 'accent-red-600' },
                      ].map(opt => (
                        <label
                          key={opt.key}
                          className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs font-bold border ${
                            r.status === opt.key
                              ? opt.key === 'Hadir' ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                              : opt.key === 'Sakit' ? 'bg-amber-50 border-amber-400 text-amber-800'
                              : opt.key === 'Izin' ? 'bg-blue-50 border-blue-400 text-blue-800'
                              : 'bg-red-50 border-red-400 text-red-800'
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`att-${r.student_id}`}
                            checked={r.status === opt.key}
                            onChange={() => updateStatus(r.student_id, opt.key)}
                            className={opt.cls}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#002147] focus:outline-none"
                      placeholder="Surat dokter, izin keluarga..."
                      value={r.notes || ''}
                      onChange={e => updateNotes(r.student_id, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    Belum ada siswa terdaftar di rombel ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 9. JURNAL PEMBELAJARAN TAB
// ============================================================================
function JurnalTab() {
  const { showToast } = useAuth();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(makeJournalForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadJournal = () => {
    setLoading(true);
    apiFetch('/journal')
      .then(setJournals)
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadJournal(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.subject_name.trim() || !form.topic_material.trim()) {
      showToast('Mata pelajaran dan materi wajib diisi!', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/journal', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          date: form.date || todayLocal(),
          subject_name: form.subject_name.trim(),
          teacher_name: form.teacher_name.trim(),
          topic_material: form.topic_material.trim(),
          attendance_summary: form.attendance_summary.trim() || undefined,
          incident_notes: form.incident_notes.trim() || null,
        })
      });
      showToast(res?.message || 'Jurnal KBM berhasil dicatat', 'success');
      setShowAdd(false);
      setForm(makeJournalForm());
      loadJournal();
    } catch (err) {
      showToast(err.message || 'Gagal menambah jurnal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (j) => {
    if (!window.confirm(`Hapus entri jurnal ${j.subject_name} (${j.date})?`)) return;
    setDeletingId(j.id);
    try {
      const res = await apiFetch(`/journal/${j.id}`, { method: 'DELETE' });
      showToast(res?.message || 'Entri jurnal berhasil dihapus', 'success');
      loadJournal();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus jurnal', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle
        icon={Notebook}
        title="Buku Jurnal Pembelajaran KBM"
        desc="Catatan materi harian, ketuntasan KD, dan kehadiran per jam mengajar"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold"
          >
            <Plus size={14} /> Tambah Entri Jurnal
          </button>
        }
      />

      <div className="space-y-3">
        {journals.map(j => (
          <div key={j.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Badge color="blue">{j.date}</Badge>
                <span className="text-xs font-bold text-gray-700">{j.period_range}</span>
                <Badge color={j.status === 'Terlaksana' ? 'green' : 'yellow'}>{j.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Guru: <b>{j.teacher_name}</b></span>
                <button
                  onClick={() => handleDelete(j)}
                  disabled={deletingId === j.id}
                  className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                  title="Hapus entri"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">{j.subject_name}</h4>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5">Materi: {j.topic_material}</p>
              {j.incident_notes && (
                <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  📝 {j.incident_notes}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-2">Kehadiran: {j.attendance_summary || '-'}</p>
            </div>
          </div>
        ))}
        {journals.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
            Belum ada entri jurnal KBM.
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Tambah Jurnal Kelas Baru</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Jam Pelajaran</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.period_range}
                    onChange={e => setForm({ ...form, period_range: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Matematika Peminatan..."
                    value={form.subject_name}
                    onChange={e => setForm({ ...form, subject_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Guru Pengajar</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Drs. H. Mulyadi, M.Pd"
                    value={form.teacher_name}
                    onChange={e => setForm({ ...form, teacher_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Topik / Materi Pembelajaran *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Pembahasan Soal Eksponensial & Logaritma..."
                  value={form.topic_material}
                  onChange={e => setForm({ ...form, topic_material: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Catatan Kejadian / KBM</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Kegiatan diskusi lancar, 2 siswa presentasi ke depan..."
                  value={form.incident_notes}
                  onChange={e => setForm({ ...form, incident_notes: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Ringkasan Kehadiran</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Contoh: 30 Hadir, 1 Sakit, 1 Izin"
                    value={form.attendance_summary}
                    onChange={e => setForm({ ...form, attendance_summary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Status KBM</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Terlaksana">Terlaksana</option>
                    <option value="Tugas Mandiri">Tugas Mandiri (guru berhalangan)</option>
                    <option value="Tidak Terlaksana">Tidak Terlaksana</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 10. REKAP NILAI AKADEMIK TAB (With Subject Picker & Edit Modal)
// ============================================================================
function NilaiTab() {
  const { showToast } = useAuth();
  const [subject, setSubject] = useState('Matematika Peminatan');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({ task_1: '', task_2: '', mid_exam: '', final_exam: '' });
  const [saving, setSaving] = useState(false);

  const subjects = [
    'Matematika Peminatan', 'Fisika', 'Biologi', 'Kimia',
    'Bahasa Indonesia', 'Bahasa Inggris', 'Sejarah Indonesia', 'Pendidikan Agama'
  ];

  const loadGrades = (subj) => {
    setLoading(true);
    apiFetch(`/grades?subject=${encodeURIComponent(subj)}`)
      .then(res => setRecords(Array.isArray(res?.records) ? res.records : []))
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGrades(subject); }, [subject]);

  const openEdit = (row) => {
    setEditingRow(row);
    // Siswa yang belum dinilai (null) mendapat input kosong, bukan angka palsu.
    setForm({
      task_1: hasScore(row.task_1) ? row.task_1 : '',
      task_2: hasScore(row.task_2) ? row.task_2 : '',
      mid_exam: hasScore(row.mid_exam) ? row.mid_exam : '',
      final_exam: hasScore(row.final_exam) ? row.final_exam : ''
    });
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!editingRow) return;
    const fields = ['task_1', 'task_2', 'mid_exam', 'final_exam'];
    const invalid = fields.some(key => !hasScore(form[key]) || Number(form[key]) < 0 || Number(form[key]) > 100);
    if (invalid) {
      showToast('Semua komponen nilai wajib diisi dengan angka 0 - 100', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/grades', {
        method: 'POST',
        body: JSON.stringify({
          student_id: editingRow.student_id,
          subject_name: subject,
          task_1: Number(form.task_1),
          task_2: Number(form.task_2),
          mid_exam: Number(form.mid_exam),
          final_exam: Number(form.final_exam)
        })
      });
      showToast(res?.message || 'Nilai siswa berhasil disimpan', 'success');
      setEditingRow(null);
      loadGrades(subject);
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan nilai', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Rata-rata kelas hanya dihitung dari siswa yang sudah dinilai (grade_id tidak null).
  const graded = records.filter(r => r.grade_id !== null && r.grade_id !== undefined && hasScore(r.final_grade));
  const classAverage = graded.length > 0
    ? graded.reduce((sum, r) => sum + Number(r.final_grade), 0) / graded.length
    : null;
  const predicateCounts = graded.reduce((acc, r) => {
    const key = r.predicate || '-';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <SectionTitle
        icon={TrendingUp}
        title="Rekapitulasi Nilai Akademik Siswa"
        desc="Nilai Tugas, PTS, PAS, dan Nilai Akhir Rapor per Mata Pelajaran"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Mapel:</span>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-[#002147]"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl bg-white border border-gray-200 p-3.5 shadow-xs">
          <p className="text-[11px] text-gray-500 font-medium">Rata-rata Kelas</p>
          <p className="text-2xl font-extrabold text-[#002147]">{classAverage === null ? '-' : classAverage.toFixed(1)}</p>
          <span className="text-[10px] text-gray-400">Hanya dari siswa yang sudah dinilai</span>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-3.5 shadow-xs">
          <p className="text-[11px] text-gray-500 font-medium">Sudah Dinilai</p>
          <p className="text-2xl font-extrabold text-emerald-700">{graded.length}</p>
          <span className="text-[10px] text-gray-400">dari {records.length} siswa</span>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-3.5 shadow-xs">
          <p className="text-[11px] text-gray-500 font-medium">Belum Dinilai</p>
          <p className="text-2xl font-extrabold text-amber-700">{records.length - graded.length}</p>
          <span className="text-[10px] text-gray-400">Klik ikon edit untuk mengisi nilai</span>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-3.5 shadow-xs">
          <p className="text-[11px] text-gray-500 font-medium">Predikat A / B / C / D</p>
          <p className="text-2xl font-extrabold text-gray-800">{predicateCounts.A || 0} / {predicateCounts.B || 0} / {predicateCounts.C || 0} / {predicateCounts.D || 0}</p>
          <span className="text-[10px] text-gray-400 truncate block">Mapel: {subject}</span>
        </div>
      </div>

      {loading ? <Spinner /> : (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full text-xs">
          <thead className="bg-[#002147] text-white">
            <tr>
              <th className="px-3 py-2.5 text-center w-12">No</th>
              <th className="px-3 py-2.5 text-left">Nama Siswa</th>
              <th className="px-3 py-2.5 text-center w-20">Tugas 1</th>
              <th className="px-3 py-2.5 text-center w-20">Tugas 2</th>
              <th className="px-3 py-2.5 text-center w-20">PTS</th>
              <th className="px-3 py-2.5 text-center w-20">PAS</th>
              <th className="px-3 py-2.5 text-center w-24">Nilai Akhir</th>
              <th className="px-3 py-2.5 text-center w-16">Predikat</th>
              <th className="px-3 py-2.5 text-center w-16">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((r, idx) => (
              <tr key={r.student_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                <td className="px-3 py-2 font-bold text-gray-900">{r.name}</td>
                <td className="px-3 py-2 text-center">{formatScore(r.task_1)}</td>
                <td className="px-3 py-2 text-center">{formatScore(r.task_2)}</td>
                <td className="px-3 py-2 text-center">{formatScore(r.mid_exam)}</td>
                <td className="px-3 py-2 text-center">{formatScore(r.final_exam)}</td>
                <td className="px-3 py-2 text-center font-extrabold text-[#002147]">{formatScore(r.final_grade)}</td>
                <td className="px-3 py-2 text-center">
                  {r.grade_id !== null && r.grade_id !== undefined && r.predicate ? (
                    <Badge color={r.predicate === 'A' ? 'green' : r.predicate === 'B' ? 'blue' : r.predicate === 'C' ? 'yellow' : 'red'}>
                      {r.predicate}
                    </Badge>
                  ) : (
                    <Badge color="gray">Belum dinilai</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => openEdit(r)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit nilai siswa"
                  >
                    <Edit3 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Belum ada siswa terdaftar di rombel ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {editingRow && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Input Nilai: {editingRow.name}</h3>
            <p className="text-xs text-gray-500 mb-3">{subject}</p>
            <form onSubmit={handleSaveScore} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Tugas 1 (20%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5"
                    value={form.task_1}
                    onChange={e => setForm({ ...form, task_1: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Tugas 2 (20%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5"
                    value={form.task_2}
                    onChange={e => setForm({ ...form, task_2: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">PTS (30%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5"
                    value={form.mid_exam}
                    onChange={e => setForm({ ...form, mid_exam: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">PAS (30%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5"
                    value={form.final_exam}
                    onChange={e => setForm({ ...form, final_exam: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#002147] text-white rounded font-bold"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 11. BUKU KASUS & PEMBINAAN TAB
// ============================================================================
function KasusTab() {
  const { showToast } = useAuth();
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    student_name: '',
    date: todayLocal(),
    incident_type: 'Keterlambatan Berulang',
    description: '',
    action_taken: '',
    parent_notified: false,
    status: 'Dalam Pemantauan'
  });

  const loadCases = () => {
    setLoading(true);
    Promise.all([apiFetch('/cases'), apiFetch('/students')])
      .then(([cList, sList]) => {
        const studentList = Array.isArray(sList) ? sList : [];
        setCases(Array.isArray(cList) ? cList : []);
        setStudents(studentList);
        if (studentList.length > 0 && !form.student_id) {
          setForm(f => ({ ...f, student_id: studentList[0].id, student_name: studentList[0].name }));
        }
      })
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  const handleStudentSelect = (sid) => {
    const st = students.find(s => String(s.id) === String(sid));
    setForm({ ...form, student_id: sid, student_name: st?.name || '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.student_name || !form.description.trim()) {
      showToast('Siswa dan kronologi wajib diisi!', 'error');
      return;
    }
    try {
      const res = await apiFetch('/cases', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          student_id: Number(form.student_id),
          date: form.date || todayLocal(),
          description: form.description.trim(),
          action_taken: form.action_taken.trim(),
        })
      });
      showToast(res?.message || 'Kasus pembinaan berhasil dicatat', 'success');
      setShowAdd(false);
      setForm({
        student_id: students[0]?.id || '',
        student_name: students[0]?.name || '',
        date: todayLocal(),
        incident_type: 'Keterlambatan Berulang',
        description: '',
        action_taken: '',
        parent_notified: false,
        status: 'Dalam Pemantauan'
      });
      loadCases();
    } catch (err) {
      showToast(err.message || 'Gagal mencatat kasus', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus catatan kasus ini?')) return;
    try {
      const res = await apiFetch(`/cases/${id}`, { method: 'DELETE' });
      showToast(res?.message || 'Catatan kasus berhasil dihapus', 'success');
      loadCases();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus kasus', 'error');
    }
  };

  // Server PUT /cases/:id menimpa status, action_taken, dan parent_notified sekaligus, jadi kirim ketiganya.
  const handleStatusChange = async (c, status) => {
    if (!status || status === c.status) return;
    try {
      const res = await apiFetch(`/cases/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, action_taken: c.action_taken || '', parent_notified: !!c.parent_notified })
      });
      showToast(res?.message || 'Status pembinaan kasus berhasil diperbarui', 'success');
      loadCases();
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui status kasus', 'error');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle
        icon={AlertCircle}
        title="Buku Catatan Kasus & Pembinaan Siswa"
        desc="Rekam jejak insiden kedisiplinan, mediasi wali kelas, dan laporan ortu"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold"
          >
            <Plus size={14} /> Catat Kasus Baru
          </button>
        }
      />

      <div className="space-y-3">
        {cases.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Badge color={c.status === 'Selesai' ? 'green' : 'red'}>{c.status}</Badge>
                <span className="font-bold text-gray-900 text-xs">{c.student_name}</span>
                <Badge color="yellow">{c.incident_type}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">{c.date}</span>
                <select
                  value={c.status || 'Dalam Pemantauan'}
                  onChange={e => handleStatusChange(c, e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-700 focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  title="Ubah status pembinaan"
                >
                  {c.status && !CASE_STATUSES.includes(c.status) && <option value={c.status}>{c.status}</option>}
                  {CASE_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-gray-400 hover:text-red-600 p-1"
                  title="Hapus kasus"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <p className="text-gray-800"><b>Kronologi:</b> {c.description}</p>
              {c.action_taken && (
                <p className="text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                  <b>Tindakan / Pembinaan:</b> {c.action_taken}
                </p>
              )}
              <div className="pt-1 flex items-center gap-3 text-[11px] text-gray-500">
                <span>Notifikasi Ortu: <b>{c.parent_notified ? 'Sudah Dihubungi' : 'Belum'}</b></span>
              </div>
            </div>
          </div>
        ))}
        {cases.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
            Tidak ada catatan kasus aktif di kelas ini. Alhamdulillah situasi kelas kondusif.
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Catat Kasus / Pelanggaran Baru</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Pilih Siswa *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.student_id}
                  onChange={e => handleStudentSelect(e.target.value)}
                >
                  {students.length === 0 && <option value="">Belum ada siswa di rombel</option>}
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Tanggal Kejadian</label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Jenis Kasus / Pelanggaran</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.incident_type}
                  onChange={e => setForm({ ...form, incident_type: e.target.value })}
                >
                  <option value="Keterlambatan Berulang">Keterlambatan Berulang</option>
                  <option value="Atribut & Seragam">Atribut & Kerapian Seragam</option>
                  <option value="Tugas & Akademik">Kelalaian Tugas Akademik</option>
                  <option value="Perselisihan Antarsiswa">Perselisihan Antarsiswa</option>
                  <option value="Penggunaan Gadget di Kelas">Penggunaan Gadget Ilegal</option>
                  <option value="Penghargaan / Prestasi">Penghargaan / Prestasi Khusus</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Uraian Kejadian / Kronologi *</label>
                <textarea
                  rows={2}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ceritakan kronologi secara objektif..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Tindakan Pembinaan yang Dilakukan</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Telah dipanggil, diberikan teguran lisan, membuat surat komitmen..."
                  value={form.action_taken}
                  onChange={e => setForm({ ...form, action_taken: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notify_parent"
                  checked={form.parent_notified}
                  onChange={e => setForm({ ...form, parent_notified: e.target.checked })}
                  className="accent-[#002147]"
                />
                <label htmlFor="notify_parent" className="font-medium text-gray-700 cursor-pointer">
                  Sudah menghubungi atau menginformasikan orang tua/wali
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={students.length === 0}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 12. CATATAN P5 TAB
// ============================================================================
function P5Tab() {
  const { showToast } = useAuth();
  const [p5List, setP5List] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    student_name: '',
    project_theme: 'Suara Demokrasi',
    dimension: 'Berkebinekaan Global',
    predicate: 'BSH',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadP5 = () => {
    setLoading(true);
    Promise.all([apiFetch('/p5'), apiFetch('/students')])
      .then(([pList, sList]) => {
        const studentList = Array.isArray(sList) ? sList : [];
        setP5List(Array.isArray(pList) ? pList : []);
        setStudents(studentList);
        if (studentList.length > 0 && !form.student_id) {
          setForm(f => ({ ...f, student_id: studentList[0].id, student_name: studentList[0].name }));
        }
      })
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadP5(); }, []);

  const handleStudentSelect = (sid) => {
    const st = students.find(s => String(s.id) === String(sid));
    setForm({ ...form, student_id: sid, student_name: st?.name || '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.student_name) {
      showToast('Pilih siswa yang akan dinilai terlebih dahulu', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/p5', {
        method: 'POST',
        body: JSON.stringify({ ...form, student_id: Number(form.student_id), description: form.description.trim() || null })
      });
      showToast(res?.message || 'Penilaian P5 berhasil disimpan', 'success');
      setShowAdd(false);
      setForm(f => ({ ...f, description: '' }));
      loadP5();
    } catch (err) {
      showToast(err.message || 'Gagal menambah P5', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Hapus penilaian P5 ${p.student_name} (${p.project_theme})?`)) return;
    setDeletingId(p.id);
    try {
      const res = await apiFetch(`/p5/${p.id}`, { method: 'DELETE' });
      showToast(res?.message || 'Penilaian P5 berhasil dihapus', 'success');
      loadP5();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus P5', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle
        icon={Leaf}
        title="Catatan Projek Penguatan Profil Pelajar Pancasila (P5)"
        desc="Penilaian dimensi karakter, tema projek, dan capaian kompetensi siswa"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
          >
            <Plus size={14} /> Nilai Siswa P5
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {p5List.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 text-sm">{p.student_name}</p>
                <p className="text-[11px] text-gray-500">Tema: <b>{p.project_theme}</b></p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={p.predicate === 'SAB' ? 'green' : 'blue'}>
                  {p.predicate}
                </Badge>
                <button
                  onClick={() => handleDelete(p)}
                  disabled={deletingId === p.id}
                  className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                  title="Hapus penilaian P5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="text-xs space-y-1">
              <p className="text-emerald-800 font-semibold">Dimensi: {p.dimension}</p>
              {p.description && <p className="text-gray-600">{p.description}</p>}
            </div>
          </div>
        ))}
      </div>
      {p5List.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
          Belum ada penilaian P5 yang dicatat.
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Input Capaian Karakter P5</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Pilih Siswa</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.student_id}
                  onChange={e => handleStudentSelect(e.target.value)}
                >
                  {students.length === 0 && <option value="">Belum ada siswa di rombel</option>}
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Tema Projek</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.project_theme}
                  onChange={e => setForm({ ...form, project_theme: e.target.value })}
                >
                  <option value="Suara Demokrasi">Suara Demokrasi</option>
                  <option value="Gaya Hidup Berkelanjutan">Gaya Hidup Berkelanjutan</option>
                  <option value="Kearifan Lokal">Kearifan Lokal</option>
                  <option value="Kewirausahaan">Kewirausahaan</option>
                  <option value="Rekayasa dan Teknologi">Rekayasa dan Teknologi</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Dimensi Profil Pancasila</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.dimension}
                  onChange={e => setForm({ ...form, dimension: e.target.value })}
                >
                  <option value="Beriman, Bertakwa kepada Tuhan YME & Berakhlak Mulia">Beriman & Bertakwa</option>
                  <option value="Berkebinekaan Global">Berkebinekaan Global</option>
                  <option value="Bergotong Royong">Bergotong Royong</option>
                  <option value="Mandiri">Mandiri</option>
                  <option value="Bernalar Kritis">Bernalar Kritis</option>
                  <option value="Kreatif">Kreatif</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Capaian Predikat</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.predicate}
                  onChange={e => setForm({ ...form, predicate: e.target.value })}
                >
                  <option value="BB">BB - Belum Berkembang</option>
                  <option value="MB">MB - Mulai Berkembang</option>
                  <option value="BSH">BSH - Berkembang Sesuai Harapan</option>
                  <option value="SAB">SAB - Sangat Berkembang</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Deskripsi Catatan Perkembangan</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Mampu memimpin kelompok dan berdiskusi secara demokratis..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan P5'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 13. INVENTARIS KELAS TAB
// ============================================================================
function InventarisTab() {
  const { showToast } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(makeInventoryForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadInv = () => {
    setLoading(true);
    apiFetch('/inventory')
      .then(list => setItems(Array.isArray(list) ? list : []))
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadInv(); }, []);

  const openAddModal = () => {
    setEditItem(null);
    setForm(makeInventoryForm());
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    // PUT server menimpa item_name, quantity, unit, condition, notes → muat nilai lama ke form.
    setForm({
      item_name: item.item_name || '',
      quantity: item.quantity ?? 1,
      unit: item.unit || 'Unit',
      condition: INVENTORY_CONDITIONS.includes(item.condition) ? item.condition : 'Baik',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const item_name = form.item_name.trim();
    if (!item_name) {
      showToast('Nama barang wajib diisi', 'error');
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      showToast('Jumlah barang harus berupa angka bulat minimal 1', 'error');
      return;
    }
    if (!INVENTORY_CONDITIONS.includes(form.condition)) {
      showToast('Kondisi barang tidak valid', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        item_name,
        quantity,
        unit: form.unit.trim() || 'Unit',
        condition: form.condition,
        notes: form.notes.trim() || null
      };
      if (editItem) {
        const res = await apiFetch(`/inventory/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast(res?.message || 'Inventaris berhasil diperbarui', 'success');
      } else {
        const res = await apiFetch('/inventory', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast(res?.message || 'Barang inventaris berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      loadInv();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan inventaris', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus "${item.item_name}" dari daftar inventaris?`)) return;
    setDeletingId(item.id);
    try {
      const res = await apiFetch(`/inventory/${item.id}`, { method: 'DELETE' });
      showToast(res?.message || 'Barang inventaris berhasil dihapus', 'success');
      loadInv();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus inventaris', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle
        icon={Package}
        title="Daftar Sarana & Inventaris Ruang Kelas"
        desc="Pencatatan aset fisik, mebel, dan fasilitas penunjang KBM"
        action={
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold"
          >
            <Plus size={14} /> Tambah Barang
          </button>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full text-xs">
          <thead className="bg-[#002147] text-white">
            <tr>
              <th className="px-3 py-2.5 text-center w-12">No</th>
              <th className="px-3 py-2.5 text-left">Kode Barang</th>
              <th className="px-3 py-2.5 text-left">Nama Barang</th>
              <th className="px-3 py-2.5 text-center w-24">Jumlah</th>
              <th className="px-3 py-2.5 text-center w-28">Kondisi</th>
              <th className="px-3 py-2.5 text-left">Catatan / Keterangan</th>
              <th className="px-3 py-2.5 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-gray-600">{item.item_code}</td>
                <td className="px-3 py-2 font-bold text-gray-900">{item.item_name}</td>
                <td className="px-3 py-2 text-center font-semibold">{item.quantity} {item.unit}</td>
                <td className="px-3 py-2 text-center">
                  <Badge color={item.condition === 'Baik' ? 'green' : item.condition === 'Rusak Ringan' ? 'yellow' : 'red'}>
                    {item.condition}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-gray-600">{item.notes || '-'}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      disabled={deletingId === item.id}
                      className="p-1.5 hover:bg-blue-50 text-blue-700 rounded transition-colors disabled:opacity-50"
                      title="Edit barang"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors disabled:opacity-50"
                      title="Hapus barang"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Belum ada barang inventaris yang dicatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah/Edit Inventaris */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Package size={16} className="text-[#002147]" />
                {editItem ? `Edit Inventaris — ${editItem.item_code || editItem.item_name}` : 'Tambah Inventaris Kelas'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Nama Barang *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Kipas Angin Dinding, Meja Siswa..."
                  value={form.item_name}
                  onChange={e => setForm({ ...form, item_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Jumlah *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Unit / Buah / Set"
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Kondisi</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.condition}
                  onChange={e => setForm({ ...form, condition: e.target.value })}
                >
                  {INVENTORY_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Pengadaan BOS 2024..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded font-bold disabled:opacity-50"
                >
                  <Save size={13} /> {saving ? 'Menyimpan...' : (editItem ? 'Simpan Perubahan' : 'Simpan Barang')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 14. ARSIP DOKUMEN TAB
// ============================================================================
function ArsipTab() {
  const { showToast } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    doc_title: '',
    category: 'Administrasi',
    doc_date: todayLocal(),
    file_url: '',
    notes: ''
  });

  const loadDocs = () => {
    setLoading(true);
    apiFetch('/documents')
      .then(setDocs)
      .catch(err => showToast(err.message || 'Gagal memuat data dari server', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDocs(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.doc_title.trim()) {
      showToast('Judul dokumen wajib diisi', 'error');
      return;
    }
    const fileUrl = form.file_url.trim();
    if (fileUrl && !isDocumentLink(fileUrl)) {
      showToast('Tautan berkas harus diawali http://, https://, atau / (jalur di server ini)', 'error');
      return;
    }
    try {
      const res = await apiFetch('/documents', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          doc_title: form.doc_title.trim(),
          doc_date: form.doc_date || todayLocal(),
          file_url: fileUrl || '#',
          notes: form.notes.trim() || null
        })
      });
      showToast(res?.message || 'Dokumen berhasil diarsipkan', 'success');
      setShowAdd(false);
      setForm({
        doc_title: '',
        category: 'Administrasi',
        doc_date: todayLocal(),
        file_url: '',
        notes: ''
      });
      loadDocs();
    } catch (err) {
      showToast(err.message || 'Gagal mengarsipkan', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus dokumen ini dari arsip?')) return;
    try {
      const res = await apiFetch(`/documents/${id}`, { method: 'DELETE' });
      showToast(res?.message || 'Dokumen berhasil dihapus', 'success');
      loadDocs();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus dokumen', 'error');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle
        icon={FolderOpen}
        title="Arsip Dokumen Administrasi Kelas"
        desc="Penyimpanan berkas SK, berita acara, piagam, dan notulen rapat kelas"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold"
          >
            <Plus size={14} /> Arsipkan Dokumen
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex items-start gap-3">
            <div className="p-3 bg-blue-50 text-[#002147] rounded-xl font-bold shrink-0">
              <FolderOpen size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Badge color="blue">{d.category}</Badge>
                <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-600 p-1" title="Hapus dokumen">
                  <Trash2 size={13} />
                </button>
              </div>
              <h4 className="font-bold text-gray-900 text-xs mt-1 leading-snug">{d.doc_title}</h4>
              {d.notes && <p className="text-xs text-gray-500 mt-1">{d.notes}</p>}
              <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                <Calendar size={11} /> {d.doc_date}
              </p>
              {isDocumentLink(d.file_url) && (
                <a
                  href={d.file_url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-blue-700 hover:underline mt-1 inline-flex items-center gap-1"
                >
                  <Eye size={11} /> Buka berkas
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      {docs.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
          Belum ada dokumen yang diarsipkan.
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Arsipkan Dokumen Baru</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Judul Dokumen *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="SK Kepengurusan Kelas, Berita Acara..."
                  value={form.doc_title}
                  onChange={e => setForm({ ...form, doc_title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Kategori</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Administrasi">Administrasi</option>
                    <option value="Prestasi">Prestasi</option>
                    <option value="Kegiatan">Kegiatan</option>
                    <option value="Surat Resmi">Surat Resmi</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Tanggal Dokumen</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.doc_date}
                    onChange={e => setForm({ ...form, doc_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Tautan Berkas (opsional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="https://drive.google.com/... atau /uploads/berkas.pdf"
                  value={form.file_url}
                  onChange={e => setForm({ ...form, file_url: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Catatan / Ringkasan</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Keterangan singkat..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded font-bold"
                >
                  Simpan Arsip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 15. PENGATURAN & CETAK TAB (Fully Interactive Form with Typing Support!)
// ============================================================================
function PengaturanTab() {
  const { showToast } = useAuth();
  const [info, setInfo] = useState(DEFAULT_DASHBOARD_DATA.info);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadInfo = () => {
    setLoading(true);
    setError(null);
    apiFetch('/info')
      .then(res => {
        if (res) setInfo(res);
      })
      .catch(err => {
        console.warn('WaliKelas Pengaturan load warning:', err.message);
        setError(err.message || 'Gagal memuat info rombel dari server');
        setInfo(prev => prev || DEFAULT_DASHBOARD_DATA.info);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const handleChange = (field, val) => {
    setInfo(prev => ({ ...(prev || DEFAULT_DASHBOARD_DATA.info), [field]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/info', {
        method: 'PUT',
        body: JSON.stringify(info)
      });
      if (res?.info) setInfo(res.info);
      showToast(res?.message || 'Profil dan pengaturan kelas berhasil diperbarui', 'success');
      setSavedMsg('✅ Profil dan Pengaturan Rombel Wali Kelas berhasil diperbarui!');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !info) return <Spinner />;

  const currentInfo = info || DEFAULT_DASHBOARD_DATA.info;

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={Settings}
        title="Profil Wali Kelas & Pengaturan Rombel"
        desc="Kelola data wali kelas, target ketercapaian, serta cetak Buku Administrasi Wali Kelas (BAWK)"
        action={
          <button
            onClick={loadInfo}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Segarkan
          </button>
        }
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{error} — Pengaturan ditampilkan dari memori lokal.</span>
          </div>
          <button
            onClick={loadInfo}
            className="px-3 py-1 bg-[#002147] hover:bg-blue-900 text-white rounded-lg text-xs font-bold shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs">
          {savedMsg}
        </div>
      )}

      {/* Editable Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-[#002147] flex items-center gap-2 pb-2 border-b border-gray-100">
          <GraduationCap size={18} /> Biodata Wali Kelas & Rombongan Belajar
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Nama Lengkap Wali Kelas</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.teacher_name || ''}
              onChange={e => handleChange('teacher_name', e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">NIP Wali Kelas</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.teacher_nip || ''}
              onChange={e => handleChange('teacher_nip', e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Nama Kelas / Rombel</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.class_name || ''}
              onChange={e => handleChange('class_name', e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Ruangan / Gedung</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.room_name || ''}
              onChange={e => handleChange('room_name', e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Tahun Ajaran</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.academic_year || ''}
              onChange={e => handleChange('academic_year', e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Semester</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.semester || 'Ganjil'}
              onChange={e => handleChange('semester', e.target.value)}
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Target Kehadiran Kelas (%)</label>
            <input
              type="number"
              step="0.1"
              min="50"
              max="100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.target_attendance ?? 95}
              onChange={e => handleChange('target_attendance', e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Target Rata-Rata Nilai (KKM)</label>
            <input
              type="number"
              step="0.1"
              min="50"
              max="100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.target_gpa ?? 85}
              onChange={e => handleChange('target_gpa', e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-bold text-gray-700 block mb-1">Slogan / Motto Kelas</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.slogan || ''}
              onChange={e => handleChange('slogan', e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-bold text-gray-700 block mb-1">Visi & Misi Kelas</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002147] focus:outline-none"
              value={info.vision || ''}
              onChange={e => handleChange('vision', e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#002147] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            <Save size={15} /> {saving ? 'Menyimpan Perubahan...' : 'Simpan Pengaturan Kelas'}
          </button>
        </div>
      </form>

      {/* Cetak BAWK Box */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-300 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-amber-950 flex items-center gap-2">
            <Printer size={18} className="text-amber-800" /> Cetak Buku Administrasi Wali Kelas (BAWK)
          </h3>
          <p className="text-xs text-amber-900/80 mt-1 max-w-xl leading-relaxed">
            Format resmi BAWK terintegrasi siap cetak atau ekspor PDF, mencakup data siswa, struktur pengurus, jadwal piket, denah duduk, rekap kehadiran, dan catatan evaluasi.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-[#002147] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-lg shrink-0 transition-transform active:scale-95"
        >
          <Printer size={16} /> Cetak Sekarang / Simpan PDF
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-TABS COMPONENT
// ============================================================================
function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/60">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-[#002147] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            }`}
          >
            <Icon size={14} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// TAB CONSTANTS
// ============================================================================
const MAIN_TABS = [
  { key: 'dashboard',  label: 'Dashboard',            icon: LayoutDashboard },
  { key: 'data',       label: 'Data Master',          icon: Users },
  { key: 'harian',     label: 'Aktivitas Harian',     icon: ClipboardCheck },
  { key: 'evaluasi',   label: 'Evaluasi & Kasus',     icon: Star },
  { key: 'admin',      label: 'Administrasi Lanjutan',icon: Package },
  { key: 'pengaturan', label: 'Pengaturan & Cetak',   icon: Settings },
];

const DATA_TABS = [
  { key: 'siswa',      label: 'Data Siswa',       icon: Users },
  { key: 'pengurus',   label: 'Pengurus Kelas',   icon: UserCog },
  { key: 'piket',      label: 'Jadwal Piket',     icon: CalendarDays },
  { key: 'denah',      label: 'Denah Duduk',      icon: Grid3X3 },
  { key: 'tatatertib', label: 'Tata Tertib',      icon: ScrollText },
  { key: 'jadwal',     label: 'Jadwal Pelajaran', icon: BookOpen },
];

const HARIAN_TABS = [
  { key: 'presensi', label: 'Presensi Harian', icon: UserCheck },
  { key: 'jurnal',   label: 'Jurnal KBM',      icon: Notebook },
];

const EVAL_TABS = [
  { key: 'nilai',  label: 'Rekap Nilai',  icon: TrendingUp },
  { key: 'kasus',  label: 'Buku Kasus',   icon: AlertCircle },
  { key: 'p5',     label: 'Catatan P5',   icon: Leaf },
];

const ADMIN_TABS = [
  { key: 'inventaris', label: 'Inventaris Kelas', icon: Package },
  { key: 'arsip',      label: 'Arsip Dokumen',    icon: FolderOpen },
];

// ============================================================================
// MAIN VIEW EXPORT
// ============================================================================
export default function WaliKelasView() {
  const [mainTab, setMainTab] = useState('dashboard');
  // Kunci remount konten tab: "Segarkan Data" memuat ulang data tanpa reload halaman (reload melempar pengguna ke portal).
  const [refreshKey, setRefreshKey] = useState(0);
  const [dataTab, setDataTab] = useState('siswa');
  const [harianTab, setHarianTab] = useState('presensi');
  const [evalTab, setEvalTab] = useState('nilai');
  const [adminTab, setAdminTab] = useState('inventaris');

  const renderContent = () => {
    switch (mainTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'data':
        return (
          <div>
            <SubTabs tabs={DATA_TABS} active={dataTab} onChange={setDataTab} />
            {dataTab === 'siswa'      && <DataSiswaTab />}
            {dataTab === 'pengurus'   && <PengurusTab />}
            {dataTab === 'piket'      && <PiketTab />}
            {dataTab === 'denah'      && <DenahTab />}
            {dataTab === 'tatatertib' && <TataTertibTab />}
            {dataTab === 'jadwal'     && <JadwalTab />}
          </div>
        );
      case 'harian':
        return (
          <div>
            <SubTabs tabs={HARIAN_TABS} active={harianTab} onChange={setHarianTab} />
            {harianTab === 'presensi' && <PresensiTab />}
            {harianTab === 'jurnal'   && <JurnalTab />}
          </div>
        );
      case 'evaluasi':
        return (
          <div>
            <SubTabs tabs={EVAL_TABS} active={evalTab} onChange={setEvalTab} />
            {evalTab === 'nilai' && <NilaiTab />}
            {evalTab === 'kasus' && <KasusTab />}
            {evalTab === 'p5'    && <P5Tab />}
          </div>
        );
      case 'admin':
        return (
          <div>
            <SubTabs tabs={ADMIN_TABS} active={adminTab} onChange={setAdminTab} />
            {adminTab === 'inventaris' && <InventarisTab />}
            {adminTab === 'arsip'      && <ArsipTab />}
          </div>
        );
      case 'pengaturan':
        return <PengaturanTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#002147] to-[#003366] text-white shadow-md">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Sistem Wali Kelas</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Digital Rombel
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Administrasi, Presensi, Roster, Denah Duduk & Evaluasi Siswa
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <RefreshCw size={14} /> Segarkan Data
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Printer size={14} /> Cetak BAWK
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {MAIN_TABS.map(t => {
          const Icon = t.icon;
          const isActive = mainTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 border ${
                isActive
                  ? 'bg-[#002147] text-white border-[#002147] shadow-md scale-[1.02]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Module Tab Content */}
      <div className="bg-transparent" key={refreshKey}>
        {renderContent()}
      </div>
    </div>
  );
}
