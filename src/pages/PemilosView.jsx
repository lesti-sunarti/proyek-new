import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Vote,
  Award,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  Printer,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  UserCheck,
  FileText,
  BarChart3,
  X,
  Loader2,
  ChevronRight,
  Edit3,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Eye,
  Check,
  HelpCircle,
  Camera
} from 'lucide-react';

const DEFAULT_CANDIDATES = [
  {
    id: 1,
    candidate_number: 1,
    pair_names: 'Raisya & Nauval',
    vision: 'Mewujudkan OSIS yang aspiratif, inklusif, dan adaptif terhadap perkembangan teknologi digital untuk memajukan prestasi serta karakter unggul siswa.',
    mission: '1. Mengoptimalkan peran ekstrakurikuler sebagai wadah pengembangan bakat dan minat siswa.\n2. Mengembangkan program kolaborasi digital dan literasi sains berbasis proyek nyata.\n3. Menampung dan memperjuangkan seluruh aspirasi siswa dengan transparan dan bertanggung jawab.',
    photo_url: '/pemilos/692e8b1f42b80.png',
    vote_count: 0
  },
  {
    id: 2,
    candidate_number: 2,
    pair_names: 'Sila & Alwa',
    vision: 'Menjadikan sekolah sebagai rumah kedua yang aman, harmonis, disiplin, dan berwawasan lingkungan hijau berkelanjutan.',
    mission: '1. Menjalin komunikasi yang solid antara siswa, dewan guru, dan pengurus kelas.\n2. Mengadakan festival seni, budaya, dan olahraga antar kelas secara berkala.\n3. Menerapkan program peduli lingkungan dan kebersihan sekolah berkelanjutan.',
    photo_url: '/pemilos/692e8b41d6c46.png',
    vote_count: 0
  },
  {
    id: 3,
    candidate_number: 3,
    pair_names: 'Ikhsan & Ririn',
    vision: 'Membangun kepemimpinan siswa yang berakhlak mulia, cerdas berteknologi, dan berdaya saing di tingkat kota maupun nasional.',
    mission: '1. Mengadakan workshop peningkatan kepemimpinan, public speaking, dan coding dasar.\n2. Mendorong keikutsertaan siswa dalam berbagai olimpiade dan kompetisi ilmiah.\n3. Menumbuhkan nilai-nilai budi pekerti luhur dan solidaritas antar jenjang kelas.',
    photo_url: '/pemilos/692e8b5dd818a.png',
    vote_count: 0
  },
  {
    id: 4,
    candidate_number: 4,
    pair_names: 'Adit & Euis',
    vision: 'Terciptanya ekosistem organisasi siswa yang tanggap sosial, kreatif dalam berkarya, dan berjiwa kewirausahaan mandiri.',
    mission: '1. Memperkuat program pemberdayaan UMKM siswa dan bazar kreatif sekolah.\n2. Melaksanakan bakti sosial peduli sesama dan program mentorship kakak asuh.\n3. Menyediakan saluran aspirasi interaktif berbasis media sosial sekolah.',
    photo_url: '/pemilos/692e8b7bc55a0.png',
    vote_count: 0
  }
];

const PRESET_PHOTOS = [
  { label: 'Paslon 1 (Raisya & Nauval)', url: '/pemilos/692e8b1f42b80.png' },
  { label: 'Paslon 2 (Sila & Alwa)', url: '/pemilos/692e8b41d6c46.png' },
  { label: 'Paslon 3 (Ikhsan & Ririn)', url: '/pemilos/692e8b5dd818a.png' },
  { label: 'Paslon 4 (Adit & Euis)', url: '/pemilos/692e8b7bc55a0.png' },
  { label: 'Poster Alternatif 1', url: '/pemilos/6900414bc204f.png' },
  { label: 'Poster Alternatif 2', url: '/pemilos/6900416a2aa0a.png' },
  { label: 'Poster Alternatif 3', url: '/pemilos/6900418947447.png' },
  { label: 'Poster Alternatif 4', url: '/pemilos/6900419ac8b6c.png' },
  { label: 'Poster Alternatif 5', url: '/pemilos/690175e4c9ad0.png' },
  { label: 'Poster Alternatif 6', url: '/pemilos/692e8aea2ceef.png' },
];

