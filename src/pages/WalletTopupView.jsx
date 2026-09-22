import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Send, 
  History, 
  QrCode, 
  CheckCircle2, 
  Copy, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  Smartphone, 
  Receipt, 
  Search, 
  UserCheck,
  X,
  Loader2
} from 'lucide-react';

export default function WalletTopupView() {
  const { currentUser, currentRole, isStaff, isAuthenticated, openLogin, showToast } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [filterType, setFilterType] = useState('all');

  // Modals
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCardQrModal, setShowCardQrModal] = useState(false);

  // Top-Up Form State
  const [topupAmount, setTopupAmount] = useState(50000);
  const [customAmount, setCustomAmount] = useState('');
  const [topupMethod, setTopupMethod] = useState('qris'); // 'qris', 'va', 'cash'
  const [selectedBank, setSelectedBank] = useState('BCA');
  const [isProcessing, setIsProcessing] = useState(false);
  const [topupStep, setTopupStep] = useState(1); // 1 = select, 2 = payment instruction

  // Transfer Form State
  const [targetCard, setTargetCard] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Admin all wallets state
  const [allWallets, setAllWallets] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [adminSearch, setAdminSearch] = useState('');

  // Kode booking setor tunai dibuat sekali saat masuk langkah pembayaran (bukan tiap render)
  const [cashBookingCode, setCashBookingCode] = useState('');

  // Terjemahkan respons non-OK menjadi pesan error; 401 = sesi habis (tampilkan ajakan login)
  const handleApiFailure = (res, data, fallbackMsg) => {
    if (res.status === 401) {
      setNeedsLogin(true);
      return 'Sesi Anda telah berakhir. Silakan masuk kembali untuk mengakses dompet digital.';
    }
    return data?.message || fallbackMsg;
  };

  const fetchTransactions = async (walletId) => {
    if (!walletId) return;
    try {
      const res = await fetch(`/api/wallet/transactions/${walletId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        handleApiFailure(res, data, '');
        return;
      }
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllWallets = async () => {
    try {
      const res = await fetch('/api/wallet/all');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        handleApiFailure(res, data, '');
        return;
      }
      setAllWallets(Array.isArray(data.wallets) ? data.wallets : []);
      setWalletSummary(data.summary || null);
    } catch (err) {
      console.error(err);
    }
  };

  // Dompet diidentifikasi server dari sesi login; parameter identitas akun hanya untuk kompatibilitas
  const fetchWallet = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        role: currentRole || '',
        name: currentUser?.name || '',
        identifier: currentUser?.username || ''
      });
      const res = await fetch(`/api/wallet/my-wallet?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.wallet) {
        setWallet(null);
        setTransactions([]);
        setWalletError(handleApiFailure(res, data, 'Dompet digital belum aktif untuk akun ini. Hubungi Tata Usaha sekolah.'));
      } else {
        setWallet(data.wallet);
        setWalletError('');
        fetchTransactions(data.wallet.id);
      }
      if (isStaff) {
        fetchAllWallets();
      }
    } catch (err) {
      console.error(err);
      setWalletError('Dompet tidak dapat dimuat karena server tidak terjangkau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Tamu: tampilkan ajakan login tanpa memanggil API privat (akan 401)
      setNeedsLogin(true);
      setLoading(false);
      setWallet(null);
      setTransactions([]);
      setAllWallets([]);
      setWalletSummary(null);
      return;
    }
    setNeedsLogin(false);
    fetchWallet();
  }, [isAuthenticated, currentRole, currentUser]);

  const selectedTopupAmount = customAmount ? Number(customAmount) : topupAmount;

  const openTopupModal = () => {
    if (!wallet) return showToast(walletError || 'Dompet belum aktif, top-up belum dapat dilakukan.', 'error');
    setTopupStep(1);
    setShowTopupModal(true);
  };

  const goToPaymentStep = () => {
    if (!selectedTopupAmount || selectedTopupAmount < 10000) {
      return showToast('Minimal top-up adalah Rp 10.000', 'error');
    }
    if (topupMethod === 'cash') {
      setCashBookingCode(`KSR-TOPUP-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    setTopupStep(2);
  };

  const handleTopupSubmit = async () => {
    if (!wallet) return showToast(walletError || 'Dompet belum aktif, tidak dapat top-up.', 'error');
    const finalAmount = selectedTopupAmount;
    if (!finalAmount || finalAmount < 10000) {
      return showToast('Minimal top-up adalah Rp 10.000', 'error');
    }

    let referenceNumber;
    if (topupMethod === 'va') referenceNumber = `VA-${selectedBank}-${Math.floor(100000 + Math.random() * 900000)}`;
    if (topupMethod === 'cash' && cashBookingCode) referenceNumber = cashBookingCode;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: wallet.id,
          amount: finalAmount,
          method: topupMethod,
          reference_number: referenceNumber
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(handleApiFailure(res, data, 'Gagal memproses top-up'));
      }
      showToast(data.message || 'Top-up berhasil', 'success');
      const updatedWallet = data.wallet || wallet;
      setWallet(updatedWallet);
      fetchTransactions(updatedWallet.id);
      if (isStaff) fetchAllWallets();
      setShowTopupModal(false);
      setTopupStep(1);
      setCustomAmount('');
    } catch (err) {
      showToast(err.message || 'Gagal memproses top-up', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) return showToast(walletError || 'Dompet belum aktif, tidak dapat transfer.', 'error');
    const amount = Number(transferAmount);
    const cardNumber = targetCard.trim();
    if (!cardNumber) return showToast('Masukkan nomor kartu tujuan', 'error');
    if (cardNumber.toLowerCase() === String(wallet.card_number || '').toLowerCase()) {
      return showToast('Tidak dapat transfer ke kartu sendiri', 'error');
    }
    if (!amount || amount < 5000) return showToast('Minimal transfer Rp 5.000', 'error');
    if (amount > (wallet.balance || 0)) return showToast('Saldo Anda tidak mencukupi', 'error');

    setIsProcessing(true);
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_wallet_id: wallet.id,
          target_card_number: cardNumber,
          amount: amount,
          notes: transferNotes.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(handleApiFailure(res, data, 'Transfer gagal'));
      }
      showToast(data.message || 'Transfer berhasil', 'success');
      const updatedWallet = data.wallet || wallet;
      setWallet(updatedWallet);
      fetchTransactions(updatedWallet.id);
      if (isStaff) fetchAllWallets();
      setShowTransferModal(false);
      setTargetCard('');
      setTransferAmount('');
      setTransferNotes('');
    } catch (err) {
      showToast(err.message || 'Gagal memproses transfer', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} disalin ke clipboard!`, 'info');
    } catch {
      showToast(`Tidak dapat menyalin otomatis. ${label}: ${text}`, 'info');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const type = t.type || '';
    if (filterType === 'all') return true;
    if (filterType === 'topup') return type === 'topup' || type === 'transfer_in';
    if (filterType === 'canteen') return type === 'payment_canteen';
    if (filterType === 'digital') return type === 'payment_digital';
    if (filterType === 'out') return type.includes('payment') || type === 'transfer_out';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#002147]/10 border border-[#002147]/20 text-[#002147] text-xs font-semibold uppercase mb-2">
            <Wallet className="w-3.5 h-3.5 text-[#f4a024]" /> Dompet Digital & Kartu Pintar
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#002147]">Smart School Cashless Card</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Ekosistem transaksi non-tunai resmi untuk belanja kantin, produk digital, dan administrasi sekolah.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={openTopupModal}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#f4a024]" /> Isi Saldo (Top-Up)
          </button>
          <button
            onClick={() => {
              if (!wallet) return showToast(walletError || 'Dompet belum aktif, transfer belum dapat dilakukan.', 'error');
              setShowTransferModal(true);
            }}
            disabled={!wallet}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5 text-[#002147]" /> Transfer
          </button>
        </div>
      </div>

      {/* Ajakan login untuk tamu / sesi berakhir, atau keterangan dompet belum aktif */}
      {(needsLogin || (!loading && !wallet && walletError)) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {needsLogin
                ? 'Silakan masuk dengan akun sekolah Anda untuk melihat saldo, riwayat transaksi, dan melakukan top-up.'
                : walletError}
            </span>
          </div>
          {needsLogin && (
            <button
              onClick={openLogin}
              className="px-4 py-2 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              Masuk Sekarang
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Card & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Smart Card */}
        <div className="lg:col-span-1">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#001733] via-[#002147] to-[#003875] p-6 text-white shadow-xl shadow-[#002147]/25 flex flex-col justify-between min-h-[220px] border border-white/10">
            {/* Background Decorative patterns */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-[#f4a024]/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-36 h-36 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
            
            {/* Top row */}
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider uppercase text-[#f4a024]">
                  <span>HARAPAN BANGSA</span>
                  <span className="w-1 h-1 rounded-full bg-[#f4a024]" />
                  <span>SMART CARD</span>
                </div>
                <p className="text-[10px] text-slate-300">Kartu Pelajar & Civitas Digital</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCardQrModal(true)}
                  title="Lihat Barcode Kartu"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chip & NFC symbol */}
            <div className="my-3 flex items-center gap-3 relative z-10">
              <div className="w-10 h-7 rounded-md bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 border border-amber-300/40 flex items-center justify-center shadow-inner">
                <div className="w-8 h-5 border-t border-b border-amber-600/40" />
              </div>
              <span className="text-white/60 text-xs font-mono tracking-widest font-semibold">))) NFC CASHLESS</span>
            </div>

            {/* Balance section */}
            <div className="relative z-10">
              <div className="flex items-center justify-between text-slate-300 text-[11px] mb-0.5">
                <span>Saldo Aktif</span>
                <button 
                  onClick={() => setHideBalance(!hideBalance)}
                  className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {hideBalance ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span className="text-[10px]">{hideBalance ? 'Tampilkan' : 'Sembunyikan'}</span>
                </button>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-1.5">
                {hideBalance ? (
                  <span>Rp ••••••••</span>
                ) : loading ? (
                  <span className="text-base text-slate-300 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memuat saldo...</span>
                ) : wallet ? (
                  <span>Rp {(wallet.balance || 0).toLocaleString('id-ID')}</span>
                ) : (
                  <span className="text-base text-slate-300">{needsLogin ? 'Belum masuk' : 'Dompet belum aktif'}</span>
                )}
              </div>
            </div>

            {/* Bottom: Card No & Holder */}
            <div className="pt-3 border-t border-white/15 flex items-end justify-between relative z-10 text-xs">
              <div>
                <p className="font-mono text-[11px] tracking-wider text-amber-200">{wallet?.card_number || 'CARD-0000-0000'}</p>
                <p className="font-bold text-white uppercase text-xs truncate max-w-[170px]">{wallet?.holder_name || currentUser.name}</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#f4a024] text-[#002147]">
                  {wallet?.holder_role || currentRole}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Benefits */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500 font-semibold">Total Top-Up Masuk</p>
              <h4 className="text-lg font-black text-slate-900 mt-1">
                Rp {transactions
                  .filter(t => t.type === 'topup' || t.type === 'transfer_in')
                  .reduce((acc, t) => acc + t.amount, 0)
                  .toLocaleString('id-ID')}
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Bebas biaya admin sekolah
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500 font-semibold">Total Belanja & Keluar</p>
              <h4 className="text-lg font-black text-slate-900 mt-1">
                Rp {transactions
                  .filter(t => t.type.includes('payment') || t.type === 'transfer_out')
                  .reduce((acc, t) => acc + t.amount, 0)
                  .toLocaleString('id-ID')}
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-rose-600" /> Terhubung struk kasir kantin
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-3xl p-5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-[#f4a024] flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">Keuntungan Cashless</p>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Antrean kantin lebih cepat, tanpa uang kembalian lecek, serta orang tua dapat memonitor riwayat jajan harian anak secara real-time.
              </p>
            </div>
            <button
              onClick={openTopupModal}
              className="mt-3 text-xs font-bold text-[#002147] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Isi Saldo Sekarang &rarr;
            </button>
          </div>

        </div>

      </div>

      {/* Transaction History Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#002147]" />
            <h3 className="text-base font-bold text-[#002147]">Mutasi & Riwayat Transaksi</h3>
            <span className="text-xs text-slate-400">({filteredTransactions.length} transaksi)</span>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all', label: 'Semua' },
              { key: 'topup', label: 'Top-Up Masuk' },
              { key: 'canteen', label: 'Kantin' },
              { key: 'digital', label: 'Produk Digital' },
              { key: 'out', label: 'Pengeluaran' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterType === tab.key
                    ? 'bg-[#002147] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List Transactions */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">Belum ada riwayat transaksi pada kategori ini</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'topup' || tx.type === 'transfer_in';
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isIncome 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}>
                      {isIncome ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-600">{tx.transaction_code}</span>
                        <span>•</span>
                        <span>{tx.created_at}</span>
                        <span>•</span>
                        <span className="capitalize px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">{tx.method}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {isIncome ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                    </p>
                    <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Panel Staf/TU: Monitoring Seluruh Saldo Sekolah (GET /api/wallet/all) */}
      {isStaff && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase mb-1">
                Panel Tata Usaha & Keuangan
              </div>
              <h3 className="text-base font-bold text-[#002147]">Daftar Saldo Kartu Pintar Civitas Sekolah</h3>
            </div>
            
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Uang Beredar E-Money:</span>
              <p className="text-lg font-black text-emerald-600">
                Rp {(walletSummary?.total_circulating_balance || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pemegang atau nomor kartu..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3">No. Kartu</th>
                  <th className="py-2.5 px-3">Nama Pemegang</th>
                  <th className="py-2.5 px-3">Peran</th>
                  <th className="py-2.5 px-3">ID / NISN</th>
                  <th className="py-2.5 px-3 text-right">Saldo Saat Ini</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allWallets
                  .filter(w => 
                    w.holder_name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
                    w.card_number?.toLowerCase().includes(adminSearch.toLowerCase())
                  )
                  .map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-[#002147]">{w.card_number}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{w.holder_name}</td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {w.holder_role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">{w.holder_identifier || '-'}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        Rp {(w.balance || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Top-Up Saldo */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#f4a024]" /> Isi Saldo Dompet Sekolah
              </h3>
              <button
                onClick={() => setShowTopupModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {topupStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih Nominal Top-Up Instan:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[20000, 50000, 100000, 200000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setTopupAmount(amt); setCustomAmount(''); }}
                        className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          !customAmount && topupAmount === amt
                            ? 'border-[#002147] bg-[#002147] text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>Rp {amt.toLocaleString('id-ID')}</span>
                        {!customAmount && topupAmount === amt && <CheckCircle2 className="w-3.5 h-3.5 text-[#f4a024]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Atau Masukkan Nominal Lain (Rp):
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    placeholder="Contoh: 75000"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Minimal isi saldo Rp 10.000</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Metode Pembayaran:
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      topupMethod === 'qris' ? 'border-[#002147] bg-[#002147]/5' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="topup_method"
                          checked={topupMethod === 'qris'}
                          onChange={() => setTopupMethod('qris')}
                          className="text-[#002147]"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <QrCode className="w-4 h-4 text-[#002147]" /> QRIS Instan (Semua Bank & E-Wallet)
                          </p>
                          <p className="text-[10px] text-slate-500">BCA, Mandiri, GoPay, OVO, DANA, ShopeePay</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Otomatis</span>
                    </label>

                    <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      topupMethod === 'va' ? 'border-[#002147] bg-[#002147]/5' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="topup_method"
                          checked={topupMethod === 'va'}
                          onChange={() => setTopupMethod('va')}
                          className="text-[#002147]"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-[#002147]" /> Virtual Account Bank
                          </p>
                          <p className="text-[10px] text-slate-500">BCA, Mandiri, BRI, BNI</p>
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      topupMethod === 'cash' ? 'border-[#002147] bg-[#002147]/5' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="topup_method"
                          checked={topupMethod === 'cash'}
                          onChange={() => setTopupMethod('cash')}
                          className="text-[#002147]"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-[#002147]" /> Setor Tunai di Kasir / TU Sekolah
                          </p>
                          <p className="text-[10px] text-slate-500">Bayar tunai ke petugas kantin / loket sekolah</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={goToPaymentStep}
                    className="w-full py-2.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    Lanjutkan Pembayaran Rp {(customAmount ? Number(customAmount) : topupAmount).toLocaleString('id-ID')} &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Total Pembayaran:</span>
                  <div className="text-xl font-black text-[#002147]">
                    Rp {(customAmount ? Number(customAmount) : topupAmount).toLocaleString('id-ID')}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Metode: <strong className="uppercase">{topupMethod}</strong>
                  </p>
                </div>

                {topupMethod === 'qris' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">Scan QRIS ini dengan aplikasi m-Banking atau e-Wallet apa saja:</p>
                    <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl border border-slate-300 shadow-md flex items-center justify-center">
                      {/* Simulating QR code graphic */}
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=HARAPAN-BANGSA-SMARTCARD-TOPUP"
                        alt="QRIS Sekolah"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="inline-block text-[11px] font-bold text-[#002147] bg-[#002147]/10 px-3 py-1 rounded-full">
                      NMID: ID1020081928371
                    </span>
                  </div>
                )}

                {topupMethod === 'va' && (
                  <div className="space-y-3 text-left">
                    <p className="text-xs text-slate-600">Nomor Virtual Account Bank:</p>
                    <div className="p-3 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-[#002147]">
                        8808 0061 2345 6101
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('8808006123456101', 'Nomor Virtual Account')}
                        className="px-2.5 py-1 rounded-lg bg-[#002147] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Salin
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">Nama Penerima: <strong>SMAN 1 HARAPAN BANGSA ({wallet?.holder_name})</strong></p>
                  </div>
                )}

                {topupMethod === 'cash' && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs space-y-2 text-amber-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" /> Kode Booking Kasir:
                    </p>
                    <p className="font-mono text-base font-black text-[#002147]">{cashBookingCode || 'KSR-TOPUP-0000'}</p>
                    <p className="text-[11px]">Tunjukkan kode ini kepada kasir kantin atau petugas Tata Usaha sekolah saat menyetorkan uang tunai.</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTopupStep(1)}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleTopupSubmit}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Konfirmasi Bayar Selesai
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Transfer Saldo */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#f4a024]" /> Transfer Uang Saku Antar Kartu
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Saldo Anda Saat Ini:</span>
              <span className="font-black text-[#002147]">Rp {(wallet?.balance || 0).toLocaleString('id-ID')}</span>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Kartu Pelajar Tujuan:</label>
                <input
                  type="text"
                  placeholder="Contoh: CARD-7721-0061 atau CARD-1975-1001"
                  value={targetCard}
                  onChange={(e) => setTargetCard(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Transfer (Rp):</label>
                <input
                  type="number"
                  min="5000"
                  step="1000"
                  placeholder="Minimal Rp 5.000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pesan / Catatan (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: Uang saku jajan siang / patungan buku"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#f4a024]" />}
                  <span>Kirim Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code Kartu Pelajar */}
      {showCardQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#002147]">Barcode Digital Kartu Pelajar</h3>
              <button onClick={() => setShowCardQrModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${wallet?.card_number || 'CARD'}`}
                alt="Barcode Kartu"
                className="w-44 h-44 mx-auto object-contain"
              />
              <p className="font-mono font-black text-sm text-[#002147] mt-3">{wallet?.card_number}</p>
              <p className="text-xs font-bold text-slate-800">{wallet?.holder_name}</p>
              <p className="text-[11px] text-slate-500 uppercase">{wallet?.holder_role}</p>
            </div>

            <p className="text-[11px] text-slate-500">
              Tunjukkan barcode ini ke scanner kasir kantin atau perpustakaan untuk transaksi kilat tanpa kartu fisik.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
