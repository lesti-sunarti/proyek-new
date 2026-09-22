import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle2, AlertCircle, Clock, Printer, QrCode, ShieldCheck, Download } from 'lucide-react';
import QRModal from '../components/QRModal';

export default function SppPaymentView() {
  const { currentUser, showToast } = useAuth();
  const studentId = currentUser.studentId || 1;
  const [sppBills, setSppBills] = useState([]);
  const [otherBills, setOtherBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [qrModal, setQrModal] = useState({ open: false, title: '', value: '' });

  const loadBills = () => {
    fetch(`/api/spp/bills/${studentId}`)
      .then(r => r.json())
      .then(data => {
        setSppBills(data.sppBills || []);
        setOtherBills(data.otherBills || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadBills();
  }, [studentId]);

  const handlePayInstant = (bill) => {
    fetch(`/api/spp/pay/${bill.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: 'QRIS Real-Time Payment Gateway' })
    })
      .then(r => r.json())
      .then(data => {
        showToast(data.message, 'success');
        loadBills();
      });
  };

  const handlePrintReceipt = (bill) => {
    setSelectedBill(bill);
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
            <CreditCard className="w-3.5 h-3.5" /> Modul 5: Kartu SPP & Keuangan Siswa
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Kartu SPP Elektronik & Pembayaran Online</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Riwayat tagihan SPP bulanan, pembayaran via QRIS/Virtual Account, dan cetak kuitansi digital resmi.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-right">
          <div className="text-[11px] text-slate-500">Total Lunas Tahun Ini:</div>
          <div className="text-base font-extrabold text-emerald-400">
            {sppBills.filter(b => b.status === 'lunas').length} dari 12 Bulan
          </div>
        </div>
      </div>

      {/* Grid Kartu SPP 12 Bulan */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" /> Kartu Kontrol SPP Siswa (Tahun Pelajaran 2024/2025)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sppBills.map((bill) => {
            const isPaid = bill.status === 'lunas';
            const isWaiting = bill.status === 'menunggu';

            return (
              <div 
                key={bill.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isPaid 
                    ? 'bg-slate-100 border-emerald-500/30' 
                    : isWaiting 
                      ? 'bg-amber-950/20 border-amber-500/40' 
                      : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">{bill.month} {bill.year}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isPaid 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : isWaiting 
                          ? 'bg-amber-500/20 text-amber-300' 
                          : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {bill.status}
                    </span>
                  </div>

                  <div className="text-base font-extrabold text-slate-900 mt-2">
                    Rp {Number(bill.amount).toLocaleString('id-ID')}
                  </div>

                  {isPaid ? (
                    <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                      <div>Tgl: {bill.payment_date}</div>
                      <div className="font-mono text-emerald-400 text-[10px]">{bill.receipt_number}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 mt-1">Jatuh tempo: Tanggal 10 tiap bulan</div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  {isPaid ? (
                    <button
                      onClick={() => handlePrintReceipt(bill)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Kuitansi
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePayInstant(bill)}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Bayar Sekarang
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tagihan Lain (Uang Gedung & Seragam) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" /> Tagihan Non-SPP & Uang Pangkal
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {otherBills.map((ob) => (
            <div key={ob.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{ob.title}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  ob.status === 'lunas' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {ob.status}
                </span>
              </div>
              <div className="text-lg font-black text-slate-900">
                Rp {Number(ob.amount).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-500">
                {ob.status === 'lunas' ? `Dibayarkan: ${ob.payment_date}` : 'Silakan lunasi di kasir TU / transfer bank'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printable Receipt Template (Hidden on screen, visible during print) */}
      {selectedBill && (
        <div className="printable-area hidden p-8 max-w-lg mx-auto bg-white text-black border border-black rounded-lg">
          <div className="text-center pb-4 border-b-2 border-black">
            <h2 className="text-lg font-bold uppercase">SMAN 1 HARAPAN BANGSA JAKARTA</h2>
            <p className="text-xs">Jl. Pendidikan No. 45, Jakarta Selatan | Telp: (021) 7890-1234</p>
            <h3 className="text-base font-bold mt-2 underline uppercase">BUKTI KUITANSI PEMBAYARAN SPP</h3>
          </div>

          <div className="py-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span>No. Kuitansi:</span>
              <span className="font-bold font-mono">{selectedBill.receipt_number || 'KW-2025-001'}</span>
            </div>
            <div className="flex justify-between">
              <span>Nama Siswa:</span>
              <span className="font-bold">{currentUser.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Pembayaran:</span>
              <span>SPP Bulan {selectedBill.month} {selectedBill.year}</span>
            </div>
            <div className="flex justify-between">
              <span>Jumlah Nominal:</span>
              <span className="font-bold text-sm">Rp {Number(selectedBill.amount).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal Bayar:</span>
              <span>{selectedBill.payment_date}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold text-green-700 uppercase">LUNAS / SAH</span>
            </div>
          </div>

          <div className="pt-6 border-t border-black flex justify-between text-xs text-center">
            <div>
              <p>Wali Murid,</p>
              <br /><br />
              <p>( ........................... )</p>
            </div>
            <div>
              <p>Petugas Kasir Keuangan,</p>
              <br /><br />
              <p className="font-bold">( Siti Fatimah, S.E. )</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
