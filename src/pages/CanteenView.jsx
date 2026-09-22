import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Wallet, 
  QrCode, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText, 
  Smartphone, 
  Zap, 
  Coffee, 
  Utensils, 
  BookOpen, 
  Copy, 
  Loader2, 
  ChefHat, 
  Store,
  UploadCloud
} from 'lucide-react';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // batas /api/upload di server
const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';

export default function CanteenView() {
  const { currentUser, currentRole, isStaff, isAuthenticated, openLogin, setActiveModule, showToast } = useAuth();
  
  // Data states
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'my_orders', 'admin_orders'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state
  const [cart, setCart] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [pickupTime, setPickupTime] = useState('Istirahat 1 (09.30)');
  const [orderNotes, setOrderNotes] = useState('');
  const [digitalTarget, setDigitalTarget] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet', 'qris', 'cash'
  const [isOrdering, setIsOrdering] = useState(false);

  // Order Receipt Modal
  const [completedOrder, setCompletedOrder] = useState(null);

  // Admin Add/Edit Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('makanan');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('50');
  const [newProdStand, setNewProdStand] = useState('Kantin Utama');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdDigitalType, setNewProdDigitalType] = useState('');
  const [uploadMode, setUploadMode] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Terjemahkan respons non-OK menjadi pesan error; 401 = sesi habis (tampilkan ajakan login)
  const handleApiFailure = (res, data, fallbackMsg) => {
    if (res.status === 401) {
      setNeedsLogin(true);
      return 'Sesi Anda telah berakhir. Silakan masuk kembali untuk memesan.';
    }
    if (res.status === 403) {
      const msg = data?.message || 'Akun Anda tidak memiliki hak akses layanan kantin.';
      setAccessError(msg);
      return msg;
    }
    return data?.message || fallbackMsg;
  };

  // Produk bisa dibeli hanya jika tersedia (is_available != 0) dan stok > 0
  const isProductAvailable = (p) =>
    Boolean(p) && Number(p.stock) > 0 && p.is_available !== 0 && p.is_available !== false;

  // Load Data (GET /api/canteen/products -> {success, products})
  const loadProducts = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await fetch('/api/canteen/products');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const msg = handleApiFailure(res, data, 'Gagal memuat daftar produk kantin');
        if (res.status !== 401 && res.status !== 403) showToast(msg, 'error');
        return;
      }
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // GET /api/canteen/orders -> {success, orders}; staf/pengelola memuat seluruh antrean kasir
  const loadOrders = async () => {
    if (!isAuthenticated) return;
    try {
      const url = isStaff
        ? '/api/canteen/orders'
        : `/api/canteen/orders?buyer_name=${encodeURIComponent(currentUser.name || '')}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        handleApiFailure(res, data, '');
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      console.error(err);
    }
  };

  // GET /api/wallet/my-wallet -> {success, wallet}; dompet diidentifikasi server dari sesi login
  // (parameter identitas akun hanya untuk kompatibilitas, bukan nama default)
  const loadWallet = async () => {
    if (!isAuthenticated) return;
    try {
      const params = new URLSearchParams({
        role: currentRole || '',
        name: currentUser.name || '',
        identifier: currentUser.username || ''
      });
      const res = await fetch(`/api/wallet/my-wallet?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.wallet) {
        setWallet(null);
        if (res.status === 401) {
          setNeedsLogin(true);
          setWalletError('');
        } else {
          setWalletError(data.message || 'Dompet digital belum aktif untuk akun ini.');
        }
        return;
      }
      setWallet(data.wallet);
      setWalletError('');
    } catch (err) {
      console.error(err);
      setWalletError('Dompet tidak dapat dimuat karena server tidak terjangkau.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Tamu: jangan panggil API privat (akan 401); tampilkan ajakan login
      setNeedsLogin(true);
      setLoading(false);
      setProducts([]);
      setOrders([]);
      setWallet(null);
      return;
    }
    setNeedsLogin(false);
    setAccessError('');
    loadProducts();
    loadOrders();
    loadWallet();
  }, [isAuthenticated, currentRole, currentUser]);

  // Cart Handlers (kuantitas dibatasi stok; produk tidak tersedia tidak bisa ditambahkan)
  const addToCart = (product) => {
    if (!isProductAvailable(product)) {
      return showToast(`${product.name} sedang tidak tersedia atau stok habis`, 'error');
    }
    const maxQty = Number(product.stock);
    const existing = cart.find((item) => item.id === product.id);
    if (existing && existing.quantity >= maxQty) {
      return showToast(`Stok ${product.name} hanya tersisa ${maxQty}`, 'error');
    }
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id);
      if (found) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, maxQty) } : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        category: product.category,
        stock: maxQty,
        quantity: 1
      }];
    });
    showToast(`${product.name} dimasukkan ke keranjang`, 'info');
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    const item = cart.find((it) => it.id === productId);
    if (!item) return;
    const product = products.find((p) => p.id === productId);
    const maxQty = product ? Number(product.stock) : Number(item.stock) || Infinity;
    const newQty = item.quantity + delta;
    if (newQty <= 0) return removeFromCart(productId);
    if (newQty > maxQty) {
      return showToast(`Stok ${item.name} hanya tersisa ${maxQty}`, 'error');
    }
    setCart((prev) => prev.map((it) => (it.id === productId ? { ...it, quantity: newQty } : it)));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const hasDigitalInCart = cart.some((item) => item.category === 'digital');

  // Produk digital tidak bisa dibayar tunai; kembalikan pilihan ke dompet
  useEffect(() => {
    if (hasDigitalInCart && paymentMethod === 'cash') setPaymentMethod('wallet');
  }, [hasDigitalInCart, paymentMethod]);

  // Checkout Handler (POST /api/canteen/order -> {success, message, order, new_balance})
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return showToast('Keranjang belanja kosong', 'error');
    if (!isAuthenticated) {
      setNeedsLogin(true);
      return showToast('Silakan masuk terlebih dahulu untuk memesan', 'error');
    }

    // Validasi ulang terhadap ketersediaan & stok produk terkini
    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      if (!product || !isProductAvailable(product)) {
        return showToast(`${item.name} sudah tidak tersedia. Hapus dari keranjang.`, 'error');
      }
      if (item.quantity > Number(product.stock)) {
        return showToast(`Stok ${item.name} hanya tersisa ${product.stock}. Kurangi jumlah pesanan.`, 'error');
      }
    }

    if (hasDigitalInCart && !digitalTarget.trim()) {
      return showToast('Masukkan nomor tujuan / nomor meter listrik untuk produk digital', 'error');
    }

    if (paymentMethod === 'wallet' && wallet && wallet.balance < cartTotal) {
      return showToast('Saldo dompet sekolah tidak mencukupi! Silakan lakukan top-up terlebih dahulu.', 'error');
    }

    setIsOrdering(true);
    try {
      const res = await fetch('/api/canteen/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: currentUser.name,
          buyer_role: currentRole,
          buyer_identifier: currentUser.username || '',
          items: cart.map(({ id, name, price, category, quantity }) => ({ id, name, price, category, quantity })),
          payment_method: paymentMethod,
          pickup_time: hasDigitalInCart ? 'Instan (Produk Digital)' : pickupTime,
          notes: orderNotes.trim(),
          digital_target: hasDigitalInCart ? digitalTarget.trim() : null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(handleApiFailure(res, data, 'Gagal memproses pesanan'));
      }
      showToast(data.message || 'Pesanan berhasil dibuat', 'success');
      setCompletedOrder(data.order || null);
      // Tampilkan saldo baru langsung dari respons server
      if (data.new_balance !== null && data.new_balance !== undefined) {
        setWallet((prev) => (prev ? { ...prev, balance: Number(data.new_balance) } : prev));
      } else if (data.wallet) {
        setWallet(data.wallet);
      }
      setCart([]);
      setShowCartDrawer(false);
      setOrderNotes('');
      setDigitalTarget('');
      loadProducts();
      loadOrders();
      loadWallet();
    } catch (err) {
      showToast(err.message || 'Gagal memproses pesanan', 'error');
    } finally {
      setIsOrdering(false);
    }
  };

  // Update Order Status (Kasir / Pengelola) - PUT /api/canteen/orders/:id/status {order_status}
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/canteen/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: newStatus })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(handleApiFailure(res, data, 'Gagal mengubah status pesanan'));
      }
      showToast(data.message || 'Status pesanan berhasil diperbarui', 'success');
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Gagal mengubah status pesanan', 'error');
    }
  };

  // Product Photo Upload Handler (validasi sesuai /api/upload: JPG/PNG/WEBP, maks 5 MB)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return showToast('Format foto harus JPG, PNG, atau WEBP', 'error');
    if (file.size > MAX_IMAGE_BYTES) return showToast('Ukuran foto maksimal 5 MB', 'error');
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const name = newProdName.trim();
    const price = Number(newProdPrice);
    const stock = newProdStock === '' ? 50 : Number(newProdStock);
    if (!name || !newProdPrice) return showToast('Nama dan harga wajib diisi', 'error');
    if (!Number.isFinite(price) || price <= 0) return showToast('Harga jual harus lebih dari 0', 'error');
    if (!Number.isFinite(stock) || stock < 0) return showToast('Stok tidak boleh bernilai negatif', 'error');

    setIsUploading(true);
    try {
      let finalImageUrl = uploadMode === 'url' ? newProdImage.trim() : '';
      if (uploadMode === 'file' && previewImage) {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: previewImage,
            filename: selectedFile?.name || 'produk.jpg'
          })
        });
        const upData = await upRes.json().catch(() => ({}));
        if (!upRes.ok || !upData.success || !upData.url) {
          throw new Error(handleApiFailure(upRes, upData, 'Gagal mengunggah foto produk'));
        }
        finalImageUrl = upData.url;
      }

      const res = await fetch('/api/canteen/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: newProdCategory,
          price,
          stock,
          image_url: finalImageUrl || DEFAULT_PRODUCT_IMAGE,
          description: newProdDesc.trim(),
          stand_name: newProdStand.trim() || 'Kantin Utama Sekolah',
          digital_type: newProdCategory === 'digital' ? (newProdDigitalType || 'voucher') : null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(handleApiFailure(res, data, 'Gagal menambah produk'));
      }
      showToast(data.message || 'Produk berhasil ditambahkan', 'success');
      setShowProductModal(false);
      setNewProdName('');
      setNewProdPrice('');
      setNewProdDesc('');
      setNewProdImage('');
      setNewProdDigitalType('');
      setSelectedFile(null);
      setPreviewImage('');
      loadProducts();
    } catch (err) {
      showToast(err.message || 'Gagal menambah produk', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const copyText = async (txt, label) => {
    try {
      await navigator.clipboard.writeText(txt);
      showToast(`${label} disalin ke clipboard!`, 'info');
    } catch {
      showToast(`Tidak dapat menyalin otomatis. ${label}: ${txt}`, 'info');
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = (p.name || '').toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  // Tab "Pesanan Saya": staf memuat seluruh antrean, jadi saring pesanan miliknya sendiri
  const myOrders = isStaff ? orders.filter((o) => o.buyer_name === currentUser.name) : orders;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#002147]/10 border border-[#002147]/20 text-[#002147] text-xs font-semibold uppercase mb-2">
            <Store className="w-3.5 h-3.5 text-[#f4a024]" /> Kantin & Koperasi Digital
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#002147]">Kantin Online & Layanan Produk Digital</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Pesan makanan & minuman hangat bebas antre, beli pulsa, kuota belajar, token listrik PLN, serta seragam sekolah.
          </p>
        </div>

        {/* Live Wallet Chip & Cart Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div 
            onClick={() => setActiveModule('topup')}
            className="flex-1 sm:flex-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-2.5 px-3.5 flex items-center gap-3 cursor-pointer transition-colors"
            title="Klik untuk membuka Dompet Digital"
          >
            <div className="w-8 h-8 rounded-xl bg-[#002147] text-[#f4a024] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold">Saldo Dompet Anda:</p>
              <p className="text-xs font-black text-[#002147]">
                {wallet ? `Rp ${(wallet.balance || 0).toLocaleString('id-ID')}` : (needsLogin ? 'Belum masuk' : 'Belum aktif')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCartDrawer(true)}
            className="relative px-4 py-2.5 rounded-2xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#f4a024]" />
            <span className="hidden sm:inline">Keranjang</span>
            {cartItemCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#f4a024] text-[#002147] font-black text-[11px] flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Ajakan login untuk tamu / sesi berakhir, dan keterangan hak akses */}
      {(needsLogin || accessError) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {needsLogin
                ? 'Silakan masuk dengan akun sekolah Anda untuk melihat menu kantin, memesan, dan membayar dengan dompet digital.'
                : accessError}
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

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'menu' 
                ? 'bg-[#002147] text-white shadow-sm' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-[#f4a024]" /> Menu & Produk
          </button>

          <button
            onClick={() => setActiveTab('my_orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_orders' 
                ? 'bg-[#002147] text-white shadow-sm' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#f4a024]" /> Pesanan Saya ({myOrders.length})
          </button>

          {isStaff && (
            <button
              onClick={() => setActiveTab('admin_orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admin_orders' 
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" /> Antrean Kasir / Pengelola
            </button>
          )}
        </div>

        {isStaff && activeTab === 'menu' && (
          <button
            onClick={() => setShowProductModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Menu Baru
          </button>
        )}
      </div>

      {/* TAB 1: MENU & PRODUK KATALOG */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          
          {/* Category Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {[
                { key: 'all', label: 'Semua Menu', icon: Store },
                { key: 'makanan', label: '🍱 Makanan Hangat', icon: Utensils },
                { key: 'minuman', label: '🥤 Minuman Segar', icon: Coffee },
                { key: 'digital', label: '⚡ Produk Digital & PPOB', icon: Zap },
                { key: 'koperasi', label: '📚 Koperasi & Atribut', icon: BookOpen },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat.key
                      ? 'bg-[#002147] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari menu, snack, pulsa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147]"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((p) => {
              const inCart = cart.find((it) => it.id === p.id);
              const isUnavailable = p.is_available === 0 || p.is_available === false;
              const isOutOfStock = isUnavailable || Number(p.stock) <= 0;
              const atStockLimit = Boolean(inCart) && inCart.quantity >= Number(p.stock);
              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-[#002147]/40 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Image Box */}
                    <div className="relative h-44 bg-slate-100 overflow-hidden">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
                        }}
                      />
                      
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase ${
                          p.category === 'makanan' ? 'bg-amber-600' :
                          p.category === 'minuman' ? 'bg-blue-600' :
                          p.category === 'digital' ? 'bg-indigo-600' : 'bg-emerald-600'
                        }`}>
                          {p.category}
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-white">
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs font-semibold">
                          {p.stand_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          isOutOfStock ? 'bg-rose-600' : 'bg-emerald-600'
                        }`}>
                          {isUnavailable ? 'Tidak Tersedia' : isOutOfStock ? 'Habis' : `Stok ${p.stock}`}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-1.5">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-[#002147] transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {p.description || 'Pilihan menu sehat bergizi standar kantin sekolah.'}
                      </p>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="p-4 pt-0 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Harga</p>
                      <p className="text-base font-black text-[#002147]">
                        Rp {p.price.toLocaleString('id-ID')}
                      </p>
                    </div>

                    {isOutOfStock ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold">
                        {isUnavailable ? 'Tidak Tersedia' : 'Habis'}
                      </span>
                    ) : inCart ? (
                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(p.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer shadow-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-[#002147] w-5 text-center">
                          {inCart.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(p.id, 1)}
                          disabled={atStockLimit}
                          title={atStockLimit ? `Stok tersisa ${p.stock}` : 'Tambah jumlah'}
                          className="w-6 h-6 rounded-lg bg-[#002147] hover:bg-[#002e62] text-white font-bold flex items-center justify-center text-xs cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        disabled={needsLogin}
                        className="px-3 py-1.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#f4a024]" /> Tambah
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
              <Store className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Tidak ada produk ditemukan</p>
              <p className="text-xs text-slate-500">Coba kata kunci pencarian lain atau pilih kategori Semua Menu.</p>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: PESANAN SAYA */}
      {activeTab === 'my_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-[#002147]">Daftar Pesanan Saya</h3>
            <span className="text-xs text-slate-500">{myOrders.length} pesanan tercatat</span>
          </div>

          {myOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Belum ada pesanan aktif</p>
              <p className="text-xs text-slate-500">
                {needsLogin ? 'Masuk terlebih dahulu untuk melihat riwayat pesanan Anda.' : 'Silakan pilih menu makanan atau produk digital pada tab Menu & Produk.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myOrders.map((ord) => (
                <div key={ord.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-[#002147] bg-[#002147]/5 px-2.5 py-1 rounded-lg border border-[#002147]/10">
                        {ord.order_number}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        ord.order_status === 'selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        ord.order_status === 'siap_diambil' ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {ord.order_status === 'siap_diambil' ? 'Siap Diambil di Stand!' : ord.order_status}
                      </span>
                    </div>

                    <div className="space-y-1 divide-y divide-slate-100">
                      {(ord.items || []).map((it, idx) => (
                        <div key={idx} className="pt-1.5 flex justify-between text-xs text-slate-700">
                          <span>{it.quantity}x {it.name}</span>
                          <span className="font-semibold text-slate-900">Rp {(it.price * it.quantity).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>

                    {ord.serial_number && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-1">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">Token / Kode SN Digital:</span>
                        <div className="flex items-center justify-between font-mono font-black text-indigo-900 text-sm">
                          <span>{ord.serial_number}</span>
                          <button
                            onClick={() => copyText(ord.serial_number, 'Kode SN Token')}
                            className="p-1 hover:bg-indigo-100 rounded text-indigo-700 cursor-pointer"
                            title="Salin Kode"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {ord.digital_target && (
                          <p className="text-[10px] text-indigo-600">Nomor Tujuan: {ord.digital_target}</p>
                        )}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                      <p>Waktu Ambil: <strong>{ord.pickup_time}</strong></p>
                      {ord.notes && <p>Catatan: <em>"{ord.notes}"</em></p>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Total Pembayaran ({ord.payment_method})</p>
                      <p className="text-base font-black text-[#002147]">Rp {ord.total_amount.toLocaleString('id-ID')}</p>
                    </div>
                    <button
                      onClick={() => setCompletedOrder(ord)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Buka Struk Tiket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMIN ANTREAN KASIR KANTIN */}
      {activeTab === 'admin_orders' && isStaff && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-900">
              <ChefHat className="w-5 h-5 text-amber-700" />
              <span>Panel Operasional Penjual Kantin & Pengelola Koperasi Sekolah</span>
            </div>
            <span className="text-xs font-bold text-amber-800">{orders.length} total pesanan</span>
          </div>

          <div className="overflow-x-auto bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3">No. Order</th>
                  <th className="py-2.5 px-3">Pemesan</th>
                  <th className="py-2.5 px-3">Item Pesanan</th>
                  <th className="py-2.5 px-3">Total Bayar</th>
                  <th className="py-2.5 px-3">Waktu Ambil</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-[#002147]">{ord.order_number}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{ord.buyer_name}</p>
                      <span className="text-[10px] text-slate-500 uppercase">{ord.buyer_role}</span>
                    </td>
                    <td className="py-3 px-3">
                      {(ord.items || []).map((it, idx) => (
                        <div key={idx} className="text-[11px] text-slate-700">
                          {it.quantity}x {it.name}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-3 font-black text-slate-900">
                      Rp {ord.total_amount.toLocaleString('id-ID')}
                      <span className="block text-[10px] text-slate-400 font-normal">{ord.payment_method}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{ord.pickup_time}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.order_status === 'selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        ord.order_status === 'siap_diambil' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {ord.order_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      {ord.order_status === 'diproses' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'siap_diambil')}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Siap Diambil
                        </button>
                      )}
                      {ord.order_status !== 'selesai' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'selesai')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Selesai
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRAWER KERANJANG BELANJA */}
      {showCartDrawer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            
            {/* Top */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#f4a024]" />
                <h3 className="text-base font-bold text-[#002147]">Keranjang Belanja Kantin</h3>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-2">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Keranjang belanja Anda masih kosong</p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-slate-100">
                  {cart.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-500">Rp {item.price.toLocaleString('id-ID')} / item</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer shadow-xs"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold text-slate-900 w-4 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded bg-[#002147] hover:bg-[#002e62] text-white font-bold flex items-center justify-center text-xs cursor-pointer shadow-xs"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Form Options if items present */}
              {cart.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  
                  {!hasDigitalInCart ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jadwal Pengambilan Makanan/Minuman:
                      </label>
                      <select
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#002147]"
                      >
                        <option value="Istirahat 1 (09.30)">Istirahat 1 (Pukul 09.30 WIB)</option>
                        <option value="Istirahat 2 (12.00)">Istirahat 2 / Dzuhur (Pukul 12.00 WIB)</option>
                        <option value="Pulang Sekolah (15.00)">Pulang Sekolah (Pukul 15.00 WIB)</option>
                        <option value="Langsung Ambil Sekarang">Langsung Ambil Sekarang di Stand</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor HP / ID Pelanggan PLN (Produk Digital):
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 08123456789 atau 54123456789"
                        value={digitalTarget}
                        onChange={(e) => setDigitalTarget(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147]"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional):</label>
                    <input
                      type="text"
                      placeholder="Contoh: Tidak pedas, es dipisah, bungkus rapat"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Metode Pembayaran:</label>
                    <div className="space-y-1.5">
                      
                      <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs ${
                        paymentMethod === 'wallet' ? 'border-[#002147] bg-[#002147]/5' : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="cart_pay"
                            checked={paymentMethod === 'wallet'}
                            onChange={() => setPaymentMethod('wallet')}
                          />
                          <div>
                            <p className="font-bold text-[#002147] flex items-center gap-1">
                              <Wallet className="w-3.5 h-3.5 text-[#f4a024]" /> Saldo Dompet Sekolah
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {wallet
                                ? `Saldo Anda: Rp ${(wallet.balance || 0).toLocaleString('id-ID')}`
                                : (walletError || 'Dompet digital belum aktif untuk akun ini.')}
                            </p>
                          </div>
                        </div>
                        {!wallet ? (
                          <span className="text-[10px] font-bold text-amber-700">Belum Aktif</span>
                        ) : wallet.balance < cartTotal ? (
                          <span className="text-[10px] font-bold text-rose-600">Saldo Kurang</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Instan 1-Klik</span>
                        )}
                      </label>

                      <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs ${
                        paymentMethod === 'qris' ? 'border-[#002147] bg-[#002147]/5' : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="cart_pay"
                            checked={paymentMethod === 'qris'}
                            onChange={() => setPaymentMethod('qris')}
                          />
                          <p className="font-bold text-slate-800 flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" /> QRIS Dinamis
                          </p>
                        </div>
                      </label>

                      {!hasDigitalInCart && (
                        <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs ${
                          paymentMethod === 'cash' ? 'border-[#002147] bg-[#002147]/5' : 'border-slate-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="cart_pay"
                              checked={paymentMethod === 'cash'}
                              onChange={() => setPaymentMethod('cash')}
                            />
                            <p className="font-bold text-slate-800">Bayar Tunai di Kasir Kantin</p>
                          </div>
                        </label>
                      )}

                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Bottom Checkout Action */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Tagihan ({cartItemCount} item):</span>
                  <span className="text-lg font-black text-[#002147]">Rp {cartTotal.toLocaleString('id-ID')}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isOrdering || (paymentMethod === 'wallet' && wallet && wallet.balance < cartTotal)}
                  className="w-full py-3 rounded-2xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isOrdering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#f4a024]" />
                      <span>Memproses Pembayaran...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#f4a024]" />
                      <span>Konfirmasi & Bayar Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL STRUK DIGITAL / TIKET PESANAN */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#002147]">Pesanan Berhasil Dibuat!</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono font-bold">{completedOrder.order_number}</p>
            </div>

            {/* QR Barcode to show at canteen */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${completedOrder.order_number}`}
                alt="Barcode Pesanan"
                className="w-36 h-36 mx-auto object-contain"
              />
              <p className="text-[10px] text-slate-500">Tunjukkan barcode ini ke kasir/penjual saat mengambil makanan.</p>
            </div>

            {/* Digital Token if present */}
            {completedOrder.serial_number && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-left text-xs space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 uppercase">Token / Kode Voucher:</span>
                <div className="flex items-center justify-between font-mono font-black text-indigo-900">
                  <span>{completedOrder.serial_number}</span>
                  <button
                    onClick={() => copyText(completedOrder.serial_number, 'Kode SN')}
                    className="p-1 hover:bg-indigo-100 rounded text-indigo-700 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            <div className="text-left text-xs border-t border-slate-100 pt-3 space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Pemesan:</span>
                <span className="font-semibold text-slate-900">{completedOrder.buyer_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Bayar:</span>
                <span className="font-black text-[#002147]">Rp {completedOrder.total_amount?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Waktu Ambil:</span>
                <span className="font-semibold text-slate-900">{completedOrder.pickup_time}</span>
              </div>
            </div>

            <button
              onClick={() => setCompletedOrder(null)}
              className="w-full py-2.5 rounded-xl bg-[#002147] text-white text-xs font-bold cursor-pointer"
            >
              Tutup Struk
            </button>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: TAMBAH PRODUK BARU DENGAN UPLOAD GAMBAR */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#f4a024]" /> Tambah Produk / Menu Kantin Baru
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Produk / Menu:</label>
                <input
                  type="text"
                  placeholder="Contoh: Nasi Uduk Komplit Telur Balado"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori:</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147]"
                  >
                    <option value="makanan">Makanan & Snack</option>
                    <option value="minuman">Minuman Segar</option>
                    <option value="digital">Produk Digital (PPOB)</option>
                    <option value="koperasi">Koperasi & Atribut</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stand / Lokasi:</label>
                  <input
                    type="text"
                    placeholder="Stand Mas Joko / PPOB"
                    value={newProdStand}
                    onChange={(e) => setNewProdStand(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147]"
                  />
                </div>
              </div>

              {newProdCategory === 'digital' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Produk Digital:</label>
                  <select
                    value={newProdDigitalType}
                    onChange={(e) => setNewProdDigitalType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147]"
                  >
                    <option value="">Pilih jenis (default: voucher)</option>
                    <option value="pulsa">Pulsa</option>
                    <option value="kuota">Paket Kuota Internet</option>
                    <option value="pln">Token Listrik PLN</option>
                    <option value="voucher">Voucher Digital</option>
                    <option value="buku_digital">Buku Digital</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Jual (Rp):</label>
                  <input
                    type="number"
                    placeholder="15000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Awal:</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147]"
                  />
                </div>
              </div>

              {/* Upload Foto Produk */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Foto Produk:</label>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`font-semibold cursor-pointer ${uploadMode === 'file' ? 'text-[#002147] underline' : 'text-slate-400'}`}
                    >
                      Unggah File
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`font-semibold cursor-pointer ${uploadMode === 'url' ? 'text-[#002147] underline' : 'text-slate-400'}`}
                    >
                      URL Web
                    </button>
                  </div>
                </div>

                {uploadMode === 'file' ? (
                  !previewImage ? (
                    <label className="border-2 border-dashed border-slate-300 hover:border-[#002147] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/60 hover:bg-slate-50 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <UploadCloud className="w-6 h-6 text-[#002147] mb-1" />
                      <p className="text-xs font-bold text-slate-800">Klik untuk memilih foto produk dari komputer</p>
                      <p className="text-[10px] text-slate-500">JPG, PNG, WEBP hingga 5 MB</p>
                    </label>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-32">
                      <img src={previewImage} alt="Preview Produk" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setPreviewImage(''); }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                ) : (
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={newProdImage}
                    onChange={(e) => setNewProdImage(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147]"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Singkat:</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan porsi, bahan, atau ketentuan produk..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-2.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-[#f4a024]" />}
                  <span>Simpan Produk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
