import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Maximize2, 
  Minimize2, 
  FileText, 
  EyeOff, 
  Award, 
  Users, 
  Lock,
  RefreshCw,
  Plus,
  Send,
  HelpCircle,
  XCircle,
  Trash2
} from 'lucide-react';

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];
const DEFAULT_QUESTION_POINTS = 10;
let questionUidCounter = 0;
const createEmptyQuestion = () => ({
  uid: `q-${Date.now()}-${questionUidCounter++}`,
  question_text: '',
  question_type: 'pg',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  option_e: '',
  correct_option: 'A',
  points: DEFAULT_QUESTION_POINTS
});

export default function CbtExamView() {
  const { currentUser, isStaff, showToast } = useAuth();
  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [inExamRoom, setInExamRoom] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [doubtStatus, setDoubtStatus] = useState({});
  const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes in seconds
  const [violationsCount, setViolationsCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [violationWarning, setViolationWarning] = useState(null);
  const [examFinished, setExamFinished] = useState(false);
  const [finishResult, setFinishResult] = useState(null);
  const [examResultsList, setExamResultsList] = useState([]);
  const [monitorExamId, setMonitorExamId] = useState(null);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create', 'monitor'

  // Form Buat Ujian Baru
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Informatika & Coding');
  const [newClass, setNewClass] = useState('X MIPA 1');
  const [newDuration, setNewDuration] = useState(45);
  const [newMaxViolations, setNewMaxViolations] = useState(3);
  const [newPassingScore, setNewPassingScore] = useState(75);
  const [newQuestions, setNewQuestions] = useState(() => [createEmptyQuestion()]);
  const [isCreatingExam, setIsCreatingExam] = useState(false);

  const examContainerRef = useRef(null);
  const lastViolationTimeRef = useRef(0);
  const examFinishedRef = useRef(false);
  const inExamRoomRef = useRef(false);
  const violationWarningActiveRef = useRef(false);
  // Ref agar handler event/timer selalu membaca data terbaru (bukan closure usang)
  const answersRef = useRef({});
  const activeExamRef = useRef(null);
  const submittingRef = useRef(false);
  const dialogOpenRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    activeExamRef.current = activeExam;
  }, [activeExam]);

  // Pastikan fullscreen dilepas & deteksi dimatikan saat komponen dilepas (unmount)
  useEffect(() => {
    return () => {
      inExamRoomRef.current = false;
      examFinishedRef.current = true;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // ID peserta harus berupa angka: siswa memakai related_student_id, akun lain memakai id akun
  const getStudentId = () => {
    const raw = currentUser?.related_student_id ?? currentUser?.id ?? 1;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };
  const getStudentName = () => currentUser?.name || 'Peserta Ujian';

  // Dialog konfirmasi bawaan browser memicu event blur; tandai agar tidak dihitung pelanggaran
  const confirmDialog = (message) => {
    dialogOpenRef.current = true;
    lastViolationTimeRef.current = Date.now();
    const ok = window.confirm(message);
    window.setTimeout(() => { dialogOpenRef.current = false; }, 800);
    return ok;
  };

  useEffect(() => {
    inExamRoomRef.current = inExamRoom;
  }, [inExamRoom]);

  useEffect(() => {
    examFinishedRef.current = examFinished;
  }, [examFinished]);

  useEffect(() => {
    violationWarningActiveRef.current = !!violationWarning;
  }, [violationWarning]);

  // Fetch available exams
  const fetchExams = async () => {
    try {
      const res = await fetch('/api/cbt/exams');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memuat daftar ujian');
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      setExams([]);
      showToast(err.message || 'Gagal memuat daftar ujian', 'error');
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Fetch results for monitoring (for teachers/admins)
  const fetchResults = async (examId) => {
    if (!examId) return;
    setMonitorExamId(examId);
    try {
      const res = await fetch(`/api/cbt/exams/${examId}/results`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memuat hasil ujian');
      setExamResultsList(Array.isArray(data) ? data : []);
    } catch (err) {
      setExamResultsList([]);
      showToast(err.message || 'Gagal memuat hasil ujian', 'error');
    }
  };

  // Mulai Ujian & Load Pertanyaan
  const startExam = async (exam) => {
    try {
      const res = await fetch(`/api/cbt/exams/${exam.id}`);
      const fullExam = await res.json().catch(() => ({}));
      if (!res.ok || fullExam.success === false) throw new Error(fullExam.message || 'Gagal memuat soal ujian');

      const questions = Array.isArray(fullExam.questions) ? fullExam.questions : [];
      if (questions.length === 0) {
        return showToast('Paket ujian ini belum memiliki soal. Hubungi guru pengampu.', 'error');
      }
      const durationMinutes = Number(fullExam.duration_minutes) > 0 ? Number(fullExam.duration_minutes) : 45;
      const examData = { ...fullExam, questions };

      // Reset ref lebih dulu agar listener/timer membaca kondisi ujian yang baru
      activeExamRef.current = examData;
      answersRef.current = {};
      submittingRef.current = false;
      examFinishedRef.current = false;
      inExamRoomRef.current = true;
      lastViolationTimeRef.current = Date.now(); // toleransi awal saat masuk fullscreen

      setActiveExam(examData);
      setMaxViolations(Number(fullExam.max_violations) || 3);
      setTimeLeft(durationMinutes * 60);
      setAnswers({});
      setDoubtStatus({});
      setViolationsCount(0);
      setViolationWarning(null);
      setExamFinished(false);
      setFinishResult(null);
      setCurrentQuestionIndex(0);
      setInExamRoom(true);

      // Minta Fullscreen
      enterFullscreen();
    } catch (err) {
      showToast(err.message || 'Gagal memuat soal ujian', 'error');
    }
  };

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.log('Fullscreen request notice:', err);
      });
    }
  };

  // Record Violation Handler (Debounced & Safe)
  const recordViolation = (violationType) => {
    const now = Date.now();
    const exam = activeExamRef.current;
    if (!exam || !inExamRoomRef.current || examFinishedRef.current || submittingRef.current) return;
    // Abaikan blur/focus yang dipicu dialog konfirmasi internal (bukan kecurangan)
    if (dialogOpenRef.current) return;
    // Cegah double triggers beruntun (misal Esc memicu fullscreenchange sekaligus blur dalam 1500ms)
    if (now - lastViolationTimeRef.current < 1500) return;
    // Cegah trigger blur jika dialog peringatan sedang aktif
    if (violationWarningActiveRef.current && violationType.includes('Fokus')) return;

    lastViolationTimeRef.current = now;

    fetch(`/api/cbt/exams/${exam.id}/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: getStudentId(),
        student_name: getStudentName(),
        violation_type: violationType,
        timestamp: new Date().toISOString()
      })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal mencatat pelanggaran');
        return data;
      })
      .then(data => {
        const newCount = Number(data.violations_count) || 0;
        const maxAllowed = Number(data.max_violations) || 3;
        setViolationsCount(newCount);
        setMaxViolations(maxAllowed);

        if (data.is_locked) {
          // AUTO SUBMIT ON CHEATING (jawaban terakhir dibaca dari ref, bukan closure usang)
          setViolationWarning({
            title: 'UJIAN DIHENTIKAN OTOMATIS!',
            message: data.message || 'Anda terdeteksi melakukan pelanggaran berulang melebihi batas maksimal. Sistem Anti-Nyontek otomatis mensubmit lembar ujian Anda.',
            critical: true
          });
          submitExam(true);
        } else {
          setViolationWarning({
            title: `PERINGATAN ANTI-NYONTEK (${newCount}/${maxAllowed})`,
            message: `Aksi terlarang terdeteksi: [${violationType}]. Jangan membuka tab lain, meminimalkan browser, atau keluar dari layar penuh. Sisa toleransi: ${Math.max(maxAllowed - newCount, 0)}x!`,
            critical: false
          });
        }
      })
      .catch(() => {});
  };

  // ============================================================
  // ANTI-CHEATING SECURITY EVENT LISTENERS
  // ============================================================
  useEffect(() => {
    if (!inExamRoom || examFinished) return;

    // 1. Deteksi Pergantian Tab atau Minimize Browser
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('Pindah Tab Browser / Minimize Halaman');
      }
    };

    // 2. Deteksi Kehilangan Fokus Window
    const handleWindowBlur = () => {
      recordViolation('Kehilangan Fokus Layar (Membuka Aplikasi Lain)');
    };

    // 3. Deteksi Keluar dari Mode Fullscreen
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !examFinishedRef.current) {
        recordViolation('Keluar dari Mode Fullscreen Layar Penuh');
      }
    };

    // 4. Mencegah Klik Kanan (Context Menu)
    const handleContextMenu = (e) => {
      e.preventDefault();
      showToast('⚠️ Klik kanan dinonaktifkan demi keamanan ujian!', 'error');
      recordViolation('Mencoba Klik Kanan');
      return false;
    };

    // 5. Mencegah Shortcut Keyboard
    const handleKeyDown = (e) => {
      if (e.keyCode === 123) { // F12
        e.preventDefault();
        recordViolation('Mencoba Membuka DevTools (F12)');
        return false;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        recordViolation('Mencoba Inspect Element');
        return false;
      }
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        recordViolation('Mencoba View Source (Ctrl+U)');
        return false;
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        showToast('⚠️ Dilarang Copy-Paste dalam ruang ujian!', 'error');
        recordViolation('Mencoba Copy/Paste');
        return false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inExamRoom, examFinished]);

  // Timer Countdown (satu interval selama di ruang ujian; tanpa efek samping di dalam updater state)
  useEffect(() => {
    if (!inExamRoom || examFinished) return undefined;

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [inExamRoom, examFinished]);

  // Waktu habis -> kirim otomatis satu kali (dijaga submittingRef agar tidak ganda)
  useEffect(() => {
    if (inExamRoom && !examFinished && timeLeft <= 0 && activeExamRef.current) {
      showToast('Waktu ujian habis. Jawaban Anda dikirim otomatis.', 'info');
      submitExam(false);
    }
  }, [timeLeft, inExamRoom, examFinished]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit Ujian (Aman tanpa trigger violation, tidak bisa terkirim dua kali)
  const submitExam = async (isForceSubmitted = false) => {
    const exam = activeExamRef.current;
    if (!exam || submittingRef.current || examFinishedRef.current) return;

    submittingRef.current = true;
    examFinishedRef.current = true;
    inExamRoomRef.current = false;
    setIsSubmittingExam(true);

    try {
      const res = await fetch(`/api/cbt/exams/${exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: getStudentId(),
          student_name: getStudentName(),
          answers: answersRef.current,
          force_submitted: Boolean(isForceSubmitted)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal mengirim jawaban ujian');

      setFinishResult(data);
      setExamFinished(true);
      setViolationWarning(null); // tutup modal peringatan agar layar hasil (skor) terlihat
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      // Gagal terkirim: kembalikan status agar peserta bisa mengirim ulang
      submittingRef.current = false;
      examFinishedRef.current = false;
      inExamRoomRef.current = true;
      showToast(`Koneksi submit ujian gagal: ${err.message}. Silakan coba kirim ulang.`, 'error');
    } finally {
      setIsSubmittingExam(false);
    }
  };

  const exitExamRoom = () => {
    inExamRoomRef.current = false;
    examFinishedRef.current = true;
    submittingRef.current = false;
    activeExamRef.current = null;
    setInExamRoom(false);
    setActiveExam(null);
    setExamFinished(false);
    setFinishResult(null);
    setViolationWarning(null);
    setViolationsCount(0);
    setTimeLeft(2700);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    fetchExams();
  };

  // ============================================================
  // FORM BUAT PAKET UJIAN (GURU / ADMIN)
  // ============================================================
  const updateNewQuestion = (index, patch) => {
    setNewQuestions(prev => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };
  const addNewQuestion = () => setNewQuestions(prev => [...prev, createEmptyQuestion()]);
  const removeNewQuestion = (index) => {
    setNewQuestions(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };
  const totalNewPoints = newQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  const resetCreateForm = () => {
    setNewTitle('');
    setNewSubject('Informatika & Coding');
    setNewClass('X MIPA 1');
    setNewDuration(45);
    setNewMaxViolations(3);
    setNewPassingScore(75);
    setNewQuestions([createEmptyQuestion()]);
  };

  const handleCreateExam = async () => {
    const title = newTitle.trim();
    if (!title) return showToast('Judul ujian tidak boleh kosong', 'error');
    if (!newSubject.trim() || !newClass.trim()) return showToast('Mata pelajaran dan target kelas wajib diisi', 'error');
    const duration = Number(newDuration);
    if (!Number.isInteger(duration) || duration < 1) return showToast('Durasi ujian harus bilangan bulat minimal 1 menit', 'error');
    const maxViolationsValue = Number(newMaxViolations);
    if (!Number.isInteger(maxViolationsValue) || maxViolationsValue < 1) return showToast('Batas toleransi pelanggaran minimal 1', 'error');
    const passingScore = Number(newPassingScore);
    if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) return showToast('Passing score (KKM) harus 0 - 100', 'error');
    if (newQuestions.length === 0) return showToast('Tambahkan minimal satu soal', 'error');

    const preparedQuestions = [];
    for (let i = 0; i < newQuestions.length; i += 1) {
      const q = newQuestions[i];
      const nomor = i + 1;
      const questionText = String(q.question_text || '').trim();
      if (!questionText) return showToast(`Teks soal nomor ${nomor} tidak boleh kosong`, 'error');
      const points = Number(q.points);
      if (!Number.isFinite(points) || points <= 0) return showToast(`Poin soal nomor ${nomor} harus lebih dari 0`, 'error');

      if (q.question_type === 'pg') {
        const options = {};
        OPTION_KEYS.forEach((key) => {
          const field = `option_${key.toLowerCase()}`;
          options[field] = String(q[field] || '').trim();
        });
        const filledCount = Object.values(options).filter(Boolean).length;
        if (filledCount < 2) return showToast(`Soal nomor ${nomor}: isi minimal dua teks pilihan jawaban`, 'error');
        const correctKey = String(q.correct_option || '').toUpperCase();
        if (!OPTION_KEYS.includes(correctKey)) return showToast(`Soal nomor ${nomor}: pilih kunci jawaban (A-E)`, 'error');
        if (!options[`option_${correctKey.toLowerCase()}`]) return showToast(`Soal nomor ${nomor}: kunci jawaban ${correctKey} belum memiliki teks pilihan`, 'error');
        preparedQuestions.push({ question_text: questionText, question_type: 'pg', ...options, correct_option: correctKey, points });
      } else {
        preparedQuestions.push({ question_text: questionText, question_type: 'essay', points });
      }
    }

    setIsCreatingExam(true);
    try {
      const res = await fetch('/api/cbt/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject_name: newSubject.trim(),
          class_name: newClass.trim(),
          duration_minutes: duration,
          passing_score: passingScore,
          max_violations: maxViolationsValue,
          questions: preparedQuestions
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal membuat paket ujian');
      showToast(data.message || 'Paket ujian CBT berhasil dibuat!', 'success');
      resetCreateForm();
      setActiveTab('list');
      fetchExams();
    } catch (err) {
      showToast(err.message || 'Gagal membuat paket ujian', 'error');
    } finally {
      setIsCreatingExam(false);
    }
  };

  // ============================================================
  // RENDER: EXAM ROOM (RUANG UJIAN ANTI-NYONTEK)
  // ============================================================
  if (inExamRoom) {
    const questions = activeExam?.questions || [];
    const currentQ = questions[currentQuestionIndex];

    return (
      <div 
        ref={examContainerRef} 
        className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col select-none overflow-y-auto"
      >
        {/* Anti-Cheating Violation Alert Modal */}
        {violationWarning && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-150">
            <div className={`max-w-md w-full rounded-3xl p-6 border text-center ${
              violationWarning.critical ? 'bg-rose-950 border-rose-600' : 'bg-amber-950 border-amber-600'
            }`}>
              <AlertTriangle className={`w-16 h-16 mx-auto mb-4 ${
                violationWarning.critical ? 'text-rose-500 animate-bounce' : 'text-amber-400'
              }`} />
              <h3 className="text-lg font-black text-slate-900 mb-2">{violationWarning.title}</h3>
              <p className="text-xs text-slate-700 mb-6 leading-relaxed">{violationWarning.message}</p>
              
              {!violationWarning.critical ? (
                <button
                  onClick={() => {
                    setViolationWarning(null);
                    enterFullscreen();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Saya Mengerti & Kembali ke Layar Penuh
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {isSubmittingExam ? (
                    <div className="text-xs font-semibold text-slate-700">Mengirim jawaban Anda ke server...</div>
                  ) : (
                    <button
                      onClick={() => submitExam(true)}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Coba Kirim Ulang Jawaban
                    </button>
                  )}
                  <button
                    onClick={exitExamRoom}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                  >
                    Keluar dari Ruang Ujian
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FINISH SCREEN */}
        {examFinished ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
              <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${
                finishResult?.status === 'force_submitted' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {finishResult?.status === 'force_submitted' ? <XCircle className="w-10 h-10" /> : <Award className="w-10 h-10" />}
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {finishResult?.status === 'force_submitted' ? 'Ujian Dihentikan Paksa!' : 'Ujian Berhasil Diselesaikan!'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {finishResult?.status === 'force_submitted' 
                    ? 'Tercatat pelanggaran Anti-Nyontek melebihi ambang batas.' 
                    : 'Terima kasih telah mengerjakan ujian dengan jujur dan tertib.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Skor Otomatis (Pilihan Ganda & Essay)</div>
                <div className="text-4xl font-black text-emerald-400 mt-1">{finishResult?.score ?? 0} / 100</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Status: {finishResult?.status === 'force_submitted' ? 'Dibatalkan / Terkunci' : 'Terekam'}
                  {activeExam?.passing_score != null && (
                    <> | KKM {activeExam.passing_score}: {Number(finishResult?.score ?? 0) >= Number(activeExam.passing_score) ? 'Tuntas' : 'Belum Tuntas'}</>
                  )}
                </div>
                {finishResult?.message && (
                  <div className="text-[11px] text-slate-400 mt-1">{finishResult.message}</div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 flex justify-between">
                <span>Total Pelanggaran:</span>
                <span className="font-bold text-rose-400">{violationsCount}x Catatan</span>
              </div>

              <button
                onClick={exitExamRoom}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Kembali ke Dashboard Utama
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* TOP BAR: Exam Info, Timer, Violation Counter */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                    {activeExam.title}
                    <span className="hidden sm:inline-block text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono border border-rose-500/30">
                      SECURE LOCK ACTIVE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Siswa: <span className="text-emerald-400 font-semibold">{currentUser.name}</span> | Mapel: {activeExam.subject_name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                
                {/* Violations Strike Counter */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Pelanggaran: {violationsCount}/{maxViolations}</span>
                </div>

                {/* Countdown Timer */}
                <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                  timeLeft < 300 
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' 
                    : 'bg-slate-100 border-slate-200 text-emerald-400'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(timeLeft)}</span>
                </div>

                {/* Force Fullscreen Button */}
                <button
                  onClick={enterFullscreen}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-600"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* MAIN EXAM BODY: Question & Palette Navigation */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Question Content (Col 8) */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl">
                {currentQ ? (
                  <div className="space-y-6">
                    {/* Header Soal */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                          Nomor {currentQuestionIndex + 1} dari {questions.length}
                        </span>
                        <span className="text-xs text-slate-500 uppercase font-semibold">
                          Tipe: {currentQ.question_type === 'pg' ? 'Pilihan Ganda' : 'Essay'} ({currentQ.points} Poin)
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-amber-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!doubtStatus[currentQ.id]}
                          onChange={(e) => setDoubtStatus({ ...doubtStatus, [currentQ.id]: e.target.checked })}
                          className="rounded text-amber-500 focus:ring-0 bg-slate-100 border-slate-200"
                        />
                        <span>Ragu-Ragu</span>
                      </label>
                    </div>

                    {/* Question Text */}
                    <div className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed">
                      {currentQ.question_text}
                    </div>

                    {/* Options (Pilihan Ganda) or Textarea (Essay) */}
                    {currentQ.question_type === 'pg' ? (
                      <div className="space-y-2.5 pt-2">
                        {['A', 'B', 'C', 'D', 'E'].map((optKey) => {
                          const optText = currentQ[`option_${optKey.toLowerCase()}`];
                          if (!optText) return null;
                          const isSelected = answers[currentQ.id] === optKey;

                          return (
                            <button
                              key={optKey}
                              onClick={() => setAnswers({ ...answers, [currentQ.id]: optKey })}
                              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                                isSelected 
                                  ? 'bg-emerald-500/15 border-emerald-500 text-white font-semibold ring-2 ring-emerald-500/20' 
                                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                              }`}
                            >
                              <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {optKey}
                              </span>
                              <span className="text-xs sm:text-sm mt-0.5">{optText}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-2">Tuliskan Jawaban Essay Anda:</label>
                        <textarea
                          rows={6}
                          value={answers[currentQ.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                          placeholder="Ketik jawaban lengkap di sini..."
                          className="w-full bg-white border border-slate-300 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-12">Tidak ada soal aktif.</div>
                )}

                {/* Navigasi Bawah */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-30"
                  >
                    ← Soal Sebelumnya
                  </button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      Soal Berikutnya →
                    </button>
                  ) : (
                    <button
                      disabled={isSubmittingExam}
                      onClick={() => {
                        if (confirmDialog('Apakah Anda yakin ingin menyelesaikan dan mengirim ujian ini?')) {
                          submitExam(false);
                        }
                      }}
                      className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30"
                    >
                      {isSubmittingExam ? 'Mengirim...' : 'Kirim & Selesaikan Ujian'}
                    </button>
                  )}
                </div>
              </div>

              {/* Palette Soal (Col 4) */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xl h-fit">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nomor Soal Ujian</h4>
                  <p className="text-[11px] text-slate-500">Klik nomor untuk berpindah soal secara cepat</p>
                </div>

                <div className="grid grid-cols-5 gap-2.5">
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                    const isCurrent = idx === currentQuestionIndex;
                    const isDoubt = !!doubtStatus[q.id];

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`h-11 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center relative ${
                          isCurrent
                            ? 'ring-2 ring-emerald-400 bg-emerald-500 text-slate-950 font-black scale-105'
                            : isDoubt
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : isAnswered
                                ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                                : 'bg-slate-50 border border-slate-200 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <span>{idx + 1}</span>
                        {isAnswered && !isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute bottom-1"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Keterangan Warna */}
                <div className="space-y-1.5 pt-4 border-t border-slate-200 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-500/40"></span>
                    <span>Sudah Dijawab ({Object.keys(answers).length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50"></span>
                    <span>Ragu-Ragu ({Object.keys(doubtStatus).filter(k => doubtStatus[k]).length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200"></span>
                    <span>Belum Dijawab ({questions.length - Object.keys(answers).length})</span>
                  </div>
                </div>

                {/* Tombol Selesai Cepat */}
                <button
                  disabled={isSubmittingExam}
                  onClick={() => {
                    if (confirmDialog('Konfirmasi: Kirim semua jawaban ujian sekarang?')) {
                      submitExam(false);
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-rose-600 disabled:opacity-60 text-slate-600 hover:text-white text-xs font-bold transition-all border border-slate-200"
                >
                  {isSubmittingExam ? 'Mengirim Jawaban...' : 'Selesaikan Ujian Sekarang'}
                </button>
              </div>

            </div>
          </>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER: DASHBOARD UTAMA CBT (LIST UJIAN, BUAT UJIAN, MONITORING)
  // ============================================================
  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> Modul 3: CBT Secure Exam Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Ujian Online & Sistem Web Anti-Nyontek</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dilengkapi proteksi Fullscreen paksa, deteksi pindah tab browser, pemblokiran klik kanan, inspect element, dan auto-submit pelanggaran.
          </p>
        </div>

        {/* Tabs for Teacher/Admin */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'list' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Daftar Ujian Aktif
          </button>
          {isStaff && (
            <>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'create' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                + Buat Paket Ujian
              </button>
              <button
                onClick={() => {
                  setActiveTab('monitor');
                  const targetId = monitorExamId || exams[0]?.id;
                  if (targetId) fetchResults(targetId);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'monitor' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Monitoring Pelanggaran
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: LIST UJIAN AKTIF */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {exams.length === 0 && (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center text-xs text-slate-500">
              Belum ada paket ujian yang tersedia saat ini.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id} 
                className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-200 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Anti-Nyontek Active
                    </span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> {exam.duration_minutes} Menit
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-400 transition-colors">
                      {exam.title}
                    </h3>
                    <div className="text-xs text-slate-500 mt-1">
                      Mapel: <span className="text-slate-700 font-semibold">{exam.subject_name}</span> | Kelas: {exam.class_name}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Passing Score (KKM):</span>
                      <span className="font-bold text-slate-900">{exam.passing_score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Batas Toleransi Pelanggaran:</span>
                      <span className="font-bold text-rose-400">{exam.max_violations || 3}x Max Peringatan</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-200 flex gap-2">
                  <button
                    onClick={() => startExam(exam)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" /> Masuk Ruang Ujian Aman
                  </button>

                  {isStaff && (
                    <button
                      onClick={() => {
                        setActiveTab('monitor');
                        fetchResults(exam.id);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs font-semibold"
                      title="Lihat Hasil Ujian & Log Siswa"
                    >
                      Log Nilai
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BUAT PAKET UJIAN BARU (TEACHER / ADMIN) */}
      {activeTab === 'create' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Buat Paket Ujian CBT Baru</h3>
            <p className="text-xs text-slate-500 mt-0.5">Konfigurasi soal dan aturan ketat anti-kecurangan</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Ujian:</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Contoh: Ulangan Harian Fisika Gelombang..."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mata Pelajaran:</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Kelas:</label>
                <input
                  type="text"
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Durasi (Menit):</label>
                <input
                  type="number"
                  min="1"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Maksimal Pelanggaran (Toleransi):</label>
                <input
                  type="number"
                  min="1"
                  value={newMaxViolations}
                  onChange={(e) => setNewMaxViolations(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
              <div className="font-bold text-rose-400">Proteksi Keamanan yang Otomatis Diterapkan:</div>
              <div>✓ Mode Wajib Fullscreen (Layar Penuh)</div>
              <div>✓ Deteksi Real-Time Pindah Tab & Minimize Window</div>
              <div>✓ Blokir Klik Kanan, Blokir DevTools F12, dan Blokir Copy-Paste</div>
              <div>✓ Auto-Submit Paksa jika Pelanggaran mencapai batas</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Passing Score / KKM (0-100):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newPassingScore}
                onChange={(e) => setNewPassingScore(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
              />
            </div>

            {/* Editor Soal */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-600">
                  Daftar Soal ({newQuestions.length}) | Total {totalNewPoints} poin
                </label>
                <button
                  type="button"
                  onClick={addNewQuestion}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Soal
                </button>
              </div>

              {newQuestions.map((q, idx) => (
                <div key={q.uid} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Soal {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={q.question_type}
                        onChange={(e) => updateNewQuestion(idx, { question_type: e.target.value })}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#002147]"
                      >
                        <option value="pg">Pilihan Ganda</option>
                        <option value="essay">Essay</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={q.points}
                        onChange={(e) => updateNewQuestion(idx, { points: e.target.value })}
                        title="Poin soal"
                        className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#002147]"
                      />
                      <span className="text-[10px] text-slate-500">poin</span>
                      <button
                        type="button"
                        onClick={() => removeNewQuestion(idx)}
                        disabled={newQuestions.length === 1}
                        title="Hapus soal"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={q.question_text}
                    onChange={(e) => updateNewQuestion(idx, { question_text: e.target.value })}
                    placeholder="Tuliskan teks soal di sini..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147]"
                  />

                  {q.question_type === 'pg' && (
                    <div className="space-y-2">
                      {OPTION_KEYS.map((optKey) => {
                        const field = `option_${optKey.toLowerCase()}`;
                        const isKey = q.correct_option === optKey;
                        return (
                          <div key={optKey} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateNewQuestion(idx, { correct_option: optKey })}
                              title="Jadikan kunci jawaban"
                              className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 ${
                                isKey ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:border-emerald-400'
                              }`}
                            >
                              {optKey}
                            </button>
                            <input
                              type="text"
                              value={q[field]}
                              onChange={(e) => updateNewQuestion(idx, { [field]: e.target.value })}
                              placeholder={`Teks pilihan ${optKey}${optKey === 'E' ? ' (opsional)' : ''}`}
                              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147]"
                            />
                          </div>
                        );
                      })}
                      <p className="text-[11px] text-slate-500">
                        Klik huruf untuk menandai kunci jawaban. Kunci saat ini: <strong className="text-emerald-700">{q.correct_option}</strong>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCreateExam}
              disabled={isCreatingExam}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
            >
              {isCreatingExam ? 'Menyimpan Paket Ujian...' : 'Simpan & Terbitkan Ujian CBT'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: MONITORING HASIL & LOG PELANGGARAN SISWA (GURU/ADMIN) */}
      {activeTab === 'monitor' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Hasil Ujian & Catatan Pelanggaran Siswa
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={monitorExamId ?? ''}
                onChange={(e) => fetchResults(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#002147] max-w-[260px]"
                title="Pilih paket ujian yang dimonitor"
              >
                {exams.length === 0 && <option value="">Belum ada paket ujian</option>}
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.title} ({exam.class_name})</option>
                ))}
              </select>
              <button
                onClick={() => fetchResults(monitorExamId || exams[0]?.id)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Nama Siswa</th>
                  <th className="py-3 px-4">Waktu Mulai</th>
                  <th className="py-3 px-4">Waktu Selesai</th>
                  <th className="py-3 px-4">Skor / Nilai</th>
                  <th className="py-3 px-4">Pelanggaran</th>
                  <th className="py-3 px-4 rounded-r-xl">Status Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {examResultsList.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{res.student_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{res.start_time ? String(res.start_time).substring(11, 19) : '-'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{res.submit_time ? String(res.submit_time).substring(11, 19) : '-'}</td>
                    <td className="py-3 px-4 font-extrabold text-emerald-400 text-sm">{res.score ?? '-'} / 100</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        res.violations_count > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {res.violations_count ?? 0}x Tercatat
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        res.status === 'force_submitted' 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {res.status === 'force_submitted' ? 'FORCE SUBMIT (CURANG)' : res.status === 'ongoing' ? 'SEDANG MENGERJAKAN' : 'SELESAI NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
                {examResultsList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Belum ada siswa yang menyelesaikan ujian ini. Silakan uji coba mengerjakan ujian di tab "Daftar Ujian Aktif".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
