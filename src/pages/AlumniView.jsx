import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Briefcase, GraduationCap, Plus, Search, UserCheck, MessageSquare } from 'lucide-react';

export default function AlumniView() {
  const { showToast } = useAuth();
  const [alumni, setAlumni] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form tracer alumni
  const [name, setName] = useState('');
  const [gradYear, setGradYear] = useState(2023);
  const [nisn, setNisn] = useState('');
  const [status, setStatus] = useState('kuliah');
  const [institution, setInstitution] = useState('');
  const [positionOrMajor, setPositionOrMajor] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [testimonial, setTestimonial] = useState('');

  const loadAlumni = () => {
    fetch('/api/alumni').then(r => r.json()).then(setAlumni).catch(() => {});
  };

  useEffect(() => {
    loadAlumni();
  }, []);

  const handleAddAlumni = (e) => {
    e.preventDefault();
    if (!name || !institution) return showToast('Nama dan institusi harus diisi', 'error');

    fetch('/api/alumni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        graduation_year: Number(gradYear),
        nisn,
        current_status: status,
        institution_name: institution,
        position_or_major: positionOrMajor,
        phone,
        email,
        testimonial
      })
    })
      .then(r => r.json())
      .then(data => {
        showToast(data.message, 'success');
        setShowAddModal(false);
        setName('');
        setInstitution('');
        setPositionOrMajor('');
        setTestimonial('');
        loadAlumni();
      });
  };

  const filteredAlumni = alumni.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.institution_name && a.institution_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <Award className="w-3.5 h-3.5" /> Modul 14: Data Alumni (Tracer Study)
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Direktori & Jejak Karir Lulusan</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pelacakan studi lanjut di perguruan tinggi negeri/swasta, dunia kerja, wirausaha, serta testimoni alumni.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Isi Form Tracer Alumni
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Cari nama alumni atau nama kampus/perusahaan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
        />
      </div>

      {/* Alumni Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAlumni.map((a) => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 hover:border-slate-200 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Angkatan {a.graduation_year}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  a.current_status === 'kuliah' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : a.current_status === 'kerja' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {a.current_status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{a.name}</h3>
                <div className="text-xs text-slate-600 font-semibold mt-1">
                  {a.institution_name}
                </div>
                <div className="text-xs text-slate-500">{a.position_or_major}</div>
              </div>

              {a.testimonial && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 italic">
                  "{a.testimonial}"
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
              <span>NISN: {a.nisn || '-'}</span>
              <span>{a.email || a.phone || 'Terverifikasi'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Alumni */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900">Form Pendataan Alumni (Tracer Study)</h3>

            <form onSubmit={handleAddAlumni} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  placeholder="Contoh: Rian Pratama, S.Kom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tahun Kelulusan:</label>
                  <input
                    type="number"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status Saat Ini:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  >
                    <option value="kuliah">Kuliah (Perguruan Tinggi)</option>
                    <option value="kerja">Bekerja di Perusahaan/Instansi</option>
                    <option value="wirausaha">Wirausaha / Bisnis Mandiri</option>
                    <option value="mencari_kerja">Mempersiapkan Karir</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Nama Kampus / Nama Kantor:</label>
                <input
                  type="text"
                  placeholder="Contoh: Universitas Indonesia / PT Bank Mandiri"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Program Studi / Jabatan Karir:</label>
                <input
                  type="text"
                  placeholder="Contoh: Teknik Informatika / Data Analyst"
                  value={positionOrMajor}
                  onChange={(e) => setPositionOrMajor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Pesan / Kesan untuk Sekolah:</label>
                <textarea
                  rows={3}
                  placeholder="Ceritakan pengalaman belajar di sekolah ini..."
                  value={testimonial}
                  onChange={(e) => setTestimonial(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
