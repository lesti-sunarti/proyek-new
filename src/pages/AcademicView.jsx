import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Calendar, Plus, Users, School, Layers, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan.');
  return data;
}

export default function AcademicView() {
  const { showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'subjects', 'schedules'
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [scheduleConflicts, setScheduleConflicts] = useState([]);
  // Hasil 409 saat menyimpan jadwal baru berbentuk {...jadwal, reasons} — berbeda dari panel konflik {left, right, reasons}.
  const [attemptConflicts, setAttemptConflicts] = useState([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ class_id: '', subject_id: '', day: 'Senin', start_time: '07:00', end_time: '08:30', room: '' });

  // Form Tambah Kelas
  const [newClassName, setNewClassName] = useState('');
  const [newGrade, setNewGrade] = useState('10');
  const [newMajor, setNewMajor] = useState('MIPA');
  const [newHomeroom, setNewHomeroom] = useState('');

  const loadList = (url, setter) => requestJson(url)
    .then((data) => setter(Array.isArray(data) ? data : []))
    .catch((error) => { setter([]); showToast(error.message, 'error'); });

  const loadData = () => {
    loadList('/api/academic/classes', setClasses);
    loadList('/api/academic/subjects', setSubjects);
    loadList('/api/academic/schedules', setSchedules);
    requestJson('/api/academic/schedule-conflicts')
      .then((data) => setScheduleConflicts(Array.isArray(data.conflicts) ? data.conflicts : []))
      .catch(() => setScheduleConflicts([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return showToast('Nama kelas wajib diisi', 'error');
    if (classes.some((c) => String(c.name || '').trim().toLowerCase() === newClassName.trim().toLowerCase())) {
      return showToast('Nama kelas tersebut sudah terdaftar', 'error');
    }

    setIsSavingClass(true);
    try {
      const data = await requestJson('/api/academic/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName.trim(),
          grade: newGrade,
          major: newMajor,
          academic_year: '2024/2025',
          homeroom_teacher_name: newHomeroom.trim() || 'Belum Ditentukan'
        })
      });
      showToast(data.message || 'Kelas baru berhasil ditambahkan', 'success');
      setNewClassName('');
      setNewHomeroom('');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSavingClass(false);
    }
  };

  const updateScheduleField = (event) => {
    setAttemptConflicts([]);
    setScheduleForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleAddSchedule = async (event) => {
    event.preventDefault();
    if (!scheduleForm.class_id || !scheduleForm.subject_id || !scheduleForm.room.trim()) {
      showToast('Pilih kelas, mata pelajaran, dan isi ruangan terlebih dahulu.', 'error');
      return;
    }
    if (!scheduleForm.start_time || !scheduleForm.end_time || scheduleForm.start_time >= scheduleForm.end_time) {
      showToast('Jam selesai harus lebih besar dari jam mulai.', 'error');
      return;
    }
    setIsSavingSchedule(true);
    try {
      const response = await fetch('/api/academic/schedules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scheduleForm, class_id: Number(scheduleForm.class_id), subject_id: Number(scheduleForm.subject_id), room: scheduleForm.room.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        if (result.code === 'SCHEDULE_CONFLICT') {
          setAttemptConflicts(Array.isArray(result.conflicts) ? result.conflicts : []);
          throw new Error(result.message || 'Jadwal berbenturan dengan jadwal yang sudah ada. Lihat rincian di bawah form.');
        }
        throw new Error(result.message || 'Jadwal tidak dapat disimpan.');
      }
      setAttemptConflicts([]);
      showToast(result.message || 'Jadwal berhasil disimpan tanpa bentrok.', 'success');
      setScheduleForm((previous) => ({ ...previous, room: '' }));
      loadData();
    } catch (error) { showToast(error.message, 'error'); }
    finally { setIsSavingSchedule(false); }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <BookOpen className="w-3.5 h-3.5" /> Modul 4: Aplikasi Akademik
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Manajemen Akademik, Rombel & Jadwal</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pengelolaan tahun ajaran aktif, rombongan belajar (kelas), kurikulum mata pelajaran, serta jadwal mingguan.
          </p>
        </div>

        <div className="flex gap-2">
          {['classes', 'subjects', 'schedules'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                activeTab === t ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'classes' ? 'Rombel / Kelas' : t === 'subjects' ? 'Mata Pelajaran' : 'Jadwal Mingguan'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: ROMBEL / KELAS */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-400" /> Daftar Rombongan Belajar (Tahun Ajaran 2024/2025)
              </h3>
              <span className="text-xs text-slate-500">Total: {classes.length} Kelas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{c.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      Tingkat {c.grade}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Jurusan: {c.major}</div>
                  <div className="text-xs text-slate-600 pt-2 border-t border-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Wali Kelas: {c.homeroom_teacher_name || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Tambah Kelas */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Tambah Rombel Baru
            </h3>
            <form onSubmit={handleAddClass} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nama Kelas:</label>
                <input
                  type="text"
                  placeholder="Contoh: XI MIPA 2"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tingkat:</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  >
                    <option value="10">Kelas 10</option>
                    <option value="11">Kelas 11</option>
                    <option value="12">Kelas 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Jurusan:</label>
                  <select
                    value={newMajor}
                    onChange={(e) => setNewMajor(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  >
                    <option value="MIPA">MIPA</option>
                    <option value="IPS">IPS</option>
                    <option value="Bahasa">Bahasa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Nama Wali Kelas:</label>
                <input
                  type="text"
                  placeholder="Contoh: Drs. Suharjo, M.Pd"
                  value={newHomeroom}
                  onChange={(e) => setNewHomeroom(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingClass}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-60"
              >
                {isSavingClass ? 'Menyimpan…' : 'Simpan Kelas'}
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB 2: MATA PELAJARAN */}
      {activeTab === 'subjects' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" /> Kurikulum & Mata Pelajaran Satuan Pendidikan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map((sub) => (
              <div key={sub.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-fit">
                  {sub.code}
                </div>
                <h4 className="text-sm font-bold text-slate-900">{sub.name}</h4>
                <div className="text-xs text-slate-500">Koordinator: {sub.teacher_name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: JADWAL MINGGUAN */}
      {activeTab === 'schedules' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-500" /> Jadwal Pelajaran Mingguan</h3><p className="mt-1 text-xs text-slate-500">Setiap jadwal baru diperiksa terhadap kelas, guru, dan ruangan sebelum disimpan.</p></div><button onClick={loadData} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-[#002147]" title="Perbarui jadwal"><RefreshCw className="h-4 w-4" /></button></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold"><tr><th className="py-3 px-4 rounded-l-xl">Hari</th><th className="py-3 px-4">Jam</th><th className="py-3 px-4">Kelas</th><th className="py-3 px-4">Mata Pelajaran</th><th className="py-3 px-4">Guru</th><th className="py-3 px-4 rounded-r-xl">Ruangan</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">{schedules.map((schedule) => <tr key={schedule.id} className="hover:bg-slate-50"><td className="py-3 px-4 font-bold text-emerald-700">{schedule.day}</td><td className="py-3 px-4 font-mono text-slate-500">{schedule.start_time}–{schedule.end_time}</td><td className="py-3 px-4 font-semibold text-slate-900">{schedule.class_name}</td><td className="py-3 px-4">{schedule.subject_name}</td><td className="py-3 px-4 text-slate-600">{schedule.teacher_name}</td><td className="py-3 px-4 text-slate-500">{schedule.room}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className={`rounded-2xl border p-5 ${scheduleConflicts.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-start gap-3">{scheduleConflicts.length ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /> : <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />}<div><h4 className={`text-sm font-bold ${scheduleConflicts.length ? 'text-amber-900' : 'text-emerald-900'}`}>{scheduleConflicts.length ? `${scheduleConflicts.length} konflik jadwal terdeteksi` : 'Tidak ada konflik pada jadwal aktif'}</h4><p className={`mt-1 text-xs leading-relaxed ${scheduleConflicts.length ? 'text-amber-800' : 'text-emerald-800'}`}>{scheduleConflicts.length ? 'Perbaiki salah satu jadwal pada pasangan di bawah. Sistem selalu menolak jadwal baru yang bentrok.' : 'Guru, kelas, dan ruangan tidak tercatat pada jam yang tumpang tindih.'}</p></div></div>
              {scheduleConflicts.length > 0 && <div className="mt-4 space-y-2">{scheduleConflicts.map((conflict, index) => <div key={`${conflict.left.id}-${conflict.right.id}-${index}`} className="rounded-xl border border-amber-200 bg-white/80 p-3 text-xs text-amber-900"><span className="font-bold">{conflict.reasons.join(', ')}</span><span className="mt-1 block">{conflict.left.day}, {conflict.left.start_time}–{conflict.left.end_time}: {conflict.left.subject_name} ({conflict.left.class_name}) ↔ {conflict.right.subject_name} ({conflict.right.class_name})</span></div>)}</div>}
            </div>
          </div>
          <aside className="h-fit bg-white border border-slate-200 rounded-3xl p-6"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Plus className="h-4 w-4 text-emerald-500" /> Tambah jadwal</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Mata pelajaran otomatis memakai guru pengampu pada kurikulum.</p><form onSubmit={handleAddSchedule} className="mt-5 space-y-3"><label className="block text-xs font-semibold text-slate-600">Kelas<select required name="class_id" value={scheduleForm.class_id} onChange={updateScheduleField} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#002147]"><option value="">Pilih kelas</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label><label className="block text-xs font-semibold text-slate-600">Mata pelajaran<select required name="subject_id" value={scheduleForm.subject_id} onChange={updateScheduleField} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#002147]"><option value="">Pilih mata pelajaran</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} — {subject.teacher_name}</option>)}</select></label><label className="block text-xs font-semibold text-slate-600">Hari<select name="day" value={scheduleForm.day} onChange={updateScheduleField} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#002147]">{['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => <option key={day}>{day}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label className="block text-xs font-semibold text-slate-600">Mulai<input required type="time" name="start_time" value={scheduleForm.start_time} onChange={updateScheduleField} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><label className="block text-xs font-semibold text-slate-600">Selesai<input required type="time" name="end_time" value={scheduleForm.end_time} onChange={updateScheduleField} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label></div><label className="block text-xs font-semibold text-slate-600">Ruangan<input required name="room" value={scheduleForm.room} onChange={updateScheduleField} placeholder="Contoh: R. 102" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><button disabled={isSavingSchedule} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#002147] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0a2f5c] disabled:opacity-60">{isSavingSchedule ? 'Memeriksa…' : 'Periksa & simpan jadwal'}</button></form>{attemptConflicts.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-bold">Usulan jadwal bentrok dengan {attemptConflicts.length} jadwal yang sudah ada:</p><ul className="mt-2 space-y-1.5">{attemptConflicts.map((conflict, index) => <li key={`attempt-${conflict.id ?? index}`}><span className="font-semibold">{(conflict.reasons || []).join(', ')}</span> — {conflict.day}, {conflict.start_time}–{conflict.end_time}: {conflict.subject_name || 'Mapel'} ({conflict.class_name || 'Kelas'}){conflict.room ? `, ${conflict.room}` : ''}</li>)}</ul><p className="mt-2 text-[11px] text-amber-800">Ubah hari, jam, atau ruangan lalu periksa kembali.</p></div>}</aside>
        </div>
      )}

    </div>
  );
}
