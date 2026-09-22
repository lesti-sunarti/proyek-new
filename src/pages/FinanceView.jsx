import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, DollarSign, Plus, Printer, ArrowDownRight, ArrowUpRight } from 'lucide-react';

// Tanggal hari ini menurut zona waktu lokal browser (format YYYY-MM-DD).
const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan.');
  return data;
}

export default function FinanceView() {
  const { showToast } = useAuth();
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form input transaksi
  const [type, setType] = useState('masuk');
  const [category, setCategory] = useState('SPP Siswa');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');

  const loadFinance = () => {
    requestJson('/api/finance/summary')
      .then((data) => setSummary({ totalIn: Number(data.totalIn) || 0, totalOut: Number(data.totalOut) || 0, balance: Number(data.balance) || 0 }))
      .catch((error) => showToast(error.message, 'error'));
    requestJson('/api/finance/transactions')
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setTransactions([]));
  };

  useEffect(() => {
    loadFinance();
  }, []);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const nominal = Number(amount);
    if (!category.trim()) return showToast('Kategori transaksi harus diisi', 'error');
    if (!amount || !Number.isFinite(nominal) || nominal <= 0) return showToast('Nominal harus berupa angka lebih dari 0', 'error');
    if (!description.trim()) return showToast('Keterangan transaksi harus diisi', 'error');
    if (!date) return showToast('Tanggal transaksi harus diisi', 'error');

    setIsSaving(true);
    try {
      const data = await requestJson('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category: category.trim(),
          amount: nominal,
          date,
          description: description.trim(),
          source_or_recipient: source.trim() || (type === 'masuk' ? 'Penyetor' : 'Penerima')
        })
      });
      showToast(data.message || 'Transaksi kas berhasil dicatat', 'success');
      setShowAddModal(false);
      setAmount('');
      setDescription('');
      setSource('');
      setDate(todayLocal());
      loadFinance();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <Wallet className="w-3.5 h-3.5" /> Modul 7: Aplikasi Keuangan Sekolah
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Buku Kas Umum & Laporan Keuangan</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan real-time penerimaan kas, pengeluaran operasional, dana BOS, dan neraca saldo.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Catat Transaksi Kas
          </button>
          <button
            onClick={() => window.print()}
            disabled={transactions.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Cetak BKU
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Masuk */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Total Penerimaan Kas</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            Rp {Number(summary.totalIn || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 font-medium">Penerimaan SPP, BOS, & Donasi</div>
        </div>

        {/* Total Keluar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Total Pengeluaran Kas</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            Rp {Number(summary.totalOut || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-rose-400 mt-2 font-medium">Gaji, Sarpras, Listrik & Operasional</div>
        </div>

        {/* Saldo Kas Bersih */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Saldo Kas Bersih Tersedia</span>
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            Rp {Number(summary.balance || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-medium">{Number(summary.balance) < 0 ? 'Saldo kas negatif, periksa pengeluaran' : 'Likuiditas Sekolah Stabil & Terpantau'}</div>
        </div>

      </div>

      {/* Tabel Transaksi Kas BKU */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" /> Buku Kas Umum (BKU) - Riwayat Transaksi
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Tanggal</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Keterangan Transaksi</th>
                <th className="py-3 px-4">Pihak Terkait</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada transaksi kas yang tercatat.</td></tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-slate-500">{t.date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.type === 'masuk' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{t.category}</td>
                  <td className="py-3 px-4 text-slate-600">{t.description}</td>
                  <td className="py-3 px-4 text-slate-500">{t.source_or_recipient || '-'}</td>
                  <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                    t.type === 'masuk' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {t.type === 'masuk' ? '+' : '-'} Rp {Number(t.amount || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Laporan BKU versi cetak (tersembunyi di layar, tampil saat window.print) */}
      <div className="printable-area hidden p-8 bg-white text-black">
        <div className="text-center pb-4 border-b-2 border-black">
          <h2 className="text-lg font-bold uppercase">SMAN 1 HARAPAN BANGSA JAKARTA</h2>
          <h3 className="text-base font-bold mt-1 uppercase">Buku Kas Umum (BKU)</h3>
          <p className="text-xs">Dicetak {new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
        </div>
        <div className="py-3 text-xs">
          <div className="flex justify-between py-0.5"><span>Total Penerimaan Kas</span><span>Rp {Number(summary.totalIn || 0).toLocaleString('id-ID')}</span></div>
          <div className="flex justify-between py-0.5"><span>Total Pengeluaran Kas</span><span>Rp {Number(summary.totalOut || 0).toLocaleString('id-ID')}</span></div>
          <div className="flex justify-between py-0.5 font-bold"><span>Saldo Kas Bersih</span><span>Rp {Number(summary.balance || 0).toLocaleString('id-ID')}</span></div>
        </div>
        <div className="text-xs">
          <div className="flex gap-2 border-b-2 border-black py-1 font-bold uppercase">
            <span className="w-24">Tanggal</span><span className="w-14">Tipe</span><span className="flex-1">Kategori / Keterangan</span><span className="w-32 text-right">Nominal</span>
          </div>
          {transactions.map((t) => (
            <div key={`print-${t.id}`} className="flex gap-2 border-b border-slate-300 py-1">
              <span className="w-24">{t.date}</span>
              <span className="w-14 uppercase">{t.type}</span>
              <span className="flex-1">{t.category} — {t.description} ({t.source_or_recipient || '-'})</span>
              <span className="w-32 text-right">{t.type === 'masuk' ? '+' : '-'} Rp {Number(t.amount || 0).toLocaleString('id-ID')}</span>
            </div>
          ))}
        </div>
        <div className="pt-6 flex justify-between text-xs text-center">
          <div><p>Mengetahui, Kepala Sekolah</p><br /><br /><p>( ........................... )</p></div>
          <div><p>Bendahara Sekolah,</p><br /><br /><p>( ........................... )</p></div>
        </div>
      </div>

      {/* Modal Tambah Transaksi Kas */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900">Catat Transaksi Kas Baru</h3>

            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setType('masuk'); setCategory('SPP Siswa'); }}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    type === 'masuk' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  Penerimaan Kas (Masuk)
                </button>
                <button
                  type="button"
                  onClick={() => { setType('keluar'); setCategory('Operasional'); }}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    type === 'keluar' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  Pengeluaran Kas (Keluar)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Kategori:</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tanggal Transaksi:</label>
                  <input
                    type="date"
                    value={date}
                    max={todayLocal()}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Nominal (Rp):</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Contoh: 1500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Keterangan / Rincian:</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembelian tinta printer & ATK ujian"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Pihak Terkait (Penyetor/Penerima):</label>
                <input
                  type="text"
                  placeholder="Contoh: Toko ATK Bersama"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-60"
                >
                  {isSaving ? 'Menyimpan…' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
