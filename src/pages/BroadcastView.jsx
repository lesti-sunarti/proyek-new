import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Radio, Send, Bell, AlertTriangle, CheckCircle2, User, Clock } from 'lucide-react';

export default function BroadcastView() {
  const { broadcasts, showToast, setUrgentNotice } = useAuth();
  const [broadcastList, setBroadcastList] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('semua');
  const [isUrgent, setIsUrgent] = useState(false);

  const loadBroadcasts = () => {
    fetch('/api/broadcasts')
      .then(r => r.json())
      .then(data => setBroadcastList(data))
      .catch(() => {});
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!title || !message) return showToast('Judul dan isi pengumuman harus diisi', 'error');

    fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        target_role: targetRole,
        sender_name: 'Kepala Sekolah & Tim Manajemen',
        is_urgent: isUrgent ? 1 : 0
      })
    })
      .then(r => r.json())
      .then(data => {
        showToast(data.message, 'success');
        if (isUrgent) {
          setUrgentNotice({ title, message });
        }
        setTitle('');
        setMessage('');
        setIsUrgent(false);
        loadBroadcasts();
      });
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <Radio className="w-3.5 h-3.5" /> Modul 11: Broadcast Informasi
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Broadcast Pengumuman & Notifikasi Kilat</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kirim pengumuman resmi atau peringatan darurat ke seluruh smartphone guru, siswa, dan orang tua seketika.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Kirim Broadcast (Col 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" /> Siarkan Pengumuman Baru
          </h3>

          <form onSubmit={handleSendBroadcast} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Judul Pengumuman:</label>
              <input
                type="text"
                placeholder="Contoh: Jadwal Libur Awal Ramadhan 1446 H"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Target Penerima Pesan:</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
              >
                <option value="semua">Semua Warga Sekolah (Guru, Siswa, Ortu)</option>
                <option value="guru">Khusus Tenaga Pendidik & Staf (Guru)</option>
                <option value="siswa">Khusus Peserta Didik (Siswa)</option>
                <option value="ortu">Khusus Orang Tua / Wali Murid</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <input
                type="checkbox"
                id="urgentCheck"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded bg-white border-slate-200 text-rose-600 focus:ring-0"
              />
              <label htmlFor="urgentCheck" className="text-xs text-slate-600 font-semibold cursor-pointer">
                Tandai sebagai <span className="text-rose-400">URGENT (Banner Merah Berkedip)</span>
              </label>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Isi Pesan Broadcast:</label>
              <textarea
                rows={5}
                placeholder="Tuliskan instruksi pengumuman secara jelas..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Radio className="w-4 h-4 animate-pulse" /> Siarkan Pengumuman Sekarang
            </button>
          </form>
        </div>

        {/* Daftar Broadcast Terkirim (Col 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" /> Riwayat Pengumuman Tersiar ({broadcastList.length})
          </h3>

          <div className="space-y-3">
            {broadcastList.map((b) => (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                  b.is_urgent ? 'bg-rose-950/20 border-rose-500/40' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {b.is_urgent ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                        Info Resmi
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Target: {b.target_role}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {b.created_at}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{b.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{b.message}</p>
                </div>

                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  Pengirim: <strong className="text-slate-500">{b.sender_name}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
