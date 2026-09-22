import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Users, UserCog, CalendarDays, Grid3X3, ScrollText,
  BookOpen, ClipboardCheck, Notebook, Star, AlertCircle, Leaf,
  Package, FolderOpen, Settings, Printer, ArrowLeftRight, Check,
  Plus, Save, TrendingUp, ShieldAlert, UserCheck, GraduationCap, Home,
  Search, Edit3, Trash2, X, RefreshCw, Eye, Award, CheckCircle2,
  Calendar, Phone, MapPin, User, AlertTriangle
} from 'lucide-react';

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
    if (!res.ok) {
      let msg = 'Terjadi kesalahan pada server';
      try {
        const errJson = await res.json();
        msg = errJson.message || msg;
      } catch {
        msg = await res.text();
      }
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Koneksi timeout (8 detik). Pastikan server backend sedang aktif.');
    }
    throw err;
  }
}

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
  const piketToday = currentData.piketToday;
  const scheduleToday = currentData.scheduleToday || [];

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
        <StatCard icon={Package} label="Inventaris" value={`${stats.inventory.total} unit`} sub={`${stats.inventory.good} baik / ${stats.inventory.damaged} rusak`} color="amber" />
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
              Jadwal KBM Hari Ini ({piketToday?.day || 'Senin'})
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
      .catch(console.error)
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
      alert('Nama siswa dan NIS wajib diisi!');
      return;
    }
    setSaving(true);
    try {
      if (editStudent) {
        await apiFetch(`/students/${editStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        await apiFetch('/students', {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }
      setShowModal(false);
      loadStudents();
    } catch (err) {
      alert('Gagal menyimpan siswa: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus data siswa "${name}" dari rombel?`)) return;
    try {
      await apiFetch(`/students/${id}`, { method: 'DELETE' });
      loadStudents();
    } catch (err) {
      alert('Gagal menghapus siswa: ' + err.message);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.nis || '').includes(q) ||
      (s.nisn || '').includes(q) ||
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
                    Tidak ada siswa ditemukan dengan kata kunci "{search}"
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
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOfficers = () => {
    setLoading(true);
    apiFetch('/officers')
      .then(setOfficers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOfficers(); }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle icon={UserCog} title="Struktur Organisasi Kelas" desc="Pengurus kelas masa bakti 2025/2026" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {officers.map(o => (
          <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex items-start gap-3.5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#002147] to-[#0a4b8f] text-white flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
              {o.student_name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                {o.position_title}
              </span>
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
    </div>
  );
}

// ============================================================================
// 4. JADWAL PIKET TAB (BUG FIX: uses day_name and members array!)
// ============================================================================
function PiketTab() {
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
      .catch(console.error)
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
      await apiFetch(`/piket/${editPiket.id}`, {
        method: 'PUT',
        body: JSON.stringify({ members, duties })
      });
      setEditPiket(null);
      loadPiket();
    } catch (err) {
      alert('Gagal menyimpan piket: ' + err.message);
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
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadSeats = () => {
    setLoading(true);
    apiFetch('/seating')
      .then(setSeats)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSeats(); }, []);

  const handleSeatClick = async (seat) => {
    if (!selectedSeat) {
      setSelectedSeat(seat);
      setMessage(`Kursi Meja ${seat.desk_number} (${seat.student_name || 'Kosong'}) dipilih. Klik kursi lain untuk menukar posisi.`);
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
        setMessage(`✅ Posisi duduk berhasil ditukar antara ${selectedSeat.student_name || 'Meja ' + selectedSeat.desk_number} dan ${seat.student_name || 'Meja ' + seat.desk_number}!`);
        setSelectedSeat(null);
        loadSeats();
      } catch (err) {
        alert('Gagal menukar posisi duduk: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) return <Spinner />;

  // Group by desk_number (1 to 16)
  const desks = [];
  for (let d = 1; d <= 16; d++) {
    const pair = seats.filter(s => s.desk_number === d).sort((a, b) => a.col_num - b.col_num);
    desks.push({ deskNum: d, seats: pair });
  }

  return (
    <div>
      <SectionTitle
        icon={Grid3X3}
        title="Denah Tempat Duduk Kelas"
        desc="Klik dua kursi berturut-turut untuk menukar posisi duduk siswa secara instan"
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
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSeatClick(s)}
                    disabled={saving}
                    className={`h-18 p-1 rounded-lg text-center flex flex-col items-center justify-center transition-all duration-150 border-2 ${
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
                      B{s.row_num}K{s.col_num}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 6. TATA TERTIB TAB
// ============================================================================
function TataTertibTab() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'Disiplin', title: '', description: '', points: 5 });

  const loadRules = () => {
    setLoading(true);
    apiFetch('/rules')
      .then(setRules)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRules(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await apiFetch('/rules', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setShowAdd(false);
      setForm({ category: 'Disiplin', title: '', description: '', points: 5 });
      loadRules();
    } catch (err) {
      alert('Gagal menambah aturan: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus tata tertib ini?')) return;
    try {
      await apiFetch(`/rules/${id}`, { method: 'DELETE' });
      loadRules();
    } catch (err) {
      alert('Gagal menghapus aturan: ' + err.message);
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
                <Badge color={r.category === 'Disiplin' ? 'blue' : r.category === 'Kerapian' ? 'purple' : 'amber'}>
                  {r.category}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    +{r.points} Poin
                  </span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
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
                  className="px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold"
                >
                  Simpan Aturan
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
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('all');

  const loadSchedule = () => {
    setLoading(true);
    apiFetch(`/schedule?day=${selectedDay}`)
      .then(setSchedule)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSchedule(); }, [selectedDay]);

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle
        icon={BookOpen}
        title="Jadwal Pelajaran KBM Rombel"
        desc="Roster jam pelajaran kelas X MIPA 1 per hari"
        action={
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {['all', ...DAYS].map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedDay === d ? 'bg-[#002147] text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {d === 'all' ? 'Semua Hari' : d}
              </button>
            ))}
          </div>
        }
      />

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {schedule.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-center font-bold text-[#002147] whitespace-nowrap">{s.day_name}</td>
                <td className="px-3 py-2 text-center font-bold text-gray-700">{s.period_num}</td>
                <td className="px-3 py-2 text-center font-mono text-gray-500 whitespace-nowrap">
                  {s.time_start} - {s.time_end}
                </td>
                <td className="px-3 py-2 font-bold text-gray-900">{s.subject_name}</td>
                <td className="px-3 py-2 text-gray-600">{s.teacher_name}</td>
                <td className="px-3 py-2 text-center font-semibold text-gray-500">{s.room}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// 8. PRESENSI HARIAN TAB (BUG FIX: 'Hadir'|'Sakit'|'Izin'|'Alpa')
// ============================================================================
function PresensiTab() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadAttendance = (dt) => {
    setLoading(true);
    apiFetch(`/attendance?date=${dt}`)
      .then(res => {
        setRecords(res.records || []);
      })
      .catch(console.error)
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
    setSaving(true);
    try {
      await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({ date, records })
      });
      setSavedMsg(`✅ Presensi tanggal ${date} berhasil disimpan ke database!`);
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      alert('Gagal menyimpan presensi: ' + err.message);
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
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    period_range: 'Jam ke 1-2 (07.15 - 08.45)',
    subject_name: '',
    teacher_name: '',
    topic_material: '',
    attendance_summary: '32 Siswa Hadir',
    incident_notes: '',
    status: 'Terlaksana'
  });

  const loadJournal = () => {
    setLoading(true);
    apiFetch('/journal')
      .then(setJournals)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadJournal(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.subject_name.trim() || !form.topic_material.trim()) {
      alert('Mata pelajaran dan materi wajib diisi!');
      return;
    }
    try {
      await apiFetch('/journal', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setShowAdd(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        period_range: 'Jam ke 1-2 (07.15 - 08.45)',
        subject_name: '',
        teacher_name: '',
        topic_material: '',
        attendance_summary: '32 Siswa Hadir',
        incident_notes: '',
        status: 'Terlaksana'
      });
      loadJournal();
    } catch (err) {
      alert('Gagal menambah jurnal: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus entri jurnal ini?')) return;
    try {
      await apiFetch(`/journal/${id}`, { method: 'DELETE' });
      loadJournal();
    } catch (err) {
      alert('Gagal menghapus jurnal: ' + err.message);
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
                  onClick={() => handleDelete(j.id)}
                  className="text-gray-400 hover:text-red-600 p-1"
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
              <p className="text-[11px] text-gray-400 mt-2">Kehadiran: {j.attendance_summary}</p>
            </div>
          </div>
        ))}
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
                  className="px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded-lg font-bold"
                >
                  Simpan Jurnal
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
  const [subject, setSubject] = useState('Matematika Peminatan');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({ task_1: 80, task_2: 85, mid_exam: 80, final_exam: 85 });
  const [saving, setSaving] = useState(false);

  const subjects = [
    'Matematika Peminatan', 'Fisika', 'Biologi', 'Kimia',
    'Bahasa Indonesia', 'Bahasa Inggris', 'Sejarah Indonesia', 'Pendidikan Agama'
  ];

  const loadGrades = (subj) => {
    setLoading(true);
    apiFetch(`/grades?subject=${encodeURIComponent(subj)}`)
      .then(res => setRecords(res.records || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGrades(subject); }, [subject]);

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      task_1: row.task_1 || 80,
      task_2: row.task_2 || 85,
      mid_exam: row.mid_exam || 80,
      final_exam: row.final_exam || 85
    });
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!editingRow) return;
    setSaving(true);
    try {
      await apiFetch('/grades', {
        method: 'POST',
        body: JSON.stringify({
          student_id: editingRow.student_id,
          subject_name: subject,
          ...form
        })
      });
      setEditingRow(null);
      loadGrades(subject);
    } catch (err) {
      alert('Gagal menyimpan nilai: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

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
                <td className="px-3 py-2 text-center">{r.task_1}</td>
                <td className="px-3 py-2 text-center">{r.task_2}</td>
                <td className="px-3 py-2 text-center">{r.mid_exam}</td>
                <td className="px-3 py-2 text-center">{r.final_exam}</td>
                <td className="px-3 py-2 text-center font-extrabold text-[#002147]">{r.final_grade}</td>
                <td className="px-3 py-2 text-center">
                  <Badge color={r.predicate === 'A' ? 'green' : r.predicate === 'B' ? 'blue' : 'yellow'}>
                    {r.predicate}
                  </Badge>
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
          </tbody>
        </table>
      </div>

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
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    student_name: '',
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
        setCases(cList || []);
        setStudents(sList || []);
        if (sList.length > 0 && !form.student_id) {
          setForm(f => ({ ...f, student_id: sList[0].id, student_name: sList[0].name }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  const handleStudentSelect = (sid) => {
    const st = students.find(s => String(s.id) === String(sid));
    setForm({ ...form, student_id: sid, student_name: st?.name || '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.student_name || !form.description.trim()) {
      alert('Siswa dan kronologi wajib diisi!');
      return;
    }
    try {
      await apiFetch('/cases', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setShowAdd(false);
      setForm({
        student_id: students[0]?.id || '',
        student_name: students[0]?.name || '',
        incident_type: 'Keterlambatan Berulang',
        description: '',
        action_taken: '',
        parent_notified: false,
        status: 'Dalam Pemantauan'
      });
      loadCases();
    } catch (err) {
      alert('Gagal mencatat kasus: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus catatan kasus ini?')) return;
    try {
      await apiFetch(`/cases/${id}`, { method: 'DELETE' });
      loadCases();
    } catch (err) {
      alert('Gagal menghapus kasus: ' + err.message);
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
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
                  ))}
                </select>
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
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold"
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

  const loadP5 = () => {
    setLoading(true);
    Promise.all([apiFetch('/p5'), apiFetch('/students')])
      .then(([pList, sList]) => {
        setP5List(pList || []);
        setStudents(sList || []);
        if (sList.length > 0 && !form.student_id) {
          setForm(f => ({ ...f, student_id: sList[0].id, student_name: sList[0].name }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadP5(); }, []);

  const handleStudentSelect = (sid) => {
    const st = students.find(s => String(s.id) === String(sid));
    setForm({ ...form, student_id: sid, student_name: st?.name || '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/p5', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setShowAdd(false);
      setForm(f => ({ ...f, description: '' }));
      loadP5();
    } catch (err) {
      alert('Gagal menambah P5: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus penilaian P5 ini?')) return;
    try {
      await apiFetch(`/p5/${id}`, { method: 'DELETE' });
      loadP5();
    } catch (err) {
      alert('Gagal menghapus P5: ' + err.message);
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
                <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 p-1">
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
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold"
                >
                  Simpan P5
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ item_name: '', quantity: 1, unit: 'Unit', condition: 'Baik', notes: '' });

  const loadInv = () => {
    setLoading(true);
    apiFetch('/inventory')
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadInv(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    try {
      await apiFetch('/inventory', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setShowAdd(false);
      setForm({ item_name: '', quantity: 1, unit: 'Unit', condition: 'Baik', notes: '' });
      loadInv();
    } catch (err) {
      alert('Gagal menambah inventaris: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus item inventaris ini?')) return;
    try {
      await apiFetch(`/inventory/${id}`, { method: 'DELETE' });
      loadInv();
    } catch (err) {
      alert('Gagal menghapus inventaris: ' + err.message);
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
            onClick={() => setShowAdd(true)}
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
              <th className="px-3 py-2.5 text-center w-16">Aksi</th>
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
                  <Badge color={item.condition === 'Baik' ? 'green' : item.condition === 'Cukup Baik' ? 'blue' : 'red'}>
                    {item.condition}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-gray-600">{item.notes || '-'}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600 p-1">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Tambah Inventaris Kelas</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
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
                  <label className="font-semibold text-gray-700 block mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
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
                  <option value="Baik">Baik</option>
                  <option value="Cukup Baik">Cukup Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
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
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#002147] hover:bg-blue-900 text-white rounded font-bold"
                >
                  Simpan Barang
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
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    doc_title: '',
    category: 'Administrasi',
    doc_date: new Date().toISOString().split('T')[0],
    file_url: '#',
    notes: ''
  });

  const loadDocs = () => {
    setLoading(true);
    apiFetch('/documents')
      .then(setDocs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDocs(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.doc_title.trim()) return;
    try {
      await apiFetch('/documents', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setShowAdd(false);
      setForm({
        doc_title: '',
        category: 'Administrasi',
        doc_date: new Date().toISOString().split('T')[0],
        file_url: '#',
        notes: ''
      });
      loadDocs();
    } catch (err) {
      alert('Gagal mengarsipkan: ' + err.message);
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
              <Badge color="blue">{d.category}</Badge>
              <h4 className="font-bold text-gray-900 text-xs mt-1 leading-snug">{d.doc_title}</h4>
              {d.notes && <p className="text-xs text-gray-500 mt-1">{d.notes}</p>}
              <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                <Calendar size={11} /> {d.doc_date}
              </p>
            </div>
          </div>
        ))}
      </div>

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
      await apiFetch('/info', {
        method: 'PUT',
        body: JSON.stringify(info)
      });
      setSavedMsg('✅ Profil dan Pengaturan Rombel Wali Kelas berhasil diperbarui!');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      alert('Gagal memperbarui pengaturan: ' + err.message);
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
            onClick={() => window.location.reload()}
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
      <div className="bg-transparent">
        {renderContent()}
      </div>
    </div>
  );
}
