import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    // Clear any stale caches and hard reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8fafc] text-[#334155] flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-[#f4a024] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-[#f4a024]" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#002147]">Memuat Ulang Aplikasi</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Terdapat pembaruan sistem terbaru. Klik tombol di bawah untuk menyegarkan cache browser dan memuat versi terbaru aplikasi sekolah.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] font-mono text-slate-600 max-h-24 overflow-y-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#002147] hover:bg-[#0a2f5c] text-white text-xs font-bold shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4 text-[#f4a024]" /> Segarkan Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
