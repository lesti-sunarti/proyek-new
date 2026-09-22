import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Printer, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function FinanceView() {
  const { showToast } = useAuth();
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form input transaksi
  const [type, setType] = useState('masuk');
  const [category, setCategory] = useState('SPP Siswa');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');

  const loadFinance = () => {
    fetch('/api/finance/summary').then(r => r.json()).then(setSummary).catch(() => {});
    fetch('/api/finance/transactions').then(r => r.json()).then(setTransactions).catch(() => {});
  };

  useEffect(() => {
    loadFinance();
  }, []);

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!amount || !description) return showToast('Nominal dan keterangan harus diisi', 'error');

    fetch('/api/finance/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        category,
        amount: Number(amount),
        description,
        source_or_recipient: source || (type === 'masuk' ? 'Penyetor' : 'Penerima')
      })
    })
      .then(r => r.json())
      .then(data => {
        showToast(data.message, 'success');
        setShowAddModal(false);
        setAmount('');
        setDescription('');
        setSource('');
        loadFinance();
      });
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
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5"
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
          <div className="text-[11px] text-slate-500 mt-2 font-medium">Likuiditas Sekolah Stabil & Terpantau</div>
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
                    {t.type === 'masuk' ? '+' : '-'} Rp {Number(t.amount).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <label className="block text-xs text-slate-500 mb-1">Nominal (Rp):</label>
                <input
                  type="number"
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
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
