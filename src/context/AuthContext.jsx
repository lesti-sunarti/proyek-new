import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { roleCanAccess } from '../config/access';

const AuthContext = createContext();

export const STAFF_ACCOUNTS = [
  { role: 'kepala_sekolah', name: 'Dr. Raka Pradana, M.Pd.', title: 'Kepala Sekolah', badge: 'Kepala Sekolah', username: 'kepsek.raka', password: 'Kepsek!4826' },
  { role: 'kepala_tu', name: 'Nadia Kartika, S.E.', title: 'Kepala Tata Usaha', badge: 'Kepala TU', username: 'tu.nadia', password: 'TU!7319' },
  { role: 'kepala_perpus', name: 'Arya Kusuma, S.S.I.', title: 'Kepala Perpustakaan', badge: 'Kepala Perpustakaan', username: 'perpus.arya', password: 'Perpus!5482' },
  { role: 'kepala_bk', name: 'Rina Marlina, S.Psi.', title: 'Kepala Bimbingan Konseling', badge: 'Kepala BK', username: 'bk.rina', password: 'BK!6247' },
  { role: 'guru_walikelas', name: 'Drs. Budi Santoso, M.Pd.', title: 'Guru Matematika & Wali Kelas X-1', badge: 'Guru / Wali Kelas', username: 'wali.budi', password: 'Wali!3951' },
];

const GUEST = { id: null, role: 'publik', name: 'Pengunjung', title: 'Akses publik sekolah', badge: 'Akses Publik' };
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(GUEST);
  const [activeModule, setActiveModule] = useState('portal');
  const [toast, setToast] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [urgentNotice, setUrgentNotice] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(true);

  const isAuthenticated = currentUser.role !== 'publik';
  const isStaff = isAuthenticated && currentUser.role !== 'siswa' && currentUser.role !== 'ortu';
  const currentRole = currentUser.role;
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    window.setTimeout(() => setToast(null), 4000);
  }, []);
  const canAccess = useCallback((moduleKey) => {
    return roleCanAccess(currentUser.role, moduleKey);
  }, [currentUser.role]);
  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  const login = useCallback(async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Tidak dapat masuk');
      const accountInfo = STAFF_ACCOUNTS.find((account) => account.role === data.user.role);
      const user = { ...data.user, title: data.user.title || accountInfo?.title || data.user.role, badge: data.user.badge || accountInfo?.badge || data.user.role };
      setCurrentUser(user);
      sessionStorage.setItem('school-session', JSON.stringify(user));
      setIsLoginOpen(false);
      setActiveModule('portal');
      showToast(`Selamat datang, ${user.name}. Hak akses ${user.badge} telah aktif.`);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Login gagal. Coba kembali.' };
    }
  }, [showToast]);

  const logout = useCallback(() => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.removeItem('school-session');
    setCurrentUser(GUEST);
    setActiveModule('portal');
    setIsLoginOpen(false);
    showToast('Anda telah keluar. Akses kembali ke layanan publik.', 'info');
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me').then(async (response) => {
      if (!response.ok) throw new Error('Sesi tidak aktif');
      return response.json();
    }).then((data) => {
      if (!isMounted || !data?.user) return;
      setCurrentUser(data.user);
      sessionStorage.setItem('school-session', JSON.stringify(data.user));
    }).catch(() => {
      sessionStorage.removeItem('school-session');
      if (isMounted) setCurrentUser(GUEST);
    });
    return () => { isMounted = false; };
  }, []);

  const checkServerOnline = useCallback(async () => {
    try {
      const controller = new AbortController();
      const tid = window.setTimeout(() => controller.abort(), 3500);
      const res = await fetch('/api/health', { signal: controller.signal });
      window.clearTimeout(tid);
      setIsServerOnline(res.ok);
      return res.ok;
    } catch { setIsServerOnline(false); return false; }
  }, []);

  useEffect(() => {
    checkServerOnline();
    const interval = window.setInterval(checkServerOnline, 6000);
    return () => window.clearInterval(interval);
  }, [checkServerOnline]);

  useEffect(() => {
    fetch('/api/broadcasts').then((res) => res.json()).then((data) => {
      if (!Array.isArray(data)) return;
      setBroadcasts(data);
      const urgent = data.find((item) => item.is_urgent === 1);
      if (urgent) setUrgentNotice(urgent);
    }).catch(() => {});
  }, []);

  const value = useMemo(() => ({
    currentRole, currentUser, isAuthenticated, isStaff, activeModule, setActiveModule, toast, showToast,
    broadcasts, urgentNotice, setUrgentNotice, isServerOnline, checkServerOnline, canAccess,
    login, logout, isLoginOpen, openLogin, closeLogin,
  }), [activeModule, broadcasts, canAccess, checkServerOnline, closeLogin, currentRole, currentUser, isAuthenticated, isLoginOpen, isStaff, login, logout, showToast, toast, urgentNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
