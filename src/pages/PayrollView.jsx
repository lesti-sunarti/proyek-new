import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Receipt, DollarSign, Printer, Download, Plus, CheckCircle2, User } from 'lucide-react';

export default function PayrollView() {
  const { showToast } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [selectedSlip, setSelectedSlip] = useState(null);

  const loadPayrolls = () => {
    fetch('/api/payroll/list').then(r => r.json()).then(setPayrolls).catch(() => {});
  };

  useEffect(() => {
    loadPayrolls();
  }, []);

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

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-right">
          <div className="text-[11px] text-slate-500">Total Payroll Bulan Ini:</div>
          <div className="text-base font-extrabold text-emerald-400">
            Rp {payrolls.reduce((sum, p) => sum + Number(p.net_salary), 0).toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Tabel Slip Gaji */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" /> Daftar Slip Gaji Terbit
          </h3>
          <span className="text-xs text-slate-500">{payrolls.length} Pegawai</span>
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
              {payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.staff_name}</td>
                  <td className="py-3 px-4 text-slate-500">{p.staff_role}</td>
                  <td className="py-3 px-4 font-medium text-emerald-300">{p.month} {p.year}</td>
                  <td className="py-3 px-4 font-mono">Rp {Number(p.base_salary).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">
                    +Rp {(Number(p.allowance) + Number(p.teaching_fee)).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-400">
                    -Rp {Number(p.deductions).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-sm text-white">
                    Rp {Number(p.net_salary).toLocaleString('id-ID')}
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
              <span>{selectedSlip.paid_at}</span>
            </div>

            <div className="pt-2 border-t border-slate-300">
              <div className="font-bold mb-1">Rincian Penghasilan:</div>
              <div className="flex justify-between py-0.5">
                <span>- Gaji Pokok:</span>
                <span>Rp {Number(selectedSlip.base_salary).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>- Tunjangan Fungsional:</span>
                <span>Rp {Number(selectedSlip.allowance).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>- Honor Jam Mengajar & Tambahan:</span>
                <span>Rp {Number(selectedSlip.teaching_fee).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-300">
              <div className="font-bold mb-1">Potongan:</div>
              <div className="flex justify-between py-0.5 text-red-600">
                <span>- Potongan Absensi & Keterlambatan:</span>
                <span>Rp {Number(selectedSlip.deductions).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-black flex justify-between font-bold text-sm">
              <span>TOTAL DITERIMA (NET):</span>
              <span>Rp {Number(selectedSlip.net_salary).toLocaleString('id-ID')}</span>
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
