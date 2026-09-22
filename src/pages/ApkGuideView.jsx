import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, Code2, Globe, Sparkles, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ApkGuideView() {
  const { showToast } = useAuth();
  const [copiedSection, setCopiedSection] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    showToast('Kode berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedSection(null), 3000);
  };

  const capacitorConfig = `{
  "appId": "id.sch.sekolahapp",
  "appName": "Sekolah Super App & CBT",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "url": "http://IP_SERVER_SEKOLAH:5000",
    "cleartext": true
  }
}`;

  const manifestContent = `{
  "name": "Sekolah Super App & CBT",
  "short_name": "SekolahApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#16a34a",
  "icons": [
    {
      "src": "/icon.svg",
      "sizes": "192x192 512x512",
      "type": "image/svg+xml"
    }
  ]
}`;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase mb-2">
            <Smartphone className="w-3.5 h-3.5 animate-pulse" /> Panduan & Generator Menjadi APK Android
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900">Ubah Web Sekolah Menjadi Aplikasi APK HP</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Aplikasi web ini sudah dibangun dengan arsitektur **Progressive Web App (PWA)** standar Google. 
            Berikut 3 metode mudah untuk mengubahnya menjadi aplikasi APK Android di smartphone guru, siswa, dan orang tua.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center shrink-0">
          <Sparkles className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          PWA & WebAPK Ready
        </div>
      </div>

      {/* METODE 1: PALING MUDAH (WEBAPK LANGSUNG DI HP) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base">
            1
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Metode 1: WebAPK Instan (Paling Cepat Tanpa Koding)</h3>
            <p className="text-xs text-slate-500">Siswa & Guru cukup membuka link web di browser Google Chrome HP</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-emerald-400 text-sm">Langkah 1</div>
            <p>Buka alamat web sekolah ini di smartphone melalui browser <strong>Google Chrome</strong>.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-emerald-400 text-sm">Langkah 2</div>
            <p>Tekan tombol titik tiga <strong>(⋮)</strong> di pojok kanan atas Chrome, lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-emerald-400 text-sm">Langkah 3</div>
            <p>Otomatis ikon sekolah akan terpasang di menu HP seperti aplikasi APK native, berjalan <strong>fullscreen tanpa address bar browser</strong>!</p>
          </div>
        </div>
      </div>

      {/* METODE 2: PWABUILDER GOOGLE (EXPORT KE FILE .APK / .AAB PLAY STORE) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-base">
            2
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Metode 2: PWABuilder (Menghasilkan File .APK Asli)</h3>
            <p className="text-xs text-slate-500">Menggunakan alat resmi dari Microsoft & Google Trusted Web Activity (TWA)</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            1. Buka situs <strong className="text-emerald-400">https://www.pwabuilder.com</strong> di komputer.<br />
            2. Masukkan URL web sekolah Anda (misal: <code className="text-emerald-300 bg-slate-50 px-2 py-0.5 rounded">https://sekolahanda.sch.id</code>).<br />
            3. PWABuilder otomatis membaca file <code className="text-emerald-300 bg-slate-50 px-2 py-0.5 rounded">manifest.json</code> yang sudah kami sertakan.<br />
            4. Klik tombol <strong>"Build Android APK"</strong>.<br />
            5. File <strong>.apk</strong> dan <strong>.aab</strong> langsung terdownload dan siap dibagikan ke siswa via WhatsApp atau diunggah ke <strong>Google Play Store</strong>!
          </p>
        </div>
      </div>

      {/* METODE 3: CAPACITOR / ANDROID STUDIO WRAPPER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-base">
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
            <pre className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-400 overflow-x-auto">
{`# 1. Build aset frontend aplikasi
npm run build

# 2. Pasang Capacitor Android
npm install @capacitor/core @capacitor/cli @capacitor/android

# 3. Inisialisasi dan buka di Android Studio
npx cap init "SekolahApp" "id.sch.sekolahapp" --web-dir dist
npx cap add android
npx cap open android`}
            </pre>
            <button
              onClick={() => copyToClipboard(`npm run build\nnpm install @capacitor/core @capacitor/cli @capacitor/android\nnpx cap init "SekolahApp" "id.sch.sekolahapp" --web-dir dist\nnpx cap add android\nnpx cap open android`, 'cap')}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-semibold flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> {copiedSection === 'cap' ? 'Tersalin!' : 'Salin Perintah'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
