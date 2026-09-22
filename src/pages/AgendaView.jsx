import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Users, 
  Sparkles, 
  Trash2, 
  Search, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Filter
} from 'lucide-react';

// Parse 'YYYY-MM-DD' sebagai tanggal LOKAL. new Date('YYYY-MM-DD') dibaca sebagai UTC sehingga
// di zona WIB agenda hari ini terhitung "1 Hari Lagi" dan bisa bergeser hari di zona lain.
const parseLocalDate = (value) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatEventDate = (value) => {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : (value || '-');
};

// Pola fetch standar: lempar Error berisi pesan server untuk respons non-OK.
const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan');
  return data;
};

export default function AgendaView() {
  const { canAccess, showToast } = useAuth();
  // Tambah/hapus agenda memerlukan modul 'broadcast' (server menolak 403 untuk staf lain); halaman ini publik.
  const canManageAgenda = canAccess('broadcast');
  const [agendas, setAgendas] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState('all'); // all, siswa, guru, ortu, semua
  const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, selesai

  // Form agenda baru
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('Aula Utama');
  const [audience, setAudience] = useState('semua');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAgendas = () => {
    fetchJson('/api/agenda')
      .then(data => { setAgendas(Array.isArray(data) ? data : []); setLoadError(''); })
      .catch(err => { setAgendas([]); setLoadError(err.message || 'Agenda belum dapat dimuat.'); });
  };

  useEffect(() => {
    loadAgendas();
  }, []);

  const handleAddAgenda = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!canManageAgenda) return showToast('Akun Anda tidak memiliki hak untuk menambah agenda.', 'error');
    if (!title.trim() || !eventDate) {
      return showToast('Judul dan tanggal agenda harus diisi', 'error');
    }
    if (startTime && endTime && endTime <= startTime) {
      return showToast('Jam selesai harus setelah jam mulai', 'error');
    }

    setIsSubmitting(true);
    try {
      const data = await fetchJson('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime,
          location: location.trim() || 'Lingkungan Sekolah',
          audience
        })
      });

      showToast(data.message || 'Agenda kegiatan sekolah berhasil ditambahkan', 'success');
      setShowAddModal(false);
      setTitle('');
      setDescription('');
      setEventDate('');
      loadAgendas();
    } catch (err) {
      showToast('Gagal menambahkan agenda: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgenda = async (id, agendaTitle) => {
    if (!window.confirm(`Hapus agenda kegiatan: "${agendaTitle}"?`)) return;
    try {
      const data = await fetchJson(`/api/agenda/${id}`, { method: 'DELETE' });
      showToast(data.message || 'Agenda kegiatan berhasil dihapus', 'success');
      loadAgendas();
    } catch (err) {
      showToast('Gagal menghapus agenda: ' + err.message, 'error');
    }
  };

  // Hitung hari tersisa (berbasis tanggal lokal)
  const getDaysRemaining = (targetDateStr) => {
    const target = parseLocalDate(targetDateStr);
    if (!target) return 'Tanggal tidak valid';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hari ini!';
    if (diffDays < 0) return 'Selesai';
    return `${diffDays} Hari Lagi`;
  };

  // Filtered agendas
  const filteredAgendas = agendas.filter(ag => {
    const q = searchQuery.trim().toLowerCase();
    const matchQuery = !q || 
      ag.title?.toLowerCase().includes(q) ||
      ag.description?.toLowerCase().includes(q) ||
      ag.location?.toLowerCase().includes(q);

    const matchAudience = filterAudience === 'all' || ag.audience === filterAudience;

    const daysLeft = getDaysRemaining(ag.event_date);
    const isCompleted = daysLeft === 'Selesai';
    const matchStatus = filterStatus === 'all' || 
      (filterStatus === 'upcoming' && !isCompleted) || 
      (filterStatus === 'selesai' && isCompleted);

    return matchQuery && matchAudience && matchStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-xs font-bold uppercase mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#f4a024]" /> Modul 10: Agenda Kegiatan Sekolah
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            Kalender Kegiatan & Acara Sekolah
          </h2>
          <p className="text-xs sm:text-sm text-black font-medium mt-1">
            Publikasi jadwal kegiatan akademik, rapat wali murid, perlombaan, dan hari libur sekolah resmi.
          </p>
        </div>

        {canManageAgenda && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-xl bg-black hover:bg-neutral-800 active:scale-[0.98] text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-[#f4a024]" /> Tambah Agenda Baru
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-black absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama agenda, deskripsi, atau lokasi acara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-black placeholder:text-slate-500 font-bold focus:outline-none focus:border-black focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-black font-bold focus:outline-none focus:border-black transition-all"
          >
            <option value="all">Semua Status</option>
            <option value="upcoming">Akan Datang</option>
            <option value="selesai">Sudah Selesai</option>
          </select>

          <select
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-black font-bold focus:outline-none focus:border-black transition-all"
          >
            <option value="all">Semua Audiens</option>
            <option value="semua">Warga Sekolah</option>
            <option value="siswa">Khusus Siswa</option>
            <option value="guru">Khusus Guru</option>
            <option value="ortu">Khusus Orang Tua</option>
          </select>
        </div>
      </div>

      {/* Grid Agenda Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgendas.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border-2 border-slate-200 rounded-3xl p-6">
            <Calendar className="w-12 h-12 text-black mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-black text-black">{loadError ? 'Agenda Belum Dapat Dimuat' : 'Tidak Ada Agenda Kegiatan'}</h3>
            <p className="text-xs text-black font-medium mt-1">
              {loadError || (agendas.length === 0
                ? 'Belum ada agenda kegiatan yang dipublikasikan.'
                : 'Tidak ditemukan agenda yang sesuai dengan pencarian atau filter yang dipilih.')}
            </p>
          </div>
        ) : (
          filteredAgendas.map((ag) => {
            const daysLeft = getDaysRemaining(ag.event_date);
            const isCompleted = daysLeft === 'Selesai';
            const isToday = daysLeft === 'Hari ini!';

            return (
              <div
                key={ag.id}
                className="bg-white border-2 border-slate-300 hover:border-black rounded-3xl p-6 transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${
                      isToday 
                        ? 'bg-rose-100 text-rose-950 border-rose-300 animate-pulse' 
                        : !isCompleted 
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300' 
                          : 'bg-slate-200 text-black border-slate-400'
                    }`}>
                      {daysLeft}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-black uppercase font-black tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        Untuk: {ag.audience}
                      </span>
                      
                      {canManageAgenda && (
                        <button
                          onClick={() => handleDeleteAgenda(ag.id, ag.title)}
                          className="p-1 rounded-lg hover:bg-rose-100 text-black hover:text-rose-700 transition-all"
                          title="Hapus Agenda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description in solid black */}
                  <h3 className="text-base sm:text-lg font-black text-black leading-snug">
                    {ag.title}
                  </h3>
                  <p className="text-xs text-black font-medium leading-relaxed">
                    {ag.description || 'Tidak ada keterangan tambahan.'}
                  </p>
                </div>

                {/* Metadata in solid black */}
                <div className="pt-4 border-t-2 border-slate-200 text-xs text-black font-bold space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-black shrink-0" />
                    <span className="text-black">
                      {formatEventDate(ag.event_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-black shrink-0" />
                    <span className="text-black">{ag.start_time} - {ag.end_time} WIB</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-black shrink-0" />
                    <span className="text-black">{ag.location}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tambah Agenda */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 text-black transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-black">Tambah Agenda Kegiatan Sekolah</h3>
              <p className="text-xs text-black font-medium mt-0.5">Jadwalkan kegiatan akademik atau acara sekolah resmi.</p>
            </div>

            <form onSubmit={handleAddAgenda} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-black mb-1">Nama Acara / Kegiatan: *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penilaian Akhir Semester (PAS)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold placeholder:text-slate-400 focus:outline-none focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Tanggal Acara: *</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold focus:outline-none focus:border-black transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-black mb-1">Jam Mulai:</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold focus:outline-none focus:border-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-black mb-1">Jam Selesai:</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold focus:outline-none focus:border-black transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Lokasi Kegiatan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Gedung Olahraga / Lapangan Utama"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold placeholder:text-slate-400 focus:outline-none focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Target Audiens:</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold focus:outline-none focus:border-black transition-all"
                >
                  <option value="semua">Semua Warga Sekolah</option>
                  <option value="siswa">Khusus Peserta Didik (Siswa)</option>
                  <option value="guru">Khusus Tenaga Pendidik (Guru)</option>
                  <option value="ortu">Khusus Orang Tua / Wali Murid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Deskripsi Kegiatan:</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan detail acara..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl p-3 text-xs text-black font-bold placeholder:text-slate-400 focus:outline-none focus:border-black transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-black transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-black hover:bg-neutral-800 active:scale-[0.98] text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
