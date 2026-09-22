import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Library, 
  BookOpen, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  BookMarked, 
  RotateCcw,
  Tag,
  MapPin,
  Calendar,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';

// Tanggal lokal (bukan UTC) agar konsisten dengan tanggal "hari ini" di server.
const toLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getDefaultDueDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toLocalDateString(d);
};

// Pola fetch standar: lempar Error berisi pesan server untuk respons non-OK.
const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan');
  return data;
};

export default function LibraryView() {
  const { currentUser, currentRole, canAccess, showToast } = useAuth();
  const isStudentAccount = currentRole === 'siswa' || currentRole === 'ortu';
  // Aksi tulis katalog (tambah/hapus judul) hanya untuk pengelola, bukan akun siswa/ortu.
  const canManageCatalog = canAccess('library') && !isStudentAccount;
  // Data induk siswa/guru hanya dimuat bila akun punya modul buku_induk (hindari 403).
  const canPickBorrower = canAccess('buku_induk');
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' or 'loans'
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Modal Pinjam
  const [borrowModal, setBorrowModal] = useState({ open: false, book: null });
  const [borrowerType, setBorrowerType] = useState('siswa');
  const [borrowerId, setBorrowerId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowDueDate, setBorrowDueDate] = useState(getDefaultDueDate);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [borrowerOptions, setBorrowerOptions] = useState({ siswa: [], guru: [], loaded: false });

  // Modal Tambah Buku
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newCategory, setNewCategory] = useState('Buku Pelajaran');
  const [newTotal, setNewTotal] = useState(10);
  const [newShelf, setNewShelf] = useState('Rak A-02');

  const fetchBooks = () => {
    fetchJson('/api/library/books')
      .then(data => { setBooks(Array.isArray(data) ? data : []); setLoadError(''); })
      .catch(err => { setBooks([]); setLoadError(err.message || 'Katalog buku tidak dapat dimuat.'); });
  };

  const fetchLoans = () => {
    fetchJson('/api/library/loans')
      .then(data => setLoans(Array.isArray(data) ? data : []))
      .catch(err => { setLoans([]); setLoadError(prev => prev || err.message || 'Data peminjaman tidak dapat dimuat.'); });
  };

  useEffect(() => {
    fetchBooks();
    fetchLoans();
  }, []);

  // Muat daftar siswa/guru dari data induk (sekali) agar peminjam tercatat dengan ID yang benar.
  const loadBorrowerOptions = () => {
    if (!canPickBorrower || borrowerOptions.loaded) return;
    Promise.all([
      fetchJson('/api/master/students').catch(() => []),
      fetchJson('/api/master/teachers').catch(() => []),
    ]).then(([students, teachers]) => {
      setBorrowerOptions({
        siswa: Array.isArray(students) ? students.filter(s => String(s.status || 'aktif').toLowerCase() === 'aktif') : [],
        guru: Array.isArray(teachers) ? teachers : [],
        loaded: true,
      });
    });
  };

  const openBorrowModal = (book) => {
    setBorrowerType('siswa');
    setBorrowerId(isStudentAccount && currentUser.related_student_id ? String(currentUser.related_student_id) : '');
    setBorrowerName(currentRole === 'siswa' ? currentUser.name : '');
    setBorrowDueDate(getDefaultDueDate());
    setBorrowModal({ open: true, book });
    loadBorrowerOptions();
  };

  const handleBorrowerTypeChange = (type) => {
    setBorrowerType(type);
    setBorrowerId('');
    setBorrowerName('');
  };

  const handleBorrowerPick = (value) => {
    setBorrowerId(value);
    const person = (borrowerOptions[borrowerType] || []).find(p => String(p.id) === String(value));
    setBorrowerName(person ? person.name : '');
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!borrowModal.book || isBorrowing) return;
    const name = borrowerName.trim();
    const today = toLocalDateString();
    if (!name) return showToast('Nama peminjam wajib diisi.', 'error');
    if (!borrowDueDate || borrowDueDate < today) return showToast('Batas pengembalian tidak boleh sebelum hari ini.', 'error');

    setIsBorrowing(true);
    try {
      const data = await fetchJson('/api/library/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: borrowModal.book.id,
          borrower_type: borrowerType,
          borrower_id: Number(borrowerId) || 0,
          borrower_name: name,
          borrow_date: today,
          due_date: borrowDueDate,
          notes: `Peminjaman dicatat oleh ${currentUser.name} via portal digital`
        })
      });
      showToast(data.message || 'Peminjaman buku berhasil dicatat.', 'success');
      setBorrowModal({ open: false, book: null });
      fetchBooks();
      fetchLoans();
    } catch (err) {
      showToast(err.message || 'Gagal memproses peminjaman', 'error');
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleReturnBook = async (loanId) => {
    try {
      const data = await fetchJson(`/api/library/loans/${loanId}/return`, { method: 'POST' });
      showToast(data.message || 'Buku berhasil dikembalikan.', data.already_returned ? 'info' : 'success');
      fetchBooks();
      fetchLoans();
    } catch (err) {
      showToast(err.message || 'Gagal mengembalikan buku', 'error');
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return showToast('Judul buku wajib diisi!', 'error');
    if (!newAuthor.trim()) return showToast('Penulis/pengarang wajib diisi!', 'error');

    setIsSubmitting(true);
    try {
      // ISBN dikosongkan: server membangkitkan ISBN unik sendiri (menghindari bentrok UNIQUE).
      const data = await fetchJson('/api/library/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          author: newAuthor.trim(),
          publisher: 'Pustaka Pendidikan',
          category: newCategory,
          total_copies: Math.max(1, Number(newTotal) || 1),
          shelf_location: newShelf.trim() || 'Rak Umum',
          cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300',
          year_published: new Date().getFullYear()
        })
      });
      showToast(data.message || 'Buku berhasil ditambahkan!', 'success');
      setShowAddModal(false);
      setNewTitle('');
      setNewAuthor('');
      fetchBooks();
    } catch (err) {
      showToast(err.message || 'Gagal menambahkan buku', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async (bookId, title) => {
    const hasActiveLoan = loans.some(l => l.book_id === bookId && l.status === 'dipinjam');
    const warning = hasActiveLoan ? '\n\nPerhatian: masih ada peminjaman aktif untuk buku ini; riwayat peminjamannya ikut terhapus.' : '';
    if (!window.confirm(`Hapus buku "${title}" dari katalog perpustakaan?${warning}`)) return;
    try {
      const data = await fetchJson(`/api/library/books/${bookId}`, { method: 'DELETE' });
      showToast(data.message || 'Buku berhasil dihapus', 'success');
      fetchBooks();
      fetchLoans();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus buku', 'error');
    }
  };

  const today = toLocalDateString();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBooks = books.filter(b => {
    const haystack = `${b.title || ''} ${b.author || ''} ${b.isbn || ''}`.toLowerCase();
    const matchSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    const matchCat = selectedCategory === 'Semua' || b.category === selectedCategory;
    return matchSearch && matchCat;
  });
  const activeLoans = loans.filter(l => l.status === 'dipinjam');
  const overdueLoans = activeLoans.filter(l => l.due_date && l.due_date < today);
  const totalAvailable = books.reduce((acc, b) => acc + (Number(b.available_copies) || 0), 0);
  const borrowerList = borrowerOptions[borrowerType] || [];

  return (
    <div className="space-y-6 pb-16">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-[#002147] text-xs font-bold uppercase tracking-wider mb-2">
            <Library className="w-3.5 h-3.5 text-[#f4a024]" /> Sistem Perpustakaan Sekolah
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#002147]">Perpustakaan Digital (E-Library)</h2>
          <p className="text-xs text-slate-500 mt-1">Katalog Buku Pelajaran, Referensi, Fiksi & Sirkulasi Peminjaman Mandiri</p>
        </div>

        <div className="flex items-center gap-2">
          {canManageCatalog && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4 text-[#f4a024]" /> Tambah Judul Buku
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {loadError}
        </div>
      )}

      {/* STATS TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Total Judul Buku</div>
            <div className="text-lg font-black text-[#002147]">{books.length} Judul</div>
            <div className="text-[10px] text-slate-500">Tersedia di rak perpustakaan</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Stok Eksemplar</div>
            <div className="text-lg font-black text-[#002147]">
              {totalAvailable} <span className="text-xs font-normal text-slate-500">Eksemplar</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Siap dipinjam</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <BookMarked className="w-5 h-5 text-[#f4a024]" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Sedang Dipinjam</div>
            <div className="text-lg font-black text-[#002147]">
              {activeLoans.length} Buku
            </div>
            <div className={`text-[10px] ${overdueLoans.length ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
              {overdueLoans.length ? `${overdueLoans.length} melewati batas kembali` : 'Sirkulasi aktif saat ini'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Maks. Peminjaman</div>
            <div className="text-lg font-black text-[#002147]">7 Hari</div>
            <div className="text-[10px] text-slate-500">Dapat diperpanjang 1x</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'catalog' ? 'border-[#002147] text-[#002147]' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#f4a024]" /> Katalog Koleksi Buku ({filteredBooks.length})
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'loans' ? 'border-[#002147] text-[#002147]' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-[#f4a024]" /> Sirkulasi & Riwayat Peminjaman ({loans.length})
        </button>
      </div>

      {/* TAB 1: KATALOG BUKU */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari judul buku, pengarang, atau ISBN..."
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#002147]"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Buku Pelajaran">Buku Pelajaran</option>
              <option value="Teknologi">Teknologi</option>
              <option value="Sains">Sains</option>
              <option value="Fiksi & Sastra">Fiksi & Sastra</option>
              <option value="Referensi">Referensi</option>
              <option value="Sejarah">Sejarah</option>
              <option value="Agama & Karakter">Agama & Karakter</option>
            </select>
          </div>

          {/* GRID BUKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredBooks.map((b) => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {b.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {b.shelf_location}
                      </span>
                      {canManageCatalog && (
                        <button
                          onClick={() => handleDeleteBook(b.id, b.title)}
                          title="Hapus Buku"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-[#002147] line-clamp-2 leading-snug">{b.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">Penulis: {b.author}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Penerbit: {b.publisher} ({b.year_published})</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400 text-[10px]">Tersedia: </span>
                    <span className={`font-bold ${b.available_copies > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {b.available_copies} dari {b.total_copies}
                    </span>
                  </div>
                  <button
                    disabled={b.available_copies <= 0}
                    onClick={() => openBorrowModal(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      b.available_copies > 0
                        ? 'bg-[#002147] hover:bg-[#0a2f5c] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {b.available_copies > 0 ? 'Pinjam Buku' : 'Habis'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">
                {books.length === 0 ? 'Katalog buku masih kosong.' : 'Tidak ada buku yang cocok dengan pencarian/kategori.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT PEMINJAMAN */}
      {activeTab === 'loans' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#002147]">Daftar Peminjaman & Sirkulasi Buku</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#002147] text-white text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Judul Buku</th>
                  <th className="py-3 px-4">Peminjam</th>
                  <th className="py-3 px-3 text-center">Tgl Pinjam</th>
                  <th className="py-3 px-3 text-center">Batas Kembali</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">Belum ada catatan peminjaman.</td>
                  </tr>
                )}
                {loans.map((l, idx) => {
                  const isOverdue = l.status === 'dipinjam' && l.due_date && l.due_date < today;
                  return (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-[#002147]">{l.book_title}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{l.borrower_name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{l.borrower_type}</div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-[11px]">{l.borrow_date}</td>
                    <td className={`py-3.5 px-3 text-center font-mono text-[11px] font-bold ${isOverdue ? 'text-rose-700' : 'text-amber-700'}`}>{l.due_date}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        l.status === 'dikembalikan' ? 'bg-emerald-100 text-emerald-800' : isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isOverdue ? 'terlambat' : l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {l.status === 'dipinjam' ? (
                        <button
                          onClick={() => handleReturnBook(l.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
                        >
                          Kembalikan
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Selesai{l.return_date ? ` (${l.return_date})` : ''}</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PINJAM BUKU */}
      {borrowModal.open && borrowModal.book && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-[#002147] mb-2">Form Peminjaman Buku</h3>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4 text-xs">
              <div className="font-bold text-[#002147]">{borrowModal.book.title}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">Penulis: {borrowModal.book.author}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-1">Lokasi: {borrowModal.book.shelf_location}</div>
            </div>

            <form onSubmit={handleBorrowSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tipe Peminjam</label>
                <select
                  value={borrowerType}
                  onChange={(e) => handleBorrowerTypeChange(e.target.value)}
                  disabled={isStudentAccount}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white disabled:bg-slate-50"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru / Tenaga Kependidikan</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Peminjam</label>
                {canPickBorrower && borrowerList.length > 0 && !isStudentAccount ? (
                  <select
                    value={borrowerId}
                    onChange={(e) => handleBorrowerPick(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                    required
                  >
                    <option value="">-- Pilih {borrowerType === 'siswa' ? 'siswa' : 'guru/staf'} dari data induk --</option>
                    {borrowerList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.class_name ? ` — ${p.class_name}` : p.nip ? ` — NIP ${p.nip}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Nama lengkap peminjam"
                    readOnly={currentRole === 'siswa'}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 read-only:bg-slate-50"
                    required
                  />
                )}
                {canPickBorrower && !borrowerOptions.loaded && !isStudentAccount && (
                  <p className="text-[10px] text-slate-400 mt-1">Memuat data induk peminjam…</p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Batas Waktu Pengembalian</label>
                <input
                  type="date"
                  value={borrowDueDate}
                  min={today}
                  onChange={(e) => setBorrowDueDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBorrowModal({ open: false, book: null })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBorrowing}
                  className="px-4 py-1.5 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] disabled:opacity-50 text-white font-semibold"
                >
                  {isBorrowing ? 'Memproses...' : 'Konfirmasi Pinjam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH BUKU BARU */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-[#002147] mb-4">Tambah Buku Baru ke Perpustakaan</h3>
            <form onSubmit={handleAddBook} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Judul Buku <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Informatika & Pemrograman Modern"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#002147]"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Penulis / Pengarang <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Contoh: Abdulloh, S.Pd"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#002147]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kategori</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#002147]"
                  >
                    <option value="Buku Pelajaran">Buku Pelajaran</option>
                    <option value="Teknologi">Teknologi</option>
                    <option value="Sains">Sains</option>
                    <option value="Fiksi & Sastra">Fiksi & Sastra</option>
                    <option value="Referensi">Referensi</option>
                    <option value="Sejarah">Sejarah</option>
                    <option value="Agama & Karakter">Agama & Karakter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Jumlah Eksemplar</label>
                  <input
                    type="number"
                    value={newTotal}
                    onChange={(e) => setNewTotal(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#002147]"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lokasi Rak</label>
                <input
                  type="text"
                  value={newShelf}
                  onChange={(e) => setNewShelf(e.target.value)}
                  placeholder="Contoh: Rak A-02"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#002147]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#002147] hover:bg-[#0a2f5c] disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    'Simpan Buku'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
