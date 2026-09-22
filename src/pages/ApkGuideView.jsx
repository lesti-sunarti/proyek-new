import React, { useState } from 'react';
import { Smartphone, CheckCircle2, Code2, Globe, Sparkles, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Perintah Capacitor yang ditampilkan dan disalin harus identik agar pengguna tidak kebingungan.
const CAPACITOR_COMMANDS = `# 1. Build aset frontend aplikasi
npm run build

# 2. Pasang Capacitor Android
npm install @capacitor/core @capacitor/cli @capacitor/android

# 3. Inisialisasi dan buka di Android Studio
npx cap init "SekolahApp" "id.sch.sekolahapp" --web-dir dist
npx cap add android
npx cap open android`;

// Contoh capacitor.config.json: ganti IP_SERVER_SEKOLAH dengan alamat server backend (port 5000) yang bisa dijangkau HP.
const CAPACITOR_CONFIG = `{
  "appId": "id.sch.sekolahapp",
  "appName": "Sekolah Super App & CBT",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "url": "http://IP_SERVER_SEKOLAH:5000",
    "cleartext": true
  }
}`;

// Sinkron dengan public/manifest.json yang benar-benar dilayani di /manifest.json.
const MANIFEST_CONTENT = `{
  "name": "Sekolah Super App & CBT",
  "short_name": "SekolahApp",
  "description": "Sistem Informasi Manajemen Sekolah Terpadu & CBT Anti-Nyontek",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#16a34a",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon.svg",
      "sizes": "192x192 512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}`;

export default function ApkGuideView() {
  const { showToast } = useAuth();
  const [copiedSection, setCopiedSection] = useState(null);

  const copyToClipboard = async (text, key) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback untuk browser tanpa Clipboard API atau saat diakses lewat HTTP biasa.
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) throw new Error('Clipboard tidak tersedia');
      }
      setCopiedSection(key);
      showToast('Teks berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedSection(null), 3000);
    } catch {
      showToast('Clipboard tidak dapat diakses oleh browser. Silakan salin teks secara manual.', 'error');
    }
  };

  const CopyButton = ({ text, sectionKey, label = 'Salin' }) => (
    <button
      type="button"
      onClick={() => copyToClipboard(text, sectionKey)}
      className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-semibold flex items-center gap-1"
    >
      <Copy className="w-3 h-3" /> {copiedSection === sectionKey ? 'Tersalin!' : label}
    </button>
  );

  return (
    <div className="space-y-8 pb-12">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <Smartphone className="w-3.5 h-3.5 animate-pulse" /> Panduan & Generator Menjadi APK Android
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white">Ubah Web Sekolah Menjadi Aplikasi APK HP</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Aplikasi web ini sudah dibangun dengan arsitektur <strong className="text-white">Progressive Web App (PWA)</strong> standar Google.
            Berikut 3 metode mudah untuk mengubahnya menjadi aplikasi APK Android di smartphone guru, siswa, dan orang tua.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center shrink-0">
          <Sparkles className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          PWA & WebAPK Ready
        </div>
      </div>

      {/* CATATAN PENTING */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <ShieldCheck className="w-4 h-4" /> Syarat agar instalasi berhasil
        </div>
        <ul className="mt-3 space-y-2 text-xs text-amber-900/90">
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-700" /><span>Fitur "Install Aplikasi" (WebAPK) dan PWABuilder hanya bekerja bila web sekolah diakses melalui <strong>HTTPS</strong> (atau <code className="bg-white px-1 rounded">localhost</code> saat uji coba).</span></li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-700" /><span>Berkas <a href="/manifest.json" target="_blank" rel="noopener noreferrer" className="font-semibold underline">manifest.json</a> dan ikon <a href="/icon.svg" target="_blank" rel="noopener noreferrer" className="font-semibold underline">icon.svg</a> sudah tersedia di folder <code className="bg-white px-1 rounded">public/</code> dan ikut terlayani saat produksi.</span></li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-700" /><span>Pada metode Capacitor, ganti <code className="bg-white px-1 rounded">IP_SERVER_SEKOLAH</code> dengan alamat server backend (port 5000) yang dapat dijangkau dari jaringan HP.</span></li>
        </ul>
      </div>

      {/* METODE 1: PALING MUDAH (WEBAPK LANGSUNG DI HP) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-base">
            1
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Metode 1: WebAPK Instan (Paling Cepat Tanpa Koding)</h3>
            <p className="text-xs text-slate-500">Siswa & Guru cukup membuka link web di browser Google Chrome HP</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-emerald-700 text-sm">Langkah 1</div>
            <p>Buka alamat web sekolah ini di smartphone melalui browser <strong>Google Chrome</strong>.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-emerald-700 text-sm">Langkah 2</div>
            <p>Tekan tombol titik tiga <strong>(⋮)</strong> di pojok kanan atas Chrome, lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-emerald-700 text-sm">Langkah 3</div>
            <p>Otomatis ikon sekolah akan terpasang di menu HP seperti aplikasi APK native, berjalan <strong>fullscreen tanpa address bar browser</strong>!</p>
          </div>
        </div>
      </div>

      {/* METODE 2: PWABUILDER (EXPORT KE FILE .APK / .AAB PLAY STORE) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-base">
            2
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Metode 2: PWABuilder (Menghasilkan File .APK Asli)</h3>
            <p className="text-xs text-slate-500">Menggunakan alat resmi dari Microsoft & Google Trusted Web Activity (TWA)</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            1. Buka situs{' '}
            <a href="https://www.pwabuilder.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-emerald-700 underline hover:text-emerald-900">
              https://www.pwabuilder.com <ExternalLink className="w-3 h-3" />
            </a>{' '}
            di komputer.<br />
            2. Masukkan URL web sekolah Anda (misal: <code className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">https://sekolahanda.sch.id</code>).<br />
            3. PWABuilder otomatis membaca file <code className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">manifest.json</code> yang sudah kami sertakan (isi lengkapnya di bawah).<br />
            4. Klik tombol <strong>"Build Android APK"</strong>.<br />
            5. File <strong>.apk</strong> dan <strong>.aab</strong> langsung terdownload dan siap dibagikan ke siswa via WhatsApp atau diunggah ke <strong>Google Play Store</strong>!
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Globe className="w-4 h-4 text-blue-700" /> Isi berkas <code className="bg-slate-100 px-1.5 py-0.5 rounded">public/manifest.json</code>
          </div>
          <div className="relative">
            <pre className="p-4 pr-28 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-200 overflow-x-auto">
{MANIFEST_CONTENT}
            </pre>
            <CopyButton text={MANIFEST_CONTENT} sectionKey="manifest" label="Salin Manifest" />
          </div>
        </div>
      </div>

      {/* METODE 3: CAPACITOR / ANDROID STUDIO WRAPPER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-base">
            3
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Metode 3: Build Native APK dengan Capacitor CLI</h3>
            <p className="text-xs text-slate-500">Untuk developer yang ingin compile langsung menjadi APK menggunakan Android Studio</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Jalankan perintah berikut di folder proyek untuk mengemas aplikasi menjadi project Android:
          </p>

          <div className="relative">
            <pre className="p-4 pr-32 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-200 overflow-x-auto">
{CAPACITOR_COMMANDS}
            </pre>
            <CopyButton text={CAPACITOR_COMMANDS} sectionKey="cap" label="Salin Perintah" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Code2 className="w-4 h-4 text-amber-700" /> Contoh <code className="bg-slate-100 px-1.5 py-0.5 rounded">capacitor.config.json</code> agar aplikasi memuat server sekolah
            </div>
            <div className="relative">
              <pre className="p-4 pr-28 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-200 overflow-x-auto">
{CAPACITOR_CONFIG}
              </pre>
              <CopyButton text={CAPACITOR_CONFIG} sectionKey="capconfig" label="Salin Config" />
            </div>
            <p className="text-[11px] text-slate-500">
              Setelah menyimpan config, jalankan <code className="bg-slate-100 px-1 rounded">npx cap sync android</code> lalu build APK dari menu <strong>Build &gt; Build Bundle(s) / APK(s)</strong> di Android Studio.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
