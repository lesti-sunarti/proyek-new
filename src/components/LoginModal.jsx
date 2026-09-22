import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, LogIn, ShieldCheck, UserRound, X } from 'lucide-react';
import { STAFF_ACCOUNTS, useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { isLoginOpen, closeLogin, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoginOpen) return;
    setError('');
    setPassword('');
  }, [isLoginOpen]);

  if (!isLoginOpen) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);
    if (!result.success) setError(result.message);
  };

  const chooseAccount = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" onMouseDown={closeLogin}>
      <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Masuk ke layanan staf" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#002147] text-[#f4a024]"><ShieldCheck className="h-5 w-5" /></span>
            <div><h2 className="text-base font-bold text-[#002147]">Masuk layanan staf</h2><p className="text-xs text-slate-500">Akses hanya terbuka sesuai jabatan Anda.</p></div>
          </div>
          <button onClick={closeLogin} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup login"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid md:grid-cols-[.95fr_1.25fr]">
          <form onSubmit={submit} className="border-b border-slate-100 p-5 sm:p-7 md:border-b-0 md:border-r">
            <div className="mb-5"><h3 className="font-semibold text-slate-800">Gunakan akun Anda</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Menu administrasi, akademik, dan kesiswaan akan menyesuaikan peran akun.</p></div>
            <label className="mb-3 block text-xs font-bold text-slate-600">Username
              <span className="relative mt-1.5 block"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="contoh: kepsek.raka" className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/10" /></span>
            </label>
            <label className="block text-xs font-bold text-slate-600">Password
              <span className="relative mt-1.5 block"><KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Masukkan password" className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-10 text-sm outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/10" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700" aria-label="Tampilkan atau sembunyikan password">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span>
            </label>
            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
            <button disabled={isSubmitting} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#002147] text-sm font-bold text-white transition hover:bg-[#0a2f5c] disabled:cursor-wait disabled:opacity-70"><LogIn className="h-4 w-4" />{isSubmitting ? 'Memeriksa akun…' : 'Masuk ke sistem'}</button>
            <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-slate-400"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />Akun demo tersimpan hanya di perangkat ini. Ubah kredensial sebelum penggunaan nyata.</p>
          </form>
          <div className="bg-slate-50/70 p-5 sm:p-7"><div className="mb-4"><h3 className="font-semibold text-slate-800">Akun demo siap pakai</h3><p className="mt-1 text-xs text-slate-500">Klik salah satu kartu untuk mengisi username dan password otomatis.</p></div>
            <div className="grid gap-2 sm:grid-cols-2">{STAFF_ACCOUNTS.map((account) => <button key={account.role} type="button" onClick={() => chooseAccount(account)} className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-[#f4a024] hover:shadow-md"><span className="block text-xs font-bold text-[#002147]">{account.badge}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{account.name}</span><span className="mt-2 block rounded-md bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-600">{account.username} · {account.password}</span></button>)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
