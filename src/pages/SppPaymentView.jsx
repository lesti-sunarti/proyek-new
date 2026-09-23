import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Printer, QrCode, ShieldCheck, Users, ListChecks } from 'lucide-react';

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Gagal memproses permintaan.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export default function SppPaymentView() {
  const { currentUser, currentRole, isStaff, canAccess, showToast } = useAuth();
  // Akun siswa/ortu terhubung ke satu siswa lewat currentUser.student (dari sesi login; related_student_id hanya fallback akun lama).
  // Akun staf memilih siswa dari buku induk.
  const isStudentAccount = currentRole === 'siswa' || currentRole === 'ortu';
  const linkedStudent = isStudentAccount && currentUser?.student ? currentUser.student : null;
  const relatedStudentId = linkedStudent?.id
    ? Number(linkedStudent.id)
    : (currentUser?.related_student_id ? Number(currentUser.related_student_id) : null);
  const canBrowseStudents = canAccess('buku_induk');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState(relatedStudentId);
  const [studentInfo, setStudentInfo] = useState(null); // objek student dari respons /api/spp/bills/:id
  const [billsError, setBillsError] = useState('');
  const [sppBills, setSppBills] = useState([]);
  const [otherBills, setOtherBills] = useState([]);
  const [recap, setRecap] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [payingBillId, setPayingBillId] = useState(null);
  const [isLoadingBills, setIsLoadingBills] = useState(false);

  // Daftar siswa hanya diambil bila akun punya modul buku_induk (ortu/siswa akan 403, jadi dilewati).
  useEffect(() => {
    if (!canBrowseStudents) {
      setStudents([]);
      setStudentId(relatedStudentId);
      return;
    }
    requestJson('/api/master/students')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setStudents(list);
        setStudentId((previous) => previous || relatedStudentId || list[0]?.id || null);
      })
      .catch((error) => {
        setStudents([]);
        setStudentId(relatedStudentId);
        if (error.status !== 403) showToast(error.message, 'error');
      });
  }, [canBrowseStudents, relatedStudentId]);

  const loadRecap = () => {
    requestJson('/api/spp/all').then((data) => setRecap(Array.isArray(data) ? data : [])).catch(() => setRecap([]));
  };

  useEffect(() => {
    if (isStaff) loadRecap();
    else setRecap([]);
  }, [isStaff]);

  const loadBills = () => {
    if (!studentId) {
      setSppBills([]);
      setOtherBills([]);
      setStudentInfo(null);
      setBillsError('');
      return;
    }
    setIsLoadingBills(true);
    setBillsError('');
    requestJson(`/api/spp/bills/${studentId}`)
      .then((data) => {
        setSppBills(Array.isArray(data.sppBills) ? data.sppBills : []);
        setOtherBills(Array.isArray(data.otherBills) ? data.otherBills : []);
        // Identitas siswa (nama/NISN/NIS/kelas/wali) untuk kartu & kuitansi berasal dari respons tagihan.
        setStudentInfo(data.student && typeof data.student === 'object' ? data.student : null);
      })
      .catch((error) => {
        setSppBills([]);
        setOtherBills([]);
        setStudentInfo(null);
        // 403: akun tidak berhak / belum tertaut ke siswa; 404: siswa tidak ditemukan. Pesan server ditampilkan + arahan.
        const message = error.status === 403
          ? `Akses ditolak: ${error.message}${isStudentAccount ? ' Hubungi Tata Usaha untuk menautkan akun Anda.' : ''}`
          : error.status === 404
            ? `${error.message}${canBrowseStudents ? ' Pilih siswa lain dari daftar.' : ''}`
            : error.message;
        setBillsError(message);
        showToast(message, 'error');
      })
      .finally(() => setIsLoadingBills(false));
  };

  useEffect(() => {
    loadBills();
  }, [studentId]);

  // Identitas siswa untuk kartu & kuitansi: respons /api/spp/bills (utama) -> Buku Induk -> data siswa dari sesi login.
  const masterStudent = students.find((s) => Number(s.id) === Number(studentId)) || null;
  const sessionStudent = linkedStudent && Number(linkedStudent.id) === Number(studentId) ? linkedStudent : null;
  const displayStudent = studentInfo || masterStudent || sessionStudent;

  const handlePayInstant = async (bill) => {
    if (payingBillId) return;
    setPayingBillId(bill.id);
    try {
      const data = await requestJson(`/api/spp/pay/${bill.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: 'QRIS Real-Time Payment Gateway' })
      });
      showToast(`${data.message || 'Pembayaran berhasil dikonfirmasi.'}${data.receipt_number ? ` No. kuitansi: ${data.receipt_number}` : ''}`, 'success');
      loadBills();
      if (isStaff) loadRecap();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setPayingBillId(null);
    }
  };

  const handlePrintReceipt = (bill) => {
    setSelectedBill(bill);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const paidCount = sppBills.filter((b) => b.status === 'lunas').length;
  const studentLabel = displayStudent?.name || (studentId ? `Siswa ID ${studentId}` : currentUser?.name || '-');

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
            {paidCount} dari {sppBills.length || 12} Bulan
          </div>
        </div>
      </div>

      {/* Pilih siswa (staf) / identitas siswa (ortu) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900"><Users className="w-4 h-4 text-emerald-500" /> Kartu SPP untuk:</div>
        {students.length > 0 ? (
          <select
            value={studentId || ''}
            onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147]"
          >
            {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.class_name || 'Kelas belum ditetapkan'} (NISN {s.nisn})</option>)}
          </select>
        ) : studentId ? (
          <div className="text-xs text-slate-600">
            <strong className="text-slate-900">{studentLabel}</strong>
            {displayStudent?.nisn ? ` · NISN ${displayStudent.nisn}` : ''}
            {displayStudent?.class_name ? ` · ${displayStudent.class_name}` : ''}
            {currentRole === 'ortu' ? <span className="block text-[11px] text-slate-500 mt-0.5">Wali murid: {currentUser.name}</span> : null}
          </div>
        ) : (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Akun ini belum terhubung dengan data siswa, sehingga kartu SPP belum dapat ditampilkan. Hubungi Tata Usaha untuk menautkan akun.
          </div>
        )}
      </div>

      {/* Grid Kartu SPP 12 Bulan */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" /> Kartu Kontrol SPP Siswa (Tahun Pelajaran 2024/2025)
        </h3>

        {isLoadingBills && <p className="text-xs text-slate-500">Memuat tagihan…</p>}
        {!isLoadingBills && billsError && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{billsError}</p>
        )}
        {!isLoadingBills && !billsError && studentId && sppBills.length === 0 && (
          <p className="text-xs text-slate-500">Belum ada tagihan SPP yang tercatat untuk siswa ini.</p>
        )}

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
                      ? 'bg-amber-50 border-amber-300' 
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
                          ? 'bg-amber-500/20 text-amber-700' 
                          : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {bill.status}
                    </span>
                  </div>

                  <div className="text-base font-extrabold text-slate-900 mt-2">
                    Rp {Number(bill.amount || 0).toLocaleString('id-ID')}
                  </div>

                  {isPaid ? (
                    <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                      <div>Tgl: {bill.payment_date || '-'}</div>
                      <div className="font-mono text-emerald-400 text-[10px]">{bill.receipt_number || '-'}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 mt-1">{isWaiting ? 'Menunggu verifikasi pembayaran' : 'Jatuh tempo: Tanggal 10 tiap bulan'}</div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  {isPaid ? (
                    <button
                      onClick={() => handlePrintReceipt(bill)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Kuitansi
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePayInstant(bill)}
                      disabled={payingBillId === bill.id}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <QrCode className="w-3.5 h-3.5" /> {payingBillId === bill.id ? 'Memproses…' : 'Bayar Sekarang'}
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

        {studentId && !billsError && otherBills.length === 0 && !isLoadingBills && (
          <p className="text-xs text-slate-500">Tidak ada tagihan non-SPP untuk siswa ini.</p>
        )}

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
                Rp {Number(ob.amount || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-500">
                {ob.status === 'lunas' ? `Dibayarkan: ${ob.payment_date || '-'}` : 'Silakan lunasi di kasir TU / transfer bank'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rekap SPP seluruh siswa (khusus staf) */}
      {isStaff && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-400" /> Rekap Tagihan SPP Seluruh Siswa
            </h3>
            <span className="text-xs text-slate-500">{recap.length} tagihan terakhir · {recap.filter((b) => b.status !== 'lunas').length} belum lunas</span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-xl">Siswa</th>
                  <th className="py-2.5 px-4">Kelas</th>
                  <th className="py-2.5 px-4">Periode</th>
                  <th className="py-2.5 px-4">Nominal</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 rounded-r-xl">Kuitansi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recap.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">Belum ada data rekap SPP.</td></tr>}
                {recap.map((b) => (
                  <tr key={`recap-${b.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{b.student_name}<span className="block text-[10px] font-normal text-slate-400">NISN {b.nisn}</span></td>
                    <td className="py-2.5 px-4">{b.class_name || '-'}</td>
                    <td className="py-2.5 px-4">{b.month} {b.year}</td>
                    <td className="py-2.5 px-4 font-mono">Rp {Number(b.amount || 0).toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.status === 'lunas' ? 'bg-emerald-500/20 text-emerald-500' : b.status === 'menunggu' ? 'bg-amber-500/20 text-amber-700' : 'bg-rose-500/20 text-rose-500'}`}>{b.status}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">{b.receipt_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <span className="font-bold font-mono">{selectedBill.receipt_number || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Nama Siswa:</span>
              <span className="font-bold">{studentLabel}</span>
            </div>
            <div className="flex justify-between">
              <span>NISN / NIS:</span>
              <span>{displayStudent?.nisn || '-'} / {displayStudent?.nis || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Kelas:</span>
              <span>{displayStudent?.class_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Pembayaran:</span>
              <span>SPP Bulan {selectedBill.month} {selectedBill.year}</span>
            </div>
            <div className="flex justify-between">
              <span>Jumlah Nominal:</span>
              <span className="font-bold text-sm">Rp {Number(selectedBill.amount || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal Bayar:</span>
              <span>{selectedBill.payment_date || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Metode:</span>
              <span>{selectedBill.payment_method || '-'}</span>
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
              <p>( {currentRole === 'ortu' ? currentUser.name : (displayStudent?.parent_name || '...........................')} )</p>
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
