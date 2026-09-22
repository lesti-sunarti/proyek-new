import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CircleCheck,
  Clock3,
  CreditCard,
  FileText,
  LifeBuoy,
  Mail,
  MessageCircle,
  QrCode,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const quickGuides = [
  { title: 'PPDB Online', detail: 'Pendaftaran, nomor registrasi, dan status kelulusan.', module: 'ppdb', icon: FileText },
  { title: 'Pembayaran SPP', detail: 'Cek tagihan serta unduh bukti pembayaran.', module: 'spp', icon: CreditCard },
  { title: 'Presensi', detail: 'Panduan scan QR dan perbaikan data kehadiran.', module: 'attendance', icon: QrCode },
  { title: 'E-Learning', detail: 'Akses materi, tugas, dan ruang diskusi kelas.', module: 'elearning', icon: BookOpen },
];

const faqs = [
  { question: 'Bagaimana jika data kehadiran saya belum masuk?', answer: 'Buka menu Absensi untuk memastikan riwayat scan. Jika belum ada, kirim tiket dengan waktu scan dan jenis presensi agar petugas dapat memeriksa log.' },
  { question: 'Di mana saya dapat melihat tagihan dan bukti pembayaran SPP?', answer: 'Gunakan menu Pembayaran SPP. Tagihan aktif, status pembayaran, dan tombol cetak kuitansi tersedia di sana.' },
  { question: 'Siapa yang dapat mengubah data siswa atau guru?', answer: 'Perubahan data induk dilakukan oleh operator atau tata usaha melalui modul Buku Induk agar riwayat administrasi tetap akurat.' },
  { question: 'Kapan tiket bantuan akan ditanggapi?', answer: 'Tiket masuk diteruskan ke petugas terkait pada jam kerja. Prioritas tinggi digunakan untuk kendala layanan yang menghambat kegiatan belajar.' },
];

const initialForm = { requester_name: '', requester_role: 'siswa', category: 'Akun & akses', subject: '', message: '', priority: 'normal' };

