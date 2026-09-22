import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertOctagon, ShieldAlert, Plus } from 'lucide-react';

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Gagal memproses permintaan.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export default function ViolationsView() {
  const { currentUser, isStaff, showToast } = useAuth();
  const [violations, setViolations] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsUnavailable, setStudentsUnavailable] = useState(false);
  const [studentSummary, setStudentSummary] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form input pelanggaran
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [violationName, setViolationName] = useState('');
  const [category, setCategory] = useState('ringan');
  const [points, setPoints] = useState('5');
  const [actionTaken, setActionTaken] = useState('Pembinaan lisan & teguran');

  const loadData = () => {
    requestJson('/api/violations')
      .then((data) => setViolations(Array.isArray(data) ? data : []))
      .catch((error) => { setViolations([]); showToast(error.message, 'error'); });

    // Daftar siswa berasal dari modul buku_induk; bila akun tidak berhak (403), form tetap aman.
    requestJson('/api/master/students')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setStudents(list);
        setStudentsUnavailable(false);
        setSelectedStudentId((previous) => previous || (list[0] ? String(list[0].id) : ''));
      })
      .catch(() => { setStudents([]); setStudentsUnavailable(true); });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Akumulasi poin siswa terpilih ditampilkan saat form dibuka.
  useEffect(() => {
    if (!showAddModal || !selectedStudentId) {
      setStudentSummary(null);
      return;
    }
    requestJson(`/api/violations/student/${selectedStudentId}`)
      .then((data) => setStudentSummary({ totalPoints: Number(data.totalPoints) || 0, count: Array.isArray(data.records) ? data.records.length : 0 }))
      .catch(() => setStudentSummary(null));
  }, [showAddModal, selectedStudentId]);

  const handleAddViolation = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return showToast('Pilih siswa terlebih dahulu', 'error');
    if (!violationName.trim()) return showToast('Nama pelanggaran harus diisi', 'error');
    const pointValue = Number(points);
    if (!Number.isFinite(pointValue) || pointValue <= 0) return showToast('Bobot poin harus lebih dari 0', 'error');

    setIsSaving(true);
    try {
      const data = await requestJson('/api/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: Number(selectedStudentId),
          violation_name: violationName.trim(),
          category,
          points: pointValue,
          reporter_name: currentUser?.name || 'Guru BP/BK',
          action_taken: actionTaken.trim() || 'Pembinaan lisan'
        })
      });
      showToast(data.message || 'Poin pelanggaran berhasil dicatat', 'success');
      setShowAddModal(false);
      setViolationName('');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase mb-2">
            <AlertOctagon className="w-3.5 h-3.5" /> Modul 12: Poin Pelanggaran Siswa (Guru BP / BK)
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Buku Disiplin, Poin Pelanggaran & Sanksi</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan pelanggaran tata tertib oleh guru BK, sistem poin kumulatif, dan pemantauan orang tua.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Catat Pelanggaran Siswa
          </button>
        )}
      </div>

      {/* Skema Poin Sanksi Sekolah */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { level: 'Tingkat 1 (1-15 Poin)', title: 'Teguran Lisan & Pembinaan', action: 'Wali Kelas & Guru BK', color: 'border-emerald-500/30 text-emerald-400' },
          { level: 'Tingkat 2 (16-30 Poin)', title: 'Surat Peringatan 1 (SP 1)', action: 'Pemberitahuan Orang Tua', color: 'border-amber-500/30 text-amber-400' },
          { level: 'Tingkat 3 (31-50 Poin)', title: 'Surat Peringatan 2 (SP 2)', action: 'Pemanggilan Orang Tua ke Sekolah', color: 'border-orange-500/30 text-orange-400' },
          { level: 'Tingkat 4 (> 50 Poin)', title: 'Skorsing / Sidang Disiplin', action: 'Kepala Sekolah & Komite', color: 'border-rose-500/30 text-rose-400' },
        ].map((s, idx) => (
          <div key={idx} className={`p-4 rounded-2xl bg-white border ${s.color} space-y-1`}>
            <div className="text-[10px] uppercase font-bold text-slate-500">{s.level}</div>
            <div className="text-xs font-bold text-slate-900">{s.title}</div>
            <div className="text-[11px] text-slate-500">Tindakan: {s.action}</div>
          </div>
        ))}
      </div>

      {/* Tabel Catatan Pelanggaran */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Buku Riwayat Pelanggaran Siswa
          </h3>
          <span className="text-xs text-slate-500">Total: {violations.length} Kasus</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Tanggal</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Bentuk Pelanggaran</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Poin</th>
                <th className="py-3 px-4">Tindakan Sanksi</th>
                <th className="py-3 px-4 rounded-r-xl">Guru Pelapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {violations.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">Belum ada catatan pelanggaran.</td></tr>
              )}
              {violations.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-slate-500">{v.incident_date}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{v.student_name}</td>
                  <td className="py-3 px-4 font-semibold text-slate-600">{v.class_name || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{v.violation_name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      v.category === 'ringan' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : v.category === 'sedang' 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {v.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-rose-400">+{v.points} Poin</td>
                  <td className="py-3 px-4 text-slate-500">{v.action_taken || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{v.reporter_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Pelanggaran */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900">Catat Poin Pelanggaran Siswa</h3>

            {studentsUnavailable && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Daftar siswa (Buku Induk) tidak tersedia untuk akun ini, sehingga pelanggaran belum dapat dicatat.
              </div>
            )}

            <form onSubmit={handleAddViolation} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Pilih Siswa:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={studentsUnavailable || students.length === 0}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all disabled:opacity-60"
                >
                  {students.length === 0 && <option value="">{studentsUnavailable ? 'Daftar siswa tidak tersedia' : 'Belum ada data siswa'}</option>}
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.class_name || 'Kelas belum ditetapkan'} ({s.nisn})
                    </option>
                  ))}
                </select>
                {studentSummary && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Akumulasi poin saat ini: <strong className={studentSummary.totalPoints > 30 ? 'text-rose-500' : 'text-slate-900'}>{studentSummary.totalPoints} poin</strong> ({studentSummary.count} catatan). Setelah dicatat: {studentSummary.totalPoints + (Number(points) || 0)} poin.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Bentuk Pelanggaran:</label>
                <input
                  type="text"
                  placeholder="Contoh: Terlambat masuk sekolah > 15 menit"
                  value={violationName}
                  onChange={(e) => setViolationName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Kategori:</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (e.target.value === 'ringan') setPoints('5');
                      if (e.target.value === 'sedang') setPoints('15');
                      if (e.target.value === 'berat') setPoints('40');
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  >
                    <option value="ringan">Ringan (5 Poin)</option>
                    <option value="sedang">Sedang (15 Poin)</option>
                    <option value="berat">Berat (40 Poin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Bobot Poin Minus:</label>
                  <input
                    type="number"
                    min="1"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Tindakan / Sanksi Diberikan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembinaan oleh guru BK dan surat peringatan"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || studentsUnavailable || students.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 disabled:opacity-60"
                >
                  {isSaving ? 'Menyimpan…' : 'Catat ke Buku Sanksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
