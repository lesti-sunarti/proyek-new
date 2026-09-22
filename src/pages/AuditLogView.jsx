import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const actionLabel = {
  login: 'Masuk sistem', logout: 'Keluar sistem', access_denied: 'Akses ditolak',
  post: 'Membuat data', put: 'Memperbarui data', patch: 'Memperbarui status', delete: 'Menghapus data', view_sensitive_data: 'Membuka data sensitif',
};

export default function AuditLogView() {
  const { showToast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/audit-log?limit=75');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Audit tidak dapat dimuat');
      setLogs(data.data || []);
      setMeta(data.meta || { total: 0 });
    } catch (error) { showToast(error.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, []);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#f4a024]"><ShieldCheck className="h-4 w-4" /> Keamanan sistem</div><h1 className="mt-2 text-2xl font-bold tracking-tight text-[#002147]">Jejak aktivitas</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Catatan perubahan dan akses penting untuk akuntabilitas operasional sekolah.</p></div>
        <button onClick={loadLogs} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-[#002147] transition hover:border-[#002147] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Muat ulang</button>
      </section>
      <section className="grid gap-4 sm:grid-cols-3"><div className="border-l-4 border-[#002147] bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Total aktivitas</p><p className="mt-1 text-2xl font-bold text-[#002147]">{meta.total}</p></div><div className="border-l-4 border-emerald-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Aktivitas berhasil</p><p className="mt-1 text-2xl font-bold text-emerald-700">{logs.filter((item) => item.status === 'success').length}</p></div><div className="border-l-4 border-amber-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Perlu perhatian</p><p className="mt-1 text-2xl font-bold text-amber-700">{logs.filter((item) => item.status !== 'success').length}</p></div></section>
      <section className="overflow-hidden border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-sm font-bold text-[#002147]"><Activity className="h-4 w-4 text-[#f4a024]" />Aktivitas terbaru</div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Memuat jejak aktivitas…</div> : logs.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Belum ada aktivitas yang dicatat.</div> : <div className="overflow-x-auto"><table className="min-w-[780px] w-full text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Waktu</th><th className="px-5 py-3">Aktor</th><th className="px-5 py-3">Aktivitas</th><th className="px-5 py-3">Layanan</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((item) => <tr key={item.id} className="text-xs text-slate-600"><td className="whitespace-nowrap px-5 py-3.5 font-mono text-[11px]">{new Date(item.created_at).toLocaleString('id-ID')}</td><td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{item.actor_username || 'Sistem / tidak dikenal'}</p><p className="mt-0.5 text-[10px] text-slate-400">{item.actor_role || '-'}</p></td><td className="px-5 py-3.5">{actionLabel[item.action] || item.action}</td><td className="px-5 py-3.5">{item.resource}</td><td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.status !== 'success' && <AlertTriangle className="h-3 w-3" />}{item.status === 'success' ? 'Berhasil' : item.status === 'denied' ? 'Ditolak' : 'Gagal'}</span></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
