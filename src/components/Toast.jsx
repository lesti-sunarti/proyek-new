import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast() {
  const { toast } = useAuth();
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm max-w-md backdrop-blur-md
        ${isError 
          ? 'bg-rose-50 text-rose-900 border-rose-200' 
          : isInfo 
            ? 'bg-blue-50 text-blue-900 border-blue-200' 
            : 'bg-white text-emerald-900 border-emerald-200 shadow-emerald-600/10'
        }
      `}>
        {isError ? (
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
        ) : isInfo ? (
          <Info className="w-5 h-5 text-blue-600 shrink-0" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        )}
        <div className="flex-1 font-medium">{toast.message}</div>
      </div>
    </div>
  );
}
