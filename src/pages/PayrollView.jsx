import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Receipt, Printer, Plus, X } from 'lucide-react';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const inputClass = 'w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all';
const formatRp = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan.');
  return data;
}

const buildInitialForm = () => {
  const now = new Date();
  return { staff_id: '', month: MONTHS[now.getMonth()], year: String(now.getFullYear()), base_salary: '', allowance: '0', teaching_fee: '0', deductions: '0' };
};

export default function PayrollView() {
  const { canAccess, showToast } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teachersUnavailable, setTeachersUnavailable] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [form, setForm] = useState(buildInitialForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadPayrolls = () => {
    requestJson('/api/payroll/list')
      .then((data) => setPayrolls(Array.isArray(data) ? data : []))
      .catch((error) => { setPayrolls([]); showToast(error.message, 'error'); });
  };

  // Daftar guru/staf diambil dari buku induk; bila akun tidak punya modulnya, form generate dinonaktifkan.
  const loadTeachers = () => {
    if (!canAccess('buku_induk')) {
      setTeachersUnavailable(true);
      return;
    }
    requestJson('/api/master/teachers')
      .then((data) => { setTeachers(Array.isArray(data) ? data : []); setTeachersUnavailable(false); })
      .catch(() => { setTeachers([]); setTeachersUnavailable(true); });
  };

  useEffect(() => {
    loadPayrolls();
    loadTeachers();
  }, []);

  // Total payroll dihitung per periode terbaru (bukan akumulasi semua bulan).
  const latest = payrolls[0] || null;
  const periodPayrolls = latest ? payrolls.filter((p) => p.month === latest.month && Number(p.year) === Number(latest.year)) : [];
  const periodTotal = periodPayrolls.reduce((sum, p) => sum + (Number(p.net_salary) || 0), 0);

  const updateField = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const netPreview = Number(form.base_salary || 0) + Number(form.allowance || 0) + Number(form.teaching_fee || 0) - Number(form.deductions || 0);

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!form.staff_id) return showToast('Pilih guru/staf penerima gaji', 'error');
    if (!form.month || !/^\d{4}$/.test(String(form.year))) return showToast('Periode bulan dan tahun harus valid', 'error');
    const base = Number(form.base_salary);
    if (!form.base_salary || !Number.isFinite(base) || base <= 0) return showToast('Gaji pokok harus lebih dari 0', 'error');
    if ([form.allowance, form.teaching_fee, form.deductions].some((value) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
      return showToast('Tunjangan, honor, dan potongan tidak boleh negatif', 'error');
    }
    const duplicate = payrolls.find((p) => Number(p.staff_id) === Number(form.staff_id) && p.month === form.month && Number(p.year) === Number(form.year));
    if (duplicate) return showToast(`Slip gaji ${duplicate.staff_name} periode ${form.month} ${form.year} sudah pernah diterbitkan`, 'error');

    setIsSaving(true);
    try {
      const data = await requestJson('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: Number(form.staff_id),
          month: form.month,
          year: Number(form.year),
          base_salary: base,
          allowance: Number(form.allowance) || 0,
          teaching_fee: Number(form.teaching_fee) || 0,
          deductions: Number(form.deductions) || 0,
        }),
      });
      showToast(data.message || 'Slip gaji berhasil diterbitkan', 'success');
      setShowGenerateModal(false);
      setForm(buildInitialForm());
      loadPayrolls();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintSlip = (slip) => {
    setSelectedSlip(slip);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <Receipt className="w-3.5 h-3.5" /> Modul 8: Aplikasi Penggajian (Payroll)
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Sistem Payroll & Slip Gaji Digital Guru/Staf</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penghitungan honor jam mengajar, gaji pokok, tunjangan fungsional, dan pencetakan slip gaji digital resmi.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Terbitkan Slip Gaji
          </button>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-right">
            <div className="text-[11px] text-slate-500">{latest ? `Total Payroll ${latest.month} ${latest.year}:` : 'Total Payroll:'}</div>
            <div className="text-base font-extrabold text-emerald-400">
              {formatRp(periodTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Slip Gaji */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" /> Daftar Slip Gaji Terbit
          </h3>
          <span className="text-xs text-slate-500">{payrolls.length} Slip</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Nama Pendidik / Staf</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4">Gaji Pokok</th>
                <th className="py-3 px-4">Tunjangan & Honor</th>
                <th className="py-3 px-4">Potongan</th>
                <th className="py-3 px-4">Gaji Bersih (Net)</th>
                <th className="py-3 px-4 rounded-r-xl text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payrolls.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">Belum ada slip gaji yang diterbitkan.</td></tr>
              )}
              {payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.staff_name}</td>
                  <td className="py-3 px-4 text-slate-500">{p.staff_role}</td>
                  <td className="py-3 px-4 font-medium text-emerald-600">{p.month} {p.year}</td>
                  <td className="py-3 px-4 font-mono">{formatRp(p.base_salary)}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">
                    +{formatRp((Number(p.allowance) || 0) + (Number(p.teaching_fee) || 0))}
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-400">
                    -{formatRp(p.deductions)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900">
                    {formatRp(p.net_salary)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handlePrintSlip(p)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 mx-auto"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Terbitkan Slip Gaji */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Terbitkan Slip Gaji Baru</h3>
                <p className="text-xs text-slate-500 mt-0.5">Gaji bersih otomatis dicatat sebagai pengeluaran kas di modul Keuangan.</p>
              </div>
              <button type="button" onClick={() => setShowGenerateModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Tutup form"><X className="w-4 h-4" /></button>
            </div>

            {teachersUnavailable && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Daftar guru/staf (Buku Induk) tidak tersedia untuk akun ini, sehingga slip belum dapat diterbitkan.
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Guru / Staf Penerima *</label>
                <select name="staff_id" value={form.staff_id} onChange={updateField} className={inputClass} disabled={teachersUnavailable}>
                  <option value="">Pilih guru / staf</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.position || 'Guru Pengajar'}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Bulan</label>
                  <select name="month" value={form.month} onChange={updateField} className={inputClass}>
                    {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tahun</label>
                  <input type="number" name="year" min="2000" max="2100" value={form.year} onChange={updateField} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Gaji Pokok (Rp) *</label>
                <input type="number" name="base_salary" min="1" step="1000" placeholder="Contoh: 4500000" value={form.base_salary} onChange={updateField} className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tunjangan</label>
                  <input type="number" name="allowance" min="0" step="1000" value={form.allowance} onChange={updateField} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Honor Mengajar</label>
                  <input type="number" name="teaching_fee" min="0" step="1000" value={form.teaching_fee} onChange={updateField} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Potongan</label>
                  <input type="number" name="deductions" min="0" step="1000" value={form.deductions} onChange={updateField} className={inputClass} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs">
                <span className="text-slate-500 font-semibold">Gaji Bersih (Net):</span>
                <span className={`font-mono font-bold text-sm ${netPreview < 0 ? 'text-rose-500' : 'text-slate-900'}`}>{formatRp(netPreview)}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold">Batal</button>
                <button type="submit" disabled={isSaving || teachersUnavailable} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-60">{isSaving ? 'Menerbitkan…' : 'Terbitkan Slip'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Pay Slip Template */}
      {selectedSlip && (
        <div className="printable-area hidden p-8 max-w-lg mx-auto bg-white text-black border border-black rounded-lg">
          <div className="text-center pb-4 border-b-2 border-black">
            <h2 className="text-base font-bold uppercase">SMAN 1 HARAPAN BANGSA</h2>
            <p className="text-[10px]">Jl. Pendidikan No. 45 Jakarta Selatan | Telp (021) 7890-1234</p>
            <h3 className="text-sm font-bold mt-2 underline uppercase">SLIP GAJI DAN HONORARIUM DIGITAL</h3>
            <p className="text-xs">Periode: {selectedSlip.month} {selectedSlip.year}</p>
          </div>

          <div className="py-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Nama Pegawai:</span>
              <span className="font-bold">{selectedSlip.staff_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Jabatan / Tugas:</span>
              <span>{selectedSlip.staff_role}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal Pembayaran:</span>
              <span>{selectedSlip.paid_at || '-'}</span>
            </div>

            <div className="pt-2 border-t border-slate-300">
              <div className="font-bold mb-1">Rincian Penghasilan:</div>
              <div className="flex justify-between py-0.5">
                <span>- Gaji Pokok:</span>
                <span>{formatRp(selectedSlip.base_salary)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>- Tunjangan Fungsional:</span>
                <span>{formatRp(selectedSlip.allowance)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>- Honor Jam Mengajar & Tambahan:</span>
                <span>{formatRp(selectedSlip.teaching_fee)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-300">
              <div className="font-bold mb-1">Potongan:</div>
              <div className="flex justify-between py-0.5 text-red-600">
                <span>- Potongan Absensi & Keterlambatan:</span>
                <span>{formatRp(selectedSlip.deductions)}</span>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-black flex justify-between font-bold text-sm">
              <span>TOTAL DITERIMA (NET):</span>
              <span>{formatRp(selectedSlip.net_salary)}</span>
            </div>
          </div>

          <div className="pt-6 border-t border-black flex justify-between text-xs text-center">
            <div>
              <p>Penerima,</p>
              <br /><br />
              <p className="font-bold">( {selectedSlip.staff_name} )</p>
            </div>
            <div>
              <p>Bendahara Sekolah,</p>
              <br /><br />
              <p className="font-bold">( Siti Fatimah, S.E. )</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
