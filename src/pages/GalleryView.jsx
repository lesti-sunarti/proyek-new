import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Image as ImageIcon, 
  Plus, 
  Filter, 
  Calendar, 
  X, 
  Maximize2, 
  UploadCloud, 
  Link as LinkIcon, 
  Trash2, 
  Loader2, 
  CheckCircle2 
} from 'lucide-react';

export default function GalleryView() {
  const { isStaff, showToast } = useAuth();
  const [gallery, setGallery] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form Upload Foto Baru
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('kegiatan');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadGallery = () => {
    fetch('/api/gallery').then(r => r.json()).then(setGallery).catch(() => {});
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const filteredGallery = categoryFilter === 'all' 
    ? gallery 
    : gallery.filter(g => g.category === categoryFilter);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      return showToast('Harap pilih file gambar (JPG, PNG, WEBP, GIF)', 'error');
    }
    if (file.size > 25 * 1024 * 1024) {
      return showToast('Ukuran gambar maksimal 25 MB', 'error');
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
      if (!title) {
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewImage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title) return showToast('Judul / Caption foto wajib diisi', 'error');

    let finalImageUrl = imageUrl;

    if (uploadMode === 'file') {
      if (!previewImage) {
        return showToast('Silakan pilih foto dari perangkat Anda terlebih dahulu', 'error');
      }
      setIsUploading(true);
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: previewImage,
            filename: selectedFile?.name || 'dokumentasi.jpg'
          })
        });
        const upData = await upRes.json();
        if (!upData.success) {
          setIsUploading(false);
          return showToast(upData.message || 'Gagal mengunggah gambar', 'error');
        }
        finalImageUrl = upData.url;
      } catch (err) {
        setIsUploading(false);
        return showToast('Gagal mengunggah gambar: ' + err.message, 'error');
      }
    } else {
      if (!finalImageUrl) return showToast('URL gambar harus diisi', 'error');
    }

    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          image_url: finalImageUrl,
          description
        })
      });
      const data = await res.json();
      showToast(data.message || 'Foto galeri berhasil disimpan!', 'success');
      setShowUploadModal(false);
      setTitle('');
      setImageUrl('');
      setDescription('');
      setSelectedFile(null);
      setPreviewImage('');
      loadGallery();
    } catch (err) {
      showToast('Gagal menyimpan foto galeri: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#002147]/10 border border-[#002147]/20 text-[#002147] text-xs font-semibold uppercase mb-2">
            <ImageIcon className="w-3.5 h-3.5 text-[#f4a024]" /> Galeri Sekolah
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#002147]">Dokumentasi Sarana, Prestasi & Kegiatan</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Koleksi foto fasilitas sekolah, rekam jejak juara piala, dan dokumentasi momen edukatif sekolah.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-[#f4a024]" /> Unggah Foto Dokumentasi
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Semua Album' },
          { key: 'sarpras', label: '🏛️ Fasilitas & Sarpras' },
          { key: 'prestasi', label: '🏆 Prestasi & Piala' },
          { key: 'kegiatan', label: '📸 Kegiatan Sekolah' },
          { key: 'ekskul', label: '⚽ Ekstrakurikuler' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategoryFilter(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              categoryFilter === tab.key 
                ? 'bg-[#002147] text-white shadow-md' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Masonry / Grid Foto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGallery.map((img) => (
          <div
            key={img.id}
            onClick={() => setSelectedPhoto(img)}
            className="bg-white border border-slate-200 rounded-3xl overflow-hidden cursor-pointer hover:border-[#002147]/40 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="relative overflow-hidden h-52 bg-slate-100">
              <img
                src={img.image_url}
                alt={img.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-[#f4a024]" /> Lihat Ukuran Penuh
                </span>
              </div>
            </div>

            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{img.category}</span>
                <span>{img.date}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#002147] transition-colors line-clamp-1">
                {img.title}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-2">{img.description}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredGallery.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Belum ada foto dalam kategori ini</p>
          <p className="text-xs text-slate-500">Klik tombol "Unggah Foto Dokumentasi" di atas untuk menambahkan foto pertama.</p>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white border border-slate-200 rounded-3xl overflow-hidden space-y-4 p-6 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[60vh]">
              <img
                src={selectedPhoto.image_url}
                alt={selectedPhoto.title}
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-700 uppercase font-bold">
                <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{selectedPhoto.category}</span>
                <span>•</span>
                <span className="text-slate-500">{selectedPhoto.date}</span>
              </div>
              <h3 className="text-lg font-bold text-[#002147] mt-1.5">{selectedPhoto.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{selectedPhoto.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Foto */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#f4a024]" /> Unggah Foto Galeri Dokumentasi
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tab: File Upload vs URL */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-white text-[#002147] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#f4a024]" /> Unggah dari File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  uploadMode === 'url'
                    ? 'bg-white text-[#002147] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 text-slate-500" /> Tautan URL Gambar
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5">
              
              {/* File Upload / URL Selector */}
              {uploadMode === 'file' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih File Foto dari Perangkat:
                  </label>
                  {!previewImage ? (
                    <label
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        dragActive
                          ? 'border-[#002147] bg-[#002147]/5'
                          : 'border-slate-300 hover:border-[#002147] bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-full bg-[#002147]/10 flex items-center justify-center mb-2 text-[#002147]">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        Klik untuk memilih foto dari komputer / HP
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        atau seret & jatuhkan file gambar ke kotak ini
                      </p>
                      <span className="mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        PNG, JPG, JPEG, WEBP (Maks. 25 MB)
                      </span>
                    </label>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
                      <img
                        src={previewImage}
                        alt="Pratinjau Foto"
                        className="w-full h-44 object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between text-white text-xs">
                        <div className="truncate max-w-[240px]">
                          <p className="font-bold truncate text-xs">{selectedFile?.name || 'Foto Terpilih'}</p>
                          <p className="text-[10px] text-slate-300">
                            {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : 'Siap diunggah'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearFile}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Ganti Foto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Gambar (Image Link):
                  </label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                  {imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-36">
                      <img 
                        src={imageUrl} 
                        alt="Pratinjau URL" 
                        className="w-full h-36 object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }} 
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul / Caption Foto:</label>
                <input
                  type="text"
                  placeholder="Contoh: Kerja Bakti Lingkungan Sekolah"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Album:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                >
                  <option value="kegiatan">Kegiatan Sekolah</option>
                  <option value="sarpras">Sarana & Prasarana (Fasilitas)</option>
                  <option value="prestasi">Piala & Prestasi Siswa/Guru</option>
                  <option value="ekskul">Ekstrakurikuler</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Foto:</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan singkat tentang dokumentasi ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-2.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#f4a024]" />
                      <span>Mengunggah Foto...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#f4a024]" />
                      <span>Simpan Foto</span>
                    </>
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
