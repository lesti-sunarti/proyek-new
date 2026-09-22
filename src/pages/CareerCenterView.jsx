import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  MapPin,
  Plus,
  Send,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const typeMeta = {
  magang: { label: 'Magang', tone: 'bg-blue-50 text-blue-700 border-blue-100', icon: Briefcase },
  beasiswa: { label: 'Beasiswa', tone: 'bg-amber-50 text-amber-800 border-amber-100', icon: Award },
  karier: { label: 'Karier', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: UsersRound },
  webinar: { label: 'Kelas Karier', tone: 'bg-violet-50 text-violet-700 border-violet-100', icon: GraduationCap },
};

const emptyOpportunity = { title: '', opportunity_type: 'magang', organization: '', location: '', description: '', requirements: '', deadline: '', contact_person: '' };

export default function CareerCenterView() {
  const { currentRole, currentUser, isStaff, showToast } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('semua');
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [candidate, setCandidate] = useState({ name: currentUser?.name || '', class_name: '', notes: '' });
  const [newOpportunity, setNewOpportunity] = useState(emptyOpportunity);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    Promise.all([
      fetch('/api/careers/opportunities').then((response) => response.ok ? response.json() : []),
      fetch('/api/careers/applications').then((response) => response.ok ? response.json() : []),
    ])
      .then(([opportunityData, applicationData]) => {
        setOpportunities(Array.isArray(opportunityData) ? opportunityData : []);
        setApplications(Array.isArray(applicationData) ? applicationData : []);
      })
      .catch(() => showToast('Data pusat karier belum dapat dimuat.', 'error'));
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCandidate((previous) => ({ ...previous, name: currentUser?.name || previous.name })); }, [currentUser]);

  const visibleOpportunities = useMemo(() => opportunities.filter((item) => filter === 'semua' || item.opportunity_type === filter), [filter, opportunities]);

  const submitInterest = async (event) => {
    event.preventDefault();
    if (!candidate.name.trim() || !selectedOpportunity) {
      showToast('Nama pendaftar wajib diisi.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch('/api/careers/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: selectedOpportunity.id, applicant_name: candidate.name, applicant_role: currentRole, class_name: candidate.class_name, notes: candidate.notes }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.message || 'Permintaan tidak dapat diproses.');
      showToast(data.message, 'success');
      setSelectedOpportunity(null);
      setCandidate((previous) => ({ ...previous, notes: '' }));
      loadData();
    } catch (error) {
      showToast(error.message || 'Pendaftaran minat belum berhasil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const createOpportunity = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/careers/opportunities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newOpportunity),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.message || 'Permintaan tidak dapat diproses.');
      showToast(data.message, 'success');
      setShowCreate(false);
      setNewOpportunity(emptyOpportunity);
      loadData();
    } catch (error) {
      showToast(error.message || 'Peluang belum dapat dipublikasikan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const hasApplied = (opportunityId) => applications.some((item) => item.opportunity_id === opportunityId && item.applicant_name === currentUser?.name);

  return (
    <div className="space-y-7 pb-12">
      <section className="overflow-hidden rounded-2xl bg-[#002147] p-6 text-white shadow-lg shadow-[#002147]/10 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300"><Briefcase className="h-4 w-4" /> Masa depan & kemitraan</div>
            <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">Pusat Karier & Magang</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">Satu ruang untuk menemukan peluang magang, beasiswa, kelas karier, dan jaringan mitra yang relevan dengan rencana masa depan siswa.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div><div className="text-2xl font-semibold text-[#f4a024]">{opportunities.length}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Peluang aktif</div></div>
            <div><div className="text-2xl font-semibold text-[#f4a024]">{applications.length}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Minat tercatat</div></div>
          </div>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {[['semua', 'Semua peluang'], ...Object.entries(typeMeta).map(([key, value]) => [key, value.label])].map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${filter === value ? 'bg-[#002147] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{label}</button>
          ))}
        </div>
        {isStaff && <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#002147] px-3.5 py-2 text-xs font-bold text-[#002147] transition-colors hover:bg-[#002147] hover:text-white"><Plus className="h-4 w-4" /> Publikasikan peluang</button>}
      </section>

      {visibleOpportunities.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {visibleOpportunities.map((opportunity) => {
            const meta = typeMeta[opportunity.opportunity_type] || typeMeta.karier;
            const Icon = meta.icon;
            const expired = opportunity.deadline && new Date(`${opportunity.deadline}T23:59:59`) < new Date();
            return (
              <article key={opportunity.id} className="surface-card flex flex-col rounded-xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.tone}`}><Icon className="h-3.5 w-3.5" /> {meta.label}</span><span className="text-[11px] text-slate-400">{opportunity.application_count || 0} minat</span></div>
                <h3 className="mt-4 text-2xl font-semibold leading-tight text-[#002147]">{opportunity.title}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">{opportunity.organization}</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">{opportunity.description}</p>
                <div className="mt-4 grid gap-2 border-y border-slate-100 py-3 text-xs text-slate-600 sm:grid-cols-2">
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-amber-700" /> {opportunity.location || 'Daring / lokasi menyusul'}</span>
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-amber-700" /> {opportunity.deadline ? `Tutup ${new Date(`${opportunity.deadline}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Pendaftaran dibuka'}</span>
                </div>
                {opportunity.requirements && <p className="mt-3 text-[11px] leading-5 text-slate-500"><strong className="font-bold text-slate-700">Persiapan:</strong> {opportunity.requirements}</p>}
                <div className="mt-5 flex items-center justify-between gap-3"><span className="text-[11px] text-slate-400">{opportunity.contact_person || 'Hubungi pembimbing karier'}</span><button disabled={expired || hasApplied(opportunity.id)} onClick={() => setSelectedOpportunity(opportunity)} className="inline-flex items-center gap-1 rounded-lg bg-[#002147] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0b315f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{expired ? 'Sudah ditutup' : hasApplied(opportunity.id) ? <><CheckCircle2 className="h-3.5 w-3.5" /> Minat terkirim</> : <>Daftar minat <ChevronRight className="h-3.5 w-3.5" /></>}</button></div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Briefcase className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-4 text-xl font-semibold text-[#002147]">Belum ada peluang pada kategori ini</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Tim sekolah dapat mempublikasikan magang, beasiswa, atau kelas karier baru dari tombol di atas.</p></section>
      )}

      {selectedOpportunity && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Pernyataan minat</div><h3 className="mt-1 text-2xl font-semibold text-[#002147]">{selectedOpportunity.title}</h3></div><button onClick={() => setSelectedOpportunity(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={submitInterest} className="mt-5 space-y-4"><label className="block text-xs font-semibold text-slate-700">Nama pendaftar<input value={candidate.name} onChange={(event) => setCandidate({ ...candidate, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><label className="block text-xs font-semibold text-slate-700">Kelas / angkatan<input value={candidate.class_name} onChange={(event) => setCandidate({ ...candidate, class_name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" placeholder="Contoh: XI MIPA 1" /></label><label className="block text-xs font-semibold text-slate-700">Catatan singkat (opsional)<textarea value={candidate.notes} onChange={(event) => setCandidate({ ...candidate, notes: event.target.value })} rows="3" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" placeholder="Minat atau kemampuan yang ingin kamu kembangkan" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setSelectedOpportunity(null)} className="rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Batal</button><button disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[#002147] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Send className="h-3.5 w-3.5" /> {isSaving ? 'Mengirim…' : 'Kirim minat'}</button></div></form></div></div>}

      {showCreate && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Mitra & kesempatan</div><h3 className="mt-1 text-2xl font-semibold text-[#002147]">Publikasikan peluang</h3></div><button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={createOpportunity} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700 sm:col-span-2">Judul peluang<input required value={newOpportunity.title} onChange={(event) => setNewOpportunity({ ...newOpportunity, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><label className="block text-xs font-semibold text-slate-700">Jenis<select value={newOpportunity.opportunity_type} onChange={(event) => setNewOpportunity({ ...newOpportunity, opportunity_type: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#002147]"><option value="magang">Magang</option><option value="beasiswa">Beasiswa</option><option value="karier">Karier</option><option value="webinar">Kelas karier</option></select></label><label className="block text-xs font-semibold text-slate-700">Mitra / penyelenggara<input required value={newOpportunity.organization} onChange={(event) => setNewOpportunity({ ...newOpportunity, organization: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><label className="block text-xs font-semibold text-slate-700">Lokasi<input value={newOpportunity.location} onChange={(event) => setNewOpportunity({ ...newOpportunity, location: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><label className="block text-xs font-semibold text-slate-700">Batas pendaftaran<input type="date" value={newOpportunity.deadline} onChange={(event) => setNewOpportunity({ ...newOpportunity, deadline: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><label className="block text-xs font-semibold text-slate-700 sm:col-span-2">Deskripsi<textarea required rows="3" value={newOpportunity.description} onChange={(event) => setNewOpportunity({ ...newOpportunity, description: event.target.value })} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><label className="block text-xs font-semibold text-slate-700">Persyaratan<textarea rows="2" value={newOpportunity.requirements} onChange={(event) => setNewOpportunity({ ...newOpportunity, requirements: event.target.value })} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><label className="block text-xs font-semibold text-slate-700">Kontak pengampu<input value={newOpportunity.contact_person} onChange={(event) => setNewOpportunity({ ...newOpportunity, contact_person: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#002147]" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Batal</button><button disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[#002147] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Plus className="h-3.5 w-3.5" /> {isSaving ? 'Menyimpan…' : 'Publikasikan'}</button></div></form></div></div>}
    </div>
  );
}
