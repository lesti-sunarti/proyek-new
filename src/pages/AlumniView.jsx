import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Plus, Search } from 'lucide-react';

const STATUS_LABELS = { kuliah: 'Kuliah', kerja: 'Bekerja', wirausaha: 'Wirausaha', mencari_kerja: 'Mempersiapkan Karir' };

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan.');
  return data;
}

export default function AlumniView() {
  const { canAccess, showToast } = useAuth();
  // GET /api/alumni bersifat publik, tetapi POST memerlukan modul broadcast (staf humas/TU).
  const canManageAlumni = canAccess('broadcast');
  const [alumni, setAlumni] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form tracer alumni
  const [name, setName] = useState('');
  const [gradYear, setGradYear] = useState(String(new Date().getFullYear()));
  const [nisn, setNisn] = useState('');
  const [status, setStatus] = useState('kuliah');
  const [institution, setInstitution] = useState('');
  const [positionOrMajor, setPositionOrMajor] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [testimonial, setTestimonial] = useState('');

  const loadAlumni = () => {
    requestJson('/api/alumni')
      .then((data) => setAlumni(Array.isArray(data) ? data : []))
      .catch((error) => { setAlumni([]); showToast(error.message, 'error'); });
  };

  useEffect(() => {
    loadAlumni();
  }, []);

  const resetForm = () => {
    setName('');
    setNisn('');
    setInstitution('');
    setPositionOrMajor('');
    setPhone('');
    setEmail('');
    setTestimonial('');
  };

  const handleAddAlumni = async (e) => {
    e.preventDefault();
    const year = Number(gradYear);
    if (!name.trim() || !institution.trim()) return showToast('Nama dan institusi harus diisi', 'error');
    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) return showToast('Tahun kelulusan tidak valid', 'error');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return showToast('Format email tidak valid', 'error');

    setIsSaving(true);
    try {
      const data = await requestJson('/api/alumni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          graduation_year: year,
          nisn: nisn.trim() || null,
          current_status: status,
          institution_name: institution.trim(),
          position_or_major: positionOrMajor.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          testimonial: testimonial.trim() || null
        })
      });
      showToast(data.message || 'Data alumni berhasil disimpan', 'success');
      setShowAddModal(false);
      resetForm();
      loadAlumni();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredAlumni = alumni.filter(a =>
    !term ||
    String(a.name || '').toLowerCase().includes(term) ||
    String(a.institution_name || '').toLowerCase().includes(term)
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

        {canManageAlumni ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Isi Form Tracer Alumni
          </button>
        ) : (
          <p className="text-[11px] text-slate-500 sm:max-w-[220px] sm:text-right">Pendataan alumni baru dilakukan oleh tim humas / tata usaha. Alumni dapat mengirim data melalui Pusat Bantuan.</p>
        )}
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
      {filteredAlumni.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
          {alumni.length === 0 ? 'Belum ada data alumni yang tercatat.' : 'Tidak ada alumni yang cocok dengan pencarian.'}
        </div>
      )}
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
                  {STATUS_LABELS[a.current_status] || a.current_status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{a.name}</h3>
                <div className="text-xs text-slate-600 font-semibold mt-1">
                  {a.institution_name || '-'}
                </div>
                <div className="text-xs text-slate-500">{a.position_or_major || ''}</div>
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
      {showAddModal && canManageAlumni && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[92vh] overflow-y-auto">
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
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">NISN (saat sekolah):</label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">No. HP / WhatsApp:</label>
                  <input
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email:</label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                </div>
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-60"
                >
                  {isSaving ? 'Menyimpan…' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
