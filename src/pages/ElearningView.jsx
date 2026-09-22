import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Video, 
  MessageSquare, 
  Upload, 
  CheckCircle, 
  Clock, 
  Send, 
  Award,
  Plus,
  Trash2,
  Search,
  Filter,
  X,
  Loader2,
  ExternalLink,
  Layers,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export default function ElearningView() {
  const { currentUser, currentRole, showToast } = useAuth();
  
  // Data state
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('materi'); // 'materi', 'tugas', 'diskusi'
  
  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  
  // Interaction state
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [submittedTasks, setSubmittedTasks] = useState({});
  
  // Modal states
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModule, setNewModule] = useState({
    title: '',
    subject_name: 'Informatika & Coding',
    class_name: 'X MIPA 1',
    teacher_name: currentUser?.name || 'Dewi Lestari, M.Kom',
    description: '',
    video_url: '',
    file_url: ''
  });

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: '',
    max_score: 100
  });

  const loadModules = (selectFirst = false, autoSelectId = null) => {
    fetch('/api/elearning/modules')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setModules(data);
          if (autoSelectId) {
            const found = data.find(m => m.id === autoSelectId);
            if (found) selectModule(found);
          } else if (selectFirst && data.length > 0) {
            selectModule(data[0]);
          } else if (!selectedModule && data.length > 0) {
            selectModule(data[0]);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching modules:', err);
      });
  };

  useEffect(() => {
    loadModules(true);
  }, []);

  const selectModule = (mod) => {
    setSelectedModule(mod);
    // Load tasks & discussions
    fetch(`/api/elearning/tasks/${mod.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
      })
      .catch(() => setTasks([]));

    fetch(`/api/elearning/discussions/${mod.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDiscussions(data);
      })
      .catch(() => setDiscussions([]));
  };

  // Kirim Diskusi
  const handleSendDiscussion = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedModule) return;

    setIsSendingChat(true);
    try {
      const res = await fetch('/api/elearning/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: selectedModule.id,
          user_name: currentUser?.name || 'Siswa',
          user_role: currentUser?.title || 'Peserta Didik',
          message: chatMessage.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessage('');
        // Reload discussions
        const r2 = await fetch(`/api/elearning/discussions/${selectedModule.id}`);
        const discData = await r2.json();
        if (Array.isArray(discData)) setDiscussions(discData);
      } else {
        showToast(data.message || 'Gagal mengirim pesan', 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server diskusi', 'error');
    } finally {
      setIsSendingChat(false);
    }
  };

  // Submit Tugas Siswa
  const handleSubmitTask = async (taskId) => {
    if (!submissionText.trim()) {
      return showToast('Tuliskan teks jawaban tugas terlebih dahulu!', 'error');
    }

    setIsSubmittingTask(true);
    try {
      const res = await fetch('/api/elearning/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          student_id: currentUser?.studentId || 1,
          student_name: currentUser?.name || 'Siswa',
          submission_text: submissionText.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Jawaban tugas berhasil dikumpulkan!', 'success');
        setSubmissionText('');
        setSubmittedTasks(prev => ({ ...prev, [taskId]: true }));
      } else {
        showToast(data.message || 'Gagal mengumpulkan tugas', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat mengumpulkan tugas', 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Tambah Modul Belajar Baru
  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!newModule.title.trim()) {
      return showToast('Judul modul materi wajib diisi!', 'error');
    }
    if (!newModule.subject_name.trim()) {
      return showToast('Mata pelajaran wajib dipilih!', 'error');
    }

    setIsCreatingModule(true);
    try {
      const res = await fetch('/api/elearning/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newModule.title.trim(),
          subject_name: newModule.subject_name.trim(),
          class_name: newModule.class_name.trim(),
          teacher_name: newModule.teacher_name.trim() || currentUser?.name || 'Guru Pengampu',
          description: newModule.description.trim(),
          video_url: newModule.video_url.trim(),
          file_url: newModule.file_url.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Modul pembelajaran berhasil ditambahkan!', 'success');
        setShowAddModuleModal(false);
        setNewModule({
          title: '',
          subject_name: 'Informatika & Coding',
          class_name: 'X MIPA 1',
          teacher_name: currentUser?.name || 'Dewi Lestari, M.Kom',
          description: '',
          video_url: '',
          file_url: ''
        });
        loadModules(false, data.moduleId);
      } else {
        showToast(data.message || 'Gagal menambahkan modul', 'error');
      }
    } catch (err) {
      showToast('Gagal menghubungi server untuk menambah modul', 'error');
    } finally {
      setIsCreatingModule(false);
    }
  };

  // Hapus Modul Belajar
  const handleDeleteModule = async (moduleId, title) => {
    if (!window.confirm(`Yakin ingin menghapus modul "${title}" beserta semua tugas dan diskusinya?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/elearning/modules/${moduleId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Modul berhasil dihapus', 'success');
        if (selectedModule?.id === moduleId) {
          setSelectedModule(null);
        }
        loadModules(true);
      } else {
        showToast(data.message || 'Gagal menghapus modul', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menghapus modul', 'error');
    }
  };

  // Tambah Tugas Baru untuk Modul Aktif
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedModule) return;
    if (!newTask.title.trim()) {
      return showToast('Judul tugas wajib diisi!', 'error');
    }

    setIsCreatingTask(true);
    try {
      const res = await fetch('/api/elearning/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: selectedModule.id,
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          deadline: newTask.deadline.trim() || 'Satu Minggu ke Depan',
          max_score: Number(newTask.max_score) || 100
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Tugas baru berhasil ditambahkan untuk modul ini!', 'success');
        setShowAddTaskModal(false);
        setNewTask({
          title: '',
          description: '',
          deadline: '',
          max_score: 100
        });
        // Reload tasks
        const r2 = await fetch(`/api/elearning/tasks/${selectedModule.id}`);
        const taskData = await r2.json();
        if (Array.isArray(taskData)) setTasks(taskData);
        setActiveTab('tugas');
      } else {
        showToast(data.message || 'Gagal menambahkan tugas', 'error');
      }
    } catch (err) {
      showToast('Gagal menghubungi server untuk menambah tugas', 'error');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Hapus Tugas
  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!window.confirm(`Hapus tugas "${taskTitle}"?`)) return;

    try {
      const res = await fetch(`/api/elearning/tasks/${taskId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Tugas berhasil dihapus', 'success');
        if (selectedModule) {
          const r2 = await fetch(`/api/elearning/tasks/${selectedModule.id}`);
          const taskData = await r2.json();
          if (Array.isArray(taskData)) setTasks(taskData);
        }
      } else {
        showToast(data.message || 'Gagal menghapus tugas', 'error');
      }
    } catch (err) {
      showToast('Gagal menghapus tugas', 'error');
    }
  };

  // Filter modules
  const filteredModules = modules.filter(m => {
    const matchesSearch = 
      (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subject_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.class_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.teacher_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = selectedSubjectFilter === 'all' || m.subject_name === selectedSubjectFilter;

    return matchesSearch && matchesSubject;
  });

  // Unique subjects for filter
  const uniqueSubjects = Array.from(new Set(modules.map(m => m.subject_name).filter(Boolean)));

  return (
    <div className="space-y-6">
      
      {/* Banner Utama */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-black uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-emerald-700" /> Modul 17: E-Learning (LMS Interaktif)
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-black tracking-tight">Ruang Belajar Digital, Modul & Tugas</h2>
          <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-2xl">
            Materi video interaktif, pengumpulan tugas online, penilaian guru, dan forum diskusi kelas terintegrasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tombol Tambah Modul Belajar */}
          <button
            onClick={() => {
              setNewModule(prev => ({
                ...prev,
                teacher_name: currentUser?.name || prev.teacher_name
              }));
              setShowAddModuleModal(true);
            }}
            className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 transition-all w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Tambah Modul Belajar
          </button>

          {/* Switch Tab Utama */}
          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-300 w-full sm:w-auto">
            {[
              { id: 'materi', label: 'Modul Belajar', count: null },
              { id: 'tugas', label: 'Tugas', count: tasks.length },
              { id: 'diskusi', label: 'Diskusi', count: discussions.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab.id
                    ? 'bg-black text-white shadow-md'
                    : 'text-slate-800 hover:text-black hover:bg-slate-200'
                }`}
              >
                {tab.label} {tab.count !== null && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Konten Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Kolom Kiri: Pilih Modul Pembelajaran (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-700" /> Pilih Modul Pembelajaran
              </h3>
              <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                {filteredModules.length} Modul
              </span>
            </div>

            {/* Bilah Pencarian */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari modul / mapel / guru..."
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-black placeholder:text-slate-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>

            {/* Filter Mata Pelajaran */}
            {uniqueSubjects.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <button
                  onClick={() => setSelectedSubjectFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-black shrink-0 transition-all ${
                    selectedSubjectFilter === 'all'
                      ? 'bg-black text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua ({modules.length})
                </button>
                {uniqueSubjects.map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubjectFilter(sub)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                      selectedSubjectFilter === sub
                        ? 'bg-black text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* Daftar Modul */}
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {filteredModules.map((m) => {
                const isSelected = selectedModule?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => selectModule(m)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-600 shadow-md ring-2 ring-emerald-600/30'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-400 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-950 border border-emerald-300">
                        {m.subject_name} • {m.class_name}
                      </span>
                      
                      {/* Tombol Hapus Modul */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModule(m.id, m.title);
                        }}
                        title="Hapus Modul"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-70 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-black line-clamp-2 leading-snug">
                      {m.title}
                    </h4>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span className="truncate max-w-[170px]">Guru: {m.teacher_name}</span>
                      <span className="text-[10px] font-medium text-slate-500">{m.created_at}</span>
                    </div>
                  </div>
                );
              })}

              {filteredModules.length === 0 && (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-slate-700">Belum ada modul yang cocok</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSubjectFilter('all');
                      setShowAddModuleModal(true);
                    }}
                    className="mt-3 text-xs font-black text-emerald-700 hover:underline"
                  >
                    + Buat Modul Baru
                  </button>
                </div>
              )}
            </div>

            {/* Tombol Tambah Modul Belajar di Bawah List */}
            <button
              onClick={() => setShowAddModuleModal(true)}
              className="w-full py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Buat Modul Belajar Baru
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Konten Aktif (Materi / Tugas / Diskusi) (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedModule ? (
            <>
              {/* TAB 1: MATERI PEMBELAJARAN */}
              {activeTab === 'materi' && (
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                  
                  {/* Header Detail Modul */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-950 border border-emerald-300">
                          {selectedModule.subject_name}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-slate-100 text-black border border-slate-300">
                          {selectedModule.class_name}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-2xl font-black text-black">{selectedModule.title}</h3>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                        Pengampu: <span className="text-black font-black">{selectedModule.teacher_name}</span> • Rilis: {selectedModule.created_at}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddTaskModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Berikan Tugas
                      </button>
                      <button
                        onClick={() => handleDeleteModule(selectedModule.id, selectedModule.title)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-300 hover:border-rose-300 transition-all"
                        title="Hapus Modul"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Video Player Embed jika ada */}
                  {selectedModule.video_url ? (
                    <div className="rounded-2xl overflow-hidden aspect-video bg-black border-2 border-slate-300 shadow-inner">
                      <iframe
                        src={selectedModule.video_url}
                        title={selectedModule.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl p-8 bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-2">
                      <Video className="w-10 h-10 text-slate-400 mx-auto" />
                      <div className="text-sm font-black text-black">Modul Berbasis Teks & Lembar Materi Digital</div>
                      <p className="text-xs font-medium text-slate-600 max-w-md mx-auto">
                        Guru tidak menyertakan tautan video streaming pada modul ini. Silakan pelajari ringkasan materi dan berkas lampiran di bawah.
                      </p>
                    </div>
                  )}

                  {/* Ringkasan Bahan Ajar */}
                  <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2">
                    <div className="font-black text-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-700" /> Ringkasan Bahan Ajar:
                    </div>
                    <p className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed whitespace-pre-line">
                      {selectedModule.description || 'Tidak ada catatan deskripsi tambahan untuk materi ini.'}
                    </p>
                  </div>

                  {/* Tombol Berkas Dokumen */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {selectedModule.file_url ? (
                      <a
                        href={selectedModule.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white text-xs font-black flex items-center gap-2 shadow transition-all"
                      >
                        <FileText className="w-4 h-4 text-emerald-400" /> Buka / Unduh Dokumen Materi PDF
                        <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
                      </a>
                    ) : (
                      <button
                        onClick={() => showToast('Materi ini berupa lembar ringkasan daring interaktif.', 'info')}
                        className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-black flex items-center gap-2 border border-slate-300"
                      >
                        <FileText className="w-4 h-4 text-emerald-700" /> Dokumen Materi Interaktif Siap Dipelajari
                      </button>
                    )}

                    <button
                      onClick={() => setActiveTab('tugas')}
                      className="px-5 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-black flex items-center gap-2 border border-emerald-300"
                    >
                      <Award className="w-4 h-4 text-emerald-700" /> Kerjakan Tugas Terkait ({tasks.length})
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 2: TUGAS PEMBELAJARAN */}
              {activeTab === 'tugas' && (
                <div className="space-y-4">
                  
                  {/* Action Bar Tugas */}
                  <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 flex items-center justify-between shadow-sm">
                    <div>
                      <h3 className="text-sm font-black text-black">Tagihan Tugas Modul: {selectedModule.title}</h3>
                      <p className="text-xs text-slate-600 font-medium">Kumpulkan jawaban tepat waktu untuk mendapatkan evaluasi nilai dari guru.</p>
                    </div>
                    <button
                      onClick={() => setShowAddTaskModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 shadow"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" /> Tambah Tugas Baru
                    </button>
                  </div>

                  {/* List Tugas */}
                  {tasks.map((t) => (
                    <div key={t.id} className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-700" /> Tenggat: {t.deadline}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 text-black border border-slate-300">
                            Skor Maksimal: {t.max_score}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteTask(t.id, t.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-black">{t.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        {t.description}
                      </p>

                      {/* Kotak Pengumpulan Tugas */}
                      <div className="pt-4 border-t-2 border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-black uppercase tracking-wider">
                            Ketik Jawaban Tugas / Submission:
                          </label>
                          {submittedTasks[t.id] && (
                            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Sudah Terkumpul & Dinilai
                            </span>
                          )}
                        </div>

                        <textarea
                          rows={4}
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          placeholder="Tuliskan jawaban, hasil analisis, tautan berkas tugas, atau resume pembelajaran Anda di sini..."
                          className="w-full bg-white border-2 border-slate-300 rounded-2xl p-4 text-xs sm:text-sm font-medium text-black placeholder:text-slate-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                        />

                        <button
                          onClick={() => handleSubmitTask(t.id)}
                          disabled={isSubmittingTask}
                          className="px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-700/25 flex items-center gap-2 transition-all"
                        >
                          {isSubmittingTask ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Mengirimkan Tugas...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" /> Kumpulkan Tugas Sekarang
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  {tasks.length === 0 && (
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center space-y-3">
                      <Award className="w-10 h-10 text-slate-400 mx-auto" />
                      <div className="text-sm font-black text-black">Belum Ada Tugas untuk Modul Ini</div>
                      <p className="text-xs font-medium text-slate-600 max-w-sm mx-auto">
                        Guru belum memberikan penugasan terstruktur untuk materi ini.
                      </p>
                      <button
                        onClick={() => setShowAddTaskModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs inline-flex items-center gap-1.5 shadow"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" /> Berikan Tugas Sekarang
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 3: DISKUSI INTERAKTIF */}
              {activeTab === 'diskusi' && (
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 space-y-4 flex flex-col h-[580px] shadow-sm">
                  
                  {/* Header Forum Diskusi */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
                    <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-700" /> Forum Tanya Jawab & Diskusi Kelas
                    </h3>
                    <span className="text-xs font-black text-black bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
                      {discussions.length} Pesan
                    </span>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {discussions.map((d) => (
                      <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-black">{d.user_name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-950 border border-emerald-300">
                              {d.user_role}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{d.created_at}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed whitespace-pre-line">
                          {d.message}
                        </p>
                      </div>
                    ))}

                    {discussions.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                        <div className="text-xs font-black text-slate-700">Belum ada diskusi di modul ini</div>
                        <p className="text-[11px] text-slate-500 max-w-xs">
                          Tanyakan pertanyaan atau beri tanggapan materi melalui formulir di bawah.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Send Input */}
                  <form onSubmit={handleSendDiscussion} className="flex gap-2 pt-3 border-t-2 border-slate-100">
                    <input
                      type="text"
                      placeholder="Tuliskan pertanyaan materi ke guru / teman sekelas..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1 bg-white border-2 border-slate-300 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-black placeholder:text-slate-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    />
                    <button
                      type="submit"
                      disabled={isSendingChat || !chatMessage.trim()}
                      className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow transition-all"
                    >
                      {isSendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Kirim
                    </button>
                  </form>

                </div>
              )}
            </>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-16 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-base font-black text-black">Silakan Pilih Modul Pembelajaran di Panel Kiri</div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Pilih modul materi dari daftar sebelah kiri atau buat modul baru untuk memulai pembelajaran.
              </p>
              <button
                onClick={() => setShowAddModuleModal(true)}
                className="mt-2 px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs inline-flex items-center gap-2 shadow"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Tambah Modul Belajar Baru
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ========================================== */}
      {/* MODAL 1: TAMBAH MODUL PEMBELAJARAN BARU   */}
      {/* ========================================== */}
      {showAddModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black">Tambah Modul Pembelajaran Baru</h3>
                  <p className="text-xs text-slate-600 font-medium">Unggah materi pelajaran, video, dan bahan ajar digital.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModuleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateModule} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Judul Modul */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                  Judul Modul / Pertemuan <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newModule.title}
                  onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                  placeholder="Contoh: Pertemuan 5: Arsitektur Jaringan Komputer & Subnetting"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Baris 2: Mata Pelajaran & Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                    Mata Pelajaran <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newModule.subject_name}
                    onChange={(e) => setNewModule({ ...newModule, subject_name: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-black focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="Informatika & Coding">Informatika & Coding</option>
                    <option value="Matematika Peminatan">Matematika Peminatan</option>
                    <option value="Matematika Wajib">Matematika Wajib</option>
                    <option value="Fisika Modern">Fisika Modern</option>
                    <option value="Biologi Molekuler">Biologi Molekuler</option>
                    <option value="Kimia Terapan">Kimia Terapan</option>
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                    <option value="Bahasa Inggris">Bahasa Inggris</option>
                    <option value="Ekonomi & Akuntansi">Ekonomi & Akuntansi</option>
                    <option value="Sejarah Indonesia">Sejarah Indonesia</option>
                    <option value="Pendidikan Karakter & Agama">Pendidikan Karakter & Agama</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                    Kelas / Rombel Target <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newModule.class_name}
                    onChange={(e) => setNewModule({ ...newModule, class_name: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-black focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="X MIPA 1">X MIPA 1</option>
                    <option value="X MIPA 2">X MIPA 2</option>
                    <option value="X IPS 1">X IPS 1</option>
                    <option value="XI MIPA 1">XI MIPA 1</option>
                    <option value="XI MIPA 2">XI MIPA 2</option>
                    <option value="XI IPS 1">XI IPS 1</option>
                    <option value="XII MIPA 1">XII MIPA 1</option>
                    <option value="XII MIPA 2">XII MIPA 2</option>
                    <option value="XII IPS 1">XII IPS 1</option>
                    <option value="Semua Kelas">Semua Kelas (Umum)</option>
                  </select>
                </div>
              </div>

              {/* Baris 3: Guru Pengampu */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                  Nama Guru Pengampu <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newModule.teacher_name}
                  onChange={(e) => setNewModule({ ...newModule, teacher_name: e.target.value })}
                  placeholder="Contoh: Dewi Lestari, M.Kom"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Baris 4: Video URL (YouTube) */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Tautan Video Pembelajaran (Opsional)</span>
                  <span className="text-[10px] text-emerald-800 font-bold">Mendukung link YouTube biasa</span>
                </label>
                <input
                  type="url"
                  value={newModule.video_url}
                  onChange={(e) => setNewModule({ ...newModule, video_url: e.target.value })}
                  placeholder="Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ atau youtu.be"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Sistem otomatis mengubah link YouTube menjadi format pemutar video interaktif di layar siswa.
                </p>
              </div>

              {/* Baris 5: Berkas URL (PDF) */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                  Tautan Berkas / PDF Modul (Opsional)
                </label>
                <input
                  type="text"
                  value={newModule.file_url}
                  onChange={(e) => setNewModule({ ...newModule, file_url: e.target.value })}
                  placeholder="Contoh: https://example.com/modul-pembelajaran.pdf"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Ringkasan Materi */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                  Ringkasan / Penjelasan Materi
                </label>
                <textarea
                  rows={4}
                  value={newModule.description}
                  onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                  placeholder="Tuliskan rangkuman pokok bahasan, instruksi belajar, capaian kompetensi dasar..."
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 text-xs sm:text-sm font-medium text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModuleModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingModule}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-700/25"
                >
                  {isCreatingModule ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" /> Simpan & Publikasikan Modul
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: TAMBAH TUGAS MODUL BARU          */}
      {/* ========================================== */}
      {showAddTaskModal && selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black">Berikan Tugas Baru Siswa</h3>
                  <p className="text-xs text-slate-600 font-medium">Modul: {selectedModule.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                  Judul Tugas <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Contoh: Tugas Mandiri: Analisis Konfigurasi IP Jaringan"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                    Batas Waktu Pengumpulan (Deadline)
                  </label>
                  <input
                    type="text"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    placeholder="Contoh: 2025-04-15 23:59"
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                    Nilai Maksimal (Skor)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={newTask.max_score}
                    onChange={(e) => setNewTask({ ...newTask, max_score: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-black focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                  Petunjuk / Deskripsi Tugas
                </label>
                <textarea
                  rows={4}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Tuliskan petunjuk pengerjaan, format jawaban, dan instruksi lengkap bagi siswa..."
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 text-xs sm:text-sm font-medium text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-700/25"
                >
                  {isCreatingTask ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" /> Simpan Tugas
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