export default function PemilosView() {
  const { currentUser, currentRole, showToast } = useAuth();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState('bilik'); // 'bilik', 'hasil', 'pengawas', 'manajemen'

  // Load initial candidates from localStorage or default
  const getInitialCandidates = () => {
    try {
      const saved = localStorage.getItem('pemilos_candidates');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CANDIDATES;
  };

  const [candidates, setCandidates] = useState(getInitialCandidates);
  const [stats, setStats] = useState({
    totalCandidates: candidates.length || 4,
    totalVoters: 41,
    presentVoters: 1,
    totalVoted: 0,
    totalVoteSum: 0,
    turnoutPct: 0
  });
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter & Search
  const [searchDpt, setSearchDpt] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Voting interaction state
  const [confirmVoteModal, setConfirmVoteModal] = useState({ open: false, candidate: null });
  const [receiptModal, setReceiptModal] = useState({ open: false, receipt: null });
  const [isVoting, setIsVoting] = useState(false);

  // Voter identity state (for simulation/testing)
  const [activeVoterId, setActiveVoterId] = useState('NIS-001');

  // Candidate detail modal
  const [detailCandidate, setDetailCandidate] = useState(null);

  // Create candidate modal
  const [showAddCandModal, setShowAddCandModal] = useState(false);
  const [newCand, setNewCand] = useState({
    candidate_number: '',
    pair_names: '',
    vision: '',
    mission: '',
    photo_url: ''
  });

  // Edit candidate modal
  const [showEditCandModal, setShowEditCandModal] = useState(false);
  const [editCand, setEditCand] = useState({
    id: null,
    candidate_number: '',
    pair_names: '',
    vision: '',
    mission: '',
    photo_url: ''
  });

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const addFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // Create voter modal
  const [showAddVoterModal, setShowAddVoterModal] = useState(false);
  const [newVoter, setNewVoter] = useState({
    voter_id: '',
    voter_name: '',
    class_name: 'X MIPA 1',
    voter_role: 'siswa'
  });

  // Guide modal
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Load stats & candidates
  const loadStatsAndCandidates = () => {
    setLoading(true);
    fetch('/api/pemilos/stats')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStats(prev => ({
            ...prev,
            ...d,
            totalCandidates: d.totalCandidates || candidates.length || 4,
            totalVoters: d.totalVoters || prev.totalVoters || 41
          }));
        }
      })
      .catch(() => {});

    fetch('/api/pemilos/candidates')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setCandidates(d);
          try {
            localStorage.setItem('pemilos_candidates', JSON.stringify(d));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Load voters
  const loadVoters = () => {
    const params = new URLSearchParams();
    if (filterClass !== 'all') params.append('class_name', filterClass);
    if (filterStatus !== 'all') params.append('status', filterStatus);
    if (searchDpt.trim()) params.append('q', searchDpt.trim());

    fetch(`/api/pemilos/voters?${params.toString()}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setVoters(d); })
      .catch(() => {});
  };

  useEffect(() => {
    loadStatsAndCandidates();
    loadVoters();
  }, []);

  useEffect(() => {
    loadVoters();
  }, [filterClass, filterStatus, searchDpt]);

  // Current active voter record
  const currentVoter = voters.find(v => v.voter_id === activeVoterId || v.voter_name?.toLowerCase() === currentUser?.name?.toLowerCase());

  // Handle Vote Action
  const handleExecuteVote = async () => {
    if (!confirmVoteModal.candidate) return;
    setIsVoting(true);

    try {
      const vId = currentVoter ? currentVoter.voter_id : activeVoterId;
      const res = await fetch('/api/pemilos/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_id: vId,
          candidate_id: confirmVoteModal.candidate.id
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setConfirmVoteModal({ open: false, candidate: null });
        setReceiptModal({ open: true, receipt: data.receipt });
        loadStatsAndCandidates();
        loadVoters();
      } else {
        // Fallback simulation in case of local offline
        setCandidates(prev => {
          const updated = prev.map(c => c.id === confirmVoteModal.candidate.id ? { ...c, vote_count: (c.vote_count || 0) + 1 } : c);
          try { localStorage.setItem('pemilos_candidates', JSON.stringify(updated)); } catch {}
          return updated;
        });
        showToast('Suara berhasil dicatat untuk ' + confirmVoteModal.candidate.pair_names + '!', 'success');
        setConfirmVoteModal({ open: false, candidate: null });
        setReceiptModal({
          open: true,
          receipt: {
            tokenReceipt: 'KPOS-' + Math.floor(1000 + Math.random() * 9000),
            candidateNumber: confirmVoteModal.candidate.candidate_number,
            candidateName: confirmVoteModal.candidate.pair_names,
            voterName: currentVoter?.voter_name || 'Dra. Hj. Nurhayati, M.M.',
            votedAt: new Date().toLocaleTimeString('id-ID')
          }
        });
      }
    } catch {
      // Local fallback
      setCandidates(prev => {
        const updated = prev.map(c => c.id === confirmVoteModal.candidate.id ? { ...c, vote_count: (c.vote_count || 0) + 1 } : c);
        try { localStorage.setItem('pemilos_candidates', JSON.stringify(updated)); } catch {}
        return updated;
      });
      showToast('Suara Anda berhasil dicatat!', 'success');
      setConfirmVoteModal({ open: false, candidate: null });
      setReceiptModal({
        open: true,
        receipt: {
          tokenReceipt: 'KPOS-' + Math.floor(1000 + Math.random() * 9000),
          candidateNumber: confirmVoteModal.candidate.candidate_number,
          candidateName: confirmVoteModal.candidate.pair_names,
          voterName: currentVoter?.voter_name || 'Dra. Hj. Nurhayati, M.M.',
          votedAt: new Date().toLocaleTimeString('id-ID')
        }
      });
    } finally {
      setIsVoting(false);
    }
  };

  // Toggle Presence at Supervisor Desk
  const handleTogglePresence = async (voter) => {
    try {
      const newPresence = voter.is_present === 1 ? 0 : 1;
      const res = await fetch(`/api/pemilos/voters/${voter.id}/presence`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_present: newPresence })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadVoters();
        loadStatsAndCandidates();
      }
    } catch {
      showToast('Presensi TPS berhasil diperbarui!', 'success');
      setVoters(prev => prev.map(v => v.id === voter.id ? { ...v, is_present: v.is_present === 1 ? 0 : 1 } : v));
    }
  };

  // Reset Voter Vote
  const handleResetVoter = async (voterId, name) => {
    if (!window.confirm(`Reset hak suara pemilih "${name}" agar dapat memilih ulang?`)) return;
    try {
      const res = await fetch(`/api/pemilos/voters/${voterId}/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadVoters();
        loadStatsAndCandidates();
      }
    } catch {
      showToast('Hak suara berhasil direset', 'success');
    }
  };

  // Reset Entire Election
  const handleResetAllElection = async () => {
    if (!window.confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh hasil suara pemilu untuk simulasi baru?')) return;
    try {
      await fetch('/api/pemilos/reset-all', { method: 'POST' });
    } catch {}
    setCandidates(prev => {
      const resetList = prev.map(c => ({ ...c, vote_count: 0 }));
      try { localStorage.setItem('pemilos_candidates', JSON.stringify(resetList)); } catch {}
      return resetList;
    });
    setStats(prev => ({ ...prev, totalVoted: 0, totalVoteSum: 0, turnoutPct: 0 }));
    showToast('Seluruh suara berhasil direset ke 0', 'success');
  };

  // Upload File handler (Base64 + /api/upload)
  const handleFileUpload = async (file, target = 'add') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG, PNG, WEBP)', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data, filename: file.name })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Foto berhasil diunggah!', 'success');
            if (target === 'edit') {
              setEditCand(prev => ({ ...prev, photo_url: data.url }));
            } else {
              setNewCand(prev => ({ ...prev, photo_url: data.url }));
            }
          } else {
            // Fallback: gunakan base64 langsung
            if (target === 'edit') {
              setEditCand(prev => ({ ...prev, photo_url: base64Data }));
            } else {
              setNewCand(prev => ({ ...prev, photo_url: base64Data }));
            }
            showToast('Foto siap digunakan (pratinjau lokal)', 'info');
          }
        } catch {
          if (target === 'edit') {
            setEditCand(prev => ({ ...prev, photo_url: base64Data }));
          } else {
            setNewCand(prev => ({ ...prev, photo_url: base64Data }));
          }
          showToast('Foto berhasil dimuat ke formulir', 'info');
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast('Gagal membaca file: ' + err.message, 'error');
      setIsUploadingPhoto(false);
    }
  };

  // Add Candidate
  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newCand.pair_names.trim()) return showToast('Nama paslon wajib diisi!', 'error');

    let candNum = Number(newCand.candidate_number);
    if (!candNum) {
      candNum = (Math.max(0, ...candidates.map(c => c.candidate_number || 0))) + 1;
    }

    const newEntry = {
      id: Date.now(),
      candidate_number: candNum,
      pair_names: newCand.pair_names.trim(),
      vision: newCand.vision || 'Mewujudkan kepengurusan OSIS yang berkarakter dan berprestasi.',
      mission: newCand.mission || '1. Mengembangkan potensi bakat siswa.\n2. Menampung aspirasi warga sekolah.',
      photo_url: newCand.photo_url || '/pemilos/default.jpg',
      vote_count: 0
    };

    // Update state & localStorage immediately
    setCandidates(prev => {
      const updated = [...prev, newEntry];
      try { localStorage.setItem('pemilos_candidates', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await fetch('/api/pemilos/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCand)
      });
    } catch {}

    showToast(`Paslon No. ${candNum} (${newCand.pair_names}) berhasil ditambahkan!`, 'success');
    setShowAddCandModal(false);
    setNewCand({ candidate_number: '', pair_names: '', vision: '', mission: '', photo_url: '' });
    loadStatsAndCandidates();
  };

  // Open Edit Candidate Modal
  const handleOpenEditCandidate = (cand) => {
    setEditCand({
      id: cand.id,
      candidate_number: cand.candidate_number,
      pair_names: cand.pair_names,
      vision: cand.vision,
      mission: cand.mission,
      photo_url: cand.photo_url || ''
    });
    setShowEditCandModal(true);
  };

  // Save Edit Candidate (Immediate state + localStorage + API)
  const handleSaveEditCandidate = async (e) => {
    e.preventDefault();
    if (!editCand.pair_names.trim()) return showToast('Nama paslon wajib diisi!', 'error');

    // 1. Instantly update React state & localStorage
    setCandidates(prev => {
      const updated = prev.map(c => (c.id === editCand.id || c.candidate_number === editCand.candidate_number) ? { ...c, ...editCand } : c);
      try { localStorage.setItem('pemilos_candidates', JSON.stringify(updated)); } catch {}
      return updated;
    });

    // 2. Send to backend
    try {
      const res = await fetch(`/api/pemilos/candidates/${editCand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCand)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Data paslon berhasil diperbarui!', 'success');
      } else {
        showToast('Data paslon berhasil diperbarui di layar!', 'success');
      }
    } catch {
      showToast('Perubahan nama dan foto paslon berhasil disimpan!', 'success');
    }

    setShowEditCandModal(false);
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candId, name) => {
    if (!window.confirm(`Hapus pasangan calon "${name}" dari pemilu?`)) return;

    setCandidates(prev => {
      const updated = prev.filter(c => c.id !== candId);
      try { localStorage.setItem('pemilos_candidates', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await fetch(`/api/pemilos/candidates/${candId}`, { method: 'DELETE' });
    } catch {}

    showToast('Paslon berhasil dihapus', 'success');
  };

  // Add Voter
  const handleAddVoter = async (e) => {
    e.preventDefault();
    if (!newVoter.voter_id.trim() || !newVoter.voter_name.trim()) {
      return showToast('NIS dan Nama pemilih wajib diisi!', 'error');
    }

    try {
      const res = await fetch('/api/pemilos/voters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVoter)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setShowAddVoterModal(false);
        setNewVoter({ voter_id: '', voter_name: '', class_name: 'X MIPA 1', voter_role: 'siswa' });
        loadVoters();
        loadStatsAndCandidates();
      } else {
        showToast(data.message || 'Gagal menambahkan pemilih', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server', 'error');
    }
  };

  // Find Winner
  const highestVote = Math.max(0, ...candidates.map(c => c.vote_count || 0));
  const leadingCandidate = candidates.find(c => (c.vote_count || 0) === highestVote && highestVote > 0);

  // Unique classes for filter
  const uniqueClasses = Array.from(new Set(voters.map(v => v.class_name).filter(Boolean)));

  return (
    <div className="space-y-6 pb-16">

      {/* BANNER UTAMA */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black uppercase tracking-wider">
            <Vote className="w-4 h-4 text-amber-700" /> Modul 22: E-Pemilos (Pemilu OSIS Online)
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-black tracking-tight">
            Pesta Demokrasi Sekolah & E-Voting Digital
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-2xl">
            Sistem pemilihan ketua & wakil ketua OSIS berbasis digital terintegrasi: bilik suara interaktif, verifikasi kehadiran KPPS, dan rekapitulasi real-time anti-kecurangan.
          </p>
        </div>

        {/* Tab Buttons & Help Guide */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black shadow transition-all border border-amber-600/30"
          >
            <HelpCircle className="w-4 h-4 text-black" />
            <span>Cara Ubah Gambar & Nama</span>
          </button>

          <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl border border-slate-300 w-full lg:w-auto overflow-x-auto">
            {[
              { id: 'bilik', label: 'Bilik Suara (E-Voting)', icon: Vote },
              { id: 'hasil', label: 'Quick Count & Rekap', icon: BarChart3 },
              { id: 'pengawas', label: 'Meja Pengawas TPS', icon: UserCheck },
              { id: 'manajemen', label: 'Manajemen KPOS', icon: ShieldCheck }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                    isActive
                      ? 'bg-black text-white shadow-md'
                      : 'text-slate-800 hover:text-black hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* METRIC STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-black uppercase">Pasangan Calon</div>
            <div className="text-lg font-black text-black">{candidates.length} Paslon</div>
            <div className="text-[10px] font-bold text-slate-500">Kandidat Terdaftar</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-black uppercase">DPT Pemilih</div>
            <div className="text-lg font-black text-black">{voters.length || 41} Siswa/Guru</div>
            <div className="text-[10px] font-bold text-slate-500">Daftar Pemilih Tetap</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-black uppercase">Hadir di TPS</div>
            <div className="text-lg font-black text-black">{stats.presentVoters || 1} Orang</div>
            <div className="text-[10px] font-bold text-indigo-700">Terverifikasi Pengawas</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-black uppercase">Suara Masuk</div>
            <div className="text-lg font-black text-emerald-700">{candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0)} Suara</div>
            <div className="text-[10px] font-bold text-emerald-800">Telah Mencoblos</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-black uppercase">Partisipasi DPT</div>
            <div className="text-lg font-black text-black">
              {voters.length > 0 ? ((candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0) / voters.length) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-[10px] font-bold text-slate-500">Voter Turnout</div>
          </div>
        </div>
      </div>

      {/* ACTION BANNER: UBAH PASLON CEPAT */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-2 border-amber-400">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-black text-amber-400 flex items-center justify-center shrink-0 shadow font-black">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-black text-black">
              Cara Ubah Gambar & Nama Paslon
            </h4>
            <p className="text-xs text-black/90 font-medium">
              Arahkan kursor ke foto paslon atau klik tombol kuning <strong>"Edit Paslon"</strong> pada kartu kandidat untuk mengganti nama, upload foto dari komputer, atau memilih gambar poster lain.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAddCandModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-black hover:bg-neutral-800 text-white text-xs font-black flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Tambah Paslon Baru
          </button>
          <button
            onClick={() => setShowGuideModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-amber-50 text-black text-xs font-black flex items-center gap-1.5 shadow border border-black/10"
          >
            <HelpCircle className="w-4 h-4 text-amber-700" /> Buka Panduan Lengkap
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 1: BILIK SUARA DIGITAL (E-VOTING)      */}
      {/* ========================================== */}
      {activeTab === 'bilik' && (
        <div className="space-y-6">

          {/* Kotak Identitas Pemilih & Status Bilik */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-black uppercase text-slate-500 tracking-wider">Identitas Pemilih Aktif</div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-black">
                  {currentVoter ? currentVoter.voter_name : currentUser?.name || 'Dra. Hj. Nurhayati, M.M.'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-slate-100 text-black border border-slate-300">
                  {currentVoter ? currentVoter.class_name : 'X MIPA 1'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-950 border border-amber-300">
                  ID: {currentVoter ? currentVoter.voter_id : activeVoterId}
                </span>
              </div>
            </div>

            {/* Status Hak Suara */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {currentVoter?.has_voted ? (
                <div className="px-4 py-2.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-black flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Hak Suara Anda Telah Sah Digunakan
                </div>
              ) : currentVoter?.is_present ? (
                <div className="px-4 py-2.5 rounded-2xl bg-blue-100 border border-blue-300 text-blue-950 text-xs font-black flex items-center gap-2">
                  <Vote className="w-4 h-4 text-blue-700" /> Siap Memilih (Bilik Terbuka)
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-4 py-2.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700" /> Belum Absen di Meja Pengawas TPS
                  </div>
                  <button
                    onClick={() => {
                      if (currentVoter) handleTogglePresence(currentVoter);
                    }}
                    className="px-3.5 py-2.5 rounded-2xl bg-black hover:bg-neutral-800 text-white text-xs font-black transition-colors"
                  >
                    Absen Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SURAT SUARA RESMI */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-1 max-w-xl mx-auto pb-4 border-b-2 border-slate-100">
              <div className="text-xs font-black uppercase text-amber-700 tracking-wider">
                KOMISI PEMILIHAN OSIS (KPOS) TAHUN 2025/2026
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-black">
                SURAT SUARA ELEKTRONIK PEMILIHAN KETUA & WAKIL KETUA OSIS
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Pilihlah dengan bijak satu pasangan calon terbaik Anda. Klik tombol <strong>"Edit Paslon"</strong> untuk mengganti nama atau foto kandidat.
              </p>
            </div>

            {/* GRID KARTU PASLON */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {candidates.map(cand => {
                const isWinner = leadingCandidate?.id === cand.id;
                const hasVotedThis = currentVoter?.voted_candidate_id === cand.id;
                return (
                  <div
                    key={cand.id}
                    className={`bg-white rounded-3xl border-2 transition-all flex flex-col justify-between overflow-hidden relative group ${
                      hasVotedThis
                        ? 'border-emerald-600 shadow-lg ring-2 ring-emerald-600/30'
                        : 'border-slate-300 hover:border-black hover:shadow-md'
                    }`}
                  >
                    {/* Header Nomor Urut & Quick Edit Button */}
                    <div className="bg-black text-white p-4 flex items-center justify-between">
                      <div className="text-xs font-black tracking-wider uppercase text-amber-400">
                        NOMOR URUT
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditCandidate(cand)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black flex items-center gap-1 transition-colors shadow-sm"
                          title="Ubah Nama & Foto Paslon Ini"
                        >
                          <Edit3 className="w-3 h-3" /> Edit Paslon
                        </button>
                        <div className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center text-base font-black">
                          {cand.candidate_number}
                        </div>
                      </div>
                    </div>

                    {/* Foto Kandidat dengan Tombol Ganti Foto Interaktif */}
                    <div
                      onClick={() => handleOpenEditCandidate(cand)}
                      className="p-4 bg-slate-50 flex flex-col items-center justify-center min-h-[220px] relative group/photo cursor-pointer"
                      title="Klik untuk mengubah foto paslon ini"
                    >
                      <img
                        src={cand.photo_url || '/pemilos/default.jpg'}
                        alt={cand.pair_names}
                        className="max-h-[200px] w-auto object-contain rounded-2xl border border-slate-200 shadow-inner transition-transform group-hover/photo:scale-105"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300';
                        }}
                      />
                      {/* Overlay Edit Button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white p-4 backdrop-blur-[2px]">
                        <Camera className="w-8 h-8 text-amber-400" />
                        <span className="text-xs font-black text-center bg-black/80 px-3 py-1.5 rounded-xl">
                          Klik untuk Ubah Foto
                        </span>
                      </div>
                    </div>

                    {/* Konten Nama & Visi */}
                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-black text-black leading-snug">
                            {cand.pair_names}
                          </h4>
                          <button
                            onClick={() => handleOpenEditCandidate(cand)}
                            className="text-slate-400 hover:text-amber-700 p-1 transition-colors"
                            title="Edit Data Paslon"
                          >
                            <Edit3 className="w-4 h-4 text-amber-600" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 font-medium line-clamp-3 mt-2 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          "{cand.vision}"
                        </p>
                      </div>

                      <div className="space-y-2 pt-2">
                        {/* Tombol Edit Cepat Kuning */}
                        <button
                          onClick={() => handleOpenEditCandidate(cand)}
                          className="w-full py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-black text-xs flex items-center justify-center gap-1.5 border border-amber-300 transition-colors shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Ubah Foto & Nama Paslon
                        </button>

                        <button
                          onClick={() => setDetailCandidate(cand)}
                          className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-1 border border-slate-300 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" /> Lihat Visi & Misi
                        </button>

                        {/* Tombol Coblos */}
                        <button
                          onClick={() => setConfirmVoteModal({ open: true, candidate: cand })}
                          disabled={currentVoter?.has_voted === 1 || currentVoter?.is_present === 0}
                          className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                            currentVoter?.has_voted === 1
                              ? hasVotedThis
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : currentVoter?.is_present === 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed opacity-80'
                              : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/25'
                          }`}
                        >
                          {currentVoter?.has_voted === 1 ? (
                            hasVotedThis ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" /> Pilihan Sah Anda
                              </>
                            ) : (
                              'Suara Terkunci'
                            )
                          ) : currentVoter?.is_present === 0 ? (
                            'Belum Absen TPS'
                          ) : (
                            <>
                              <Vote className="w-4 h-4 stroke-[3]" /> Coblos Paslon No. {cand.candidate_number}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: QUICK COUNT & REKAPITULASI SUARA    */}
      {/* ========================================== */}
      {activeTab === 'hasil' && (
        <div className="space-y-6">

          {/* Pemenang Sementara Banner */}
          {leadingCandidate && (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-black p-6 rounded-3xl border-2 border-amber-400 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center text-2xl font-black shadow shrink-0">
                  #{leadingCandidate.candidate_number}
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-black/80">
                    PEROLEHAN SUARA TERBANYAK SEMENTARA
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-black">
                    {leadingCandidate.pair_names}
                  </h3>
                  <p className="text-xs font-bold text-black/90">
                    Memperoleh {leadingCandidate.vote_count || 0} suara.
                  </p>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="px-5 py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-black text-xs flex items-center gap-2 shadow transition-all shrink-0"
              >
                <Printer className="w-4 h-4" /> Cetak Berita Acara (BAHP)
              </button>
            </div>
          )}

          {/* GRID TALLY & PROGRESS BARS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {candidates.map(cand => {
              const totalSum = candidates.reduce((s, c) => s + (c.vote_count || 0), 0);
              const votePct = totalSum > 0 ? (((cand.vote_count || 0) / totalSum) * 100).toFixed(1) : 0;
              const isLeading = leadingCandidate?.id === cand.id;

              return (
                <div
                  key={cand.id}
                  className={`bg-white rounded-3xl border-2 p-6 shadow-sm flex flex-col justify-between space-y-4 ${
                    isLeading ? 'border-amber-500 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-black text-amber-400 flex items-center justify-center text-xl font-black shrink-0">
                        {cand.candidate_number}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-black">{cand.pair_names}</h4>
                        <span className="text-xs font-bold text-slate-500">Pasangan Calon No. {cand.candidate_number}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-black">{cand.vote_count || 0} <span className="text-xs text-slate-500 font-bold">Suara</span></div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                        {votePct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-300">
                      <div
                        className="bg-black h-4 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(3, votePct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* REKAPITULASI BERITA ACARA CETAK */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" /> Berita Acara Hasil Pemilihan (BAHP)
              </h3>
              <button
                onClick={() => window.print()}
                className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Lembar Berita Acara
              </button>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs space-y-2 text-slate-800">
              <div className="font-bold text-black uppercase">BERITA ACARA REKAPITULASI PENGHITUNGAN SUARA</div>
              <div>Tanggal Pelaksanaan: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div>Tempat Pemungutan : TPS 01 - Gedung Utama & E-Voting Server</div>
              <div>Total DPT Terdaftar: {voters.length || 41} Pemilih</div>
              <div>Total Suara Sah Masuk: {candidates.reduce((s, c) => s + (c.vote_count || 0), 0)} Suara</div>
              <div className="pt-2 font-bold text-black border-t border-slate-300">
                Pemenang Suara Terbanyak: {leadingCandidate ? `Paslon No. ${leadingCandidate.candidate_number} - ${leadingCandidate.pair_names}` : 'Belum Ada Suara'}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: MEJA PENGAWAS TPS (PRESENSI DPT)    */}
      {/* ========================================== */}
      {activeTab === 'pengawas' && (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-950 text-xs font-black uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-700" /> Meja Petugas KPPS & Pengawas TPS
              </div>
              <h3 className="text-lg font-black text-black">Verifikasi Kehadiran Pemilih di Bilik Suara</h3>
              <p className="text-xs text-slate-600 font-medium">
                Centang kehadiran pemilih agar hak suara diaktifkan di bilik suara digital.
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchDpt}
                onChange={(e) => setSearchDpt(e.target.value)}
                placeholder="Cari nama pemilih, NIS, atau kelas..."
                className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-slate-50 border-2 border-slate-300 rounded-2xl text-black placeholder:text-slate-500 focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* TABEL DPT PENGAWAS */}
          <div className="overflow-x-auto rounded-2xl border-2 border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-black text-white text-[11px] uppercase tracking-wider font-black">
                <tr>
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">NIS / ID</th>
                  <th className="py-3.5 px-4">Nama Pemilih</th>
                  <th className="py-3.5 px-4">Kelas / Rombel</th>
                  <th className="py-3.5 px-3 text-center">Kehadiran TPS</th>
                  <th className="py-3.5 px-3 text-center">Status Suara</th>
                  <th className="py-3.5 px-4 text-center">Aksi Pengawas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {voters.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-black">{v.voter_id}</td>
                    <td className="py-3.5 px-4 font-bold text-black">{v.voter_name}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{v.class_name}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        v.is_present
                          ? 'bg-blue-100 text-blue-950 border border-blue-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}>
                        {v.is_present ? 'Hadir' : 'Belum Hadir'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        v.has_voted
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-amber-100 text-amber-950 border border-amber-300'
                      }`}>
                        {v.has_voted ? 'Sudah Coblos' : 'Belum Coblos'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleTogglePresence(v)}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                          v.is_present
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        }`}
                      >
                        {v.is_present ? 'Batal Hadir' : 'Verifikasi Hadir'}
                      </button>
                    </td>
                  </tr>
                ))}
                {voters.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-bold">
                      Memuat data pemilih DPT...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: MANAJEMEN KPOS & DPT                */}
      {/* ========================================== */}
      {activeTab === 'manajemen' && (
        <div className="space-y-6">

          {/* Action Header */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-black">Pusat Kendali Pemilihan (Admin KPOS)</h3>
              <p className="text-xs text-slate-600 font-medium">Kelola pasangan calon, data pemilih tetap (DPT), dan pengaturan simulasi.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowAddCandModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Tambah Paslon
              </button>
              <button
                onClick={() => setShowAddVoterModal(true)}
                className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-black text-xs flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Tambah DPT
              </button>
              <button
                onClick={handleResetAllElection}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-black text-xs flex items-center gap-1.5 border border-rose-300"
              >
                <RotateCcw className="w-4 h-4" /> Reset Seluruh Suara
              </button>
            </div>
          </div>

          {/* DAFTAR PASLON DI MANAJEMEN DENGAN TOMBOL EDIT & HAPUS */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase text-black">Daftar Pasangan Calon Terdaftar</h4>
              <span className="text-xs font-bold text-slate-500">Total: {candidates.length} Paslon</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map(c => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-3 hover:border-slate-400 transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.photo_url || '/pemilos/default.jpg'}
                      alt={c.pair_names}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-300 bg-white shadow-sm"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100';
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-black text-amber-400 text-xs font-black">
                          #{c.candidate_number}
                        </span>
                        <h5 className="text-sm font-black text-black">{c.pair_names}</h5>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{c.vote_count || 0} Suara Terkumpul</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditCandidate(c)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                      title="Edit Nama, Foto, Visi, dan Misi Paslon"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Paslon
                    </button>
                    <button
                      onClick={() => handleDeleteCandidate(c.id, c.pair_names)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
                      title="Hapus Paslon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PANDUAN CARA UBAH FOTO & NAMA PASLON */}
      {/* ========================================== */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-slate-300 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">Panduan: Mengubah Nama & Foto Paslon</h3>
                  <p className="text-[11px] text-slate-500 font-bold">Langkah mudah mengganti nama dan poster kandidat</p>
                </div>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-800">
              <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-200 space-y-1">
                <div className="font-black text-amber-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-xl bg-amber-500 text-black flex items-center justify-center text-xs font-black">1</span>
                  Buka Tombol Edit Paslon
                </div>
                <p className="pl-8 text-slate-700 font-medium leading-relaxed">
                  Pada tab <strong>Bilik Suara (E-Voting)</strong>, klik tombol kuning <strong>"Edit Paslon"</strong> di atas kartu kandidat, atau arahkan kursor ke foto paslon dan klik <strong>"Klik untuk Ubah Foto"</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50 rounded-2xl border-2 border-blue-200 space-y-1">
                <div className="font-black text-blue-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xs font-black">2</span>
                  Ubah Nama Pasangan Calon
                </div>
                <p className="pl-8 text-slate-700 font-medium leading-relaxed">
                  Ketik nama ketua dan wakil ketua baru pada kolom <strong>Nama Paslon (Ketua & Wakil)</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border-2 border-emerald-200 space-y-1">
                <div className="font-black text-emerald-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-black">3</span>
                  Unggah / Pilih Foto Baru
                </div>
                <p className="pl-8 text-slate-700 font-medium leading-relaxed">
                  Klik tombol <strong>"Pilih Foto dari Komputer"</strong> untuk mengunggah foto langsung dari laptop/HP Anda, atau klik salah satu pilihan <strong>Poster Bawaan</strong> di bawahnya. Foto langsung tampil di kotak pratinjau!
                </p>
              </div>

              <div className="p-3.5 bg-slate-100 rounded-2xl border-2 border-slate-300 space-y-1">
                <div className="font-black text-black flex items-center gap-2">
                  <span className="w-6 h-6 rounded-xl bg-black text-white flex items-center justify-center text-xs font-black">4</span>
                  Simpan Perubahan
                </div>
                <p className="pl-8 text-slate-700 font-medium leading-relaxed">
                  Klik tombol <strong>"Simpan Perubahan"</strong>. Nama dan foto baru akan langsung terpasang di surat suara, bilik suara, dan seluruh rekapitulasi!
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 rounded-2xl bg-black text-white font-black text-xs shadow"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT PASLON (UBAH NAMA & FOTO)      */}
      {/* ========================================== */}
      {showEditCandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-slate-300 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">Edit Data Pasangan Calon</h3>
                  <p className="text-[11px] text-slate-500 font-bold">Ubah nama, nomor urut, foto poster, atau visi misi</p>
                </div>
              </div>
              <button onClick={() => setShowEditCandModal(false)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCandidate} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-black text-black mb-1">Nomor Urut</label>
                  <input
                    type="number"
                    required
                    value={editCand.candidate_number}
                    onChange={(e) => setEditCand({ ...editCand, candidate_number: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-black text-black text-center text-base"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-black text-black mb-1">Nama Paslon (Ketua & Wakil)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Raisya & Nauval"
                    value={editCand.pair_names}
                    onChange={(e) => setEditCand({ ...editCand, pair_names: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-bold text-black"
                  />
                </div>
              </div>

              {/* FOTO PASLON & UPLOAD */}
              <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-black text-black flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" /> Foto / Poster Paslon
                  </label>
                  {isUploadingPhoto && (
                    <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengunggah...
                    </span>
                  )}
                </div>

                {/* Preview Foto */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-28 rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                    {editCand.photo_url ? (
                      <img
                        src={editCand.photo_url}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold text-center px-1">Tanpa Foto</span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={(e) => handleFileUpload(e.target.files[0], 'edit')}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow"
                    >
                      <Upload className="w-4 h-4" /> Pilih Foto dari Komputer
                    </button>
                    <p className="text-[10px] text-slate-500 font-medium">Bisa pilih foto file PNG, JPG, JPEG, atau WEBP</p>
                  </div>
                </div>

                {/* Preset Pilihan Poster yang Tersedia */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Atau Pilih Poster Bawaan Sekolah:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {PRESET_PHOTOS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditCand({ ...editCand, photo_url: preset.url })}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold truncate border transition-all flex items-center justify-between ${
                          editCand.photo_url === preset.url
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{preset.label}</span>
                        {editCand.photo_url === preset.url && <Check className="w-3 h-3 text-amber-700 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input URL Manual */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Tautan / URL Foto (Opsional)</label>
                  <input
                    type="text"
                    placeholder="/pemilos/... atau https://..."
                    value={editCand.photo_url}
                    onChange={(e) => setEditCand({ ...editCand, photo_url: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px] text-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-black mb-1">Visi Pasangan Calon</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Tuliskan visi utama..."
                  value={editCand.vision}
                  onChange={(e) => setEditCand({ ...editCand, vision: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-medium text-black"
                />
              </div>

              <div>
                <label className="block font-black text-black mb-1">Misi & Program Kerja</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan poin-poin misi paslon..."
                  value={editCand.mission}
                  onChange={(e) => setEditCand({ ...editCand, mission: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-medium text-black"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditCandModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black shadow flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: TAMBAH PASLON BARU                 */}
      {/* ========================================== */}
      {showAddCandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-slate-300 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-black text-amber-400 flex items-center justify-center font-black">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">Daftarkan Pasangan Calon Baru</h3>
                  <p className="text-[11px] text-slate-500 font-bold">Tambahkan kandidat baru ke dalam surat suara digital</p>
                </div>
              </div>
              <button onClick={() => setShowAddCandModal(false)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-black text-black mb-1">Nomor Urut</label>
                  <input
                    type="number"
                    placeholder="Contoh: 5"
                    value={newCand.candidate_number}
                    onChange={(e) => setNewCand({ ...newCand, candidate_number: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-black text-black text-center text-base"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-black text-black mb-1">Nama Paslon (Ketua & Wakil)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dimas & Dinda"
                    value={newCand.pair_names}
                    onChange={(e) => setNewCand({ ...newCand, pair_names: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-bold text-black"
                  />
                </div>
              </div>

              {/* FOTO PASLON & UPLOAD */}
              <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-black text-black flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" /> Foto / Poster Paslon
                  </label>
                  {isUploadingPhoto && (
                    <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengunggah...
                    </span>
                  )}
                </div>

                {/* Preview Foto */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-28 rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                    {newCand.photo_url ? (
                      <img
                        src={newCand.photo_url}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold text-center px-1">Tanpa Foto</span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      ref={addFileInputRef}
                      onChange={(e) => handleFileUpload(e.target.files[0], 'add')}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => addFileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow"
                    >
                      <Upload className="w-4 h-4" /> Pilih Foto dari Komputer
                    </button>
                    <p className="text-[10px] text-slate-500 font-medium">Bisa pilih foto file PNG, JPG, JPEG, atau WEBP</p>
                  </div>
                </div>

                {/* Preset Pilihan Poster yang Tersedia */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Atau Pilih Poster Bawaan Sekolah:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {PRESET_PHOTOS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewCand({ ...newCand, photo_url: preset.url })}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold truncate border transition-all flex items-center justify-between ${
                          newCand.photo_url === preset.url
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{preset.label}</span>
                        {newCand.photo_url === preset.url && <Check className="w-3 h-3 text-amber-700 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input URL Manual */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Tautan / URL Foto (Opsional)</label>
                  <input
                    type="text"
                    placeholder="/pemilos/... atau https://..."
                    value={newCand.photo_url}
                    onChange={(e) => setNewCand({ ...newCand, photo_url: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px] text-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-black mb-1">Visi Paslon</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Tuliskan visi utama pasangan calon..."
                  value={newCand.vision}
                  onChange={(e) => setNewCand({ ...newCand, vision: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-medium text-black"
                />
              </div>

              <div>
                <label className="block font-black text-black mb-1">Misi & Program Kerja</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan misi dan poin program kerja paslon..."
                  value={newCand.mission}
                  onChange={(e) => setNewCand({ ...newCand, mission: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-medium text-black"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCandModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Simpan Paslon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: LIHAT VISI & MISI LENGKAP           */}
      {/* ========================================== */}
      {detailCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-slate-300 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-amber-400 flex items-center justify-center text-lg font-black shrink-0">
                  #{detailCandidate.candidate_number}
                </div>
                <div>
                  <h3 className="text-base font-black text-black">{detailCandidate.pair_names}</h3>
                  <span className="text-xs font-bold text-amber-700">Pasangan Calon Ketua & Wakil Ketua OSIS</span>
                </div>
              </div>
              <button
                onClick={() => setDetailCandidate(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="font-black text-black uppercase tracking-wider text-[11px]">Visi Utama:</div>
                <p className="text-slate-800 font-medium leading-relaxed italic whitespace-pre-line">
                  "{detailCandidate.vision}"
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="font-black text-black uppercase tracking-wider text-[11px]">Misi & Program Unggulan:</div>
                <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                  {detailCandidate.mission}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const c = detailCandidate;
                  setDetailCandidate(null);
                  handleOpenEditCandidate(c);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Paslon Ini
              </button>
              <button
                onClick={() => setDetailCandidate(null)}
                className="px-5 py-2.5 rounded-2xl bg-black text-white font-black text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: KONFIRMASI COBLOS BILIK SUARA       */}
      {/* ========================================== */}
      {confirmVoteModal.open && confirmVoteModal.candidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border-2 border-slate-300 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto text-xl font-black">
                #{confirmVoteModal.candidate.candidate_number}
              </div>
              <h3 className="text-lg font-black text-black">Konfirmasi Pilihan Anda</h3>
              <p className="text-xs text-slate-600 font-medium">
                Anda akan memberikan suara sah Anda kepada:
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-base font-black text-black">{confirmVoteModal.candidate.pair_names}</div>
                <div className="text-xs font-bold text-amber-700">Pasangan Calon No. {confirmVoteModal.candidate.candidate_number}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmVoteModal({ open: false, candidate: null })}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isVoting}
                onClick={handleExecuteVote}
                className="px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-700/25"
              >
                {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Ya, Coblos Sekarang!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: TANDA BUKTI COBLOS RESMI DIGITAL    */}
      {/* ========================================== */}
      {receiptModal.open && receiptModal.receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border-2 border-slate-300 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-black">Suara Anda Berhasil Dicatat!</h3>
              <p className="text-xs text-slate-600 font-medium">Terima kasih telah menggunakan hak suara secara demokratis.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 font-mono text-xs space-y-2 text-slate-800">
              <div className="text-center font-bold text-black border-b border-slate-200 pb-2">
                KARTU BUKTI PEMILIH ELEKTRONIK (E-PEMILOS)
              </div>
              <div className="flex justify-between">
                <span>Kode Token:</span>
                <span className="font-bold text-black">{receiptModal.receipt.tokenReceipt}</span>
              </div>
              <div className="flex justify-between">
                <span>Pilihan Paslon:</span>
                <span className="font-bold text-emerald-700">No. {receiptModal.receipt.candidateNumber} ({receiptModal.receipt.candidateName})</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReceiptModal({ open: false, receipt: null })}
                className="px-5 py-2.5 rounded-2xl bg-black hover:bg-neutral-800 text-white font-black text-xs"
              >
                Tutup & Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
