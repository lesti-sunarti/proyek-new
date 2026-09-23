import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ClipboardPlus,
  Clock3,
  FileHeart,
  HeartPulse,
  Send,
  Stethoscope,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const visitLabels = {
  kembali_kelas: 'Kembali ke kelas',
  istirahat_uks: 'Istirahat di UKS',
  pulang_dengan_izin: 'Pulang dengan izin',
  rujukan: 'Rujukan medis',
};

const permissionLabels = { sakit: 'Sakit', izin: 'Izin', dispensasi: 'Dispensasi' };

const pad2 = (value) => String(value).padStart(2, '0');
// Tanggal hari ini dalam zona waktu lokal (bukan UTC) agar tidak bergeser sehari saat dini hari WIB.
const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

// Baca respons JSON dengan aman dan lempar pesan server (400/401/403/404/409/500) sebagai Error.
async function parseResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) throw new Error(data?.message || fallbackMessage);
  return data;
}

export default function HealthCenterView() {
  const { currentRole, currentUser, isStaff, showToast } = useAuth();
  const [visits, setVisits] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [activePanel, setActivePanel] = useState('visits');
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const isStudentSide = currentRole === 'siswa' || currentRole === 'ortu';
  // Siswa terkait akun (siswa/ortu) dari server. Server hanya mengembalikan & menerima data siswa ini,
  // sehingga identitas siswa pada form izin dikunci (tidak bisa diubah).
  const linkedStudent = isStudentSide ? (currentUser?.student || null) : null;
  const ownerLabel = currentRole === 'ortu' ? 'anak' : 'saya';
  const visitsTitle = isStudentSide ? `Catatan UKS ${ownerLabel}` : 'Kunjungan UKS';
  const permissionsTitle = isStudentSide ? `Izin ${ownerLabel}` : 'Pengajuan izin';
  const buildVisitForm = () => ({ student_name: '', class_name: '', complaint: '', action_taken: '', disposition: 'kembali_kelas', officer_name: currentUser?.name || 'Petugas UKS', parent_contacted: false });
  // Siswa/ortu: identitas siswa terisi otomatis dari akun (server tetap memakai identitas sesi);
  // kontak wali diisi dari akun ortu atau dari data orang tua siswa. Akun staf mengisi manual.
  const buildPermissionForm = () => ({
    student_id: linkedStudent?.id ?? null,
    student_name: linkedStudent?.name || (currentRole === 'siswa' ? (currentUser?.name || '') : ''),
    class_name: linkedStudent?.class_name || '',
    permission_date: todayLocal(),
    permission_type: 'izin',
    reason: '',
    parent_name: currentRole === 'ortu' ? (currentUser?.name || '') : (linkedStudent?.parent_name || ''),
    parent_phone: currentRole === 'ortu' ? (currentUser?.phone || '') : (linkedStudent?.parent_phone || ''),
  });
  const [visitForm, setVisitForm] = useState(buildVisitForm);
  const [permissionForm, setPermissionForm] = useState(buildPermissionForm);

  const canManage = isStaff;
  const loadData = async () => {
    try {
      const [visitData, permissionData] = await Promise.all([
        fetch('/api/uks/visits').then((response) => parseResponse(response, 'Data kunjungan UKS belum dapat dimuat.')),
        fetch('/api/uks/permissions').then((response) => parseResponse(response, 'Data izin siswa belum dapat dimuat.')),
      ]);
      setVisits(Array.isArray(visitData) ? visitData : []);
      setPermissions(Array.isArray(permissionData) ? permissionData : []);
      setLoadError('');
    } catch (error) {
      setVisits([]);
      setPermissions([]);
      setLoadError(error.message || 'Data UKS belum dapat dimuat.');
      showToast(error.message || 'Data UKS belum dapat dimuat.', 'error');
    }
  };

  // Muat ulang saat peran berubah (login/logout): data yang dikembalikan server berbeda per akun.
  useEffect(() => { loadData(); }, [currentRole]);

  const openVisitForm = () => {
    if (!canManage) { showToast('Kunjungan UKS dicatat oleh petugas sekolah.', 'error'); return; }
    setVisitForm(buildVisitForm());
    setShowVisitForm(true);
  };
  const openPermissionForm = () => {
    if (isStudentSide && !linkedStudent) { showToast('Akun Anda belum terhubung dengan data siswa. Hubungi tata usaha sekolah.', 'error'); return; }
    setPermissionForm(buildPermissionForm());
    setShowPermissionForm(true);
  };

  const createVisit = async (event) => {
    event.preventDefault();
    const payload = {
      ...visitForm,
      student_name: visitForm.student_name.trim(),
      class_name: visitForm.class_name.trim(),
      complaint: visitForm.complaint.trim(),
      action_taken: visitForm.action_taken.trim(),
      officer_name: visitForm.officer_name.trim() || 'Petugas UKS',
    };
    if (!payload.student_name || !payload.complaint) { showToast('Nama siswa dan keluhan wajib diisi.', 'error'); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/uks/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await parseResponse(response, 'Kunjungan belum dapat dicatat.');
      showToast(data.message || 'Kunjungan UKS berhasil dicatat.', 'success');
      setShowVisitForm(false);
      setVisitForm(buildVisitForm());
      setActivePanel('visits');
      loadData();
    } catch (error) { showToast(error.message || 'Kunjungan belum dapat dicatat.', 'error'); } finally { setSaving(false); }
  };

  const createPermission = async (event) => {
    event.preventDefault();
    const payload = {
      ...permissionForm,
      student_name: permissionForm.student_name.trim(),
      class_name: permissionForm.class_name.trim(),
      reason: permissionForm.reason.trim(),
      parent_name: permissionForm.parent_name.trim(),
      parent_phone: permissionForm.parent_phone.trim(),
      permission_date: permissionForm.permission_date || todayLocal(),
    };
    if (isStudentSide && !linkedStudent) { showToast('Akun Anda belum terhubung dengan data siswa. Hubungi tata usaha sekolah.', 'error'); return; }
    if (!payload.student_name || !payload.reason) { showToast(isStudentSide ? 'Alasan izin wajib diisi.' : 'Nama siswa dan alasan izin wajib diisi.', 'error'); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/uks/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await parseResponse(response, 'Izin belum dapat diajukan.');
      showToast(data.message || 'Permohonan izin berhasil diajukan.', 'success');
      setShowPermissionForm(false);
      setPermissionForm(buildPermissionForm());
      setActivePanel('permissions');
      loadData();
    } catch (error) { showToast(error.message || 'Izin belum dapat diajukan.', 'error'); } finally { setSaving(false); }
  };

  const updatePermission = async (id, status) => {
    try {
      const response = await fetch(`/api/uks/permissions/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, reviewed_by: currentUser?.name || 'Petugas Sekolah' }) });
      const data = await parseResponse(response, 'Status izin belum diperbarui.');
      showToast(data.message || 'Status izin berhasil diperbarui.', 'success');
      loadData();
    } catch (error) { showToast(error.message || 'Status izin belum diperbarui.', 'error'); }
  };

  return (
    <div className="space-y-7 pb-12">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-rose-700"><HeartPulse className="h-4 w-4" /> Kesehatan warga sekolah</div><h2 className="text-3xl font-semibold tracking-tight text-[#002147] sm:text-4xl">UKS & Izin Siswa</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{isStudentSide
            ? (linkedStudent
              ? `Pantau catatan kunjungan UKS dan ajukan izin untuk ${linkedStudent.name}${linkedStudent.class_name ? ` (${linkedStudent.class_name})` : ''}. Kunjungan UKS dicatat oleh petugas sekolah.`
              : 'Akun Anda belum terhubung dengan data siswa, sehingga catatan UKS dan pengajuan izin belum dapat ditampilkan. Hubungi tata usaha sekolah.')
            : 'Catat kunjungan UKS, tindak lanjut, dan pengajuan izin dalam satu layanan yang rapi serta mudah dipantau.'}</p></div>
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><div><div className="text-2xl font-semibold text-[#002147]">{visits.length}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Kunjungan tercatat</div></div><div><div className="text-2xl font-semibold text-amber-700">{permissions.filter((item) => item.status === 'menunggu').length}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Izin menunggu</div></div></div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3 sm:px-8"><button onClick={openPermissionForm} disabled={isStudentSide && !linkedStudent} title={isStudentSide && !linkedStudent ? 'Akun belum terhubung dengan data siswa' : undefined} className="inline-flex items-center gap-2 rounded-lg bg-[#002147] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0b315f] disabled:cursor-not-allowed disabled:opacity-50"><FileHeart className="h-3.5 w-3.5 text-[#f4a024]" /> {isStudentSide ? `Ajukan izin ${ownerLabel}` : 'Ajukan izin'}</button>{canManage && <button onClick={openVisitForm} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-[#002147] hover:border-[#002147]"><ClipboardPlus className="h-3.5 w-3.5" /> Catat kunjungan UKS</button>}</div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white"><div className="flex border-b border-slate-100 px-4 sm:px-6"><button onClick={() => setActivePanel('visits')} className={`border-b-2 px-4 py-4 text-xs font-bold ${activePanel === 'visits' ? 'border-[#f4a024] text-[#002147]' : 'border-transparent text-slate-500'}`}>{visitsTitle}</button><button onClick={() => setActivePanel('permissions')} className={`border-b-2 px-4 py-4 text-xs font-bold ${activePanel === 'permissions' ? 'border-[#f4a024] text-[#002147]' : 'border-transparent text-slate-500'}`}>{permissionsTitle}</button></div>
        {isStudentSide && linkedStudent && <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-[11px] text-slate-600 sm:px-6">Menampilkan data untuk <strong className="text-[#002147]">{linkedStudent.name}</strong>{linkedStudent.class_name ? ` · ${linkedStudent.class_name}` : ''}{linkedStudent.nis ? ` · NIS ${linkedStudent.nis}` : ''}</div>}
        {loadError && <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-800 sm:px-6"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> {loadError}</span><button onClick={loadData} className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100">Coba lagi</button></div>}
        {activePanel === 'visits' ? <div className="divide-y divide-slate-100">{visits.length ? visits.map((visit) => <article key={visit.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#002147]">{visit.student_name}</h3>{visit.class_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{visit.class_name}</span>}</div><p className="mt-1 text-xs text-slate-600"><strong>Keluhan:</strong> {visit.complaint}</p>{visit.action_taken && <p className="mt-1 text-xs text-slate-500"><strong>Tindakan:</strong> {visit.action_taken}</p>}{visit.officer_name && <p className="mt-1 text-[10px] text-slate-400">Petugas: {visit.officer_name}{visit.parent_contacted ? ' · Orang tua sudah dihubungi' : ''}</p>}</div><div className="sm:text-right"><span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-800">{visitLabels[visit.disposition] || visit.disposition}</span><p className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-slate-400"><Clock3 className="h-3 w-3" /> {visit.visit_date} · {visit.visit_time}</p></div></article>) : <EmptyState icon={Stethoscope} text={loadError ? 'Data kunjungan UKS belum dapat ditampilkan.' : (isStudentSide ? `Belum ada catatan kunjungan UKS untuk ${linkedStudent?.name || 'siswa terkait akun Anda'}. Catatan akan muncul di sini setelah petugas UKS mencatat kunjungan.` : 'Belum ada kunjungan UKS yang dicatat.')} />}</div> : <div className="divide-y divide-slate-100">{permissions.length ? permissions.map((permission) => <article key={permission.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#002147]">{permission.student_name}</h3>{permission.class_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{permission.class_name}</span>}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{permissionLabels[permission.permission_type] || permission.permission_type}</span></div><p className="mt-1 text-xs text-slate-600">{permission.reason}</p><p className="mt-1 text-[10px] text-slate-400">Tanggal: {permission.permission_date}{permission.parent_name ? ` · Penanggung jawab: ${permission.parent_name}` : ''}{permission.status !== 'menunggu' && permission.reviewed_by ? ` · Ditinjau oleh: ${permission.reviewed_by}` : ''}</p></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><PermissionBadge status={permission.status} />{canManage && permission.status === 'menunggu' && <><button onClick={() => updatePermission(permission.id, 'ditolak')} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50">Tolak</button><button onClick={() => updatePermission(permission.id, 'disetujui')} className="rounded-lg bg-[#002147] px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#0b315f]">Setujui</button></>}</div></article>) : <EmptyState icon={FileHeart} text={loadError ? 'Data izin belum dapat ditampilkan.' : (isStudentSide ? `Belum ada pengajuan izin untuk ${linkedStudent?.name || 'siswa terkait akun Anda'}. Gunakan tombol "Ajukan izin ${ownerLabel}" di atas untuk membuat pengajuan baru.` : 'Belum ada pengajuan izin.')} />}</div>}
      </section>

      {showVisitForm && <Modal title="Catat kunjungan UKS" onClose={() => setShowVisitForm(false)}><form onSubmit={createVisit} className="space-y-4"><Field label="Nama siswa"><input required value={visitForm.student_name} onChange={(event) => setVisitForm({ ...visitForm, student_name: event.target.value })} /></Field><Field label="Kelas / rombel"><input value={visitForm.class_name} onChange={(event) => setVisitForm({ ...visitForm, class_name: event.target.value })} placeholder="Contoh: X MIPA 1" /></Field><Field label="Keluhan"><textarea required rows="3" value={visitForm.complaint} onChange={(event) => setVisitForm({ ...visitForm, complaint: event.target.value })} /></Field><Field label="Tindakan"><textarea rows="2" value={visitForm.action_taken} onChange={(event) => setVisitForm({ ...visitForm, action_taken: event.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Arahan"><select value={visitForm.disposition} onChange={(event) => setVisitForm({ ...visitForm, disposition: event.target.value })}>{Object.entries(visitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Petugas"><input value={visitForm.officer_name} onChange={(event) => setVisitForm({ ...visitForm, officer_name: event.target.value })} /></Field></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={visitForm.parent_contacted} onChange={(event) => setVisitForm({ ...visitForm, parent_contacted: event.target.checked })} /> Orang tua sudah dihubungi</label><ModalActions saving={saving} label="Simpan kunjungan" /></form></Modal>}
      {showPermissionForm && <Modal title={isStudentSide ? `Ajukan izin ${ownerLabel}` : 'Ajukan izin siswa'} onClose={() => setShowPermissionForm(false)}><form onSubmit={createPermission} className="space-y-4">
        {isStudentSide && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">Nama dan kelas siswa terisi otomatis dari akun Anda dan tidak dapat diubah. Petugas sekolah akan meninjau pengajuan ini.</p>}
        <Field label="Nama siswa"><input required readOnly={isStudentSide} value={permissionForm.student_name} onChange={(event) => setPermissionForm({ ...permissionForm, student_name: event.target.value })} placeholder="Nama lengkap siswa" /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Kelas / rombel"><input readOnly={isStudentSide} value={permissionForm.class_name} onChange={(event) => setPermissionForm({ ...permissionForm, class_name: event.target.value })} /></Field><Field label="Jenis izin"><select value={permissionForm.permission_type} onChange={(event) => setPermissionForm({ ...permissionForm, permission_type: event.target.value })}>{Object.entries(permissionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Tanggal izin"><input type="date" required value={permissionForm.permission_date} onChange={(event) => setPermissionForm({ ...permissionForm, permission_date: event.target.value })} /></Field></div><Field label="Alasan"><textarea required rows="3" value={permissionForm.reason} onChange={(event) => setPermissionForm({ ...permissionForm, reason: event.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Nama orang tua / wali"><input value={permissionForm.parent_name} onChange={(event) => setPermissionForm({ ...permissionForm, parent_name: event.target.value })} /></Field><Field label="Nomor kontak"><input value={permissionForm.parent_phone} onChange={(event) => setPermissionForm({ ...permissionForm, parent_phone: event.target.value })} /></Field></div><ModalActions saving={saving} label="Ajukan izin" /></form></Modal>}
    </div>
  );
}

function Field({ label, children }) { return <label className="block text-xs font-semibold text-slate-700">{label}{React.cloneElement(children, { className: 'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-[#002147] read-only:bg-slate-50 read-only:text-slate-500' })}</label>; }
function EmptyState({ icon: Icon, text }) { return <div className="px-6 py-14 text-center"><Icon className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm text-slate-500">{text}</p></div>; }
function PermissionBadge({ status }) { const styles = { menunggu: 'bg-amber-50 text-amber-800', disetujui: 'bg-emerald-50 text-emerald-700', ditolak: 'bg-rose-50 text-rose-700' }; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>; }
function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-center justify-between gap-4"><h3 className="text-2xl font-semibold text-[#002147]">{title}</h3><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="mt-5">{children}</div></div></div>; }
function ModalActions({ saving, label }) { return <div className="flex justify-end border-t border-slate-100 pt-4"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#002147] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Send className="h-3.5 w-3.5" /> {saving ? 'Menyimpan…' : label}</button></div>; }
