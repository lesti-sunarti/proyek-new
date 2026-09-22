import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileCheck2, 
  Printer, 
  Plus, 
  Search, 
  Award, 
  BookOpen, 
  TrendingUp, 
  CheckCircle2, 
  GraduationCap,
  Calendar,
  User,
  ShieldCheck
} from 'lucide-react';

export default function EraporView() {
  const { currentUser, currentRole, showToast } = useAuth();
  const [grades, setGrades] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('Ganjil');
  const [selectedYear, setSelectedYear] = useState('2024/2025');
  const [selectedStudentId, setSelectedStudentId] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form input nilai baru
  const [formSubject, setFormSubject] = useState('Matematika Wajib');
  const [formFormative, setFormFormative] = useState(85);
  const [formMidterm, setFormMidterm] = useState(85);
  const [formFinal, setFormFinal] = useState(90);
  const [formCompetence, setFormCompetence] = useState('Mampu memahami konsep dasar dan menyelesaikan problem kontekstual.');
  const [formNotes, setFormNotes] = useState('Terus tingkatkan keaktifan belajar di kelas.');

  const fetchGrades = () => {
    fetch(`/api/erapor/grades?student_id=${selectedStudentId}&semester=${selectedSemester}&academic_year=${selectedYear}`)
      .then(res => res.json())
      .then(data => setGrades(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchGrades();
  }, [selectedStudentId, selectedSemester, selectedYear]);

  const handleAddGrade = (e) => {
    e.preventDefault();
    fetch('/api/erapor/grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: selectedStudentId,
        student_name: 'Aditya Pratama Putra',
        class_name: 'X MIPA 1',
        subject_name: formSubject,
        semester: selectedSemester,
        academic_year: selectedYear,
        formative_score: formFormative,
        midterm_score: formMidterm,
        final_score: formFinal,
        competence_achievement: formCompetence,
        teacher_notes: formNotes
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(data.message, 'success');
          setShowAddModal(false);
          fetchGrades();
        }
      })
      .catch(() => showToast('Gagal menyimpan nilai', 'error'));
  };

  const avgScore = grades.length > 0
    ? (grades.reduce((acc, curr) => acc + curr.final_grade, 0) / grades.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 pb-16">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-[#002147] text-xs font-bold uppercase tracking-wider mb-2">
            <FileCheck2 className="w-3.5 h-3.5 text-[#f4a024]" /> Sistem Informasi Akademik
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#002147]">E-Rapor & Transkrip Nilai Siswa</h2>
          <p className="text-xs text-slate-500 mt-1">Laporan Hasil Belajar Siswa (Rapor Digital) Kurikulum Merdeka Terintegrasi</p>
        </div>

        <div className="flex items-center gap-2">
          {currentRole !== 'siswa' && currentRole !== 'ortu' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4 text-[#f4a024]" /> Input Nilai
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f4a024] hover:bg-[#e58e10] text-[#002147] text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" /> Cetak Rapor
          </button>
        </div>
      </div>

      {/* FILTER & STUDENT INFO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Nama Peserta Didik</div>
            <div className="text-xs font-bold text-[#002147] truncate">Aditya Pratama Putra</div>
            <div className="text-[10px] text-slate-500">NISN: 0061234561 • X MIPA 1</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-[#f4a024]" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Rata-Rata Nilai Akhir</div>
            <div className="text-lg font-black text-[#002147]">{avgScore}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Predikat: A (Sangat Baik)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Peringkat Kelas</div>
            <div className="text-lg font-black text-[#002147]">3 <span className="text-xs font-normal text-slate-500">/ 36 Siswa</span></div>
            <div className="text-[10px] text-slate-500">Kenaikan: Memenuhi Syarat</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Pilih Semester</div>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full text-xs font-semibold text-[#002147] bg-slate-50 border border-slate-200 rounded p-1"
            >
              <option value="Ganjil">Semester Ganjil 2024/2025</option>
              <option value="Genap">Semester Genap 2024/2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* GRADES TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#002147] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#f4a024]" /> Capaian Hasil Belajar Peserta Didik
          </h3>
          <span className="text-xs text-slate-500 font-medium">Total: {grades.length} Mata Pelajaran</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#002147] text-white text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-3 text-center">Formatif (40%)</th>
                <th className="py-3 px-3 text-center">STS / Mid (30%)</th>
                <th className="py-3 px-3 text-center">SAS / Akhir (30%)</th>
                <th className="py-3 px-3 text-center font-bold text-[#f4a024]">Nilai Akhir</th>
                <th className="py-3 px-3 text-center">Predikat</th>
                <th className="py-3 px-4">Capaian Kompetensi & Catatan Guru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grades.map((g, idx) => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-[#002147]">{g.subject_name}</td>
                  <td className="py-3.5 px-3 text-center font-medium">{g.formative_score}</td>
                  <td className="py-3.5 px-3 text-center font-medium">{g.midterm_score}</td>
                  <td className="py-3.5 px-3 text-center font-medium">{g.final_score}</td>
                  <td className="py-3.5 px-3 text-center font-bold text-base text-[#002147] bg-amber-50/40">
                    {g.final_grade}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      g.predicate === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {g.predicate}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[11px] font-medium text-slate-800">{g.competence_achievement}</div>
                    {g.teacher_notes && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5">Catatan: {g.teacher_notes}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT NILAI */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-[#002147] mb-4">Input Nilai Mata Pelajaran Siswa</h3>
            <form onSubmit={handleAddGrade} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Formatif (40%)</label>
                  <input
                    type="number"
                    value={formFormative}
                    onChange={(e) => setFormFormative(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">STS / PTS (30%)</label>
                  <input
                    type="number"
                    value={formMidterm}
                    onChange={(e) => setFormMidterm(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">SAS / PAS (30%)</label>
                  <input
                    type="number"
                    value={formFinal}
                    onChange={(e) => setFormFinal(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Deskripsi Capaian Kompetensi</label>
                <textarea
                  value={formCompetence}
                  onChange={(e) => setFormCompetence(e.target.value)}
                  rows="2"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Catatan Wali Kelas / Guru Mapel</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows="2"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] text-white font-semibold"
                >
                  Simpan Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE AREA FOR RAPOR CETAK RESMI */}
      <div className="printable-area hidden bg-white text-black p-8">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h2 className="text-lg font-bold uppercase">PEMERINTAH DAERAH PROVINSI DKI JAKARTA</h2>
          <h2 className="text-lg font-bold uppercase">DINAS PENDIDIKAN</h2>
          <h1 className="text-xl font-extrabold uppercase mt-1">SMAN 1 HARAPAN BANGSA</h1>
          <p className="text-xs">Jl. Pendidikan No. 45, Jakarta Selatan • Telp: (021) 7890-1234 • Website: www.harapanbangsa.sch.id</p>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-base font-bold uppercase underline">LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPOR)</h3>
          <p className="text-xs">Kurikulum Merdeka • Semester {selectedSemester} Tahun Ajaran {selectedYear}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-6">
          <div>
            <div><strong>Nama Siswa:</strong> Aditya Pratama Putra</div>
            <div><strong>NISN / NIS:</strong> 0061234561 / 20241001</div>
          </div>
          <div>
            <div><strong>Kelas / Rombel:</strong> X MIPA 1</div>
            <div><strong>Fase:</strong> E (Sekolah Menengah Atas)</div>
          </div>
        </div>

        <table className="w-full border-collapse text-xs mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center w-8">No</th>
              <th className="border border-black p-2">Mata Pelajaran</th>
              <th className="border border-black p-2 text-center w-20">Nilai Akhir</th>
              <th className="border border-black p-2 text-center w-16">Predikat</th>
              <th className="border border-black p-2">Capaian Kompetensi</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g, idx) => (
              <tr key={g.id}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2 font-semibold">{g.subject_name}</td>
                <td className="border border-black p-2 text-center font-bold">{g.final_grade}</td>
                <td className="border border-black p-2 text-center">{g.predicate}</td>
                <td className="border border-black p-2 text-[11px]">{g.competence_achievement}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-3 text-center text-xs mt-12">
          <div>
            <p>Mengetahui,</p>
            <p>Orang Tua / Wali Siswa</p>
            <div className="h-16"></div>
            <p className="font-bold underline">( ........................................ )</p>
          </div>
          <div>
            <p>Jakarta, 20 Desember 2024</p>
            <p>Wali Kelas X MIPA 1</p>
            <div className="h-16"></div>
            <p className="font-bold underline">Dewi Lestari, M.Kom</p>
            <p>NIP. 198504122010012015</p>
          </div>
          <div>
            <p>Mengetahui,</p>
            <p>Kepala SMAN 1 Harapan Bangsa</p>
            <div className="h-16"></div>
            <p className="font-bold underline">Dra. Hj. Nurhayati, M.M.</p>
            <p>NIP. 197008151995122001</p>
          </div>
        </div>
      </div>

    </div>
  );
}
