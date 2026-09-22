import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Plus, 
  Eye, 
  User, 
  Calendar, 
  BookOpen, 
  Sparkles, 
  UploadCloud, 
  Link as LinkIcon, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  X 
} from 'lucide-react';

export default function BlogView() {
  const { currentUser, showToast } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);

  // Form Tulis Artikel
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Opini Pendidikan');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const loadBlogs = () => {
    fetch('/api/blogs').then(r => r.json()).then(setBlogs).catch(() => {});
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return showToast('Harap pilih file gambar (JPG, PNG, WEBP)', 'error');
    }
    if (file.size > 25 * 1024 * 1024) {
      return showToast('Ukuran gambar maksimal 25 MB', 'error');
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreateBlog = async (e) => {
    e.preventDefault();
    if (!title || !content) return showToast('Judul dan isi artikel tidak boleh kosong', 'error');

    let finalCover = coverImage;

    if (uploadMode === 'file' && previewImage) {
      setIsUploading(true);
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: previewImage,
            filename: selectedFile?.name || 'cover.jpg'
          })
        });
        const upData = await upRes.json();
        if (upData.success) {
          finalCover = upData.url;
        }
      } catch (err) {
        setIsUploading(false);
        return showToast('Gagal mengunggah cover foto: ' + err.message, 'error');
      }
    }

    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          author_name: currentUser.name,
          author_role: currentUser.title || 'Civitas Akademika',
          category,
          cover_image: finalCover || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800'
        })
      });
      const data = await res.json();
      showToast(data.message || 'Artikel berhasil dipublikasikan!', 'success');
      setShowCreateModal(false);
      setTitle('');
      setContent('');
      setCoverImage('');
      setSelectedFile(null);
      setPreviewImage('');
      loadBlogs();
    } catch (err) {
      showToast('Gagal mempublikasikan artikel: ' + err.message, 'error');
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
            <FileText className="w-3.5 h-3.5 text-[#f4a024]" /> Mading & Blog Siswa Guru
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#002147]">Mading Digital & Ruang Literasi Terpadu</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Wadah publikasi karya tulis, artikel ilmiah guru, puisi, serta esai inspiratif siswa.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#002147] hover:bg-[#002e62] text-white text-xs font-bold shadow-md shadow-[#002147]/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#f4a024]" /> Tulis Karya Baru
        </button>
      </div>

      {/* Grid Artikel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.map((b) => (
          <div
            key={b.id}
            onClick={() => setSelectedBlog(b)}
            className="bg-white border border-slate-200 rounded-3xl overflow-hidden cursor-pointer hover:border-slate-200 transition-all group flex flex-col justify-between"
          >
            <div className="relative overflow-hidden h-44">
              <img
                src={b.cover_image}
                alt={b.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-white backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                {b.category}
              </span>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {b.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {b.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-600 truncate max-w-[150px]">
                  ✍️ {b.author_name}
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Eye className="w-3.5 h-3.5" /> {b.views || 10}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Baca Artikel Lengkap */}
      {selectedBlog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {selectedBlog.category}
              </span>
              <button
                onClick={() => setSelectedBlog(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs"
              >
                ✕ Tutup
              </button>
            </div>

            <img
              src={selectedBlog.cover_image}
              alt={selectedBlog.title}
              className="w-full h-56 object-cover rounded-2xl"
            />

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">{selectedBlog.title}</h2>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-4">
                <span>Penulis: <strong className="text-slate-800">{selectedBlog.author_name}</strong></span>
                <span>•</span>
                <span>{selectedBlog.created_at}</span>
              </div>
            </div>

            <div className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line pt-4 border-t border-slate-200">
              {selectedBlog.content}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tulis Artikel Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#f4a024]" /> Tulis Artikel / Karya Mading Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBlog} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Artikel:</label>
                <input
                  type="text"
                  placeholder="Ketik judul artikel yang menarik..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Karya:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                >
                  <option value="Opini Pendidikan">Opini Pendidikan (Guru)</option>
                  <option value="Prestasi Siswa">Prestasi Siswa</option>
                  <option value="Sains & Teknologi">Sains & Teknologi</option>
                  <option value="Sastra & Cerpen">Sastra, Puisi & Cerpen</option>
                  <option value="Tips Belajar">Tips Belajar Efektif</option>
                </select>
              </div>

              {/* Cover Foto Mode Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Cover Foto:</label>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`font-semibold cursor-pointer ${uploadMode === 'file' ? 'text-[#002147] underline' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Unggah File
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`font-semibold cursor-pointer ${uploadMode === 'url' ? 'text-[#002147] underline' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Gunakan URL
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
                      <p className="text-xs font-bold text-slate-800">Pilih foto cover dari komputer</p>
                      <p className="text-[10px] text-slate-500">JPG, PNG, WEBP hingga 25 MB</p>
                    </label>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-32">
                      <img src={previewImage} alt="Cover Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setPreviewImage(''); }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                ) : (
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Tulisan:</label>
                <textarea
                  rows={5}
                  placeholder="Tuliskan isi artikel Anda secara lengkap..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#f4a024]" />
                      <span>Publikasikan Artikel</span>
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
