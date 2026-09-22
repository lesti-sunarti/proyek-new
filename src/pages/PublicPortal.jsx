import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StaffWorkspace from '../components/StaffWorkspace';
import { 
  GraduationCap, 
  Users, 
  Award, 
  BookOpen, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck,
  ChevronRight,
  Clock3,
  School,
  Building2,
  Cpu,
  Trophy,
  FileCheck2,
  Library
} from 'lucide-react';

export default function PublicPortal() {
  const { setActiveModule } = useAuth();
  const [stats, setStats] = useState({ students: 850, teachers: 48, classes: 24, alumni: 3420, accreditation: 'A (Unggul)' });
  const [news, setNews] = useState([]);
  const [agendas, setAgendas] = useState([]);

  useEffect(() => {
    let isMounted = true;
    // Semua sumber data publik bersifat opsional: bila gagal/kosong, halaman tetap tampil dengan fallback
    const safeJson = async (res) => {
      const data = await res.json().catch(() => null);
      if (!res.ok || data === null || data?.success === false) throw new Error(data?.message || `HTTP ${res.status}`);
      return data;
    };

    fetch('/api/public/stats')
      .then(safeJson)
      .then((data) => {
        if (!isMounted || !data || typeof data !== 'object' || Array.isArray(data)) return;
        // Gabungkan dengan nilai default agar field yang hilang tetap punya fallback
        setStats((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});

    fetch('/api/blogs')
      .then(safeJson)
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        setNews(data.filter((item) => item && (!item.status || item.status === 'published')).slice(0, 3));
      })
      .catch(() => {});

    fetch('/api/agenda')
      .then(safeJson)
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        // Tampilkan agenda yang akan datang (terdekat dulu); jika tidak ada, tampilkan agenda terakhir
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const valid = data.filter((ag) => ag && ag.event_date);
        const upcoming = valid.filter((ag) => {
          const d = new Date(ag.event_date);
          return !Number.isNaN(d.getTime()) && d >= today;
        });
        setAgendas((upcoming.length > 0 ? upcoming : valid.slice(-3)).slice(0, 3));
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, []);

  const formatAgendaDate = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { month: '-', day: '-' };
    return { month: d.toLocaleString('id-ID', { month: 'short' }), day: d.getDate() };
  };

  return (
    <div className="space-y-10 pb-16">
      
      {/* HERO SECTION */}
      <section className="portal-hero relative overflow-hidden rounded-2xl p-7 sm:p-10 lg:p-12">
        <div className="relative z-10 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_255px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 border-l-2 border-[#f4a024] pl-3 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> Portal resmi sekolah
            </div>

            <h1 className="portal-title mb-4 text-4xl leading-[1.04] text-white sm:text-5xl">
              Belajar dengan arah.<br />
              <span className="text-[#f4a024]">Bertumbuh dengan karakter.</span>
            </h1>

            <p className="mb-8 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              SMAN 1 Harapan Bangsa menyatukan pembelajaran yang terukur, layanan administrasi yang rapi, dan ruang tumbuh bagi setiap siswa.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveModule('ppdb')}
                className="flex items-center gap-2 rounded-lg bg-[#f4a024] px-5 py-3 text-xs font-bold text-[#002147] shadow-sm transition-colors hover:bg-[#ffd074] sm:text-sm"
              >
                Daftar PPDB <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveModule('erapor')}
                className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-white/10 sm:text-sm"
              >
                <FileCheck2 className="h-4 w-4 text-[#f4a024]" /> Lihat E-Rapor
              </button>
              <button
                onClick={() => setActiveModule('support')}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold text-slate-300 transition-colors hover:text-white sm:text-sm"
              >
                Butuh bantuan?
              </button>
            </div>
          </div>

          <div className="hidden border-l border-white/15 pl-6 lg:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Tahun ajaran</div>
            <div className="mt-1 text-xl font-semibold text-white">2026 / 2027</div>
            <div className="my-5 h-px bg-white/15" />
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Penerimaan siswa</div>
            <button onClick={() => setActiveModule('ppdb')} className="mt-1 text-left text-sm font-semibold text-[#f4a024] hover:text-amber-200">Informasi PPDB →</button>
          </div>
        </div>
      </section>

      <StaffWorkspace />

      {/* 4 PILAR KEUNGGULAN SEKOLAH ala SMK Tunas Media */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Kurikulum Berstandar Nasional', desc: 'Pembelajaran Kurikulum Merdeka berbasis riset, sains, dan literasi digital abad 21.', icon: BookOpen, color: 'text-blue-700', bg: 'bg-blue-50' },
          { title: 'CBT Aman Anti-Nyontek', desc: 'Evaluasi elektronik dengan deteksi kecurangan real-time & penguncian layar otomatis.', icon: ShieldCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { title: 'Fasilitas & Lab Modern', desc: 'Lab Komputer, Robotika, Perpustakaan Digital, dan lapangan olahraga standar nasional.', icon: Cpu, color: 'text-amber-700', bg: 'bg-amber-50' },
          { title: 'Bimbingan Karir & Prestasi', desc: 'Pendampingan tembus PTN favorit (SNBP/SNBT) serta pembinaan 48+ juara ekskul.', icon: Trophy, color: 'text-indigo-700', bg: 'bg-indigo-50' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <h3 className="text-sm font-bold text-[#002147] mb-1.5">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </section>

      {/* STATISTIK SEKOLAH */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Peserta Didik Aktif', value: stats.students || 850, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pendidik & Tenaga Ahli', value: stats.teachers || 48, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rombongan Belajar', value: stats.classes || 24, icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Alumni Sukses Tersebar', value: stats.alumni || '3,400+', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Status Akreditasi', value: stats.accreditation || 'A Unggul', icon: ShieldCheck, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-xs hover:border-slate-300 transition-colors">
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${item.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#002147]">{item.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{item.label}</div>
            </div>
          );
        })}
      </section>

      {/* SAMBUTAN KEPALA SEKOLAH & VISI MISI */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sambutan */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-4">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200" 
              alt="Kepala Sekolah" 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-[#f4a024]/40 shadow-xs"
            />
            <div>
              <div className="text-xs text-[#f4a024] font-bold uppercase tracking-wider">Sambutan Kepala Sekolah</div>
              <h3 className="text-lg sm:text-xl font-bold text-[#002147]">Dra. Hj. Nurhayati, M.M.</h3>
              <p className="text-xs text-slate-500">Pembina Utama Muda - Kepala Sekolah</p>
            </div>
          </div>
          <div className="text-slate-600 text-xs sm:text-sm leading-relaxed space-y-3 pt-3 border-t border-slate-100">
            <p>
              "Assalamu’alaikum Warahmatullahi Wabarakatuh. Selamat datang di portal resmi SMAN 1 Harapan Bangsa. 
              Sebagai institusi pendidikan yang terus bertransformasi, kami bangga menghadirkan platform digital komprehensif 
              ini guna menunjang transparansi, ketertiban akademik, serta pembelajaran abad 21."
            </p>
            <p>
              "Dengan implementasi CBT Anti-Nyontek, E-Rapor digital, absensi ganda barcode & webcam, sistem perpustakaan, 
              serta layanan konseling BK online, kami berkomitmen memberikan pelayanan prima bagi seluruh warga sekolah dan masyarakat."
            </p>
          </div>
        </div>

        {/* Visi & Misi */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div>
            <span className="text-xs font-bold text-[#f4a024] uppercase tracking-wider">Komitmen Institusi</span>
            <h3 className="text-lg font-bold text-[#002147] mt-1">Visi & Misi Sekolah</h3>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-[#002147] uppercase tracking-wider">Visi:</div>
            <p className="text-xs sm:text-sm font-semibold text-[#002147] mt-1 italic leading-snug">
              "Terwujudnya insan akademis yang beriman, berakhlak mulia, unggul dalam sains teknologi, dan berdaya saing global."
            </p>
          </div>
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Misi Utama:</div>
            {[
              'Menyelenggarakan pembelajaran berkualitas berbasis riset dan teknologi informasi.',
              'Membina kedisiplinan dan integritas melalui sistem evaluasi CBT yang transparan.',
              'Mengembangkan bakat siswa dalam bidang olimpiade sains, seni, dan kepemimpinan.',
              'Memperkuat kolaborasi harmonis bersama wali murid dan pemangku kepentingan.'
            ].map((misi, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-[#f4a024] shrink-0 mt-0.5" />
                <span>{misi}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BERITA & AGENDA */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Berita Terkini */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#002147] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#f4a024]" /> Berita & Mading Terbaru
              </h3>
              <p className="text-xs text-slate-500">Informasi prestasi dan kegiatan literasi guru serta siswa</p>
            </div>
            <button 
              onClick={() => setActiveModule('blog')}
              className="text-xs text-[#002147] hover:text-[#f4a024] flex items-center gap-1 font-semibold transition-colors"
            >
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {news.length === 0 && (
              <div className="sm:col-span-2 bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-500">
                Belum ada berita yang dapat ditampilkan saat ini.
              </div>
            )}
            {news.map((item) => (
              <div 
                key={item.id}
                onClick={() => setActiveModule('blog')}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group flex flex-col justify-between shadow-xs"
              >
                <img
                  src={item.cover_image || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800'}
                  alt={item.title || 'Berita sekolah'}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800'; }}
                  className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-[#002147] mb-2">
                      {item.category}
                    </span>
                    <h4 className="text-sm font-bold text-[#002147] group-hover:text-[#f4a024] transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-4 pt-2 border-t border-slate-100">
                    <span>Oleh: {item.author_name}</span>
                    <span>{item.created_at}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agenda Kegiatan Terdekat */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#002147] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#f4a024]" /> Agenda Terdekat
              </h3>
              <p className="text-xs text-slate-500">Jadwal kegiatan akademik & acara</p>
            </div>
            <button 
              onClick={() => setActiveModule('agenda')}
              className="text-xs text-[#002147] hover:text-[#f4a024] flex items-center gap-1 font-semibold transition-colors"
            >
              Semua <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {agendas.length === 0 && (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-500">
                Belum ada agenda kegiatan yang terjadwal.
              </div>
            )}
            {agendas.map((ag) => {
              const tanggal = formatAgendaDate(ag.event_date);
              return (
              <div key={ag.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 items-center hover:border-slate-300 transition-colors shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#002147] text-[#f4a024] flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-200">{tanggal.month}</span>
                  <span className="text-lg font-black">{tanggal.day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#002147] truncate">{ag.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{ag.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {ag.location || '-'}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {ag.start_time || '-'}</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* FOOTER ala SMK Tunas Media (Deep Oxford Navy #002147) */}
      <footer className="bg-[#002147] text-white rounded-3xl p-8 sm:p-10 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5 text-white font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-[#f4a024] text-[#002147] flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              SMAN 1 HARAPAN BANGSA
            </div>
            <p className="text-slate-300 text-xs leading-relaxed max-w-md">
              Lembaga pendidikan menengah atas unggulan yang mengedepankan pembentukan budi pekerti, 
              keterampilan abad 21, pembelajaran digital modern, serta kemandirian siswa.
            </p>
            <div className="text-[11px] text-[#f4a024] font-semibold pt-2">
              Akreditasi A Unggul • NPSN: 20108921 • SK Pendirian: 421.3/SK/1998
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-white font-bold text-sm mb-3">Kontak & Lokasi</div>
            <div className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4 text-[#f4a024]" /> Jl. Pendidikan No. 45, Jakarta Selatan</div>
            <div className="flex items-center gap-2 text-slate-300"><Phone className="w-4 h-4 text-[#f4a024]" /> (021) 7890-1234 / 0812-3456-7890</div>
            <div className="flex items-center gap-2 text-slate-300"><Mail className="w-4 h-4 text-[#f4a024]" /> info@harapanbangsa.sch.id</div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-white font-bold text-sm mb-3">Akses Cepat Modul</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Ujian CBT', key: 'cbt' },
                { label: 'E-Rapor', key: 'erapor' },
                { label: 'Perpustakaan', key: 'library' },
                { label: 'Ekstrakurikuler', key: 'extracurricular' },
                { label: 'Konseling BK', key: 'counseling' },
                { label: 'PPDB Online', key: 'ppdb' },
                { label: 'Aplikasi APK', key: 'apk' }
              ].map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveModule(t.key)}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-[#f4a024] hover:text-[#002147] text-slate-300 text-[11px] transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} SMAN 1 Harapan Bangsa. All Rights Reserved. Terintegrasi PWA & CBT Secure System.
        </div>
      </footer>

    </div>
  );
}
