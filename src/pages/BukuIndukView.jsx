import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Search, QrCode, Printer, Plus, Activity, AlertTriangle, BookOpen, CheckCircle2, Clock3, X } from 'lucide-react';
import QRModal from '../components/QRModal';

const EMPTY_STUDENT = { nisn: '', nis: '', name: '', gender: 'Laki-laki', birth_place: '', birth_date: '', address: '', parent_name: '', parent_phone: '', class_id: '' };
const EMPTY_TEACHER = { nip: '', nuptk: '', name: '', gender: 'Laki-laki', subject: '', phone: '', email: '', education: '', position: 'Guru Pengajar' };
const inputClass = 'w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all';

// Ambil JSON dan lempar Error bila status non-OK / success:false (pesan server ikut dibawa).
async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Gagal memproses permintaan.');
    error.status = response.status;
    error.hasServerMessage = Boolean(data.message);
    throw error;
  }
  return data;
}

// Field opsional kosong dikirim sebagai null agar tidak tersimpan sebagai string kosong.
const cleanText = (value) => (String(value ?? '').trim() || null);

export default function BukuIndukView() {
  const { canAccess, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('siswa'); // 'siswa' or 'guru'
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForCard, setSelectedStudentForCard] = useState(null);
  const [qrModal, setQrModal] = useState({ open: false, title: '', value: '', subtitle: '' });
  const [timelineData, setTimelineData] = useState(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT);
  const [teacherForm, setTeacherForm] = useState(EMPTY_TEACHER);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    const [studentResult, teacherResult] = await Promise.allSettled([
      requestJson('/api/master/students'),
      requestJson('/api/master/teachers'),
    ]);
    if (studentResult.status === 'fulfilled') setStudents(Array.isArray(studentResult.value) ? studentResult.value : []);
    if (teacherResult.status === 'fulfilled') setTeachers(Array.isArray(teacherResult.value) ? teacherResult.value : []);
    const failure = [studentResult, teacherResult].find((result) => result.status === 'rejected');
    if (failure) showToast(failure.reason?.message || 'Data buku induk belum dapat dimuat.', 'error');

    // Daftar kelas untuk form siswa hanya diambil bila akun punya modul akademik (menghindari 403).
    if (canAccess('academic')) {
      requestJson('/api/academic/classes').then((data) => setClasses(Array.isArray(data) ? data : [])).catch(() => setClasses([]));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Bila daftar kelas tidak tersedia, pilihan kelas diturunkan dari data siswa yang sudah ada.
  const classOptions = classes.length
    ? classes
    : Array.from(new Map(students.filter((s) => s.class_id).map((s) => [s.class_id, { id: s.class_id, name: s.class_name || `Kelas #${s.class_id}` }])).values());

  const term = searchTerm.trim().toLowerCase();
  const filteredStudents = students.filter((s) =>
    !term ||
    String(s.name || '').toLowerCase().includes(term) ||
    String(s.nisn || '').includes(term) ||
    String(s.nis || '').includes(term)
  );

  const filteredTeachers = teachers.filter((t) =>
    !term ||
    String(t.name || '').toLowerCase().includes(term) ||
    String(t.nip || '').includes(term) ||
    String(t.nuptk || '').includes(term)
  );

  const openCardPrint = (student) => {
    setSelectedStudentForCard(student);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const openTimeline = async (student) => {
    setTimelineData({ student, timeline: [], visibility: {} });
    setIsTimelineLoading(true);
    try {
      const result = await requestJson(`/api/master/students/${student.id}/timeline`);
      setTimelineData({ ...result, student: result.student || student, timeline: Array.isArray(result.timeline) ? result.timeline : [] });
    } catch (error) {
      showToast(error.message || 'Riwayat siswa belum dapat dimuat.', 'error');
      setTimelineData(null);
    } finally { setIsTimelineLoading(false); }
  };

  const updateStudentField = (event) => setStudentForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const updateTeacherField = (event) => setTeacherForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const openAddModal = () => {
    setStudentForm(EMPTY_STUDENT);
    setTeacherForm(EMPTY_TEACHER);
    setShowAddModal(true);
  };

  const handleAddStudent = async (event) => {
    event.preventDefault();
    if (!studentForm.nisn.trim() || !studentForm.nis.trim() || !studentForm.name.trim()) {
      return showToast('NISN, NIS, dan nama siswa wajib diisi', 'error');
    }
    if (!/^\d+$/.test(studentForm.nisn.trim())) return showToast('NISN hanya boleh berisi angka', 'error');
    setIsSaving(true);
    try {
      const data = await requestJson('/api/master/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: studentForm.nisn.trim(),
          nis: studentForm.nis.trim(),
          name: studentForm.name.trim(),
          gender: studentForm.gender,
          birth_place: cleanText(studentForm.birth_place),
          birth_date: cleanText(studentForm.birth_date),
          address: cleanText(studentForm.address),
          parent_name: cleanText(studentForm.parent_name),
          parent_phone: cleanText(studentForm.parent_phone),
          class_id: studentForm.class_id ? Number(studentForm.class_id) : null,
        }),
      });
      showToast(data.message || 'Data siswa berhasil ditambahkan', 'success');
      setShowAddModal(false);
      setStudentForm(EMPTY_STUDENT);
      loadData();
    } catch (error) {
      showToast(error.status === 409 && !error.hasServerMessage ? 'NISN atau NIS sudah terdaftar pada siswa lain.' : error.message, 'error');
    } finally { setIsSaving(false); }
  };

  const handleAddTeacher = async (event) => {
    event.preventDefault();
    if (!teacherForm.name.trim()) return showToast('Nama guru/staf wajib diisi', 'error');
    setIsSaving(true);
    try {
      const data = await requestJson('/api/master/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nip: cleanText(teacherForm.nip),
          nuptk: cleanText(teacherForm.nuptk),
          name: teacherForm.name.trim(),
          gender: teacherForm.gender,
          subject: cleanText(teacherForm.subject),
          phone: cleanText(teacherForm.phone),
          email: cleanText(teacherForm.email),
          education: cleanText(teacherForm.education),
          position: cleanText(teacherForm.position) || 'Guru Pengajar',
        }),
      });
      showToast(data.message || 'Data guru & staf berhasil ditambahkan', 'success');
      setShowAddModal(false);
      setTeacherForm(EMPTY_TEACHER);
      loadData();
    } catch (error) {
      showToast(error.status === 409 && !error.hasServerMessage ? 'NIP sudah terdaftar pada guru/staf lain.' : error.message, 'error');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <Users className="w-3.5 h-3.5" /> Modul 6: Buku Induk Siswa & Guru
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Buku Induk & Kartu Identitas Ber-Barcode</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Basis data lengkap NISN, NIP, biodata siswa, guru, serta pencetakan Kartu Pelajar Digital ber-QR Code.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('siswa')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'siswa' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Buku Induk Siswa ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('guru')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'guru' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Buku Induk Guru ({teachers.length})
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-[#002147] hover:bg-[#0a2f5c] text-white text-xs font-bold shadow-lg shadow-[#002147]/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {activeTab === 'siswa' ? 'Tambah Siswa' : 'Tambah Guru'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder={activeTab === 'siswa' ? "Cari nama siswa, NISN, atau NIS..." : "Cari nama guru, NIP, atau NUPTK..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
        />
      </div>

      {/* SISWA TAB */}
      {activeTab === 'siswa' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">NISN / NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">L/P</th>
                  <th className="py-3 px-4">Nama Orang Tua</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl text-center">Aksi Kartu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">{students.length === 0 ? 'Belum ada data siswa.' : 'Tidak ada siswa yang cocok dengan pencarian.'}</td></tr>
                )}
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-emerald-400">{s.nisn}{s.nis ? <span className="block text-[10px] text-slate-400">NIS {s.nis}</span> : null}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{s.class_name || 'Belum ditetapkan'}</td>
                    <td className="py-3 px-4">{s.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td className="py-3 px-4 text-slate-500">{s.parent_name || '-'}{s.parent_phone ? ` (${s.parent_phone})` : ''}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        {String(s.status || 'aktif').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setQrModal({
                            open: true,
                            title: `QR Code Absensi: ${s.name}`,
                            value: s.qr_code || `SISWA-${s.nisn}`,
                            subtitle: `NISN: ${s.nisn} | Kelas ${s.class_name || 'belum ditetapkan'}`
                          })}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-emerald-400 border border-emerald-500/30"
                          title="Lihat QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openCardPrint(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1"
                          title="Cetak Kartu Pelajar"
                        >
                          <Printer className="w-3 h-3" /> Cetak KTP
                        </button>
                        <button
                          onClick={() => openTimeline(s)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-[#002147] transition hover:border-[#002147]"
                          title="Lihat timeline siswa"
                          aria-label={`Lihat timeline ${s.name}`}
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GURU TAB */}
      {activeTab === 'guru' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">NIP / NUPTK</th>
                  <th className="py-3 px-4">Nama Tenaga Pendidik</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4">Mapel Pengampu</th>
                  <th className="py-3 px-4">Pendidikan</th>
                  <th className="py-3 px-4">Kontak</th>
                  <th className="py-3 px-4 rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTeachers.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">{teachers.length === 0 ? 'Belum ada data guru & staf.' : 'Tidak ada guru yang cocok dengan pencarian.'}</td></tr>
                )}
                {filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-emerald-400">{t.nip || '-'}{t.nuptk ? <span className="block text-[10px] text-slate-400">NUPTK {t.nuptk}</span> : null}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{t.name}</td>
                    <td className="py-3 px-4 text-slate-600">{t.position || '-'}</td>
                    <td className="py-3 px-4 text-emerald-300 font-semibold">{t.subject || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{t.education || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{t.phone || t.email || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        {String(t.status || 'Aktif').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable ID Card (Hidden on screen, prints as badge) */}
      {selectedStudentForCard && (
        <div className="printable-area hidden p-6 max-w-sm mx-auto bg-white text-black border-2 border-emerald-700 rounded-2xl shadow-xl">
          <div className="text-center pb-3 border-b-2 border-emerald-700">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">KARTU TANDA PELAJAR DIGITAL</div>
            <h3 className="text-sm font-black text-emerald-800 uppercase">SMAN 1 HARAPAN BANGSA</h3>
            <p className="text-[9px] text-slate-600">Jl. Pendidikan No. 45 Jakarta Selatan</p>
          </div>

          <div className="py-4 flex gap-4 items-center">
            <div className="w-20 h-24 bg-slate-200 rounded border border-slate-400 flex items-center justify-center text-[10px] text-slate-500 text-center font-bold">
              FOTO SISWA 3x4
            </div>
            <div className="text-xs space-y-1">
              <div><span className="font-semibold text-slate-500">Nama:</span> <br /><strong className="text-sm">{selectedStudentForCard.name}</strong></div>
              <div><span className="font-semibold text-slate-500">NISN:</span> {selectedStudentForCard.nisn}</div>
              <div><span className="font-semibold text-slate-500">Kelas:</span> {selectedStudentForCard.class_name || 'Belum ditetapkan'}</div>
              <div><span className="font-semibold text-slate-500">Berlaku s/d:</span> 2027</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-300 text-center">
            <div className="font-mono text-xs font-bold text-black py-1 tracking-widest bg-slate-100 rounded">
              *{selectedStudentForCard.qr_code || `SISWA-${selectedStudentForCard.nisn}`}*
            </div>
            <p className="text-[8px] text-slate-500 mt-1">Kartu ini sah digunakan untuk absensi gerbang & ujian CBT</p>
          </div>
        </div>
      )}

      <QRModal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ ...qrModal, open: false })}
        title={qrModal.title}
        value={qrModal.value}
        subtitle={qrModal.subtitle}
      />

      {/* Modal Tambah Siswa / Guru */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{activeTab === 'siswa' ? 'Tambah Data Siswa Buku Induk' : 'Tambah Data Guru & Staf'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeTab === 'siswa' ? 'Kartu SPP 12 bulan dibuat otomatis setelah siswa tersimpan.' : 'NIP bersifat unik; kosongkan bila belum tersedia.'}</p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Tutup form"><X className="w-4 h-4" /></button>
            </div>

            {activeTab === 'siswa' ? (
              <form onSubmit={handleAddStudent} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">NISN *</label>
                    <input name="nisn" value={studentForm.nisn} onChange={updateStudentField} placeholder="Contoh: 0061234566" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">NIS *</label>
                    <input name="nis" value={studentForm.nis} onChange={updateStudentField} placeholder="Contoh: 24006" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nama Lengkap *</label>
                  <input name="name" value={studentForm.name} onChange={updateStudentField} placeholder="Nama sesuai akta kelahiran" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Jenis Kelamin</label>
                    <select name="gender" value={studentForm.gender} onChange={updateStudentField} className={inputClass}>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Kelas / Rombel</label>
                    <select name="class_id" value={studentForm.class_id} onChange={updateStudentField} className={inputClass}>
                      <option value="">Belum ditetapkan</option>
                      {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tempat Lahir</label>
                    <input name="birth_place" value={studentForm.birth_place} onChange={updateStudentField} placeholder="Contoh: Jakarta" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tanggal Lahir</label>
                    <input type="date" name="birth_date" value={studentForm.birth_date} onChange={updateStudentField} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Alamat</label>
                  <input name="address" value={studentForm.address} onChange={updateStudentField} placeholder="Alamat domisili" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nama Orang Tua / Wali</label>
                    <input name="parent_name" value={studentForm.parent_name} onChange={updateStudentField} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">No. HP Orang Tua</label>
                    <input name="parent_phone" value={studentForm.parent_phone} onChange={updateStudentField} placeholder="08xxxxxxxxxx" className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold">Batal</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-60">{isSaving ? 'Menyimpan…' : 'Simpan Siswa'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddTeacher} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">NIP</label>
                    <input name="nip" value={teacherForm.nip} onChange={updateTeacherField} placeholder="18 digit NIP" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">NUPTK</label>
                    <input name="nuptk" value={teacherForm.nuptk} onChange={updateTeacherField} placeholder="16 digit NUPTK" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nama Lengkap & Gelar *</label>
                  <input name="name" value={teacherForm.name} onChange={updateTeacherField} placeholder="Contoh: Dra. Sri Wahyuni, M.Pd" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Jenis Kelamin</label>
                    <select name="gender" value={teacherForm.gender} onChange={updateTeacherField} className={inputClass}>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Jabatan</label>
                    <input name="position" value={teacherForm.position} onChange={updateTeacherField} placeholder="Contoh: Guru Pengajar" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Mapel Pengampu</label>
                  <input name="subject" value={teacherForm.subject} onChange={updateTeacherField} placeholder="Contoh: Kimia" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">No. HP</label>
                    <input name="phone" value={teacherForm.phone} onChange={updateTeacherField} placeholder="08xxxxxxxxxx" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Email</label>
                    <input type="email" name="email" value={teacherForm.email} onChange={updateTeacherField} placeholder="nama@sekolah.sch.id" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Pendidikan Terakhir</label>
                  <input name="education" value={teacherForm.education} onChange={updateTeacherField} placeholder="Contoh: S1 Pendidikan Kimia" className={inputClass} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold">Batal</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-60">{isSaving ? 'Menyimpan…' : 'Simpan Guru / Staf'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {timelineData && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={() => !isTimelineLoading && setTimelineData(null)}>
          <section className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Timeline siswa" onMouseDown={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-amber-700"><Activity className="h-4 w-4" /> Student Timeline</div><h2 className="mt-1 text-lg font-bold text-[#002147]">{timelineData.student?.name}</h2><p className="mt-0.5 text-xs text-slate-500">NISN {timelineData.student?.nisn || '-'} · {timelineData.student?.class_name || 'Kelas belum ditetapkan'}</p></div>
              <button onClick={() => setTimelineData(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup timeline"><X className="h-5 w-5" /></button>
            </header>
            <div className="max-h-[68vh] overflow-y-auto px-5 py-5 sm:px-6">
              {isTimelineLoading ? <div className="py-12 text-center text-sm text-slate-500">Menyusun riwayat dari data sekolah…</div> : <>
                <div className="mb-5 flex flex-wrap gap-2 text-[11px] font-medium"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Presensi terhubung</span>{timelineData.visibility?.grades && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Nilai sesuai hak akses</span>}{timelineData.visibility?.counseling && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Data pembinaan bersifat terbatas</span>}</div>
                {timelineData.timeline?.length ? <ol className="relative space-y-5 border-l border-slate-200 pl-5">{timelineData.timeline.map((event, index) => {
                  const Icon = event.type === 'attendance' ? Clock3 : event.type === 'grade' ? BookOpen : event.type === 'counseling' ? AlertTriangle : CheckCircle2;
                  const tone = event.tone === 'danger' ? 'bg-rose-100 text-rose-700' : event.tone === 'warning' ? 'bg-amber-100 text-amber-700' : event.tone === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600';
                  return <li key={`${event.type}-${index}`} className="relative"><span className={`absolute -left-[2.02rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${tone}`}><Icon className="h-3.5 w-3.5" /></span><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm font-bold text-slate-800">{event.title}</p>{event.sensitive && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800">Terbatas</span>}</div><p className="mt-1 text-xs leading-relaxed text-slate-500">{event.description}</p><p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{event.occurred_on ? new Date(event.occurred_on).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: String(event.occurred_on).includes('T') ? 'short' : undefined }) : event.period || 'Periode tidak tercatat'}</p></li>;
                })}</ol> : <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Belum ada kejadian yang dapat ditampilkan untuk siswa ini.</div>}
              </>}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
