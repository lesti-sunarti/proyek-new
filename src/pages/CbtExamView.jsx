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
  XCircle
} from 'lucide-react';

export default function CbtExamView() {
  const { currentUser, currentRole, isStaff, showToast } = useAuth();
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
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create', 'monitor'

  // Form Buat Ujian Baru
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Informatika & Coding');
  const [newClass, setNewClass] = useState('X MIPA 1');
  const [newDuration, setNewDuration] = useState(45);
  const [newMaxViolations, setNewMaxViolations] = useState(3);

  const examContainerRef = useRef(null);
  const lastViolationTimeRef = useRef(0);
  const examFinishedRef = useRef(false);
  const inExamRoomRef = useRef(false);
  const violationWarningActiveRef = useRef(false);

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
  const fetchExams = () => {
    fetch('/api/cbt/exams')
      .then(res => res.json())
      .then(data => setExams(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Fetch results for monitoring (for teachers/admins)
  const fetchResults = (examId) => {
    fetch(`/api/cbt/exams/${examId}/results`)
      .then(res => res.json())
      .then(data => setExamResultsList(data))
      .catch(() => {});
  };

  // Mulai Ujian & Load Pertanyaan
  const startExam = (exam) => {
    fetch(`/api/cbt/exams/${exam.id}`)
      .then(res => res.json())
      .then(fullExam => {
        setActiveExam(fullExam);
        setMaxViolations(fullExam.max_violations || 3);
        setTimeLeft(fullExam.duration_minutes * 60);
        setAnswers({});
        setDoubtStatus({});
        setViolationsCount(0);
        setViolationWarning(null);
        setExamFinished(false);
        setFinishResult(null);
        setCurrentQuestionIndex(0);
        
        examFinishedRef.current = false;
        inExamRoomRef.current = true;
        setInExamRoom(true);

        // Minta Fullscreen
        enterFullscreen();
      })
      .catch(() => {
        showToast('Gagal memuat soal ujian', 'error');
      });
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
    if (!inExamRoomRef.current || examFinishedRef.current) return;
    
    // Cegah double triggers beruntun (misal Esc memicu fullscreenchange sekaligus blur dalam 1500ms)
    if (now - lastViolationTimeRef.current < 1500) return;
    // Cegah trigger blur jika dialog peringatan sedang aktif
    if (violationWarningActiveRef.current && violationType.includes('Fokus')) return;

    lastViolationTimeRef.current = now;

    const studentId = currentUser.studentId || 1;
    const studentName = currentUser.name;

    fetch(`/api/cbt/exams/${activeExam.id}/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        student_name: studentName,
        violation_type: violationType,
        timestamp: new Date().toISOString()
      })
    })
      .then(res => res.json())
      .then(data => {
        const newCount = data.violations_count;
        setViolationsCount(newCount);

        if (data.is_locked) {
          // AUTO SUBMIT ON CHEATING
          setViolationWarning({
            title: 'UJIAN DIHENTIKAN OTOMATIS! (DISMISSED)',
            message: 'Anda terdeteksi melakukan pelanggaran berulang melebihi batas maksimal. Sistem Anti-Nyontek otomatis mensubmit lembar ujian Anda.',
            critical: true
          });
          submitExam(true);
        } else {
          setViolationWarning({
            title: `PERINGATAN ANTI-NYONTEK (${newCount}/${data.max_violations})`,
            message: `Aksi terlarang terdeteksi: [${violationType}]. Jangan membuka tab lain, meminimalkan browser, atau keluar dari layar penuh. Sisa toleransi: ${data.max_violations - newCount}x!`,
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
  }, [inExamRoom, examFinished, activeExam]);

  // Timer Countdown
  useEffect(() => {
    if (!inExamRoom || examFinished || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [inExamRoom, examFinished, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit Ujian (Aman tanpa trigger violation)
  const submitExam = (isForceSubmitted = false) => {
    if (!activeExam) return;

    examFinishedRef.current = true;
    inExamRoomRef.current = false;

    const studentId = currentUser.studentId || 1;
    const studentName = currentUser.name;

    fetch(`/api/cbt/exams/${activeExam.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        student_name: studentName,
        answers,
        force_submitted: isForceSubmitted
      })
    })
      .then(res => res.json())
      .then(data => {
        setExamFinished(true);
        setFinishResult(data);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      })
      .catch(() => {
        showToast('Koneksi submit ujian gagal', 'error');
      });
  };

  const exitExamRoom = () => {
    setInExamRoom(false);
    setActiveExam(null);
    setExamFinished(false);
    setFinishResult(null);
    fetchExams();
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
                <button
                  onClick={exitExamRoom}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  Keluar dari Ruang Ujian
                </button>
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
                <div className="text-4xl font-black text-emerald-400 mt-1">{finishResult?.score || 0} / 100</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Status: {finishResult?.status === 'force_submitted' ? 'Dibatalkan / Terkunci' : 'Lulus / Terekam'}
                </div>
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
                      onClick={() => {
                        if (confirm('Apakah Anda yakin ingin menyelesaikan dan mengirim ujian ini?')) {
                          submitExam(false);
                        }
                      }}
                      className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30"
                    >
                      Kirim & Selesaikan Ujian
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
                  onClick={() => {
                    if (confirm('Konfirmasi: Kirim semua jawaban ujian sekarang?')) {
                      submitExam(false);
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-rose-600 text-slate-600 hover:text-white text-xs font-bold transition-all border border-slate-200"
                >
                  Selesaikan Ujian Sekarang
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
                  if (exams.length > 0) fetchResults(exams[0].id);
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
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002147] focus:ring-1 focus:ring-[#002147] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Maksimal Pelanggaran (Toleransi):</label>
                <input
                  type="number"
                  value={newMaxViolations}
                  onChange={(e) => setNewMaxViolations(Number(e.target.value))}
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

            <button
              onClick={() => {
                if (!newTitle) return showToast('Judul ujian tidak boleh kosong', 'error');
                fetch('/api/cbt/exams', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: newTitle,
                    subject_name: newSubject,
                    class_name: newClass,
                    duration_minutes: newDuration,
                    max_violations: newMaxViolations,
                    questions: [
                      {
                        question_text: 'Jelaskan konsep dasar algoritma enkripsi data dan keamanannya!',
                        question_type: 'essay',
                        points: 50
                      },
                      {
                        question_text: 'Komponen hardware yang berfungsi mempertahankan daya sementara saat listrik padam adalah...',
                        question_type: 'pg',
                        option_a: 'UPS (Uninterruptible Power Supply)',
                        option_b: 'Motherboard',
                        option_c: 'RAM',
                        option_d: 'VGA',
                        option_e: 'Heatsink',
                        correct_option: 'A',
                        points: 50
                      }
                    ]
                  })
                })
                  .then(res => res.json())
                  .then(data => {
                    showToast('Paket ujian CBT berhasil dibuat!', 'success');
                    setActiveTab('list');
                    fetchExams();
                  });
              }}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
            >
              Simpan & Terbitkan Ujian CBT
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
            <button
              onClick={() => exams.length > 0 && fetchResults(exams[0].id)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
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
                    <td className="py-3 px-4 font-mono text-slate-500">{res.start_time?.substring(11, 19)}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{res.submit_time ? res.submit_time.substring(11, 19) : '-'}</td>
                    <td className="py-3 px-4 font-extrabold text-emerald-400 text-sm">{res.score} / 100</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        res.violations_count > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {res.violations_count}x Tercatat
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        res.status === 'force_submitted' 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {res.status === 'force_submitted' ? 'FORCE SUBMIT (CURANG)' : 'SELESAI NORMAL'}
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
