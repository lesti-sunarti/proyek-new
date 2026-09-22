import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Archive, Download, Plus, Search } from 'lucide-react';

const CATEGORY_LABELS = {
  akreditasi: 'Sertifikat Akreditasi',
  sk: 'Surat Keputusan (SK)',
  kurikulum: 'Kurikulum & Silabus',
  surat_masuk: 'Surat Masuk',
  surat_keluar: 'Surat Keluar',
};

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Gagal memproses permintaan.');
  return data;
}

export default function ArchiveView() {
  const { currentUser, canAccess, showToast } = useAuth();
  const [archives, setArchives] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form tambah arsip
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [category, setCategory] = useState('sk');
  const [fileSize, setFileSize] = useState('2.4 MB');
  const [notes, setNotes] = useState('');

  const loadArchives = () => {
    requestJson('/api/archives')
      .then((data) => setArchives(Array.isArray(data) ? data : []))
      .catch((error) => { setArchives([]); showToast(error.message, 'error'); });
  };

  useEffect(() => {
    loadArchives();
  }, []);

  const handleAddArchive = async (e) => {
    e.preventDefault();
    if (!title.trim()) return showToast('Judul dokumen wajib diisi', 'error');

    setIsSaving(true);
    try {
      const data = await requestJson('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          doc_number: docNumber.trim() || null,
          category,
          file_size: fileSize.trim() || undefined,
          uploaded_by: currentUser?.name || undefined,
          notes: notes.trim() || null
        })
      });
      showToast(data.message || 'Dokumen arsip berhasil disimpan', 'success');
      setShowAddModal(false);
      setTitle('');
      setDocNumber('');
      setNotes('');
      loadArchives();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = (doc) => {
    if (doc.file_url && doc.file_url !== '#') {
      window.open(doc.file_url, '_blank', 'noopener');
      return;
    }
    showToast(`Berkas "${doc.title}" belum diunggah; saat ini hanya metadata arsip yang tersimpan.`, 'info');
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredArchives = archives.filter(a => {
    const matchSearch = !term ||
      String(a.title || '').toLowerCase().includes(term) ||
      String(a.doc_number || '').toLowerCase().includes(term);
    const matchCat = selectedCategory === 'all' || a.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <Archive className="w-3.5 h-3.5" /> Modul 16: Aplikasi Arsip Digital
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Repositori Dokumen & Arsip Resmi Sekolah</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Digitalisasi SK Kepala Sekolah, sertifikat akreditasi BAN-SM, silabus, dan surat masuk/keluar terenkripsi aman.
          </p>
        </div>

        {canAccess('archive') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Arsipkan Dokumen Baru
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Cari nama dokumen atau nomor surat arsip..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Semua Kategori Dokumen</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {/* Grid Arsip Cards */}
      {filteredArchives.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
          {archives.length === 0 ? 'Belum ada dokumen yang diarsipkan.' : 'Tidak ada dokumen yang cocok dengan filter / pencarian.'}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArchives.map((doc) => (
          <div key={doc.id} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 hover:border-slate-200 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {CATEGORY_LABELS[doc.category] || doc.category}
                </span>
                <span className="text-xs font-mono text-slate-500">{doc.file_size || '-'}</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{doc.title}</h3>
                <div className="text-[11px] font-mono text-emerald-400 mt-1">No: {doc.doc_number || '-'}</div>
              </div>

              {doc.notes && (
                <p className="text-xs text-slate-500 line-clamp-2">{doc.notes}</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Tgl: {doc.upload_date}{doc.uploaded_by ? ` · ${doc.uploaded_by}` : ''}</span>
              <button
                onClick={() => handleDownload(doc)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-emerald-600 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Unduh PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Arsip */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900">Arsipkan Dokumen Sekolah Baru</h3>

            <form onSubmit={handleAddArchive} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nama / Judul Dokumen:</label>
                <input
                  type="text"
                  placeholder="Contoh: SK Panitia Ujian PTS 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Nomor Surat Resmi:</label>
                <input
                  type="text"
                  placeholder="Contoh: 421/089/SMAN1/2025"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Kategori Dokumen:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Perkiraan Ukuran File:</label>
                  <input
                    type="text"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Catatan Dokumen:</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan tambahan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-60"
                >
                  {isSaving ? 'Menyimpan…' : 'Simpan Arsip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
