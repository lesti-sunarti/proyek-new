import React, { useEffect, useState } from 'react';
import {
  Lightbulb,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  EyeOff,
  User,
  Tag,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const categories = ['Semua', 'Pembelajaran', 'Fasilitas', 'Kegiatan', 'Keamanan', 'Kesejahteraan', 'Lainnya'];
const STATUS_OPTIONS = ['baru', 'ditinjau', 'ditindaklanjuti', 'selesai'];
const EMPTY_SUMMARY = { total: 0, statusCounts: [], categoryCounts: [] };

// Pola fetch standar: lempar Error berisi pesan server untuk respons non-OK.
const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan');
  return data;
};

export default function FeedbackView() {
  const { currentUser, currentRole, isStaff, showToast } = useAuth();
  const [feedbackList, setFeedbackList] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('semua');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Form State
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Fasilitas');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const fetchFeedback = () => {
    fetchJson('/api/feedback?limit=100')
      .then(data => { setFeedbackList(Array.isArray(data) ? data : []); setLoadError(''); })
      .catch(err => { setFeedbackList([]); setLoadError(err.message || 'Daftar aspirasi tidak dapat dimuat.'); });

    // Ringkasan berbentuk objek {total, statusCounts:[{status,count}], categoryCounts:[{category,count}]}
    fetchJson('/api/feedback/summary')
      .then(data => setSummary({
        total: Number(data?.total) || 0,
        statusCounts: Array.isArray(data?.statusCounts) ? data.statusCounts : [],
        categoryCounts: Array.isArray(data?.categoryCounts) ? data.categoryCounts : [],
      }))
      .catch(() => setSummary(EMPTY_SUMMARY));
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage) {
      showToast('Mohon isi topik dan pesan aspirasi Anda.', 'error');
      return;
    }
    if (cleanSubject.length > 180 || cleanMessage.length > 3000) {
      showToast('Topik maksimal 180 karakter dan isi aspirasi maksimal 3000 karakter.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchJson('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: isAnonymous ? '' : currentUser.name,
          sender_role: currentRole,
          is_anonymous: isAnonymous,
          category,
          subject: cleanSubject,
          message: cleanMessage
        })
      });
      const code = data.feedback?.submission_code;
      showToast(`${data.message || 'Aspirasi berhasil dikirimkan!'}${code ? ` Kode: ${code}` : ''}`, 'success');
      setSubject('');
      setMessage('');
      fetchFeedback();
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan saat mengirim aspirasi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const target = feedbackList.find(item => item.id === id);
    if (!target || target.status === newStatus || updatingId) return;
    setUpdatingId(id);
    try {
      const data = await fetchJson(`/api/feedback/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      showToast(data.message || 'Status aspirasi berhasil diperbarui', 'success');
      fetchFeedback();
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Angka ringkasan memakai data server (seluruh aspirasi), bukan hanya daftar yang dimuat.
  const statusCount = (...statuses) => {
    if (summary.statusCounts.length) {
      return summary.statusCounts.filter(item => statuses.includes(item.status)).reduce((acc, item) => acc + (Number(item.count) || 0), 0);
    }
    return feedbackList.filter(item => statuses.includes(item.status)).length;
  };

  const filteredList = feedbackList.filter(item => {
    const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchStatus = selectedStatus === 'semua' || item.status === selectedStatus;
    return matchCategory && matchStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'baru':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Baru</span>;
      case 'ditinjau':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Ditinjau</span>;
      case 'ditindaklanjuti':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Ditindaklanjuti</span>;
      case 'selesai':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Selesai</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-[#002147] text-xs font-bold uppercase tracking-wider mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-[#f4a024]" /> Keterbukaan & Partisipasi Sekolah
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#002147]">Ruang Aspirasi & Saran Sekolah</h2>
          <p className="text-xs text-slate-500 mt-1">
            Salurkan ide, kritik membangun, dan saran demi peningkatan mutu sarana serta kegiatan sekolah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Jaminan Privasi & Aman
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400">Total Aspirasi Masuk</div>
          <div className="text-xl font-black text-[#002147] mt-1">{summary.total || feedbackList.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Semua kategori saran</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400">Sedang Ditinjau</div>
          <div className="text-xl font-black text-amber-600 mt-1">
            {statusCount('baru', 'ditinjau')}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">Menunggu respon pengelola</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400">Ditindaklanjuti</div>
          <div className="text-xl font-black text-indigo-600 mt-1">
            {statusCount('ditindaklanjuti')}
          </div>
          <div className="text-[10px] text-indigo-700 mt-0.5">Proses perbaikan/tindakan</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400">Terselesaikan</div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {statusCount('selesai')}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Solusi telah diterapkan</div>
        </div>
      </div>

      {/* MAIN CONTENT: FORM + LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* FORM KIRIM ASPIRASI */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-[#002147] mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#f4a024]" /> Tulis Aspirasi / Saran
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Bisa dikirim atas nama pribadi maupun secara anonim tanpa identitas.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori Topik</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002147]"
              >
                <option value="Fasilitas">Fasilitas & Sarana Prasarana</option>
                <option value="Pembelajaran">Kegiatan Pembelajaran & KBM</option>
                <option value="Kegiatan">Kegiatan Siswa & Ekstrakurikuler</option>
                <option value="Keamanan">Ketertiban & Keamanan Lingkungan</option>
                <option value="Kesejahteraan">Kantin & Kesejahteraan Siswa</option>
                <option value="Lainnya">Lain-lain / Saran Terbuka</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Judul / Topik Saran</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Perbaikan AC dan Proyektor di Ruang Kelas X MIPA 1"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002147]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Isi Pesan / Uraian Saran</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="4"
                placeholder="Jelaskan secara rinci kondisi lapangan dan usulan solusi yang Anda harapkan..."
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002147]"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-slate-500" />
                <div>
                  <div className="font-semibold text-slate-800 text-[11px]">Kirim Secara Anonim</div>
                  <div className="text-[10px] text-slate-500">Nama Anda tidak akan ditampilkan ke publik</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-[#002147] focus:ring-[#002147] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#002147] hover:bg-[#0a2f5c] disabled:opacity-60 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-[#f4a024]" />
              {loading ? 'Mengirimkan...' : 'Kirimkan Aspirasi Sekarang'}
            </button>
          </form>
        </div>

        {/* FEEDBACK LIST & FILTER */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* CATEGORY FILTER PILLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#002147] text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="ml-auto text-xs border border-slate-200 rounded-full px-3 py-1 bg-white text-slate-600 font-semibold"
            >
              <option value="semua">Semua Status</option>
              {STATUS_OPTIONS.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          {loadError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{loadError}</div>
          )}

          {/* LIST */}
          <div className="space-y-3">
            {filteredList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">Belum ada aspirasi pada kategori ini.</p>
              </div>
            ) : (
              filteredList.map((item) => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.submission_code || `#ASP-${item.id}`}
                      </span>
                    </div>
                    <div>{getStatusBadge(item.status)}</div>
                  </div>

                  <h4 className="text-sm font-bold text-[#002147] leading-snug">{item.subject}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{item.message}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.is_anonymous ? 'Pengguna Anonim' : item.sender_name || 'Warga Sekolah'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="capitalize">{item.sender_role || 'publik'}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.created_at}
                    </div>
                  </div>

                  {/* ADMIN / GURU CONTROLS TO CHANGE STATUS */}
                  {isStaff && (
                    <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">Ubah Status Respons:</span>
                      <div className="flex gap-1.5">
                        {['ditinjau', 'ditindaklanjuti', 'selesai'].map((st) => (
                          <button
                            key={st}
                            disabled={updatingId === item.id || item.status === st}
                            onClick={() => handleUpdateStatus(item.id, st)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors disabled:cursor-default ${
                              item.status === st
                                ? 'bg-[#002147] text-white border-[#002147]'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
