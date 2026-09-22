import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 50; // Server membatasi limit maksimal 100 per permintaan.

const actionLabel = {
  login: 'Masuk sistem', logout: 'Keluar sistem', access_denied: 'Akses ditolak',
  post: 'Membuat data', put: 'Memperbarui data', patch: 'Memperbarui status', delete: 'Menghapus data', view_sensitive_data: 'Membuka data sensitif',
};

const statusLabel = { success: 'Berhasil', denied: 'Ditolak', failed: 'Gagal' };

const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('id-ID');
};

export default function AuditLogView() {
  const { showToast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: PAGE_SIZE, offset: 0 });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async (nextOffset = offset) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/system/audit-log?limit=${PAGE_SIZE}&offset=${nextOffset}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.message || 'Jejak aktivitas tidak dapat dimuat');
      setLogs(Array.isArray(data.data) ? data.data : []);
      setMeta({
        total: Number(data.meta?.total) || 0,
        limit: Number(data.meta?.limit) || PAGE_SIZE,
        offset: Number(data.meta?.offset) || 0,
      });
      setError('');
    } catch (err) { setError(err.message); showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(offset); }, [offset]);

  const pageStart = meta.total === 0 ? 0 : meta.offset + 1;
  const pageEnd = Math.min(meta.offset + logs.length, meta.total);
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < meta.total;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#f4a024]"><ShieldCheck className="h-4 w-4" /> Keamanan sistem</div><h1 className="mt-2 text-2xl font-bold tracking-tight text-[#002147]">Jejak aktivitas</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Catatan perubahan dan akses penting untuk akuntabilitas operasional sekolah.</p></div>
        <button onClick={() => loadLogs(offset)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-[#002147] transition hover:border-[#002147] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Muat ulang</button>
      </section>
      <section className="grid gap-4 sm:grid-cols-3"><div className="border-l-4 border-[#002147] bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Total aktivitas tercatat</p><p className="mt-1 text-2xl font-bold text-[#002147]">{meta.total}</p></div><div className="border-l-4 border-emerald-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Berhasil (halaman ini)</p><p className="mt-1 text-2xl font-bold text-emerald-700">{logs.filter((item) => item.status === 'success').length}</p></div><div className="border-l-4 border-amber-500 bg-white px-4 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">Perlu perhatian (halaman ini)</p><p className="mt-1 text-2xl font-bold text-amber-700">{logs.filter((item) => item.status !== 'success').length}</p></div></section>
      <section className="overflow-hidden border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-sm font-bold text-[#002147]"><Activity className="h-4 w-4 text-[#f4a024]" />Aktivitas terbaru</div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Memuat jejak aktivitas…</div> : error && logs.length === 0 ? <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-slate-500"><AlertTriangle className="h-6 w-6 text-amber-500" /><p>{error}</p><button onClick={() => loadLogs(offset)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-[#002147] hover:border-[#002147]">Coba lagi</button></div> : logs.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Belum ada aktivitas yang dicatat.</div> : <div className="overflow-x-auto"><table className="min-w-[780px] w-full text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Waktu</th><th className="px-5 py-3">Aktor</th><th className="px-5 py-3">Aktivitas</th><th className="px-5 py-3">Layanan</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((item) => <tr key={item.id} className="text-xs text-slate-600"><td className="whitespace-nowrap px-5 py-3.5 font-mono text-[11px]">{formatTime(item.created_at)}</td><td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{item.actor_username || 'Sistem / tidak dikenal'}</p><p className="mt-0.5 text-[10px] text-slate-400">{item.actor_role || '-'}</p></td><td className="px-5 py-3.5"><p>{actionLabel[item.action] || item.action || '-'}</p>{item.request_method && item.request_path && <p className="mt-0.5 font-mono text-[10px] text-slate-400">{item.request_method} {item.request_path}</p>}</td><td className="px-5 py-3.5">{item.resource || '-'}</td><td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.status !== 'success' && <AlertTriangle className="h-3 w-3" />}{statusLabel[item.status] || item.status || '-'}</span></td></tr>)}</tbody></table></div>}
        {!loading && meta.total > 0 && <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Menampilkan {pageStart}–{pageEnd} dari {meta.total} aktivitas</span><div className="flex items-center gap-2"><button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={!hasPrev} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold text-[#002147] disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya</button><button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={!hasNext} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold text-[#002147] disabled:opacity-40">Berikutnya <ChevronRight className="h-3.5 w-3.5" /></button></div></div>}
      </section>
    </div>
  );
}