export default function SupportCenterView() {
  const { currentRole, currentUser, canAccess, setActiveModule, showToast } = useAuth();
  const canManageTickets = canAccess('support_admin');
  const [form, setForm] = useState(() => ({ ...initialForm, requester_name: currentUser?.name || '', requester_role: currentRole || 'siswa' }));
  const [openFaq, setOpenFaq] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm((previous) => ({ ...previous, requester_name: currentUser?.name || previous.requester_name, requester_role: currentRole || previous.requester_role }));
  }, [currentRole, currentUser]);

  useEffect(() => {
    if (!canManageTickets) {
      setTickets([]);
      return;
    }
    fetch('/api/support/tickets?limit=10')
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]));
  }, [canManageTickets]);

  const updateField = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const submitTicket = async (event) => {
    event.preventDefault();
    if (!form.requester_name.trim() || !form.subject.trim() || !form.message.trim()) {
      showToast('Nama, topik, dan detail kendala perlu diisi.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || 'Tiket belum dapat dikirim.');
      if (result.ticket) setTickets((previous) => [result.ticket, ...previous]);
      setForm(() => ({ ...initialForm, requester_name: currentUser?.name || '', requester_role: currentRole || 'siswa' }));
      showToast(result.ticket?.ticket_number ? `Tiket ${result.ticket.ticket_number} berhasil dibuat.` : (result.message || 'Tiket berhasil dibuat.'), 'success');
    } catch (error) {
      showToast(error.message || 'Koneksi layanan bantuan sedang bermasalah.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-7 pb-12">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
              <LifeBuoy className="h-4 w-4" /> Pusat layanan
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#002147] sm:text-4xl">Bantuan yang jelas, saat dibutuhkan.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Temukan panduan layanan sekolah, hubungi petugas, atau kirimkan tiket kendala agar dapat ditangani sesuai kebutuhan.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <div className="text-2xl font-semibold text-[#002147]">08.00–15.30</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Jam layanan</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-2xl font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Aktif</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Status sistem</div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500 sm:px-8">Untuk keadaan mendesak terkait keselamatan siswa, silakan hubungi pihak sekolah secara langsung.</div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[#002147]">Akses yang paling sering dicari</h3>
            <p className="mt-1 text-xs text-slate-500">Langsung menuju layanan tanpa perlu menelusuri menu.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickGuides.map((guide) => {
            const Icon = guide.icon;
            return (
              <button key={guide.module} onClick={() => setActiveModule(guide.module)} className="surface-card group rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#002147]"><Icon className="h-4 w-4" /></span>
                <span className="block text-sm font-bold text-[#002147]">{guide.title}</span>
                <span className="mt-1 block min-h-10 text-xs leading-5 text-slate-500">{guide.detail}</span>
                <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-700">Buka layanan <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)]">
        <form onSubmit={submitTicket} className="surface-card rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#002147] text-[#f4a024]"><Send className="h-4 w-4" /></span>
            <div>
              <h3 className="text-xl font-semibold text-[#002147]">Kirim tiket bantuan</h3>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">Sertakan informasi yang cukup agar petugas dapat menindaklanjuti tanpa bolak-balik bertanya.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">Nama pelapor
              <input name="requester_name" value={form.requester_name} onChange={updateField} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/10" placeholder="Nama lengkap" />
            </label>
            <label className="block text-xs font-semibold text-slate-700">Kategori
              <select name="category" value={form.category} onChange={updateField} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/10">
                <option>Akun & akses</option><option>Akademik</option><option>Keuangan & SPP</option><option>Presensi</option><option>Teknis aplikasi</option><option>Lainnya</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">Prioritas
              <select name="priority" value={form.priority} onChange={updateField} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/10">
                <option value="normal">Normal</option><option value="tinggi">Tinggi</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">Topik kendala
              <input name="subject" value={form.subject} onChange={updateField} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/10" placeholder="Contoh: status pembayaran belum berubah" />
            </label>
          </div>
          <label className="mt-4 block text-xs font-semibold text-slate-700">Detail kendala
            <textarea name="message" value={form.message} onChange={updateField} rows="4" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/10" placeholder="Jelaskan apa yang terjadi, kapan terjadi, serta menu yang digunakan." />
          </label>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span className="text-[11px] text-slate-500">Tiket ini tersimpan di layanan sekolah.</span>
            <button disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-[#002147] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0b315f] disabled:cursor-not-allowed disabled:opacity-60">
              <Send className="h-3.5 w-3.5" /> {isSubmitting ? 'Mengirim…' : 'Kirim tiket'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="surface-card rounded-xl p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-[#002147]">Pertanyaan umum</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {faqs.map((faq, index) => (
                <div key={faq.question}>
                  <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-slate-700">
                    <span>{faq.question}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === index && <p className="pb-4 text-xs leading-5 text-slate-500">{faq.answer}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#002147] bg-[#002147] p-5 text-white sm:p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-300"><ShieldCheck className="h-4 w-4" /> Kanal resmi</div>
            <p className="mt-3 text-sm leading-6 text-slate-200">Gunakan kanal sekolah untuk data akademik dan administrasi agar informasi tetap tercatat dengan benar.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <a href="mailto:info@harapanbangsa.sch.id" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/15"><Mail className="h-4 w-4 text-[#f4a024]" /> Email sekolah</a>
              <a href="tel:+622178901234" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/15"><MessageCircle className="h-4 w-4 text-[#f4a024]" /> Hubungi TU</a>
            </div>
          </div>
        </div>
      </section>

      {tickets.length > 0 && (
        <section className="surface-card overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h3 className="text-xl font-semibold text-[#002147]">Tiket terbaru</h3><p className="mt-0.5 text-xs text-slate-500">Riwayat tiket yang tercatat di sistem demo.</p></div><Clock3 className="h-5 w-5 text-slate-400" /></div>
          <div className="divide-y divide-slate-100">
            {tickets.slice(0, 5).map((ticket) => <div key={ticket.id} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#002147]">{ticket.ticket_number}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{ticket.category}</span></div><p className="mt-1 truncate font-semibold text-slate-700">{ticket.subject}</p><p className="mt-0.5 text-xs text-slate-500">{ticket.requester_name}</p></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800"><CircleCheck className="h-3 w-3" /> {ticket.status}</span></div>)}
          </div>
        </section>
      )}
    </div>
  );
}
