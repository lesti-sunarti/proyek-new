import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer } from 'lucide-react';

export default function QRModal({ isOpen, onClose, title, value, subtitle }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen && canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error(err);
      });
    }
  }, [isOpen, value]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `QR-${value}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-center relative shadow-2xl animate-in zoom-in-95 duration-150">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mb-4">{subtitle}</p>}

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block shadow-inner mb-4">
          <canvas ref={canvasRef} className="mx-auto rounded-lg shadow-xs" />
        </div>

        <div className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-200/70 inline-block mb-5">
          {value}
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" /> Download PNG
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
          >
            <Printer className="w-4 h-4" /> Cetak
          </button>
        </div>
      </div>
    </div>
  );
}
