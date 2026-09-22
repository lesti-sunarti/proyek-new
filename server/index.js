import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'url';
import { db, hashSessionToken, initDatabase, transaction, verifyPassword } from './db.js';
import { seedDatabase } from './seed.js';
import { roleCanAccess } from '../src/config/access.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure db initialized, lalu isi data demo untuk tabel yang masih kosong
// agar aplikasi langsung siap dicoba pada instalasi baru (idempoten).
initDatabase();
seedDatabase({ verbose: false });

// ==========================================
// HELPER UMUM (tanggal lokal, validasi, error DB, profil sesi)
// ==========================================
const LATE_CUTOFF = '07:15:00';
const pad2 = (value) => String(value).padStart(2, '0');
// Tanggal & jam memakai zona waktu lokal server (bukan UTC) agar presensi
// pagi hari tidak tercatat pada tanggal sebelumnya.
function todayStr(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function timeStr(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}
function nowStamp(date = new Date()) {
  return `${todayStr(date)} ${timeStr(date)}`;
}
function cleanText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}
function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}
function isStaffRole(role) {
  return Boolean(role) && !['siswa', 'ortu', 'publik'].includes(role);
}
const UNIQUE_LABELS = {
  'students.nisn': 'NISN', 'students.nis': 'NIS', 'teachers.nip': 'NIP', 'subjects.code': 'kode mata pelajaran',
  'library_books.isbn': 'ISBN', 'pemilos_voters.voter_id': 'NIS/ID pemilih', 'pemilos_candidates.candidate_number': 'nomor urut paslon',
  'walikelas_students.nis': 'NIS', 'walikelas_inventory.item_code': 'kode barang', 'walikelas_piket.day_name': 'hari piket',
  'walikelas_seating.desk_number': 'nomor kursi', 'wallets.card_number': 'nomor kartu', 'users.username': 'username',
  'staff_accounts.username': 'username', 'career_applications.opportunity_id, career_applications.applicant_name': 'nama pendaftar pada peluang ini',
  'walikelas_attendance.date, walikelas_attendance.student_id': 'presensi siswa pada tanggal ini',
  'walikelas_grades.student_id, walikelas_grades.subject_name': 'nilai siswa untuk mata pelajaran ini',
};
// Menerjemahkan error constraint SQLite menjadi respons HTTP yang ramah
// (409 untuk duplikat, 400 untuk data tidak valid) alih-alih 500 generik.
function dbErrorResponse(err) {
  const message = String(err?.message || '');
  const unique = message.match(/UNIQUE constraint failed: (.+)$/i);
  if (unique) {
    const key = unique[1].trim();
    const label = UNIQUE_LABELS[key] || key.split('.').pop();
    return { status: 409, message: `Data dengan ${label} yang sama sudah terdaftar.` };
  }
  if (/FOREIGN KEY constraint failed/i.test(message)) return { status: 400, message: 'Data rujukan (misalnya siswa/kelas) tidak ditemukan.' };
  if (/CHECK constraint failed|NOT NULL constraint failed/i.test(message)) return { status: 400, message: 'Data yang dikirim tidak valid atau belum lengkap.' };
  return null;
}
function sendError(res, err, prefix = 'Terjadi kesalahan pada server') {
  const mapped = dbErrorResponse(err);
  if (mapped) return res.status(mapped.status).json({ success: false, message: `${prefix}: ${mapped.message}` });
  console.error(`${prefix}:`, err);
  return res.status(500).json({ success: false, message: `${prefix}: ${err?.message || 'kesalahan tidak diketahui'}` });
}
function getLinkedStudent(studentId) {
  if (!studentId) return null;
  return db.prepare(`
    SELECT s.id, s.name, s.nisn, s.nis, s.qr_code, s.class_id, s.parent_name, s.parent_phone, c.name AS class_name
    FROM students s LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.id = ?
  `).get(studentId) || null;
}
// Profil lengkap pemilik sesi (nama, jabatan, siswa terkait) untuk kebutuhan
// dompet, kuitansi, dan pembatasan data per akun.
function getSessionProfile(auth) {
  if (!auth) return null;
  if (auth.accountType === 'staff') {
    const staff = db.prepare('SELECT id, username, role, name, title, badge FROM staff_accounts WHERE id = ?').get(auth.id);
    return staff ? { ...staff, accountType: 'staff', student: null } : null;
  }
  const user = db.prepare('SELECT id, username, role, name, email, phone, avatar, related_student_id FROM users WHERE id = ?').get(auth.id);
  return user ? { ...user, accountType: 'user', student: getLinkedStudent(user.related_student_id) } : null;
}
function withLateFlag(rows) {
  return rows.map((row) => ({
    ...row,
    is_late: row.user_type === 'siswa' && row.type === 'masuk' && row.status === 'hadir' && String(row.time || '') > LATE_CUTOFF ? 1 : 0,
  }));
}

const app = express();
const PORT = process.env.PORT || 5000;

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const loginAttempts = new Map();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');
  next();
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  const entry = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function getSessionToken(req) {
  const authorization = req.headers.authorization || '';
  if (authorization.startsWith('Bearer ')) return authorization.slice(7);
  return readCookie(req, 'sekolah_session');
}

function writeAuditLog({ actor, action, resource, status = 'success', req, metadata = null }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (actor_id, actor_username, actor_role, action, resource, status, request_method, request_path, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(actor?.id || null, actor?.username || null, actor?.role || null, action, resource, status, req?.method || null, req?.path || null, metadata ? JSON.stringify(metadata) : null, new Date().toISOString());
  } catch (error) { console.error('Audit log error:', error.message); }
}

function getAuthenticatedAccount(req) {
  const token = getSessionToken(req);
  if (!token) return null;
  const now = new Date().toISOString();
  const session = db.prepare('SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > ?').get(hashSessionToken(token), now);
  if (!session) return null;
  db.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?').run(now, session.id);
  return { id: session.account_id, username: session.username, role: session.role, accountType: session.account_type };
}

function requireAuth(req, res, next) {
  const account = getAuthenticatedAccount(req);
  if (!account) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Silakan masuk untuk mengakses layanan ini.' });
  req.auth = account;
  next();
}

const routeModules = [
  ['/api/attendance', 'attendance'], ['/api/cbt', 'cbt'], ['/api/academic', 'academic'], ['/api/spp', 'spp'],
  ['/api/master', 'buku_induk'], ['/api/buku_induk', 'buku_induk'], ['/api/finance', 'finance'], ['/api/payroll', 'payroll'],
  ['/api/violations', 'violations'], ['/api/archives', 'archive'], ['/api/elearning', 'elearning'], ['/api/erapor', 'erapor'],
  ['/api/library', 'library'], ['/api/extracurriculars', 'extracurricular'], ['/api/counseling', 'counseling'],
  ['/api/feedback', 'feedback'], ['/api/uks', 'uks'], ['/api/wallet', 'topup'], ['/api/canteen', 'kantin'],
  ['/api/pemilos', 'pemilos'], ['/api/walikelas', 'walikelas'], ['/api/system/audit-log', 'audit'],
  ['/api/blogs', 'broadcast'], ['/api/agenda', 'broadcast'], ['/api/broadcasts', 'broadcast'],
  ['/api/gallery', 'broadcast'], ['/api/alumni', 'broadcast'], ['/api/careers', 'career'],
  ['/api/ortu', 'ortu_dashboard'], ['/api/ppdb', 'ppdb_admin'], ['/api/support', 'support_admin'],
];

function moduleForPath(pathname) {
  return routeModules.find(([prefix]) => pathname.startsWith(prefix))?.[1] || null;
}

function isPublicApiRequest(req) {
  if (req.method === 'GET' && ['/api/health', '/api/public/stats', '/api/blogs', '/api/agenda', '/api/broadcasts', '/api/gallery', '/api/alumni', '/api/careers/opportunities'].includes(req.path)) return true;
  return (req.method === 'POST' && ['/api/ppdb', '/api/ppdb/register', '/api/support/tickets'].includes(req.path));
}

function apiAccessGate(req, res, next) {
  // Saat middleware dipasang pada /api, req.path tidak lagi memuat prefix /api.
  // originalUrl dipakai agar pencocokan rute publik dan permission konsisten.
  const apiPath = req.originalUrl.split('?')[0];
  const requestForAccess = { ...req, path: apiPath };
  if (isPublicApiRequest(requestForAccess)) return next();
  const account = getAuthenticatedAccount(req);
  if (!account) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Silakan masuk untuk mengakses layanan ini.' });
  const moduleKey = moduleForPath(apiPath);
  if (moduleKey && !roleCanAccess(account.role, moduleKey)) {
    writeAuditLog({ actor: account, action: 'access_denied', resource: moduleKey, status: 'denied', req });
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Akun Anda tidak memiliki hak akses untuk layanan ini.' });
  }
  req.auth = account;
  if (moduleKey === 'counseling' && req.method === 'GET') writeAuditLog({ actor: account, action: 'view_sensitive_data', resource: moduleKey, req });
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 500) writeAuditLog({ actor: account, action: req.method.toLowerCase(), resource: moduleKey || req.path, status: res.statusCode < 400 ? 'success' : 'failed', req });
    });
  }
  next();
}

// Static uploads folder
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Static pemilos folder from public/pemilos
const publicPemilosDir = path.resolve(__dirname, '../public/pemilos');
if (fs.existsSync(publicPemilosDir)) {
  app.use('/pemilos', express.static(publicPemilosDir));
}

// Health check dipasang sebelum gerbang akses agar indikator koneksi di
// antarmuka berfungsi baik pada mode pengembangan (Vite proxy) maupun produksi.
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', serverTime: new Date().toISOString() });
});

// Universal File Upload Endpoint (Base64 -> Local File in uploads/)
app.post('/api/upload', requireAuth, (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, message: 'Tidak ada data file gambar' });
    }

    let ext;
    let buffer;
    const matches = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) return res.status(400).json({ success: false, message: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.' });
    const mime = matches[1].toLowerCase();
    ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
    buffer = Buffer.from(matches[2], 'base64');
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) return res.status(400).json({ success: false, message: 'Ukuran file maksimal 5 MB.' });

    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const cleanFilename = filename ? path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_') : `foto_${timestamp}`;
    const safeName = `${timestamp}_${rand}_${cleanFilename.endsWith(ext) ? cleanFilename : cleanFilename + ext}`;
    const targetPath = path.join(uploadDir, safeName);

    fs.writeFileSync(targetPath, buffer);

    const fileUrl = `/uploads/${safeName}`;
    res.json({ success: true, url: fileUrl, filename: safeName });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengunggah foto: ' + error.message });
  }
});

// ==========================================
// 1. AUTH & ROLE SWITCHER ENDPOINTS
// ==========================================
function loginRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let attempt = loginAttempts.get(key);
  if (attempt && now - attempt.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    attempt = null;
  }
  if (attempt && attempt.count >= MAX_LOGIN_ATTEMPTS) return res.status(429).json({ success: false, message: 'Terlalu banyak percobaan masuk. Coba kembali dalam beberapa menit.' });
  req.loginAttemptKey = key;
  next();
}

function recordLoginFailure(req) {
  const key = req.loginAttemptKey || req.ip || req.socket.remoteAddress || 'unknown';
  const current = loginAttempts.get(key);
  loginAttempts.set(key, current ? { startedAt: current.startedAt, count: current.count + 1 } : { startedAt: Date.now(), count: 1 });
}

function createSession(account, accountType) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();
  db.prepare(`
    INSERT INTO auth_sessions (token_hash, account_type, account_id, username, role, expires_at, last_seen_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(hashSessionToken(token), accountType, account.id, account.username, account.role, expiresAt, now.toISOString(), now.toISOString());
  return { token, expiresAt };
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sekolah_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`);
}

app.post('/api/auth/login', loginRateLimit, (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
  }

  const staff = db.prepare(`
    SELECT id, username, password_hash, role, name, title, badge
    FROM staff_accounts
    WHERE username = ? AND status = 'aktif'
  `).get(username);
  if (staff && verifyPassword(password, staff.password_hash)) {
    loginAttempts.delete(req.loginAttemptKey);
    const session = createSession(staff, 'staff');
    setSessionCookie(res, session.token);
    const { password_hash, ...safeUser } = staff;
    writeAuditLog({ actor: safeUser, action: 'login', resource: 'authentication', req });
    return res.json({ success: true, user: safeUser, expiresAt: session.expiresAt });
  }

  // Kompatibilitas dengan akun demo lama yang masih memakai tabel users.
  const user = db.prepare('SELECT id, username, password_hash, role, name, email, phone, avatar, related_student_id FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    recordLoginFailure(req);
    writeAuditLog({ actor: { username, role: 'unknown' }, action: 'login', resource: 'authentication', status: 'failed', req });
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }
  const session = createSession(user, 'user');
  loginAttempts.delete(req.loginAttemptKey);
  setSessionCookie(res, session.token);
  const { password_hash, ...safeUser } = user;
  safeUser.student = getLinkedStudent(user.related_student_id);
  writeAuditLog({ actor: safeUser, action: 'login', resource: 'authentication', req });
  res.json({ success: true, user: safeUser, expiresAt: session.expiresAt });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const profile = getSessionProfile(req.auth);
  if (!profile) return res.status(401).json({ success: false, code: 'SESSION_INVALID', message: 'Sesi tidak lagi valid.' });
  const { accountType, ...user } = profile;
  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  const account = getAuthenticatedAccount(req);
  const token = getSessionToken(req);
  if (token) db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashSessionToken(token));
  if (account) writeAuditLog({ actor: account, action: 'logout', resource: 'authentication', req });
  res.setHeader('Set-Cookie', 'sekolah_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ success: true });
});

// Semua endpoint berikut memerlukan sesi aktif; daftar endpoint publik dipilih secara eksplisit.
app.use('/api', apiAccessGate);

// ==========================================
// 2. WEBSITE SEKOLAH & STATS (MODUL 1)
// ==========================================
app.get('/api/public/stats', (req, res) => {
  const studentCount = db.prepare("SELECT COUNT(*) as count FROM students WHERE status = 'aktif'").get().count;
  const teacherCount = db.prepare("SELECT COUNT(*) as count FROM teachers WHERE status = 'Aktif'").get().count;
  const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get().count;
  const alumniCount = db.prepare('SELECT COUNT(*) as count FROM alumni').get().count;
  const examCount = db.prepare('SELECT COUNT(*) as count FROM cbt_exams').get().count;
  res.json({
    students: studentCount || 850,
    teachers: teacherCount || 48,
    classes: classCount || 24,
    alumni: (alumniCount || 0) + 1240,
    exams: examCount || 5,
    accreditation: 'A (Unggul 98/100)'
  });
});

// ==========================================
// 3. ABSENSI DUAL MODE & NOTIFIKASI ORTU (MODUL 2)
// ==========================================
app.get('/api/attendance/today', (req, res) => {
  const today = todayStr();
  const logs = db.prepare('SELECT * FROM attendance WHERE date = ? ORDER BY id DESC').all(today);
  res.json(withLateFlag(logs));
});

app.get('/api/attendance/history', (req, res) => {
  let { person_id, user_type, limit = 50 } = req.query;
  if (!isStaffRole(req.auth.role)) {
    // Siswa/orang tua hanya boleh melihat riwayat siswa yang terkait dengan akunnya.
    const profile = getSessionProfile(req.auth);
    if (!profile?.student) return res.json([]);
    person_id = profile.student.id;
    user_type = 'siswa';
  }
  let query = 'SELECT * FROM attendance';
  const params = [];
  if (person_id && user_type) {
    query += ' WHERE person_id = ? AND user_type = ?';
    params.push(Number(person_id), user_type);
  }
  query += ' ORDER BY id DESC LIMIT ?';
  params.push(Math.min(Math.max(toNumber(limit, 50), 1), 500));
  const logs = db.prepare(query).all(...params);
  res.json(withLateFlag(logs));
});

app.get('/api/attendance/intelligence', (req, res) => {
  const requestedDays = Number.parseInt(req.query.days, 10) || 30;
  const days = Math.min(Math.max(requestedDays, 7), 90);
  const now = new Date();
  const today = todayStr(now);
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  const startDate = todayStr(start);
  const lateCutoff = LATE_CUTOFF;

  const students = db.prepare(`
    SELECT s.id, s.name, s.status, c.name AS class_name
    FROM students s LEFT JOIN classes c ON c.id = s.class_id
    WHERE lower(COALESCE(s.status, 'aktif')) = 'aktif'
  `).all();
  const recentCheckins = db.prepare(`
    SELECT person_id, person_name, date, time, status
    FROM attendance
    WHERE user_type = 'siswa' AND type = 'masuk' AND date >= ?
    ORDER BY date DESC, time DESC
  `).all(startDate);
  const todayCheckins = db.prepare(`
    SELECT DISTINCT person_id FROM attendance
    WHERE user_type = 'siswa' AND type = 'masuk' AND date = ? AND status = 'hadir'
  `).all(today);
  const todayTeachers = db.prepare(`
    SELECT DISTINCT person_id FROM attendance
    WHERE user_type = 'guru' AND type = 'masuk' AND date = ? AND status = 'hadir'
  `).all(today);

  const perStudent = new Map(students.map((student) => [student.id, { ...student, checkins: 0, lateDates: new Set(), recordedNonAttendance: 0, lastCheckin: null }]));
  recentCheckins.forEach((record) => {
    const student = perStudent.get(record.person_id);
    if (!student) return;
    student.checkins += 1;
    if (record.status !== 'hadir') student.recordedNonAttendance += 1;
    if (record.status === 'hadir' && record.time > lateCutoff) student.lateDates.add(record.date);
    if (!student.lastCheckin || `${record.date}T${record.time}` > student.lastCheckin) student.lastCheckin = `${record.date}T${record.time}`;
  });

  const followups = [...perStudent.values()].flatMap((student) => {
    const reasons = [];
    if (student.lateDates.size >= 2) reasons.push(`${student.lateDates.size} hari scan masuk melewati ${lateCutoff.slice(0, 5)} dalam ${days} hari terakhir`);
    if (student.recordedNonAttendance >= 2) reasons.push(`${student.recordedNonAttendance} status presensi non-hadir tercatat`);
    if (!student.lastCheckin) reasons.push(`belum ada scan masuk pada periode ${days} hari terakhir`);
    return reasons.length ? [{ id: student.id, name: student.name, class_name: student.class_name || 'Belum ada kelas', reasons, last_checkin: student.lastCheckin }] : [];
  }).slice(0, 12);

  const classSummary = [...new Map(students.map((student) => [student.class_name || 'Belum ada kelas', { class_name: student.class_name || 'Belum ada kelas', students: 0, checkins: 0 }])).values()];
  const classMap = new Map(classSummary.map((item) => [item.class_name, item]));
  students.forEach((student) => classMap.get(student.class_name || 'Belum ada kelas').students += 1);
  const studentClassMap = new Map(students.map((student) => [student.id, student.class_name || 'Belum ada kelas']));
  const presentStudentIds = new Set(todayCheckins.map((record) => record.person_id));
  presentStudentIds.forEach((studentId) => {
    const className = studentClassMap.get(studentId);
    if (className) classMap.get(className).checkins += 1;
  });

  const lateCheckins = recentCheckins.filter((record) => record.status === 'hadir' && record.time > lateCutoff).length;
  res.json({
    success: true,
    generated_at: now.toISOString(),
    window_days: days,
    late_cutoff: lateCutoff,
    today: {
      student_checkins: presentStudentIds.size,
      teacher_checkins: todayTeachers.length,
      late_checkins: recentCheckins.filter((record) => record.date === today && record.status === 'hadir' && record.time > lateCutoff).length,
      total_active_students: students.length,
    },
    trend: { checkins: recentCheckins.length, late_checkins: lateCheckins, followups: followups.length },
    classes: classSummary.map((item) => ({ ...item, checkin_coverage: item.students ? Math.round((item.checkins / item.students) * 100) : 0 })).sort((a, b) => a.checkin_coverage - b.checkin_coverage),
    followups,
  });
});

app.post('/api/attendance/scan', (req, res) => {
  const qrString = cleanText(req.body?.qr_string, 120);
  const type = ['masuk', 'pulang', 'mapel'].includes(req.body?.type) ? req.body.type : 'masuk';
  const method = ['self_scan', 'kiosk_card', 'manual'].includes(req.body?.method) ? req.body.method : 'self_scan';
  const subjectName = cleanText(req.body?.subject_name, 120) || null;
  const notes = cleanText(req.body?.notes, 300);
  if (!qrString) {
    return res.status(400).json({ success: false, message: 'QR Code tidak boleh kosong' });
  }
  if (type === 'mapel' && !subjectName) {
    return res.status(400).json({ success: false, message: 'Presensi mata pelajaran memerlukan nama mata pelajaran.' });
  }

  const cleanId = qrString.replace(/^SISWA-/i, '').replace(/^GURU-/i, '').trim();

  const student = db.prepare('SELECT * FROM students WHERE nisn = ? OR nis = ? OR qr_code = ?').get(cleanId, cleanId, qrString);
  const teacher = student ? null : db.prepare('SELECT * FROM teachers WHERE nip = ? OR nuptk = ?').get(cleanId, cleanId);

  if (!student && !teacher) {
    return res.status(404).json({ success: false, message: 'Identitas kartu atau QR Code tidak terdaftar di sistem sekolah.' });
  }

  const now = new Date();
  const dateStr = todayStr(now);
  const clockTime = timeStr(now);

  const user_type = student ? 'siswa' : 'guru';
  const person_id = student ? student.id : teacher.id;
  const person_name = student ? student.name : teacher.name;
  const person_identifier = (student ? student.nisn : (teacher.nip || teacher.nuptk || `GURU-${teacher.id}`)) || 'UNKNOWN';

  // Cegah pencatatan ganda: satu orang cukup satu kali scan masuk/pulang per hari.
  if (type !== 'mapel') {
    const existing = db.prepare(`
      SELECT * FROM attendance WHERE user_type = ? AND person_id = ? AND date = ? AND type = ? ORDER BY id ASC LIMIT 1
    `).get(user_type, person_id, dateStr, type);
    if (existing) {
      const [record] = withLateFlag([existing]);
      return res.json({
        success: true,
        already_recorded: true,
        message: `Presensi ${type.toUpperCase()} atas nama ${person_name} sudah tercatat hari ini pada pukul ${String(existing.time).slice(0, 5)}.`,
        record: { ...record, parent_phone: student?.parent_phone || null, is_late: Boolean(record.is_late) },
      });
    }
  }

  const isLate = user_type === 'siswa' && type === 'masuk' && clockTime > LATE_CUTOFF;
  db.prepare(`
    INSERT INTO attendance (user_type, person_id, person_name, person_identifier, date, time, type, subject_name, status, method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'hadir', ?, ?)
  `).run(user_type, person_id, person_name, person_identifier, dateStr, clockTime, type, subjectName, method, notes || `Absen ${type} via ${method}`);

  res.json({
    success: true,
    message: `Presensi ${type.toUpperCase()} atas nama ${person_name} (${user_type.toUpperCase()}) berhasil dicatat${isLate ? ' dan perlu diverifikasi sebagai scan setelah batas waktu.' : '!'}`,
    record: {
      person_name,
      user_type,
      time: clockTime,
      date: dateStr,
      subject_name: subjectName,
      parent_phone: student?.parent_phone || null,
      is_late: isLate
    }
  });
});

// ==========================================
// 4. UJIAN ONLINE CBT + WEB ANTI-NYONTEK (MODUL 3)
// ==========================================
app.get('/api/cbt/exams', (req, res) => {
  const exams = db.prepare('SELECT * FROM cbt_exams ORDER BY id DESC').all();
  res.json(exams);
});

app.get('/api/cbt/exams/:id', (req, res) => {
  const exam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ message: 'Ujian tidak ditemukan' });
  
  const questions = db.prepare(`
    SELECT id, exam_id, question_text, question_type, option_a, option_b, option_c, option_d, option_e, points
    FROM cbt_questions WHERE exam_id = ? ORDER BY id ASC
  `).all(req.params.id);

  res.json({ ...exam, questions });
});

app.post('/api/cbt/exams', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya guru/staf yang dapat membuat paket ujian.' });
  const title = cleanText(req.body?.title, 180);
  const subjectName = cleanText(req.body?.subject_name, 120);
  const className = cleanText(req.body?.class_name, 80);
  const duration = toNumber(req.body?.duration_minutes, 0);
  const passingScore = Math.min(Math.max(toNumber(req.body?.passing_score, 75), 0), 100);
  const maxViolations = Math.max(toNumber(req.body?.max_violations, 3), 1);
  const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];

  if (!title || !subjectName || !className) return res.status(400).json({ success: false, message: 'Judul, mata pelajaran, dan kelas ujian wajib diisi.' });
  if (duration < 1 || duration > 600) return res.status(400).json({ success: false, message: 'Durasi ujian harus antara 1 sampai 600 menit.' });
  if (!questions.length) return res.status(400).json({ success: false, message: 'Paket ujian minimal memiliki satu soal.' });

  const preparedQuestions = [];
  for (const [index, q] of questions.entries()) {
    const questionText = cleanText(q?.question_text, 4000);
    const questionType = q?.question_type === 'essay' ? 'essay' : 'pg';
    const options = ['a', 'b', 'c', 'd', 'e'].map((key) => cleanText(q?.[`option_${key}`], 1000) || null);
    const correctOption = questionType === 'pg' ? cleanText(q?.correct_option, 1).toUpperCase() : null;
    if (!questionText) return res.status(400).json({ success: false, message: `Teks soal nomor ${index + 1} tidak boleh kosong.` });
    if (questionType === 'pg') {
      const filledOptions = options.filter(Boolean).length;
      const optionIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(correctOption);
      if (filledOptions < 2) return res.status(400).json({ success: false, message: `Soal pilihan ganda nomor ${index + 1} minimal memiliki dua opsi jawaban.` });
      if (optionIndex === -1 || !options[optionIndex]) return res.status(400).json({ success: false, message: `Kunci jawaban soal nomor ${index + 1} harus menunjuk opsi yang terisi.` });
    }
    preparedQuestions.push({ questionText, questionType, options, correctOption, points: Math.max(toNumber(q?.points, 10), 1) });
  }

  try {
    const examId = transaction(() => {
      const result = db.prepare(`
        INSERT INTO cbt_exams (title, subject_name, class_name, duration_minutes, total_questions, passing_score, is_active, max_violations)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(title, subjectName, className, duration, preparedQuestions.length, passingScore, maxViolations);
      const newExamId = result.lastInsertRowid;
      const insertQ = db.prepare(`
        INSERT INTO cbt_questions (exam_id, question_text, question_type, option_a, option_b, option_c, option_d, option_e, correct_option, points)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      preparedQuestions.forEach((q) => insertQ.run(newExamId, q.questionText, q.questionType, ...q.options, q.correctOption, q.points));
      return newExamId;
    });
    res.status(201).json({ success: true, examId, message: 'Paket Ujian CBT berhasil dibuat!' });
  } catch (err) {
    sendError(res, err, 'Gagal membuat paket ujian');
  }
});

// Catat Pelanggaran Anti-Nyontek
app.post('/api/cbt/exams/:id/violation', (req, res) => {
  const { violation_type, timestamp } = req.body || {};
  const examId = Number(req.params.id);
  const student_id = toNumber(req.body?.student_id);
  const student_name = cleanText(req.body?.student_name, 120) || 'Peserta';
  if (!student_id) return res.status(400).json({ success: false, message: 'Identitas peserta ujian tidak valid.' });
  if (!db.prepare('SELECT id FROM cbt_exams WHERE id = ?').get(examId)) return res.status(404).json({ success: false, message: 'Ujian tidak ditemukan' });

  let attempt = db.prepare('SELECT * FROM cbt_attempts WHERE exam_id = ? AND student_id = ?').get(examId, student_id);
  const nowStr = new Date().toISOString();

  let violations = [];
  let count = 1;

  if (attempt) {
    try {
      violations = attempt.violations_log_json ? JSON.parse(attempt.violations_log_json) : [];
    } catch {
      violations = [];
    }
    violations.push({ type: violation_type, time: timestamp || nowStr });
    count = (attempt.violations_count || 0) + 1;

    db.prepare(`
      UPDATE cbt_attempts
      SET violations_count = ?, violations_log_json = ?
      WHERE id = ?
    `).run(count, JSON.stringify(violations), attempt.id);
  } else {
    violations.push({ type: violation_type, time: timestamp || nowStr });
    db.prepare(`
      INSERT INTO cbt_attempts (exam_id, student_id, student_name, start_time, violations_count, violations_log_json, status)
      VALUES (?, ?, ?, ?, 1, ?, 'ongoing')
    `).run(examId, Number(student_id), student_name, nowStr, JSON.stringify(violations));
  }

  const exam = db.prepare('SELECT max_violations FROM cbt_exams WHERE id = ?').get(examId);
  const maxAllowed = exam?.max_violations || 3;
  const isLocked = count >= maxAllowed;

  res.json({
    success: true,
    violations_count: count,
    max_violations: maxAllowed,
    is_locked: isLocked,
    message: isLocked
      ? 'BATAS PELANGGARAN TERLAMPAUI! Ujian otomatis dihentikan dan disubmit paksa oleh sistem Anti-Nyontek.'
      : `Peringatan Anti-Nyontek: Pelanggaran ke-${count} dari toleransi ${maxAllowed}x.`
  });
});

// Submit Ujian & Hitung Nilai Otomatis
app.post('/api/cbt/exams/:id/submit', (req, res) => {
  const { force_submitted = false } = req.body || {};
  const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const examId = Number(req.params.id);
  const student_id = toNumber(req.body?.student_id);
  const student_name = cleanText(req.body?.student_name, 120) || 'Peserta';
  if (!student_id) return res.status(400).json({ success: false, message: 'Identitas peserta ujian tidak valid.' });
  const exam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ success: false, message: 'Ujian tidak ditemukan' });

  // Jawaban yang sudah dikirim tidak boleh ditimpa (mencegah pengiriman ulang).
  const previous = db.prepare('SELECT * FROM cbt_attempts WHERE exam_id = ? AND student_id = ?').get(examId, student_id);
  if (previous && previous.status !== 'ongoing') {
    return res.json({
      success: true,
      already_submitted: true,
      score: previous.score,
      status: previous.status,
      passed: Number(previous.score) >= Number(exam.passing_score || 75),
      message: 'Jawaban ujian ini sudah pernah dikirim; nilai yang tersimpan tetap dipakai.'
    });
  }

  const questions = db.prepare('SELECT * FROM cbt_questions WHERE exam_id = ?').all(examId);
  let totalScore = 0;
  let maxPossibleScore = 0;

  for (const q of questions) {
    const studentAns = answers[q.id];
    maxPossibleScore += q.points;
    if (q.question_type === 'pg') {
      if (studentAns && studentAns.toString().toUpperCase() === q.correct_option?.toString().toUpperCase()) {
        totalScore += q.points;
      }
    } else {
      if (typeof studentAns === 'string' && studentAns.trim().length > 5) {
        totalScore += Math.round(q.points * 0.9);
      }
    }
  }

  const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
  const nowStr = new Date().toISOString();
  const status = force_submitted ? 'force_submitted' : 'submitted';

  let attempt = db.prepare('SELECT * FROM cbt_attempts WHERE exam_id = ? AND student_id = ?').get(examId, Number(student_id));

  if (attempt) {
    db.prepare(`
      UPDATE cbt_attempts
      SET submit_time = ?, score = ?, answers_json = ?, status = ?
      WHERE id = ?
    `).run(nowStr, finalScore, JSON.stringify(answers), status, attempt.id);
  } else {
    db.prepare(`
      INSERT INTO cbt_attempts (exam_id, student_id, student_name, start_time, submit_time, score, answers_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(examId, Number(student_id), student_name, nowStr, nowStr, finalScore, JSON.stringify(answers), status);
  }

  res.json({
    success: true,
    score: finalScore,
    status,
    passed: finalScore >= Number(exam.passing_score || 75),
    message: force_submitted
      ? 'Ujian telah disubmit secara otomatis akibat pelanggaran keamanan!'
      : 'Ujian berhasil diselesaikan dan dinilai secara otomatis.'
  });
});

app.get('/api/cbt/exams/:id/results', (req, res) => {
  const results = db.prepare('SELECT * FROM cbt_attempts WHERE exam_id = ? ORDER BY id DESC').all(req.params.id);
  res.json(results);
});

// ==========================================
// 5. AKADEMIK (MODUL 4)
// ==========================================
app.get('/api/academic/classes', (req, res) => {
  const classes = db.prepare('SELECT * FROM classes').all();
  res.json(classes);
});

app.post('/api/academic/classes', (req, res) => {
  const name = cleanText(req.body?.name, 60);
  const grade = cleanText(req.body?.grade, 10);
  const major = cleanText(req.body?.major, 60) || null;
  const academicYear = cleanText(req.body?.academic_year, 20);
  const homeroom = cleanText(req.body?.homeroom_teacher_name, 120) || null;
  if (!name || !grade || !academicYear) return res.status(400).json({ success: false, message: 'Nama kelas, tingkat, dan tahun ajaran wajib diisi.' });
  const duplicate = db.prepare('SELECT id FROM classes WHERE lower(name) = lower(?) AND academic_year = ?').get(name, academicYear);
  if (duplicate) return res.status(409).json({ success: false, message: `Kelas ${name} untuk tahun ajaran ${academicYear} sudah ada.` });
  const result = db.prepare(`
    INSERT INTO classes (name, grade, major, academic_year, homeroom_teacher_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, grade, major, academicYear, homeroom);
  const created = db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, class: created, message: 'Kelas berhasil ditambahkan' });
});

app.get('/api/academic/subjects', (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects').all();
  res.json(subjects);
});

function isValidScheduleTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

function timeRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function findScheduleConflicts({ day, start_time, end_time, class_id, teacher_name, room }, excludeId = null) {
  const candidates = db.prepare(`
    SELECT s.*, c.name AS class_name, sub.name AS subject_name
    FROM schedules s
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN subjects sub ON sub.id = s.subject_id
    WHERE lower(s.day) = lower(?) ${excludeId ? 'AND s.id != ?' : ''}
  `).all(...(excludeId ? [day, excludeId] : [day]));

  return candidates.flatMap((schedule) => {
    if (!timeRangesOverlap(start_time, end_time, schedule.start_time, schedule.end_time)) return [];
    const reasons = [];
    if (Number(class_id) === Number(schedule.class_id)) reasons.push('Kelas yang sama');
    if (teacher_name.trim().toLocaleLowerCase('id-ID') === String(schedule.teacher_name || '').trim().toLocaleLowerCase('id-ID')) reasons.push('Guru yang sama');
    if (room && String(room).trim().toLocaleLowerCase('id-ID') === String(schedule.room || '').trim().toLocaleLowerCase('id-ID')) reasons.push('Ruangan yang sama');
    return reasons.length ? [{ ...schedule, reasons }] : [];
  });
}

app.get('/api/academic/schedules', (req, res) => {
  const schedules = db.prepare(`
    SELECT s.*, c.name as class_name, sub.name as subject_name
    FROM schedules s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    ORDER BY s.day, s.start_time
  `).all();
  res.json(schedules);
});

app.get('/api/academic/schedule-conflicts', (req, res) => {
  const schedules = db.prepare(`
    SELECT s.*, c.name AS class_name, sub.name AS subject_name
    FROM schedules s
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN subjects sub ON sub.id = s.subject_id
    ORDER BY s.day, s.start_time
  `).all();
  const conflicts = [];
  for (let i = 0; i < schedules.length; i += 1) {
    for (let j = i + 1; j < schedules.length; j += 1) {
      const left = schedules[i];
      const right = schedules[j];
      if (left.day.toLocaleLowerCase('id-ID') !== right.day.toLocaleLowerCase('id-ID') || !timeRangesOverlap(left.start_time, left.end_time, right.start_time, right.end_time)) continue;
      const reasons = [];
      if (Number(left.class_id) === Number(right.class_id)) reasons.push('Kelas yang sama');
      if (String(left.teacher_name || '').trim().toLocaleLowerCase('id-ID') === String(right.teacher_name || '').trim().toLocaleLowerCase('id-ID')) reasons.push('Guru yang sama');
      if (left.room && String(left.room).trim().toLocaleLowerCase('id-ID') === String(right.room || '').trim().toLocaleLowerCase('id-ID')) reasons.push('Ruangan yang sama');
      if (reasons.length) conflicts.push({ left, right, reasons });
    }
  }
  res.json({ success: true, conflicts });
});

app.post('/api/academic/schedules', (req, res) => {
  const classId = Number(req.body?.class_id);
  const subjectId = Number(req.body?.subject_id);
  const day = String(req.body?.day || '').trim();
  const startTime = String(req.body?.start_time || '').trim();
  const endTime = String(req.body?.end_time || '').trim();
  const room = String(req.body?.room || '').trim();
  const subject = db.prepare('SELECT id, name, teacher_name FROM subjects WHERE id = ?').get(subjectId);
  const schoolClass = db.prepare('SELECT id, name FROM classes WHERE id = ?').get(classId);

  if (!schoolClass || !subject || !day || !room || !isValidScheduleTime(startTime) || !isValidScheduleTime(endTime) || startTime >= endTime) {
    return res.status(422).json({ success: false, code: 'INVALID_SCHEDULE', message: 'Lengkapi kelas, mata pelajaran, hari, ruangan, serta rentang waktu yang valid.' });
  }

  const conflicts = findScheduleConflicts({ day, start_time: startTime, end_time: endTime, class_id: classId, teacher_name: subject.teacher_name || '', room });
  if (conflicts.length) {
    return res.status(409).json({ success: false, code: 'SCHEDULE_CONFLICT', message: 'Jadwal tidak disimpan karena terdapat bentrok.', conflicts });
  }

  const result = db.prepare(`
    INSERT INTO schedules (class_id, subject_id, teacher_name, day, start_time, end_time, room)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(classId, subjectId, subject.teacher_name || 'Belum ditetapkan', day, startTime, endTime, room);
  res.status(201).json({ success: true, scheduleId: result.lastInsertRowid, message: `Jadwal ${subject.name} untuk ${schoolClass.name} berhasil disimpan tanpa bentrok.` });
});

// ==========================================
// 6. KARTU SPP & PEMBAYARAN DIGITAL (MODUL 5)
// ==========================================
app.get(['/api/spp/bills/:studentId', '/api/spp/bills/student/:studentId'], (req, res) => {
  let studentId = toNumber(req.params.studentId);
  if (!isStaffRole(req.auth.role)) {
    // Siswa/orang tua hanya dapat melihat tagihan siswa yang terkait dengan akunnya.
    const profile = getSessionProfile(req.auth);
    if (!profile?.student) return res.status(403).json({ success: false, message: 'Akun Anda belum terhubung dengan data siswa.' });
    studentId = profile.student.id;
  }
  const student = getLinkedStudent(studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
  const sppBills = db.prepare('SELECT * FROM spp_bills WHERE student_id = ? ORDER BY id ASC').all(studentId);
  const otherBills = db.prepare('SELECT * FROM other_bills WHERE student_id = ?').all(studentId);
  res.json({ student, sppBills, otherBills });
});

app.post('/api/spp/pay/:billId', (req, res) => {
  const payment_method = cleanText(req.body?.payment_method, 60) || 'QRIS Instant Payment';
  const now = todayStr();

  const currentBill = db.prepare('SELECT * FROM spp_bills WHERE id = ?').get(req.params.billId);
  if (!currentBill) {
    return res.status(404).json({ success: false, message: 'Tagihan tidak ditemukan' });
  }
  if (!isStaffRole(req.auth.role)) {
    const profile = getSessionProfile(req.auth);
    if (!profile?.student || profile.student.id !== currentBill.student_id) {
      return res.status(403).json({ success: false, message: 'Tagihan ini bukan milik siswa yang terkait dengan akun Anda.' });
    }
  }

  // Idempotency check: jika sudah lunas, jangan duplikasi transaksi kas
  if (currentBill.status === 'lunas') {
    return res.json({
      success: true,
      message: 'Tagihan ini sudah berstatus lunas.',
      receipt_number: currentBill.receipt_number
    });
  }

  const receipt = `KW-SPP-${Date.now().toString().slice(-6)}`;
  
  transaction(() => {
    db.prepare(`
      UPDATE spp_bills
      SET status = 'lunas', payment_date = ?, payment_method = ?, receipt_number = ?
      WHERE id = ?
    `).run(now, payment_method, receipt, currentBill.id);

    // Catat otomatis di kas masuk keuangan sekolah
    db.prepare(`
      INSERT INTO finance_transactions (type, category, amount, date, description, source_or_recipient)
      VALUES ('masuk', 'SPP Siswa', ?, ?, ?, ?)
    `).run(currentBill.amount, now, `Pembayaran SPP ${currentBill.month} ${currentBill.year} (${receipt})`, 'Siswa & Wali Murid');
  });

  res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi dan dicatat!', receipt_number: receipt, payment_date: now, payment_method });
});

app.get('/api/spp/all', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Rekap SPP seluruh siswa hanya untuk staf sekolah.' });
  const bills = db.prepare(`
    SELECT b.*, s.name as student_name, s.nisn, c.name as class_name
    FROM spp_bills b
    JOIN students s ON b.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    ORDER BY b.id DESC LIMIT 100
  `).all();
  res.json(bills);
});

// ==========================================
// 7. BUKU INDUK SISWA & GURU (MODUL 6)
// ==========================================
app.get(['/api/master/students', '/api/buku_induk/students'], (req, res) => {
  const students = db.prepare(`
    SELECT s.*, c.name as class_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    ORDER BY s.id ASC
  `).all();
  res.json(students);
});

app.get('/api/master/students/:id/timeline', (req, res) => {
  const studentId = Number(req.params.id);
  const student = db.prepare(`
    SELECT s.*, c.name AS class_name
    FROM students s LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.id = ?
  `).get(studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });

  const events = [];
  const attendance = db.prepare(`
    SELECT date, time, type, status, subject_name, notes
    FROM attendance WHERE user_type = 'siswa' AND person_id = ?
    ORDER BY date DESC, time DESC LIMIT 60
  `).all(studentId);
  attendance.forEach((record) => events.push({
    type: 'attendance', occurred_on: `${record.date}T${record.time || '00:00:00'}`,
    title: `Presensi ${record.status}${record.type === 'mapel' ? ` — ${record.subject_name || 'KBM'}` : ''}`,
    description: record.notes || `Presensi ${record.type} tercatat melalui sistem.`,
    tone: record.status === 'hadir' ? 'success' : 'neutral',
  }));

  const canViewGrades = roleCanAccess(req.auth.role, 'erapor');
  if (canViewGrades) {
    const grades = db.prepare(`
      SELECT subject_name, semester, academic_year, final_grade, predicate, teacher_notes
      FROM grades WHERE student_id = ? ORDER BY academic_year DESC, semester DESC, id DESC
    `).all(studentId);
    grades.forEach((grade) => events.push({
      type: 'grade', occurred_on: null, period: `${grade.semester}, ${grade.academic_year}`,
      title: `Nilai ${grade.subject_name}: ${grade.final_grade} (${grade.predicate})`,
      description: grade.teacher_notes || 'Nilai akhir telah direkap pada e-rapor.',
      tone: Number(grade.final_grade) >= 75 ? 'success' : 'warning',
    }));
  }

  const canViewCounseling = roleCanAccess(req.auth.role, 'violations');
  if (canViewCounseling) {
    const violations = db.prepare(`
      SELECT incident_date, violation_name, category, points, action_taken, status
      FROM violations WHERE student_id = ? ORDER BY incident_date DESC, id DESC
    `).all(studentId);
    violations.forEach((violation) => events.push({
      type: 'counseling', occurred_on: violation.incident_date,
      title: `Catatan pembinaan: ${violation.violation_name}`,
      description: `${violation.points} poin · ${violation.action_taken || 'Tindak lanjut sedang dicatat.'}`,
      tone: violation.category === 'berat' ? 'danger' : 'warning',
      sensitive: true,
    }));
    writeAuditLog({ actor: req.auth, action: 'view_sensitive_data', resource: 'student_timeline_counseling', req, metadata: { studentId } });
  }

  events.sort((a, b) => {
    if (!a.occurred_on) return 1;
    if (!b.occurred_on) return -1;
    return new Date(b.occurred_on) - new Date(a.occurred_on);
  });
  res.json({ success: true, student, timeline: events, visibility: { grades: canViewGrades, counseling: canViewCounseling } });
});

app.post('/api/master/students', (req, res) => {
  const nisn = cleanText(req.body?.nisn, 20);
  const nis = cleanText(req.body?.nis, 20);
  const name = cleanText(req.body?.name, 120);
  const gender = cleanText(req.body?.gender, 20) || 'Laki-laki';
  const classId = toNumber(req.body?.class_id);
  if (!nisn || !nis || !name) return res.status(400).json({ success: false, message: 'NISN, NIS, dan nama siswa wajib diisi.' });
  if (!/^\d{6,20}$/.test(nisn)) return res.status(400).json({ success: false, message: 'NISN harus berupa angka (6-20 digit).' });
  if (classId && !db.prepare('SELECT id FROM classes WHERE id = ?').get(classId)) return res.status(400).json({ success: false, message: 'Kelas yang dipilih tidak ditemukan.' });

  try {
    const studentId = transaction(() => {
      const result = db.prepare(`
        INSERT INTO students (nisn, nis, name, gender, birth_place, birth_date, address, parent_name, parent_phone, class_id, status, qr_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?)
      `).run(nisn, nis, name, gender, cleanText(req.body?.birth_place, 80) || null, cleanText(req.body?.birth_date, 20) || null, cleanText(req.body?.address, 300) || null, cleanText(req.body?.parent_name, 120) || null, cleanText(req.body?.parent_phone, 30) || null, classId, `SISWA-${nisn}`);
      const newId = result.lastInsertRowid;
      // Kartu SPP untuk tahun ajaran berjalan: Juli–Desember tahun ini, Januari–Juni tahun berikutnya.
      const now = new Date();
      const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      const insertSpp = db.prepare("INSERT INTO spp_bills (student_id, month, year, amount, status) VALUES (?, ?, ?, 350000, 'belum')");
      ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].forEach((month) => insertSpp.run(newId, month, startYear));
      ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'].forEach((month) => insertSpp.run(newId, month, startYear + 1));
      return newId;
    });
    const student = db.prepare('SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = ?').get(studentId);
    res.status(201).json({ success: true, student, message: 'Data Siswa Buku Induk berhasil ditambahkan beserta 12 bulan kartu SPP' });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan siswa');
  }
});

app.get(['/api/master/teachers', '/api/buku_induk/teachers'], (req, res) => {
  const teachers = db.prepare('SELECT * FROM teachers ORDER BY id ASC').all();
  res.json(teachers);
});

app.post('/api/master/teachers', (req, res) => {
  const name = cleanText(req.body?.name, 120);
  const gender = cleanText(req.body?.gender, 20) || 'Laki-laki';
  if (!name) return res.status(400).json({ success: false, message: 'Nama guru/staf wajib diisi.' });
  try {
    const result = db.prepare(`
      INSERT INTO teachers (nip, nuptk, name, gender, subject, phone, email, education, position, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aktif')
    `).run(cleanText(req.body?.nip, 30) || null, cleanText(req.body?.nuptk, 30) || null, name, gender, cleanText(req.body?.subject, 120) || null, cleanText(req.body?.phone, 30) || null, cleanText(req.body?.email, 120) || null, cleanText(req.body?.education, 120) || null, cleanText(req.body?.position, 120) || 'Guru Pengajar');
    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, teacher, message: 'Data Guru & Staf berhasil ditambahkan' });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan guru/staf');
  }
});

// ==========================================
// 8. KEUANGAN SEKOLAH (MODUL 7)
// ==========================================
app.get('/api/finance/summary', (req, res) => {
  const totalIn = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'masuk'").get().total;
  const totalOut = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'keluar'").get().total;
  res.json({
    totalIn,
    totalOut,
    balance: totalIn - totalOut
  });
});

app.get('/api/finance/transactions', (req, res) => {
  const trans = db.prepare('SELECT * FROM finance_transactions ORDER BY date DESC, id DESC').all();
  res.json(trans);
});

app.post('/api/finance/transactions', (req, res) => {
  const type = req.body?.type === 'keluar' ? 'keluar' : req.body?.type === 'masuk' ? 'masuk' : null;
  const category = cleanText(req.body?.category, 80);
  const amount = toNumber(req.body?.amount, 0);
  const description = cleanText(req.body?.description, 500);
  const date = cleanText(req.body?.date, 10) || todayStr();
  if (!type) return res.status(400).json({ success: false, message: "Jenis transaksi harus 'masuk' atau 'keluar'." });
  if (!category || !description) return res.status(400).json({ success: false, message: 'Kategori dan keterangan transaksi wajib diisi.' });
  if (amount <= 0) return res.status(400).json({ success: false, message: 'Nominal transaksi harus lebih dari 0.' });
  if (!isValidDate(date)) return res.status(400).json({ success: false, message: 'Format tanggal transaksi tidak valid (YYYY-MM-DD).' });
  const result = db.prepare(`
    INSERT INTO finance_transactions (type, category, amount, date, description, source_or_recipient)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(type, category, Math.round(amount), date, description, cleanText(req.body?.source_or_recipient, 150) || null);
  const created = db.prepare('SELECT * FROM finance_transactions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, transaction: created, message: 'Transaksi kas keuangan berhasil dicatat' });
});

// ==========================================
// 9. PENGGAJIAN (PAYROLL) (MODUL 8)
// ==========================================
app.get(['/api/payroll', '/api/payroll/list'], (req, res) => {
  const payrolls = db.prepare('SELECT * FROM payrolls ORDER BY id DESC').all();
  res.json(payrolls);
});

app.post('/api/payroll/generate', (req, res) => {
  const staffId = toNumber(req.body?.staff_id);
  const month = cleanText(req.body?.month, 20);
  const year = toNumber(req.body?.year);
  const baseSalary = toNumber(req.body?.base_salary, 0);
  const allowance = toNumber(req.body?.allowance, 0);
  const teachingFee = toNumber(req.body?.teaching_fee, 0);
  const deductions = toNumber(req.body?.deductions, 0);
  const teacher = staffId ? db.prepare('SELECT * FROM teachers WHERE id = ?').get(staffId) : null;
  if (!teacher) return res.status(404).json({ success: false, message: 'Guru/Staf tidak ditemukan' });
  if (!month || !year) return res.status(400).json({ success: false, message: 'Periode gaji (bulan dan tahun) wajib diisi.' });
  if (baseSalary <= 0) return res.status(400).json({ success: false, message: 'Gaji pokok harus lebih dari 0.' });
  if ([allowance, teachingFee, deductions].some((value) => value < 0)) return res.status(400).json({ success: false, message: 'Tunjangan, honor, dan potongan tidak boleh negatif.' });

  const duplicate = db.prepare('SELECT id FROM payrolls WHERE staff_id = ? AND lower(month) = lower(?) AND year = ?').get(staffId, month, year);
  if (duplicate) return res.status(409).json({ success: false, message: `Slip gaji ${teacher.name} untuk ${month} ${year} sudah pernah diterbitkan.` });

  const netSalary = Math.round(baseSalary + allowance + teachingFee - deductions);
  if (netSalary < 0) return res.status(400).json({ success: false, message: 'Potongan melebihi total penghasilan.' });
  const now = todayStr();

  const payrollId = transaction(() => {
    const result = db.prepare(`
      INSERT INTO payrolls (staff_id, staff_name, staff_role, month, year, base_salary, allowance, teaching_fee, deductions, net_salary, status, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
    `).run(staffId, teacher.name, teacher.position || 'Guru Pengajar', month, year, Math.round(baseSalary), Math.round(allowance), Math.round(teachingFee), Math.round(deductions), netSalary, now);

    db.prepare(`
      INSERT INTO finance_transactions (type, category, amount, date, description, source_or_recipient)
      VALUES ('keluar', 'Gaji & Honor Guru', ?, ?, ?, ?)
    `).run(netSalary, now, `Pembayaran Gaji ${teacher.name} (${month} ${year})`, teacher.name);
    return result.lastInsertRowid;
  });

  const payroll = db.prepare('SELECT * FROM payrolls WHERE id = ?').get(payrollId);
  res.status(201).json({ success: true, payroll, message: 'Slip Gaji berhasil diterbitkan!' });
});

// ==========================================
// 10. BLOG & MADING DIGITAL (MODUL 9)
// ==========================================
app.get('/api/blogs', (req, res) => {
  const blogs = db.prepare('SELECT * FROM blogs ORDER BY id DESC').all();
  res.json(blogs);
});

app.post('/api/blogs', (req, res) => {
  const title = cleanText(req.body?.title, 180);
  const content = cleanText(req.body?.content, 20000);
  if (!title || !content) return res.status(400).json({ success: false, message: 'Judul dan isi artikel wajib diisi.' });
  const profile = getSessionProfile(req.auth);
  const authorName = cleanText(req.body?.author_name, 120) || profile?.name || 'Redaksi Sekolah';
  const authorRole = cleanText(req.body?.author_role, 60) || profile?.badge || req.auth.role;
  const category = cleanText(req.body?.category, 60) || 'Umum';
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `artikel-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;
  while (db.prepare('SELECT id FROM blogs WHERE slug = ?').get(slug)) slug = `${baseSlug}-${counter++}`;
  const now = todayStr();
  const result = db.prepare(`
    INSERT INTO blogs (title, slug, content, author_name, author_role, category, cover_image, status, views, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'published', 0, ?)
  `).run(title, slug, content, authorName, authorRole, category, cleanText(req.body?.cover_image, 500) || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800', now);
  const blog = db.prepare('SELECT * FROM blogs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, blog, message: 'Artikel blog sekolah berhasil diterbitkan' });
});

// ==========================================
// 11. AGENDA KEGIATAN (MODUL 10)
// ==========================================
app.get('/api/agenda', (req, res) => {
  const agendas = db.prepare('SELECT * FROM agenda ORDER BY event_date ASC').all();
  res.json(agendas);
});

app.post('/api/agenda', (req, res) => {
  const title = cleanText(req.body?.title, 180);
  const eventDate = cleanText(req.body?.event_date, 10);
  const startTime = cleanText(req.body?.start_time, 5) || null;
  const endTime = cleanText(req.body?.end_time, 5) || null;
  if (!title) return res.status(400).json({ success: false, message: 'Judul agenda wajib diisi.' });
  if (!isValidDate(eventDate)) return res.status(400).json({ success: false, message: 'Tanggal agenda tidak valid (format YYYY-MM-DD).' });
  if (startTime && endTime && startTime >= endTime) return res.status(400).json({ success: false, message: 'Jam selesai harus setelah jam mulai.' });
  const result = db.prepare(`
    INSERT INTO agenda (title, description, event_date, start_time, end_time, location, audience)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, cleanText(req.body?.description, 2000) || null, eventDate, startTime, endTime, cleanText(req.body?.location, 150) || null, cleanText(req.body?.audience, 40) || 'semua');
  const agenda = db.prepare('SELECT * FROM agenda WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, agenda, message: 'Agenda kegiatan sekolah berhasil ditambahkan' });
});

app.delete('/api/agenda/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM agenda WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Agenda tidak ditemukan.' });
    res.json({ success: true, message: 'Agenda kegiatan berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus agenda');
  }
});

// ==========================================
// 12. BROADCAST INFORMASI (MODUL 11)
// ==========================================
app.get('/api/broadcasts', (req, res) => {
  const broadcasts = db.prepare('SELECT * FROM broadcasts ORDER BY id DESC').all();
  res.json(broadcasts);
});

app.post('/api/broadcasts', (req, res) => {
  const title = cleanText(req.body?.title, 180);
  const message = cleanText(req.body?.message, 3000);
  if (!title || !message) return res.status(400).json({ success: false, message: 'Judul dan isi pengumuman wajib diisi.' });
  const profile = getSessionProfile(req.auth);
  const senderName = cleanText(req.body?.sender_name, 120) || profile?.name || 'Kepala Sekolah';
  const now = nowStamp();
  const result = db.prepare(`
    INSERT INTO broadcasts (title, message, target_role, sender_name, created_at, is_urgent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, message, cleanText(req.body?.target_role, 40) || 'semua', senderName, now, req.body?.is_urgent ? 1 : 0);
  const broadcast = db.prepare('SELECT * FROM broadcasts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, broadcast, message: 'Pengumuman broadcast instan berhasil disiarkan ke pengguna' });
});

// ==========================================
// 13. POIN PELANGGARAN SISWA BK (MODUL 12)
// ==========================================
app.get('/api/violations', (req, res) => {
  const violations = db.prepare('SELECT * FROM violations ORDER BY id DESC').all();
  res.json(violations);
});

app.get('/api/violations/student/:studentId', (req, res) => {
  const records = db.prepare('SELECT * FROM violations WHERE student_id = ? ORDER BY id DESC').all(req.params.studentId);
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM violations WHERE student_id = ?').get(req.params.studentId).total;
  res.json({ records, totalPoints });
});

app.post('/api/violations', (req, res) => {
  const studentId = toNumber(req.body?.student_id);
  const violationName = cleanText(req.body?.violation_name, 180);
  const category = ['ringan', 'sedang', 'berat'].includes(req.body?.category) ? req.body.category : null;
  const points = toNumber(req.body?.points, 0);
  const incidentDate = cleanText(req.body?.incident_date, 10) || todayStr();
  if (!studentId) return res.status(400).json({ success: false, message: 'Pilih siswa yang dicatat.' });
  if (!violationName) return res.status(400).json({ success: false, message: 'Jenis pelanggaran wajib diisi.' });
  if (!category) return res.status(400).json({ success: false, message: "Kategori harus 'ringan', 'sedang', atau 'berat'." });
  if (points <= 0) return res.status(400).json({ success: false, message: 'Poin pelanggaran harus lebih dari 0.' });
  if (!isValidDate(incidentDate)) return res.status(400).json({ success: false, message: 'Tanggal kejadian tidak valid.' });

  const student = db.prepare(`
    SELECT s.*, c.name as class_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

  const profile = getSessionProfile(req.auth);
  const result = db.prepare(`
    INSERT INTO violations (student_id, student_name, class_name, violation_name, category, points, incident_date, reporter_name, action_taken, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ditindak')
  `).run(studentId, student.name, student.class_name || 'Belum ada kelas', violationName, category, Math.round(points), incidentDate, cleanText(req.body?.reporter_name, 120) || profile?.name || 'Guru BP/BK', cleanText(req.body?.action_taken, 500) || 'Pembinaan lisan');
  const violation = db.prepare('SELECT * FROM violations WHERE id = ?').get(result.lastInsertRowid);
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM violations WHERE student_id = ?').get(studentId).total;
  res.status(201).json({ success: true, violation, totalPoints, message: 'Poin pelanggaran siswa berhasil dicatat ke buku sanksi BK' });
});

// ==========================================
// 14. GALERI FOTO SEKOLAH (MODUL 13)
// ==========================================
app.get('/api/gallery', (req, res) => {
  const items = db.prepare('SELECT * FROM gallery ORDER BY id DESC').all();
  res.json(items);
});

app.post('/api/gallery', (req, res) => {
  const title = cleanText(req.body?.title, 180);
  const imageUrl = cleanText(req.body?.image_url, 1000);
  if (!title) return res.status(400).json({ success: false, message: 'Judul foto wajib diisi.' });
  if (!/^(https?:\/\/|\/uploads\/|\/pemilos\/)/i.test(imageUrl)) return res.status(400).json({ success: false, message: 'Tautan gambar tidak valid. Unggah foto atau gunakan URL https.' });
  const now = todayStr();
  const result = db.prepare('INSERT INTO gallery (title, category, image_url, description, date) VALUES (?, ?, ?, ?, ?)')
    .run(title, cleanText(req.body?.category, 60) || 'kegiatan', imageUrl, cleanText(req.body?.description, 1000) || null, now);
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, item, message: 'Foto galeri berhasil diunggah' });
});

// ==========================================
// 15. DATA ALUMNI / TRACER STUDY (MODUL 14)
// ==========================================
app.get('/api/alumni', (req, res) => {
  const alumni = db.prepare('SELECT * FROM alumni ORDER BY graduation_year DESC, id DESC').all();
  res.json(alumni);
});

app.post('/api/alumni', (req, res) => {
  const name = cleanText(req.body?.name, 120);
  const graduationYear = toNumber(req.body?.graduation_year);
  const currentStatus = cleanText(req.body?.current_status, 60);
  const currentYear = new Date().getFullYear();
  if (!name || !currentStatus) return res.status(400).json({ success: false, message: 'Nama alumni dan status saat ini wajib diisi.' });
  if (!graduationYear || graduationYear < 1950 || graduationYear > currentYear + 1) return res.status(400).json({ success: false, message: `Tahun kelulusan harus antara 1950 dan ${currentYear + 1}.` });
  const result = db.prepare(`
    INSERT INTO alumni (name, graduation_year, nisn, current_status, institution_name, position_or_major, phone, email, testimonial)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, graduationYear, cleanText(req.body?.nisn, 20) || null, currentStatus, cleanText(req.body?.institution_name, 150) || null, cleanText(req.body?.position_or_major, 150) || null, cleanText(req.body?.phone, 30) || null, cleanText(req.body?.email, 120) || null, cleanText(req.body?.testimonial, 2000) || null);
  const alumnus = db.prepare('SELECT * FROM alumni WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, alumni: alumnus, message: 'Data alumni berhasil disimpan di direktori tracer' });
});

// ==========================================
// 16. PPDB ONLINE (PENDAFTARAN SISWA BARU) (MODUL 15)
// ==========================================
app.get(['/api/ppdb', '/api/ppdb/list'], (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM ppdb ORDER BY id DESC').all();
    res.json(list);
  } catch (err) {
    console.error('Error fetching PPDB list:', err);
    sendError(res, err, 'Gagal mengambil data PPDB');
  }
});

app.post(['/api/ppdb', '/api/ppdb/register'], (req, res) => {
  try {
    const { full_name, nisn, gender, birth_place_date, track, previous_school, average_score, parent_name, parent_phone, address } = req.body;

    const trimmedName = String(full_name || '').trim();
    const trimmedNisn = String(nisn || '').trim();
    const trimmedSchool = String(previous_school || '').trim();

    if (!trimmedName || !trimmedNisn || !trimmedSchool) {
      return res.status(400).json({
        success: false,
        message: 'Mohon lengkapi data wajib: Nama Lengkap, NISN, dan Asal Sekolah'
      });
    }

    const trimmedBirth = cleanText(birth_place_date, 120);
    const trimmedParent = cleanText(parent_name, 120);
    const trimmedParentPhone = cleanText(parent_phone, 30);
    if (!trimmedBirth || !trimmedParent || !trimmedParentPhone) {
      return res.status(400).json({ success: false, message: 'Tempat/tanggal lahir, nama orang tua, dan nomor WhatsApp orang tua wajib diisi.' });
    }
    if (!/^\d{6,20}$/.test(trimmedNisn)) {
      return res.status(400).json({ success: false, message: 'NISN harus berupa angka (6-20 digit).' });
    }
    const parsedScore = Number(String(average_score ?? '').replace(',', '.'));
    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      return res.status(400).json({ success: false, message: 'Nilai rata-rata rapor harus berada di antara 0 dan 100.' });
    }
    const cleanScore = Math.round(parsedScore * 100) / 100;
    const now = nowStamp();

    // Generate guaranteed unique registration number with retry
    let regNo = '';
    let inserted = false;
    let attempts = 0;

    while (!inserted && attempts < 10) {
      attempts++;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const timePart = Date.now().toString().slice(-4);
      regNo = `PPDB-${new Date().getFullYear()}-${timePart}-${randomSuffix}`;

      try {
        const stmt = db.prepare(`
          INSERT INTO ppdb (
            registration_no, full_name, nisn, gender, birth_place_date, track,
            previous_school, average_score, parent_name, parent_phone, address, status, registered_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', ?)
        `);
        const result = stmt.run(
          regNo,
          trimmedName,
          trimmedNisn,
          gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          trimmedBirth,
          cleanText(track, 30) || 'rapor',
          trimmedSchool,
          cleanScore,
          trimmedParent,
          trimmedParentPhone,
          cleanText(address, 300) || '-',
          now
        );

        const newRecord = db.prepare('SELECT * FROM ppdb WHERE id = ?').get(result.lastInsertRowid);
        inserted = true;

        return res.status(201).json({
          success: true,
          registration_no: regNo,
          student: newRecord,
          message: `Pendaftaran Calon Siswa Baru berhasil! Nomor Registrasi Anda: ${regNo}`
        });
      } catch (insertErr) {
        if (insertErr.message && insertErr.message.includes('UNIQUE')) {
          continue; // retry generating another registration_no
        }
        throw insertErr;
      }
    }

    if (!inserted) {
      return res.status(500).json({
        success: false,
        message: 'Gagal membuat nomor registrasi unik. Silakan coba kirim ulang.'
      });
    }
  } catch (err) {
    console.error('Error in PPDB register:', err);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat memproses formulir PPDB: ' + err.message
    });
  }
});

const PPDB_STATUSES = ['menunggu', 'terverifikasi', 'diterima', 'cadangan', 'ditolak'];
app.put('/api/ppdb/:id/status', (req, res) => {
  try {
    const status = cleanText(req.body?.status, 30).toLowerCase();
    if (!PPDB_STATUSES.includes(status)) return res.status(400).json({ success: false, message: `Status PPDB harus salah satu dari: ${PPDB_STATUSES.join(', ')}.` });
    const result = db.prepare('UPDATE ppdb SET status = ? WHERE id = ?').run(status, req.params.id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Data pendaftar tidak ditemukan.' });
    res.json({ success: true, status, message: `Status kelulusan PPDB diubah menjadi: ${status.toUpperCase()}` });
  } catch (err) {
    sendError(res, err, 'Gagal mengubah status PPDB');
  }
});

app.delete('/api/ppdb/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ppdb WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Data pendaftar tidak ditemukan.' });
    res.json({ success: true, message: 'Data pendaftar PPDB berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus data PPDB');
  }
});

// ==========================================
// 17. ARSIP DIGITAL DOKUMEN (MODUL 16)
// ==========================================
app.get('/api/archives', (req, res) => {
  const docs = db.prepare('SELECT * FROM digital_archives ORDER BY id DESC').all();
  res.json(docs);
});

app.post('/api/archives', (req, res) => {
  const title = cleanText(req.body?.title, 200);
  const category = cleanText(req.body?.category, 60);
  if (!title || !category) return res.status(400).json({ success: false, message: 'Judul dan kategori dokumen wajib diisi.' });
  const fileUrl = cleanText(req.body?.file_url, 1000);
  if (fileUrl && !/^(https?:\/\/|\/uploads\/)/i.test(fileUrl)) return res.status(400).json({ success: false, message: 'Tautan berkas harus berupa URL https atau berkas unggahan.' });
  const profile = getSessionProfile(req.auth);
  const now = todayStr();
  const result = db.prepare(`
    INSERT INTO digital_archives (title, doc_number, category, file_url, file_size, upload_date, uploaded_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, cleanText(req.body?.doc_number, 80) || null, category, fileUrl || '#', cleanText(req.body?.file_size, 20) || null, now, cleanText(req.body?.uploaded_by, 120) || profile?.name || 'Petugas Arsip', cleanText(req.body?.notes, 1000) || null);
  const document = db.prepare('SELECT * FROM digital_archives WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, document, message: 'Dokumen arsip digital resmi tersimpan di repositori' });
});

// ==========================================
// 18. E-LEARNING (LMS TERPADU) (MODUL 17)
// ==========================================
// Helper YouTube embed formatter
function formatVideoEmbed(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('youtu.be/')) {
    const videoId = trimmed.split('youtu.be/')[1]?.split(/[?&#]/)[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed;
  } else if (trimmed.includes('youtube.com/watch')) {
    try {
      const urlObj = new URL(trimmed);
      const v = urlObj.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : trimmed;
    } catch {
      const match = trimmed.match(/[?&]v=([^&#]+)/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : trimmed;
    }
  } else if (trimmed.includes('youtube.com/embed/')) {
    return trimmed;
  }
  return trimmed;
}

app.get('/api/elearning/modules', (req, res) => {
  try {
    const modules = db.prepare('SELECT * FROM elearning_modules ORDER BY id DESC').all();
    res.json(modules);
  } catch (err) {
    sendError(res, err, 'Gagal memuat modul');
  }
});

app.post('/api/elearning/modules', (req, res) => {
  try {
    if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya guru/staf yang dapat mengunggah materi pembelajaran.' });
    const { subject_name, class_name, teacher_name, title, description, file_url, video_url } = req.body || {};
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Judul modul pembelajaran wajib diisi!' });
    }
    const formattedVideo = formatVideoEmbed(video_url);
    const now = todayStr();
    const stmt = db.prepare(`
      INSERT INTO elearning_modules (subject_name, class_name, teacher_name, title, description, file_url, video_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      subject_name || 'Umum',
      class_name || 'Semua Kelas',
      teacher_name || 'Guru Pengampu',
      title.trim(),
      description || '',
      file_url || '',
      formattedVideo,
      now
    );
    const newModule = db.prepare('SELECT * FROM elearning_modules WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, moduleId: result.lastInsertRowid, module: newModule, message: 'Materi pembelajaran e-learning berhasil diunggah' });
  } catch (err) {
    sendError(res, err, 'Gagal membuat modul');
  }
});

app.delete('/api/elearning/modules/:id', (req, res) => {
  try {
    if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya guru/staf yang dapat menghapus modul.' });
    const id = Number(req.params.id);
    const removed = transaction(() => {
      const tasks = db.prepare('SELECT id FROM elearning_tasks WHERE module_id = ?').all(id);
      for (const t of tasks) {
        db.prepare('DELETE FROM elearning_submissions WHERE task_id = ?').run(t.id);
      }
      db.prepare('DELETE FROM elearning_tasks WHERE module_id = ?').run(id);
      db.prepare('DELETE FROM elearning_discussions WHERE module_id = ?').run(id);
      return db.prepare('DELETE FROM elearning_modules WHERE id = ?').run(id).changes;
    });
    if (!removed) return res.status(404).json({ success: false, message: 'Modul tidak ditemukan.' });
    res.json({ success: true, message: 'Modul pembelajaran berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus modul');
  }
});

app.get(['/api/elearning/tasks', '/api/elearning/tasks/:moduleId'], (req, res) => {
  try {
    if (req.params.moduleId) {
      const tasks = db.prepare('SELECT * FROM elearning_tasks WHERE module_id = ? ORDER BY id DESC').all(req.params.moduleId);
      res.json(tasks);
    } else {
      const tasks = db.prepare('SELECT * FROM elearning_tasks ORDER BY id DESC').all();
      res.json(tasks);
    }
  } catch (err) {
    sendError(res, err, 'Gagal memuat tugas');
  }
});

app.post('/api/elearning/tasks', (req, res) => {
  try {
    if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya guru/staf yang dapat membuat tugas.' });
    const { module_id, title, description, deadline, max_score = 100 } = req.body || {};
    if (typeof title !== 'string' || !title.trim() || !module_id) {
      return res.status(400).json({ success: false, message: 'Judul tugas dan modul target wajib diisi!' });
    }
    if (!db.prepare('SELECT id FROM elearning_modules WHERE id = ?').get(Number(module_id))) {
      return res.status(404).json({ success: false, message: 'Modul target tidak ditemukan.' });
    }
    const now = todayStr();
    const stmt = db.prepare(`
      INSERT INTO elearning_tasks (module_id, title, description, deadline, max_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(Number(module_id), title.trim(), description || '', deadline || 'Segera', Number(max_score) || 100, now);
    res.status(201).json({ success: true, taskId: result.lastInsertRowid, message: 'Tugas e-learning berhasil dibuat untuk siswa' });
  } catch (err) {
    sendError(res, err, 'Gagal membuat tugas');
  }
});

app.delete('/api/elearning/tasks/:id', (req, res) => {
  try {
    if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya guru/staf yang dapat menghapus tugas.' });
    const id = Number(req.params.id);
    const removed = transaction(() => {
      db.prepare('DELETE FROM elearning_submissions WHERE task_id = ?').run(id);
      return db.prepare('DELETE FROM elearning_tasks WHERE id = ?').run(id).changes;
    });
    if (!removed) return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    res.json({ success: true, message: 'Tugas e-learning berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus tugas');
  }
});

app.get('/api/elearning/submissions/:taskId', (req, res) => {
  try {
    if (!isStaffRole(req.auth.role)) {
      // Siswa hanya melihat jawaban miliknya sendiri.
      const profile = getSessionProfile(req.auth);
      const ownId = profile?.student?.id ?? profile?.id ?? -1;
      return res.json(db.prepare('SELECT * FROM elearning_submissions WHERE task_id = ? AND student_id = ? ORDER BY id DESC').all(req.params.taskId, ownId));
    }
    const subs = db.prepare('SELECT * FROM elearning_submissions WHERE task_id = ? ORDER BY id DESC').all(req.params.taskId);
    res.json(subs);
  } catch (err) {
    sendError(res, err, 'Gagal memuat submisi');
  }
});

app.post('/api/elearning/submissions', (req, res) => {
  try {
    const taskId = toNumber(req.body?.task_id);
    const submissionText = cleanText(req.body?.submission_text, 20000);
    if (!submissionText) {
      return res.status(400).json({ success: false, message: 'Teks jawaban tugas wajib diisi!' });
    }
    const task = taskId ? db.prepare('SELECT * FROM elearning_tasks WHERE id = ?').get(taskId) : null;
    if (!task) return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    const profile = getSessionProfile(req.auth);
    const studentId = isStaffRole(req.auth.role) ? toNumber(req.body?.student_id, 0) : (profile?.student?.id ?? profile?.id ?? 0);
    const studentName = cleanText(req.body?.student_name, 120) || profile?.name || 'Siswa';
    const now = nowStamp();

    // Pengumpulan ulang sebelum dinilai memperbarui jawaban lama, bukan menggandakan.
    const existing = db.prepare('SELECT * FROM elearning_submissions WHERE task_id = ? AND student_id = ? ORDER BY id DESC LIMIT 1').get(taskId, studentId);
    if (existing && existing.score !== null) {
      return res.status(409).json({ success: false, message: 'Tugas ini sudah dinilai guru dan tidak dapat dikirim ulang.' });
    }
    let submissionId;
    if (existing) {
      db.prepare('UPDATE elearning_submissions SET submission_text = ?, submitted_at = ?, student_name = ? WHERE id = ?').run(submissionText, now, studentName, existing.id);
      submissionId = existing.id;
    } else {
      const result = db.prepare(`
        INSERT INTO elearning_submissions (task_id, student_id, student_name, submission_text, submitted_at, score, feedback)
        VALUES (?, ?, ?, ?, ?, NULL, 'Menunggu penilaian guru')
      `).run(taskId, studentId, studentName, submissionText, now);
      submissionId = result.lastInsertRowid;
    }
    const submission = db.prepare('SELECT * FROM elearning_submissions WHERE id = ?').get(submissionId);
    res.status(existing ? 200 : 201).json({ success: true, submission, updated: Boolean(existing), message: existing ? 'Jawaban tugas berhasil diperbarui!' : 'Jawaban tugas siswa berhasil dikumpulkan!' });
  } catch (err) {
    sendError(res, err, 'Gagal mengirim jawaban tugas');
  }
});

// Penilaian tugas oleh guru
app.put('/api/elearning/submissions/:id', (req, res) => {
  try {
    if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya guru/staf yang dapat menilai tugas.' });
    const submission = db.prepare('SELECT s.*, t.max_score FROM elearning_submissions s LEFT JOIN elearning_tasks t ON t.id = s.task_id WHERE s.id = ?').get(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Jawaban tugas tidak ditemukan.' });
    const maxScore = Number(submission.max_score) || 100;
    const score = toNumber(req.body?.score);
    if (score === null || score < 0 || score > maxScore) return res.status(400).json({ success: false, message: `Nilai harus berupa angka 0-${maxScore}.` });
    db.prepare('UPDATE elearning_submissions SET score = ?, feedback = ? WHERE id = ?').run(Math.round(score), cleanText(req.body?.feedback, 2000) || 'Sudah dinilai guru', submission.id);
    const updated = db.prepare('SELECT * FROM elearning_submissions WHERE id = ?').get(submission.id);
    res.json({ success: true, submission: updated, message: 'Nilai tugas berhasil disimpan.' });
  } catch (err) {
    sendError(res, err, 'Gagal menyimpan nilai tugas');
  }
});

app.get('/api/elearning/discussions/:moduleId', (req, res) => {
  try {
    const msgs = db.prepare('SELECT * FROM elearning_discussions WHERE module_id = ? ORDER BY id ASC').all(req.params.moduleId);
    res.json(msgs);
  } catch (err) {
    sendError(res, err, 'Gagal memuat diskusi');
  }
});

app.post('/api/elearning/discussions', (req, res) => {
  try {
    const { module_id, user_name, user_role, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Pesan komentar tidak boleh kosong!' });
    }
    const now = nowStamp();
    const stmt = db.prepare(`
      INSERT INTO elearning_discussions (module_id, user_name, user_role, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const profile = getSessionProfile(req.auth);
    stmt.run(Number(module_id), cleanText(user_name, 120) || profile?.name || 'Pengguna', cleanText(user_role, 60) || profile?.badge || req.auth.role || 'Warga Sekolah', message.trim(), now);
    res.status(201).json({ success: true, message: 'Komentar diskusi terkirim' });
  } catch (err) {
    sendError(res, err, 'Gagal mengirim komentar');
  }
});

// ==========================================
// 19. E-RAPOR & TRANSKRIP NILAI SISWA
// ==========================================
function currentAcademicYear(date = new Date()) {
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
}

app.get('/api/erapor/grades', (req, res) => {
  let studentId = toNumber(req.query.student_id, 1);
  if (!isStaffRole(req.auth.role)) {
    // Siswa/orang tua hanya melihat nilai siswa yang terkait dengan akunnya.
    const profile = getSessionProfile(req.auth);
    if (!profile?.student) return res.json([]);
    studentId = profile.student.id;
  }
  const semester = cleanText(req.query.semester, 20);
  const academicYear = cleanText(req.query.academic_year, 20);
  let query = 'SELECT * FROM grades WHERE student_id = ?';
  const params = [studentId];
  if (semester) { query += ' AND semester = ?'; params.push(semester); }
  if (academicYear) { query += ' AND academic_year = ?'; params.push(academicYear); }
  query += ' ORDER BY academic_year DESC, semester DESC, subject_name ASC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/erapor/grades', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya guru/staf yang dapat menginput nilai.' });
  const studentId = toNumber(req.body?.student_id);
  const subjectName = cleanText(req.body?.subject_name, 120);
  const semester = cleanText(req.body?.semester, 20) || 'Ganjil';
  const academicYear = cleanText(req.body?.academic_year, 20) || currentAcademicYear();
  const formative = toNumber(req.body?.formative_score);
  const midterm = toNumber(req.body?.midterm_score);
  const finalScore = toNumber(req.body?.final_score);
  if (!studentId) return res.status(400).json({ success: false, message: 'Siswa wajib dipilih.' });
  if (!subjectName) return res.status(400).json({ success: false, message: 'Mata pelajaran wajib diisi.' });
  if ([formative, midterm, finalScore].some((value) => value === null || value < 0 || value > 100)) return res.status(400).json({ success: false, message: 'Setiap komponen nilai harus berupa angka 0-100.' });
  const student = getLinkedStudent(studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
  const studentName = cleanText(req.body?.student_name, 120) || student.name;
  const className = cleanText(req.body?.class_name, 60) || student.class_name || 'Belum ada kelas';
  const competence = cleanText(req.body?.competence_achievement, 2000);
  const notes = cleanText(req.body?.teacher_notes, 2000);
  const final_grade = Math.round(((formative * 0.4) + (midterm * 0.3) + (finalScore * 0.3)) * 10) / 10;
  const predicate = final_grade >= 90 ? 'A' : final_grade >= 80 ? 'B' : final_grade >= 70 ? 'C' : 'D';
  
  const existing = db.prepare('SELECT id FROM grades WHERE student_id = ? AND subject_name = ? AND semester = ? AND academic_year = ?').get(studentId, subjectName, semester, academicYear);
  if (existing) {
    db.prepare(`
      UPDATE grades SET student_name = ?, class_name = ?, formative_score = ?, midterm_score = ?, final_score = ?, final_grade = ?, predicate = ?, competence_achievement = ?, teacher_notes = ?
      WHERE id = ?
    `).run(studentName, className, formative, midterm, finalScore, final_grade, predicate, competence, notes, existing.id);
  } else {
    db.prepare(`
      INSERT INTO grades (student_id, student_name, class_name, subject_name, semester, academic_year, formative_score, midterm_score, final_score, final_grade, predicate, competence_achievement, teacher_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(studentId, studentName, className, subjectName, semester, academicYear, formative, midterm, finalScore, final_grade, predicate, competence, notes);
  }
  const grade = db.prepare('SELECT * FROM grades WHERE student_id = ? AND subject_name = ? AND semester = ? AND academic_year = ?').get(studentId, subjectName, semester, academicYear);
  res.status(existing ? 200 : 201).json({ success: true, grade, updated: Boolean(existing), final_grade, predicate, message: existing ? 'Nilai mata pelajaran berhasil diperbarui!' : 'Nilai mata pelajaran berhasil disimpan!' });
});

// ==========================================
// 20. PERPUSTAKAAN DIGITAL (E-LIBRARY)
// ==========================================
app.get('/api/library/books', (req, res) => {
  try {
    const books = db.prepare('SELECT * FROM library_books ORDER BY id DESC').all();
    res.json(books);
  } catch (err) {
    sendError(res, err, 'Gagal memuat katalog buku');
  }
});

app.post('/api/library/books', (req, res) => {
  try {
    const { isbn, title, author, publisher = 'Pustaka Pendidikan', category = 'Buku Pelajaran', total_copies = 1, shelf_location = 'Rak A-01', cover_url = '', year_published = 2024 } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Judul buku wajib diisi!' });
    }
    if (!author || !author.trim()) {
      return res.status(400).json({ success: false, message: 'Penulis/pengarang buku wajib diisi!' });
    }

    const numCopies = Math.max(1, Number(total_copies) || 1);
    const cover = cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300';
    const year = Number(year_published) || new Date().getFullYear();

    // Auto-generate or sanitize unique ISBN with retry loop
    let finalIsbn = isbn && isbn.trim() ? isbn.trim() : null;
    let attempts = 0;
    let inserted = false;
    let lastErr = null;
    let result = null;

    while (!inserted && attempts < 10) {
      attempts++;
      if (!finalIsbn || attempts > 1) {
        finalIsbn = `978-602-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10000 + Math.random() * 90000)}`;
      }
      try {
        const stmt = db.prepare(`
          INSERT INTO library_books (isbn, title, author, publisher, category, total_copies, available_copies, shelf_location, cover_url, year_published)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        result = stmt.run(finalIsbn, title.trim(), author.trim(), publisher, category, numCopies, numCopies, shelf_location || 'Rak Umum', cover, year);
        inserted = true;
      } catch (err) {
        lastErr = err;
        if (err.message && err.message.includes('UNIQUE constraint failed: library_books.isbn')) {
          finalIsbn = null; // force retry with new random ISBN
        } else {
          throw err;
        }
      }
    }

    if (!inserted) {
      throw lastErr || new Error('Gagal menghasilkan ISBN unik');
    }

    const newBook = db.prepare('SELECT * FROM library_books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      success: true,
      bookId: result.lastInsertRowid,
      book: newBook,
      message: `Buku "${title.trim()}" berhasil ditambahkan ke katalog perpustakaan!`
    });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan buku');
  }
});

app.delete('/api/library/books/:id', (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const activeLoans = db.prepare("SELECT COUNT(*) AS count FROM book_loans WHERE book_id = ? AND status = 'dipinjam'").get(bookId).count;
    if (activeLoans > 0) return res.status(409).json({ success: false, message: `Buku masih dipinjam (${activeLoans} eksemplar). Selesaikan pengembalian sebelum menghapus.` });
    const removed = transaction(() => {
      db.prepare('DELETE FROM book_loans WHERE book_id = ?').run(bookId);
      return db.prepare('DELETE FROM library_books WHERE id = ?').run(bookId).changes;
    });
    if (!removed) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan.' });
    res.json({ success: true, message: 'Buku berhasil dihapus dari katalog perpustakaan' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus buku');
  }
});

app.get('/api/library/loans', (req, res) => {
  try {
    const loans = db.prepare('SELECT * FROM book_loans ORDER BY id DESC').all();
    res.json(loans);
  } catch (err) {
    sendError(res, err, 'Gagal memuat daftar peminjaman');
  }
});

app.post('/api/library/loans', (req, res) => {
  try {
    const bookId = toNumber(req.body?.book_id);
    const borrowerType = req.body?.borrower_type === 'guru' ? 'guru' : 'siswa';
    const borrowerId = toNumber(req.body?.borrower_id, 0);
    const borrowerName = cleanText(req.body?.borrower_name, 120);
    const borrowDate = cleanText(req.body?.borrow_date, 10) || todayStr();
    const dueDate = cleanText(req.body?.due_date, 10);
    if (!bookId) return res.status(400).json({ success: false, message: 'Pilih buku yang akan dipinjam.' });
    if (!borrowerName) return res.status(400).json({ success: false, message: 'Nama peminjam wajib diisi.' });
    if (!isValidDate(borrowDate) || !isValidDate(dueDate)) return res.status(400).json({ success: false, message: 'Tanggal pinjam dan jatuh tempo harus valid (YYYY-MM-DD).' });
    if (dueDate < borrowDate) return res.status(400).json({ success: false, message: 'Tanggal jatuh tempo tidak boleh sebelum tanggal pinjam.' });

    const created = transaction(() => {
      const book = db.prepare('SELECT * FROM library_books WHERE id = ?').get(bookId);
      if (!book) throw Object.assign(new Error('Buku tidak ditemukan.'), { httpStatus: 404 });
      if (book.available_copies < 1) throw Object.assign(new Error('Stok buku ini sedang habis dipinjam!'), { httpStatus: 400 });
      const result = db.prepare(`
        INSERT INTO book_loans (book_id, book_title, borrower_type, borrower_id, borrower_name, borrow_date, due_date, status, fine_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'dipinjam', 0, ?)
      `).run(bookId, book.title, borrowerType, borrowerId, borrowerName, borrowDate, dueDate, cleanText(req.body?.notes, 500));
      db.prepare('UPDATE library_books SET available_copies = available_copies - 1 WHERE id = ?').run(bookId);
      return { id: result.lastInsertRowid, title: book.title };
    });

    const loan = db.prepare('SELECT * FROM book_loans WHERE id = ?').get(created.id);
    res.status(201).json({ success: true, loan, message: `Peminjaman buku "${created.title}" berhasil dicatat!` });
  } catch (err) {
    if (err.httpStatus) return res.status(err.httpStatus).json({ success: false, message: err.message });
    sendError(res, err, 'Gagal memproses peminjaman');
  }
});

app.post('/api/library/loans/:id/return', (req, res) => {
  try {
    const loanId = req.params.id;
    const loan = db.prepare('SELECT * FROM book_loans WHERE id = ?').get(loanId);
    if (!loan) return res.status(404).json({ success: false, message: 'Peminjaman tidak ditemukan' });
    if (loan.status === 'dikembalikan') {
      return res.json({ success: true, already_returned: true, message: `Buku "${loan.book_title}" sudah tercatat dikembalikan sebelumnya.` });
    }

    const nowStr = todayStr();
    const lateDays = loan.due_date && nowStr > loan.due_date
      ? Math.max(0, Math.round((new Date(`${nowStr}T00:00:00`) - new Date(`${loan.due_date}T00:00:00`)) / 86400000))
      : 0;
    const fine = lateDays * 1000; // Denda keterlambatan Rp 1.000 per hari
    transaction(() => {
      db.prepare("UPDATE book_loans SET return_date = ?, status = 'dikembalikan', fine_amount = ? WHERE id = ?").run(nowStr, fine, loanId);
      db.prepare('UPDATE library_books SET available_copies = MIN(total_copies, available_copies + 1) WHERE id = ?').run(loan.book_id);
    });

    res.json({
      success: true,
      fine_amount: fine,
      late_days: lateDays,
      message: `Buku "${loan.book_title}" berhasil dikembalikan!${fine ? ` Terlambat ${lateDays} hari, denda Rp ${fine.toLocaleString('id-ID')}.` : ''}`
    });
  } catch (err) {
    sendError(res, err, 'Gagal mengembalikan buku');
  }
});

// ==========================================
// 21. EKSTRAKURIKULER & PRESTASI SISWA
// ==========================================
app.get('/api/extracurriculars', (req, res) => {
  const list = db.prepare('SELECT * FROM extracurriculars ORDER BY name ASC').all();
  res.json(list);
});

app.post('/api/extracurriculars/join', (req, res) => {
  const extracurricularId = toNumber(req.body?.extracurricular_id);
  const profile = getSessionProfile(req.auth);
  const studentName = cleanText(req.body?.student_name, 120) || profile?.name;
  const className = cleanText(req.body?.class_name, 60) || profile?.student?.class_name || null;
  if (!extracurricularId) return res.status(400).json({ success: false, message: 'Pilih ekstrakurikuler yang ingin diikuti.' });
  if (!studentName) return res.status(400).json({ success: false, message: 'Nama pendaftar wajib diisi.' });
  const ekskul = db.prepare('SELECT * FROM extracurriculars WHERE id = ?').get(extracurricularId);
  if (!ekskul) return res.status(404).json({ success: false, message: 'Ekstrakurikuler tidak ditemukan.' });
  const duplicate = db.prepare('SELECT id FROM extracurricular_members WHERE extracurricular_id = ? AND lower(student_name) = lower(?)').get(extracurricularId, studentName);
  if (duplicate) return res.status(409).json({ success: false, message: `${studentName} sudah terdaftar sebagai anggota ${ekskul.name}.` });
  transaction(() => {
    db.prepare('INSERT INTO extracurricular_members (extracurricular_id, student_name, class_name, reason, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(extracurricularId, studentName, className, cleanText(req.body?.reason, 500) || null, nowStamp());
    db.prepare('UPDATE extracurriculars SET member_count = member_count + 1 WHERE id = ?').run(extracurricularId);
  });
  const updated = db.prepare('SELECT * FROM extracurriculars WHERE id = ?').get(extracurricularId);
  res.status(201).json({ success: true, extracurricular: updated, message: `Pendaftaran ekstrakurikuler ${ekskul.name} atas nama ${studentName} berhasil!` });
});

app.get('/api/extracurriculars/:id/members', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Daftar anggota hanya untuk pembina/staf.' });
  const members = db.prepare('SELECT * FROM extracurricular_members WHERE extracurricular_id = ? ORDER BY id DESC').all(Number(req.params.id));
  res.json(members);
});

// ==========================================
// 22. KONSELING BK ONLINE
// ==========================================
app.get('/api/counseling/sessions', (req, res) => {
  const sessions = db.prepare('SELECT * FROM counseling_sessions ORDER BY id DESC').all();
  res.json(sessions);
});

app.post('/api/counseling/sessions', (req, res) => {
  const studentName = cleanText(req.body?.student_name, 120);
  const className = cleanText(req.body?.class_name, 60);
  const topic = cleanText(req.body?.topic, 300);
  const sessionDate = cleanText(req.body?.session_date, 10);
  const sessionTime = cleanText(req.body?.session_time, 5);
  const category = ['akademik', 'pribadi', 'sosial', 'karir'].includes(req.body?.category) ? req.body.category : 'karir';
  const profile = getSessionProfile(req.auth);
  let studentId = toNumber(req.body?.student_id);
  if (!studentId && profile?.student) studentId = profile.student.id;
  if (!studentName || !className || !topic) return res.status(400).json({ success: false, message: 'Nama siswa, kelas, dan topik konseling wajib diisi.' });
  if (!isValidDate(sessionDate) || !/^\d{2}:\d{2}$/.test(sessionTime)) return res.status(400).json({ success: false, message: 'Tanggal (YYYY-MM-DD) dan jam sesi (HH:MM) harus valid.' });
  if (!studentId || !db.prepare('SELECT id FROM students WHERE id = ?').get(studentId)) return res.status(400).json({ success: false, message: 'Siswa yang dipilih tidak ditemukan di Buku Induk.' });
  const counselorName = cleanText(req.body?.counselor_name, 120) || (req.auth.role === 'kepala_bk' ? profile?.name : null) || 'Rina Marlina, S.Psi.';
  const now = nowStamp();
  const result = db.prepare(`
    INSERT INTO counseling_sessions (student_id, student_name, class_name, counselor_name, session_date, session_time, category, topic, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'dijadwalkan', ?)
  `).run(studentId, studentName, className, counselorName, sessionDate, sessionTime, category, topic, cleanText(req.body?.notes, 2000), now);
  const session = db.prepare('SELECT * FROM counseling_sessions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, session, message: 'Jadwal sesi bimbingan konseling berhasil diajukan!' });
});

app.patch('/api/counseling/sessions/:id/status', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya konselor/staf yang dapat mengubah status sesi.' });
  const status = cleanText(req.body?.status, 20);
  if (!['dijadwalkan', 'selesai', 'dibatalkan'].includes(status)) return res.status(400).json({ success: false, message: 'Status sesi tidak valid.' });
  const notes = cleanText(req.body?.notes, 2000) || null;
  const result = db.prepare('UPDATE counseling_sessions SET status = ?, notes = COALESCE(?, notes) WHERE id = ?').run(status, notes, req.params.id);
  if (!result.changes) return res.status(404).json({ success: false, message: 'Sesi konseling tidak ditemukan.' });
  res.json({ success: true, status, message: 'Status sesi konseling diperbarui.' });
});

// ==========================================
// 23. PUSAT KARIER, MAGANG, DAN BEASISWA
// ==========================================
app.get('/api/careers/opportunities', (req, res) => {
  const { type } = req.query;
  const params = [];
  let query = `
    SELECT o.*, COUNT(a.id) AS application_count
    FROM career_opportunities o
    LEFT JOIN career_applications a ON a.opportunity_id = o.id
  `;
  if (type && type !== 'semua') {
    query += ' WHERE o.opportunity_type = ?';
    params.push(type);
  }
  query += ' GROUP BY o.id ORDER BY o.is_active DESC, o.deadline ASC, o.id DESC';
  const opportunities = db.prepare(query).all(...params);
  res.json(opportunities);
});

app.post('/api/careers/opportunities', (req, res) => {
  const { title, opportunity_type, organization, location = '', description, requirements = '', deadline = '', contact_person = '' } = req.body;
  const allowedTypes = ['magang', 'beasiswa', 'karier', 'webinar'];
  const values = [title, organization, description].map((value) => String(value || '').trim());

  if (values.some((value) => !value) || !allowedTypes.includes(opportunity_type)) {
    return res.status(400).json({ success: false, message: 'Judul, jenis, mitra, dan deskripsi peluang wajib diisi.' });
  }
  if (values[0].length > 180 || values[1].length > 120 || values[2].length > 3000) {
    return res.status(400).json({ success: false, message: 'Detail peluang melebihi batas panjang yang diizinkan.' });
  }

  const now = nowStamp();
  const result = db.prepare(`
    INSERT INTO career_opportunities (title, opportunity_type, organization, location, description, requirements, deadline, contact_person, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(values[0], opportunity_type, values[1], String(location).slice(0, 120), values[2], String(requirements).slice(0, 1500), String(deadline).slice(0, 20), String(contact_person).slice(0, 120), now);
  const opportunity = db.prepare('SELECT * FROM career_opportunities WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, opportunity, message: 'Peluang karier berhasil dipublikasikan.' });
});

app.get('/api/careers/applications', (req, res) => {
  const applications = db.prepare(`
    SELECT a.*, o.title AS opportunity_title, o.organization, o.opportunity_type
    FROM career_applications a
    JOIN career_opportunities o ON o.id = a.opportunity_id
    ORDER BY a.id DESC
    LIMIT 100
  `).all();
  res.json(applications);
});

app.post('/api/careers/applications', (req, res) => {
  const { opportunity_id, applicant_name, applicant_role = 'siswa', class_name = '', notes = '' } = req.body;
  const opportunity = db.prepare('SELECT * FROM career_opportunities WHERE id = ? AND is_active = 1').get(Number(opportunity_id));
  const cleanName = String(applicant_name || '').trim();
  if (!opportunity) return res.status(404).json({ success: false, message: 'Peluang yang dipilih sudah tidak tersedia.' });
  if (!cleanName) return res.status(400).json({ success: false, message: 'Nama pendaftar wajib diisi.' });
  if (cleanName.length > 100 || String(notes).length > 1500) {
    return res.status(400).json({ success: false, message: 'Data pendaftaran melebihi batas panjang yang diizinkan.' });
  }
  const existing = db.prepare('SELECT id FROM career_applications WHERE opportunity_id = ? AND applicant_name = ?').get(opportunity.id, cleanName);
  if (existing) return res.status(409).json({ success: false, message: 'Minat untuk peluang ini sudah pernah dikirim.' });

  const now = nowStamp();
  const result = db.prepare(`
    INSERT INTO career_applications (opportunity_id, applicant_name, applicant_role, class_name, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'minat', ?)
  `).run(opportunity.id, cleanName, String(applicant_role).slice(0, 30), String(class_name).slice(0, 80), String(notes).trim(), now);
  const application = db.prepare('SELECT * FROM career_applications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, application, message: 'Minat kamu sudah diteruskan ke pembimbing karier.' });
});

// ==========================================
// 24. RUANG ASPIRASI SEKOLAH
// ==========================================
app.get('/api/feedback/summary', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS count FROM school_feedback').get().count;
  const statusCounts = db.prepare('SELECT status, COUNT(*) AS count FROM school_feedback GROUP BY status').all();
  const categoryCounts = db.prepare('SELECT category, COUNT(*) AS count FROM school_feedback GROUP BY category ORDER BY count DESC').all();
  res.json({ total, statusCounts, categoryCounts });
});

app.get('/api/feedback', (req, res) => {
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const entries = db.prepare('SELECT * FROM school_feedback ORDER BY id DESC LIMIT ?').all(limit);
  res.json(entries);
});

app.post('/api/feedback', (req, res) => {
  const { sender_name = '', sender_role = 'publik', is_anonymous = true, category = 'Lainnya', subject, message } = req.body;
  const cleanSubject = String(subject || '').trim();
  const cleanMessage = String(message || '').trim();
  const allowedCategories = ['Pembelajaran', 'Fasilitas', 'Kegiatan', 'Keamanan', 'Kesejahteraan', 'Lainnya'];
  if (!cleanSubject || !cleanMessage) {
    return res.status(400).json({ success: false, message: 'Topik dan isi aspirasi wajib diisi.' });
  }
  if (cleanSubject.length > 180 || cleanMessage.length > 3000) {
    return res.status(400).json({ success: false, message: 'Isi aspirasi melebihi batas panjang yang diizinkan.' });
  }

  const anonymous = is_anonymous ? 1 : 0;
  const now = nowStamp();
  const submissionCode = `ASP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const result = db.prepare(`
    INSERT INTO school_feedback (submission_code, sender_name, sender_role, is_anonymous, category, subject, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'baru', ?)
  `).run(submissionCode, anonymous ? null : String(sender_name).trim().slice(0, 100), String(sender_role).slice(0, 30), anonymous, allowedCategories.includes(category) ? category : 'Lainnya', cleanSubject, cleanMessage, now);
  const feedback = db.prepare('SELECT * FROM school_feedback WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, feedback, message: 'Aspirasi telah dicatat dengan aman.' });
});

app.patch('/api/feedback/:id/status', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya staf sekolah yang dapat menindaklanjuti aspirasi.' });
  const allowedStatuses = ['baru', 'ditinjau', 'ditindaklanjuti', 'selesai'];
  const { status } = req.body;
  if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Status aspirasi tidak valid.' });
  const result = db.prepare('UPDATE school_feedback SET status = ? WHERE id = ?').run(status, req.params.id);
  if (!result.changes) return res.status(404).json({ success: false, message: 'Aspirasi tidak ditemukan.' });
  res.json({ success: true, message: 'Status aspirasi diperbarui.' });
});

// ==========================================
// 25. UKS & IZIN SISWA
// ==========================================
// Siswa/orang tua hanya melihat catatan UKS & izin milik siswa yang terkait akunnya.
function ownStudentFilter(req) {
  if (isStaffRole(req.auth.role)) return null;
  const profile = getSessionProfile(req.auth);
  return profile?.student || { id: -1, name: '' };
}

app.get('/api/uks/visits', (req, res) => {
  const own = ownStudentFilter(req);
  const visits = own
    ? db.prepare('SELECT * FROM uks_visits WHERE student_id = ? OR (student_id IS NULL AND student_name = ?) ORDER BY visit_date DESC, visit_time DESC, id DESC LIMIT 100').all(own.id, own.name)
    : db.prepare('SELECT * FROM uks_visits ORDER BY visit_date DESC, visit_time DESC, id DESC LIMIT 100').all();
  res.json(visits);
});

app.post('/api/uks/visits', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Kunjungan UKS dicatat oleh petugas sekolah.' });
  const { student_id = null, student_name, class_name = '', visit_date, visit_time, complaint, action_taken = '', disposition = 'kembali_kelas', officer_name = 'Petugas UKS', parent_contacted = false } = req.body || {};
  const allowedDispositions = ['kembali_kelas', 'istirahat_uks', 'pulang_dengan_izin', 'rujukan'];
  const cleanName = String(student_name || '').trim();
  const cleanComplaint = String(complaint || '').trim();
  if (!cleanName || !cleanComplaint) return res.status(400).json({ success: false, message: 'Nama siswa dan keluhan wajib diisi.' });
  if (cleanName.length > 100 || cleanComplaint.length > 1500) return res.status(400).json({ success: false, message: 'Catatan kunjungan melebihi batas yang diizinkan.' });

  const now = new Date();
  const date = visit_date || todayStr(now);
  const time = visit_time || timeStr(now).slice(0, 5);
  const createdAt = nowStamp(now);
  const result = db.prepare(`
    INSERT INTO uks_visits (student_id, student_name, class_name, visit_date, visit_time, complaint, action_taken, disposition, officer_name, parent_contacted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(Number(student_id) || null, cleanName, String(class_name).slice(0, 80), date, time, cleanComplaint, String(action_taken).slice(0, 1500), allowedDispositions.includes(disposition) ? disposition : 'kembali_kelas', String(officer_name).trim().slice(0, 100) || 'Petugas UKS', parent_contacted ? 1 : 0, createdAt);
  const visit = db.prepare('SELECT * FROM uks_visits WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, visit, message: 'Kunjungan UKS berhasil dicatat.' });
});

app.get('/api/uks/permissions', (req, res) => {
  const own = ownStudentFilter(req);
  const permissions = own
    ? db.prepare('SELECT * FROM student_permissions WHERE student_id = ? OR (student_id IS NULL AND student_name = ?) ORDER BY permission_date DESC, id DESC LIMIT 100').all(own.id, own.name)
    : db.prepare('SELECT * FROM student_permissions ORDER BY permission_date DESC, id DESC LIMIT 100').all();
  res.json(permissions);
});

app.post('/api/uks/permissions', (req, res) => {
  const body = { ...(req.body || {}) };
  if (!isStaffRole(req.auth.role)) {
    // Siswa/orang tua hanya bisa mengajukan izin untuk siswa yang terkait akunnya.
    const profile = getSessionProfile(req.auth);
    if (!profile?.student) return res.status(403).json({ success: false, message: 'Akun Anda belum terhubung dengan data siswa.' });
    body.student_id = profile.student.id;
    body.student_name = profile.student.name;
    body.class_name = profile.student.class_name || '';
    if (profile.role === 'ortu') {
      body.parent_name = body.parent_name || profile.name;
      body.parent_phone = body.parent_phone || profile.phone || '';
    }
  }
  const { student_id = null, student_name, class_name = '', permission_date, permission_type = 'izin', reason, parent_name = '', parent_phone = '' } = body;
  const allowedTypes = ['sakit', 'izin', 'dispensasi'];
  const cleanName = String(student_name || '').trim();
  const cleanReason = String(reason || '').trim();
  if (!cleanName || !cleanReason) return res.status(400).json({ success: false, message: 'Nama siswa dan alasan izin wajib diisi.' });
  if (cleanName.length > 100 || cleanReason.length > 1500) return res.status(400).json({ success: false, message: 'Detail izin melebihi batas yang diizinkan.' });
  const now = new Date();
  const createdAt = nowStamp(now);
  const result = db.prepare(`
    INSERT INTO student_permissions (student_id, student_name, class_name, permission_date, permission_type, reason, parent_name, parent_phone, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', ?)
  `).run(Number(student_id) || null, cleanName, String(class_name).slice(0, 80), permission_date || todayStr(now), allowedTypes.includes(permission_type) ? permission_type : 'izin', cleanReason, String(parent_name).slice(0, 100), String(parent_phone).slice(0, 40), createdAt);
  const permission = db.prepare('SELECT * FROM student_permissions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, permission, message: 'Permohonan izin berhasil diajukan.' });
});

app.patch('/api/uks/permissions/:id/status', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya petugas sekolah yang dapat meninjau permohonan izin.' });
  const { status, reviewed_by = getSessionProfile(req.auth)?.name || 'Petugas Sekolah' } = req.body || {};
  if (!['menunggu', 'disetujui', 'ditolak'].includes(status)) return res.status(400).json({ success: false, message: 'Status izin tidak valid.' });
  const result = db.prepare('UPDATE student_permissions SET status = ?, reviewed_by = ? WHERE id = ?').run(status, String(reviewed_by).slice(0, 100), req.params.id);
  if (!result.changes) return res.status(404).json({ success: false, message: 'Data izin tidak ditemukan.' });
  res.json({ success: true, message: 'Status izin berhasil diperbarui.' });
});

// ==========================================
// 26. PUSAT BANTUAN & TIKET LAYANAN
// ==========================================
app.get('/api/support/tickets', (req, res) => {
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;
  const tickets = db.prepare('SELECT * FROM support_tickets ORDER BY id DESC LIMIT ?').all(limit);
  res.json(tickets);
});

app.post('/api/support/tickets', (req, res) => {
  const {
    requester_name,
    requester_role = 'publik',
    category = 'Lainnya',
    subject,
    message,
    priority = 'normal'
  } = req.body;

  const cleanName = String(requester_name || '').trim();
  const cleanSubject = String(subject || '').trim();
  const cleanMessage = String(message || '').trim();
  const allowedPriorities = ['normal', 'tinggi'];

  if (!cleanName || !cleanSubject || !cleanMessage) {
    return res.status(400).json({ success: false, message: 'Nama, topik, dan detail kendala wajib diisi.' });
  }
  if (cleanName.length > 100 || cleanSubject.length > 180 || cleanMessage.length > 3000) {
    return res.status(400).json({ success: false, message: 'Detail tiket melebihi batas panjang yang diizinkan.' });
  }

  const now = nowStamp();
  const ticketNumber = `TKT-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const result = db.prepare(`
    INSERT INTO support_tickets (ticket_number, requester_name, requester_role, category, subject, message, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'baru', ?)
  `).run(
    ticketNumber,
    cleanName,
    String(requester_role).slice(0, 30),
    String(category).trim().slice(0, 80) || 'Lainnya',
    cleanSubject,
    cleanMessage,
    allowedPriorities.includes(priority) ? priority : 'normal',
    now
  );
  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, ticket, message: 'Tiket bantuan berhasil dibuat.' });
});

// ==========================================
// 26. DOMPET DIGITAL & TOP-UP (SMART SCHOOL CARD)
// ==========================================

// Get user wallet (or auto-create one if not yet initialized)
// Dompet diidentifikasi dari sesi login (bukan parameter query) agar akun
// tidak bisa membaca atau memakai dompet milik akun lain.
function getSessionWallet(profile, { create = false } = {}) {
  if (!profile) return null;
  let wallet = profile.accountType === 'user'
    ? db.prepare('SELECT * FROM wallets WHERE holder_role = ? AND (user_id = ? OR holder_name = ?) ORDER BY (user_id = ?) DESC, id ASC LIMIT 1').get(profile.role, profile.id, profile.name, profile.id)
    : db.prepare('SELECT * FROM wallets WHERE holder_role = ? AND holder_name = ? ORDER BY id ASC LIMIT 1').get(profile.role, profile.name);
  if (!wallet && create) {
    const cardNum = `CARD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const result = db.prepare(`
      INSERT INTO wallets (user_id, card_number, holder_name, holder_role, holder_identifier, balance, status, created_at)
      VALUES (?, ?, ?, ?, ?, 0, 'aktif', ?)
    `).run(profile.accountType === 'user' ? profile.id : null, cardNum, profile.name, profile.role, profile.student?.nisn || profile.username, nowStamp());
    wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(result.lastInsertRowid);
  }
  return wallet;
}

app.get('/api/wallet/my-wallet', (req, res) => {
  const profile = getSessionProfile(req.auth);
  if (!profile) return res.status(401).json({ success: false, code: 'SESSION_INVALID', message: 'Sesi tidak lagi valid.' });
  const { pin, ...wallet } = getSessionWallet(profile, { create: true });
  res.json({ success: true, wallet, holder: { name: profile.name, role: profile.role, identifier: wallet.holder_identifier } });
});

// Get transactions for a wallet
app.get('/api/wallet/transactions/:walletId', (req, res) => {
  if (!isStaffRole(req.auth.role)) {
    const own = getSessionWallet(getSessionProfile(req.auth));
    if (!own || own.id !== Number(req.params.walletId)) return res.status(403).json({ success: false, message: 'Anda hanya dapat melihat mutasi dompet milik sendiri.' });
  }
  const txs = db.prepare(`
    SELECT * FROM wallet_transactions 
    WHERE wallet_id = ? 
    ORDER BY id DESC 
    LIMIT 50
  `).all(req.params.walletId);
  res.json({ success: true, transactions: txs });
});

// Process Top-Up
app.post('/api/wallet/topup', (req, res) => {
  const { wallet_id, amount, method, reference_number } = req.body;
  const numAmount = Number(amount);
  if (!wallet_id || !numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Nominal top-up tidak valid' });
  }

  const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(wallet_id);
  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Dompet tidak ditemukan' });
  }
  if (!isStaffRole(req.auth.role)) {
    const own = getSessionWallet(getSessionProfile(req.auth));
    if (!own || own.id !== wallet.id) return res.status(403).json({ success: false, message: 'Anda hanya dapat mengisi saldo dompet milik sendiri.' });
  }
  if (wallet.status !== 'aktif') return res.status(400).json({ success: false, message: 'Dompet ini sedang dibekukan/nonaktif.' });
  if (numAmount < 1000 || numAmount > 5000000) return res.status(400).json({ success: false, message: 'Nominal top-up minimal Rp 1.000 dan maksimal Rp 5.000.000.' });

  const now = nowStamp();
  const txCode = `TX-TOPUP-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
  const ref = reference_number || `${(method || 'QRIS').toUpperCase()}-${Date.now().toString().slice(-6)}`;
  
  let methodLabel = 'QRIS Dinamis';
  if (method === 'va') methodLabel = 'Virtual Account Bank';
  if (method === 'cash') methodLabel = 'Setor Tunai Kasir Sekolah';

  const desc = `Top-Up Saldo Dompet via ${methodLabel}`;

  transaction(() => {
    db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(numAmount, wallet.id);
    db.prepare(`
      INSERT INTO wallet_transactions (wallet_id, transaction_code, type, amount, fee, description, method, status, reference_number, created_at)
      VALUES (?, ?, 'topup', ?, 0, ?, ?, 'success', ?, ?)
    `).run(wallet.id, txCode, numAmount, desc, method || 'qris', ref, now);
  });

  const updatedWallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(wallet_id);
  res.json({
    success: true,
    message: `Top-Up sebesar Rp ${numAmount.toLocaleString('id-ID')} berhasil! Saldo baru: Rp ${updatedWallet.balance.toLocaleString('id-ID')}`,
    wallet: updatedWallet
  });
});

// Transfer balance
app.post('/api/wallet/transfer', (req, res) => {
  const { sender_wallet_id, target_card_number, amount, notes } = req.body;
  const numAmount = Number(amount);
  if (!sender_wallet_id || !target_card_number || !numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Data transfer tidak valid' });
  }

  const sender = db.prepare('SELECT * FROM wallets WHERE id = ?').get(sender_wallet_id);
  if (!sender) return res.status(404).json({ success: false, message: 'Dompet pengirim tidak ditemukan' });
  if (!isStaffRole(req.auth.role)) {
    const own = getSessionWallet(getSessionProfile(req.auth));
    if (!own || own.id !== sender.id) return res.status(403).json({ success: false, message: 'Anda hanya dapat mentransfer dari dompet milik sendiri.' });
  }
  if (sender.status !== 'aktif') return res.status(400).json({ success: false, message: 'Dompet pengirim sedang dibekukan/nonaktif.' });
  if (sender.balance < numAmount) {
    return res.status(400).json({ success: false, message: 'Saldo tidak mencukupi untuk melakukan transfer' });
  }

  const target = db.prepare('SELECT * FROM wallets WHERE card_number = ?').get(target_card_number);
  if (!target) {
    return res.status(404).json({ success: false, message: 'Nomor kartu tujuan tidak ditemukan' });
  }
  if (target.id === sender.id) {
    return res.status(400).json({ success: false, message: 'Tidak dapat transfer ke kartu sendiri' });
  }

  const now = nowStamp();
  const stamp = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
  const txCodeOut = `TX-TRF-OUT-${stamp}`;
  const txCodeIn = `TX-TRF-IN-${stamp}`;
  const cleanNotes = cleanText(notes, 200);

  const transferred = transaction(() => {
    // Saldo diperiksa ulang di dalam transaksi agar dua transfer bersamaan tidak membuat saldo negatif.
    const debit = db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ? AND balance >= ?').run(numAmount, sender.id, numAmount);
    if (!debit.changes) return false;
    db.prepare(`
      INSERT INTO wallet_transactions (wallet_id, transaction_code, type, amount, fee, description, method, status, reference_number, created_at)
      VALUES (?, ?, 'transfer_out', ?, 0, ?, 'transfer', 'success', ?, ?)
    `).run(sender.id, txCodeOut, numAmount, `Transfer saldo ke ${target.holder_name} (${target.card_number})${cleanNotes ? ': ' + cleanNotes : ''}`, target.card_number, now);
    db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(numAmount, target.id);
    db.prepare(`
      INSERT INTO wallet_transactions (wallet_id, transaction_code, type, amount, fee, description, method, status, reference_number, created_at)
      VALUES (?, ?, 'transfer_in', ?, 0, ?, 'transfer', 'success', ?, ?)
    `).run(target.id, txCodeIn, numAmount, `Terima saldo dari ${sender.holder_name} (${sender.card_number})${cleanNotes ? ': ' + cleanNotes : ''}`, sender.card_number, now);
    return true;
  });
  if (!transferred) return res.status(400).json({ success: false, message: 'Saldo tidak mencukupi untuk melakukan transfer' });

  const updatedSender = db.prepare('SELECT * FROM wallets WHERE id = ?').get(sender.id);
  res.json({
    success: true,
    message: `Transfer Rp ${numAmount.toLocaleString('id-ID')} ke ${target.holder_name} berhasil!`,
    wallet: updatedSender
  });
});

// Admin list all wallets
app.get('/api/wallet/all', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Monitoring seluruh dompet hanya untuk staf sekolah.' });
  const wallets = db.prepare('SELECT id, user_id, card_number, holder_name, holder_role, holder_identifier, balance, status, created_at FROM wallets ORDER BY balance DESC').all();
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_cards,
      COALESCE(SUM(balance), 0) as total_circulating_balance
    FROM wallets
  `).get();
  res.json({ success: true, wallets, summary });
});


// ==========================================
// 27. KANTIN ONLINE & KOPERASI DIGITAL SEKOLAH
// ==========================================

// Get all products
app.get('/api/canteen/products', (req, res) => {
  const category = req.query.category;
  let products;
  if (category && category !== 'all') {
    products = db.prepare('SELECT * FROM canteen_products WHERE category = ? ORDER BY id DESC').all(category);
  } else {
    products = db.prepare('SELECT * FROM canteen_products ORDER BY category ASC, id DESC').all();
  }
  res.json({ success: true, products });
});

// Create product (Admin / Kasir Kantin)
app.post('/api/canteen/products', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya kasir/staf yang dapat mengelola produk kantin.' });
  const { name, category, price, stock, image_url, description, stand_name, digital_type } = req.body || {};
  if (!name || !price || !category) {
    return res.status(400).json({ success: false, message: 'Nama, kategori, dan harga produk wajib diisi' });
  }
  if (!['makanan', 'minuman', 'digital', 'koperasi'].includes(category)) return res.status(400).json({ success: false, message: 'Kategori produk tidak dikenal.' });
  if (!(Number(price) > 0)) return res.status(400).json({ success: false, message: 'Harga produk harus lebih dari 0.' });
  const now = todayStr();
  const result = db.prepare(`
    INSERT INTO canteen_products (name, category, price, stock, image_url, description, stand_name, is_available, digital_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    name,
    category,
    Number(price),
    Number(stock) || 50,
    image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    description || '',
    stand_name || 'Kantin Utama Sekolah',
    digital_type || null,
    now
  );
  const newProd = db.prepare('SELECT * FROM canteen_products WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, message: 'Produk berhasil ditambahkan ke kantin', product: newProd });
});

// Update product (pembaruan parsial: field yang tidak dikirim mempertahankan nilai lama)
app.put('/api/canteen/products/:id', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya kasir/staf yang dapat mengelola produk kantin.' });
  const existing = db.prepare('SELECT * FROM canteen_products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
  const body = req.body || {};
  const name = cleanText(body.name ?? existing.name, 150);
  const category = body.category === undefined ? existing.category : body.category;
  const price = body.price === undefined ? existing.price : toNumber(body.price, -1);
  const stock = body.stock === undefined ? existing.stock : toNumber(body.stock, -1);
  if (!name) return res.status(400).json({ success: false, message: 'Nama produk wajib diisi.' });
  if (!['makanan', 'minuman', 'digital', 'koperasi'].includes(category)) return res.status(400).json({ success: false, message: 'Kategori produk tidak dikenal.' });
  if (price <= 0) return res.status(400).json({ success: false, message: 'Harga produk harus lebih dari 0.' });
  if (stock < 0) return res.status(400).json({ success: false, message: 'Stok tidak boleh negatif.' });
  db.prepare(`
    UPDATE canteen_products
    SET name = ?, category = ?, price = ?, stock = ?, image_url = ?, description = ?, stand_name = ?, is_available = ?, digital_type = ?
    WHERE id = ?
  `).run(
    name,
    category,
    Math.round(price),
    Math.round(stock),
    body.image_url === undefined ? existing.image_url : (cleanText(body.image_url, 1000) || existing.image_url),
    body.description === undefined ? existing.description : cleanText(body.description, 1000),
    body.stand_name === undefined ? existing.stand_name : (cleanText(body.stand_name, 120) || existing.stand_name),
    body.is_available === undefined ? existing.is_available : (body.is_available ? 1 : 0),
    body.digital_type === undefined ? existing.digital_type : (cleanText(body.digital_type, 60) || null),
    existing.id
  );
  const product = db.prepare('SELECT * FROM canteen_products WHERE id = ?').get(existing.id);
  res.json({ success: true, product, message: 'Produk kantin berhasil diperbarui' });
});

// Delete product
app.delete('/api/canteen/products/:id', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya kasir/staf yang dapat mengelola produk kantin.' });
  const result = db.prepare('DELETE FROM canteen_products WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
  res.json({ success: true, message: 'Produk berhasil dihapus' });
});

// Get orders
app.get('/api/canteen/orders', (req, res) => {
  const buyer_name = cleanText(req.query.buyer_name, 120);
  let orders;
  if (!isStaffRole(req.auth.role)) {
    // Siswa/orang tua hanya melihat pesanan miliknya sendiri.
    const profile = getSessionProfile(req.auth);
    orders = db.prepare('SELECT * FROM canteen_orders WHERE buyer_name = ? AND buyer_role = ? ORDER BY id DESC LIMIT 50').all(profile?.name || '', req.auth.role);
  } else if (buyer_name) {
    orders = db.prepare('SELECT * FROM canteen_orders WHERE buyer_name = ? ORDER BY id DESC LIMIT 50').all(buyer_name);
  } else {
    orders = db.prepare('SELECT * FROM canteen_orders ORDER BY id DESC LIMIT 100').all();
  }
  const parsed = orders.map(o => {
    try {
      return { ...o, items: JSON.parse(o.items_json) };
    } catch {
      return { ...o, items: [] };
    }
  });
  res.json({ success: true, orders: parsed });
});

// Place Order
app.post('/api/canteen/order', (req, res) => {
  const profile = getSessionProfile(req.auth);
  if (!profile) return res.status(401).json({ success: false, code: 'SESSION_INVALID', message: 'Sesi tidak lagi valid.' });
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const paymentMethod = ['wallet', 'qris', 'cash'].includes(req.body?.payment_method) ? req.body.payment_method : null;
  const staffOverride = isStaffRole(req.auth.role);
  const buyerName = (staffOverride && cleanText(req.body?.buyer_name, 120)) || profile.name;
  const buyerRole = (staffOverride && cleanText(req.body?.buyer_role, 30)) || profile.role;
  const buyerIdentifier = cleanText(req.body?.buyer_identifier, 60) || profile.student?.nisn || profile.username;
  const pickupTime = cleanText(req.body?.pickup_time, 60) || 'Istirahat 1 (09.30)';
  const notes = cleanText(req.body?.notes, 300);
  const digitalTarget = cleanText(req.body?.digital_target, 80) || null;

  if (!items.length) return res.status(400).json({ success: false, message: 'Keranjang belanja kosong' });
  if (!paymentMethod) return res.status(400).json({ success: false, message: 'Metode pembayaran tidak valid (wallet, qris, atau cash).' });

  // Harga & stok diambil ulang dari database agar tidak bisa dimanipulasi dari sisi klien.
  const normalizedItems = [];
  for (const item of items) {
    const quantity = Math.max(1, Math.round(toNumber(item?.quantity, 1)));
    const productId = toNumber(item?.id);
    const product = productId ? db.prepare('SELECT * FROM canteen_products WHERE id = ?').get(productId) : null;
    if (!product) return res.status(400).json({ success: false, message: `Produk "${cleanText(item?.name, 60) || 'tidak dikenal'}" tidak ditemukan di katalog kantin.` });
    if (!product.is_available) return res.status(400).json({ success: false, message: `Produk "${product.name}" sedang tidak tersedia.` });
    if (product.category !== 'digital' && product.stock < quantity) return res.status(400).json({ success: false, message: `Stok "${product.name}" hanya tersisa ${product.stock}.` });
    normalizedItems.push({ id: product.id, name: product.name, price: product.price, quantity, category: product.category, digital_type: product.digital_type || null, stand_name: product.stand_name });
  }
  const hasDigital = normalizedItems.some((item) => item.category === 'digital');
  const totalAmount = normalizedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const now = nowStamp();
  const orderNumber = `KNT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const serialNumber = hasDigital ? Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join('-') : null;

  let wallet = null;
  if (paymentMethod === 'wallet') {
    wallet = getSessionWallet(profile);
    if (!wallet) return res.status(400).json({ success: false, message: 'Dompet digital Anda belum aktif. Silakan buka menu Dompet Digital.' });
    if (wallet.status !== 'aktif') return res.status(400).json({ success: false, message: 'Dompet digital Anda sedang dibekukan/nonaktif.' });
    if (wallet.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Saldo tidak cukup! Saldo Anda: Rp ${wallet.balance.toLocaleString('id-ID')}, Total pesanan: Rp ${totalAmount.toLocaleString('id-ID')}. Silakan isi saldo terlebih dahulu.`
      });
    }
  }

  try {
    const orderId = transaction(() => {
      if (wallet) {
        const debit = db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ? AND balance >= ?').run(totalAmount, wallet.id, totalAmount);
        if (!debit.changes) throw Object.assign(new Error('Saldo dompet tidak mencukupi.'), { httpStatus: 400 });
        db.prepare(`
          INSERT INTO wallet_transactions (wallet_id, transaction_code, type, amount, fee, description, method, status, reference_number, created_at)
          VALUES (?, ?, ?, ?, 0, ?, 'wallet_deduct', 'success', ?, ?)
        `).run(wallet.id, `TX-PAY-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`, hasDigital ? 'payment_digital' : 'payment_canteen', totalAmount, `Pembayaran Pesanan Kantin #${orderNumber} (${normalizedItems.length} item)`, orderNumber, now);
      }
      for (const item of normalizedItems) {
        if (item.category !== 'digital') {
          const updated = db.prepare('UPDATE canteen_products SET stock = stock - ? WHERE id = ? AND stock >= ?').run(item.quantity, item.id, item.quantity);
          if (!updated.changes) throw Object.assign(new Error(`Stok "${item.name}" tidak mencukupi.`), { httpStatus: 400 });
        }
      }
      const result = db.prepare(`
        INSERT INTO canteen_orders (order_number, buyer_name, buyer_role, buyer_identifier, total_amount, payment_method, payment_status, order_status, pickup_time, notes, digital_target, serial_number, items_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orderNumber, buyerName, buyerRole, buyerIdentifier, totalAmount, paymentMethod, paymentMethod === 'cash' ? 'pending' : 'paid', hasDigital ? 'selesai' : 'diproses', pickupTime, notes, digitalTarget, serialNumber, JSON.stringify(normalizedItems), now);
      return result.lastInsertRowid;
    });

    const newOrder = db.prepare('SELECT * FROM canteen_orders WHERE id = ?').get(orderId);
    const updatedWallet = wallet ? db.prepare('SELECT * FROM wallets WHERE id = ?').get(wallet.id) : null;
    res.status(201).json({
      success: true,
      message: hasDigital
        ? `Pembelian produk digital berhasil! Kode Token/SN: ${serialNumber}`
        : `Pesanan #${orderNumber} berhasil dibuat! Tunjukkan struk ke penjaga stand kantin.`,
      order: { ...newOrder, items: normalizedItems },
      wallet: updatedWallet,
      new_balance: updatedWallet ? updatedWallet.balance : null
    });
  } catch (err) {
    if (err.httpStatus) return res.status(err.httpStatus).json({ success: false, message: err.message });
    sendError(res, err, 'Gagal memproses pesanan kantin');
  }
});

// Update order status (Admin / Kasir Kantin)
app.put('/api/canteen/orders/:id/status', (req, res) => {
  if (!isStaffRole(req.auth.role)) return res.status(403).json({ success: false, message: 'Hanya kasir/staf yang dapat mengubah status pesanan.' });
  const { order_status, payment_status } = req.body || {};
  if (order_status && !['diproses', 'siap_diambil', 'selesai', 'dibatalkan'].includes(order_status)) return res.status(400).json({ success: false, message: 'Status pesanan tidak valid.' });
  if (payment_status && !['paid', 'pending', 'cancelled'].includes(payment_status)) return res.status(400).json({ success: false, message: 'Status pembayaran tidak valid.' });
  if (!db.prepare('SELECT id FROM canteen_orders WHERE id = ?').get(req.params.id)) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
  if (order_status && payment_status) {
    db.prepare('UPDATE canteen_orders SET order_status = ?, payment_status = ? WHERE id = ?').run(order_status, payment_status, req.params.id);
  } else if (order_status) {
    db.prepare('UPDATE canteen_orders SET order_status = ? WHERE id = ?').run(order_status, req.params.id);
  } else if (payment_status) {
    db.prepare('UPDATE canteen_orders SET payment_status = ? WHERE id = ?').run(payment_status, req.params.id);
  }
  res.json({ success: true, message: 'Status pesanan kantin berhasil diperbarui' });
});

// ==========================================
// 26. E-PEMILOS (PEMILIHAN OSIS & E-VOTING KPOS)
// ==========================================
app.get('/api/pemilos/stats', (req, res) => {
  try {
    const totalCandidates = db.prepare('SELECT count(*) as count FROM pemilos_candidates').get().count;
    const totalVoters = db.prepare('SELECT count(*) as count FROM pemilos_voters').get().count;
    const presentVoters = db.prepare('SELECT count(*) as count FROM pemilos_voters WHERE is_present = 1').get().count;
    const totalVoted = db.prepare('SELECT count(*) as count FROM pemilos_voters WHERE has_voted = 1').get().count;
    const totalVoteSumRow = db.prepare('SELECT sum(vote_count) as sumVotes FROM pemilos_candidates').get();
    const totalVoteSum = totalVoteSumRow.sumVotes || 0;
    const turnoutPct = totalVoters > 0 ? Number(((totalVoted / totalVoters) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      totalCandidates,
      totalVoters,
      presentVoters,
      totalVoted,
      totalVoteSum,
      turnoutPct
    });
  } catch (err) {
    sendError(res, err, 'Gagal memuat statistik Pemilos');
  }
});

app.get('/api/pemilos/candidates', (req, res) => {
  try {
    const candidates = db.prepare('SELECT * FROM pemilos_candidates ORDER BY candidate_number ASC').all();
    res.json(candidates);
  } catch (err) {
    sendError(res, err, 'Gagal memuat daftar calon');
  }
});

app.post('/api/pemilos/candidates', (req, res) => {
  try {
    const { candidate_number, pair_names, vision, mission, photo_url } = req.body;
    if (!pair_names || !vision || !mission) {
      return res.status(400).json({ success: false, message: 'Nama paslon, visi, dan misi wajib diisi!' });
    }

    let candNum = Number(candidate_number);
    if (!candNum) {
      const maxNum = db.prepare('SELECT max(candidate_number) as maxNum FROM pemilos_candidates').get().maxNum || 0;
      candNum = maxNum + 1;
    }

    const now = todayStr();
    const stmt = db.prepare(`
      INSERT INTO pemilos_candidates (candidate_number, pair_names, vision, mission, photo_url, vote_count, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);
    const result = stmt.run(candNum, pair_names.trim(), vision.trim(), mission.trim(), photo_url || '/pemilos/default.jpg', now);
    const newCand = db.prepare('SELECT * FROM pemilos_candidates WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, candidate: newCand, message: `Paslon No. ${candNum} (${pair_names}) berhasil didaftarkan!` });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan paslon');
  }
});

app.put('/api/pemilos/candidates/:id', (req, res) => {
  try {
    const cand = db.prepare('SELECT * FROM pemilos_candidates WHERE id = ?').get(req.params.id);
    if (!cand) {
      return res.status(404).json({ success: false, message: 'Pasangan calon tidak ditemukan' });
    }

    const { candidate_number, pair_names, vision, mission, photo_url } = req.body;
    const finalNumber = (candidate_number !== undefined && candidate_number !== null && candidate_number !== '') ? Number(candidate_number) : cand.candidate_number;
    const finalNames = (pair_names !== undefined && pair_names !== null && pair_names.trim() !== '') ? pair_names.trim() : cand.pair_names;
    const finalVision = (vision !== undefined && vision !== null) ? vision.trim() : cand.vision;
    const finalMission = (mission !== undefined && mission !== null) ? mission.trim() : cand.mission;
    const finalPhoto = (photo_url !== undefined && photo_url !== null && photo_url !== '') ? photo_url : cand.photo_url;

    db.prepare(`
      UPDATE pemilos_candidates 
      SET candidate_number = ?, pair_names = ?, vision = ?, mission = ?, photo_url = ?
      WHERE id = ?
    `).run(finalNumber, finalNames, finalVision, finalMission, finalPhoto, req.params.id);

    const updated = db.prepare('SELECT * FROM pemilos_candidates WHERE id = ?').get(req.params.id);
    res.json({ success: true, candidate: updated, message: `Data Paslon No. ${finalNumber} (${finalNames}) berhasil diperbarui!` });
  } catch (err) {
    sendError(res, err, 'Gagal memperbarui paslon');
  }
});

app.delete('/api/pemilos/candidates/:id', (req, res) => {
  try {
    const candId = Number(req.params.id);
    const removed = transaction(() => {
      db.prepare('UPDATE pemilos_voters SET has_voted = 0, voted_candidate_id = null, voted_at = null WHERE voted_candidate_id = ?').run(candId);
      return db.prepare('DELETE FROM pemilos_candidates WHERE id = ?').run(candId).changes;
    });
    if (!removed) return res.status(404).json({ success: false, message: 'Pasangan calon tidak ditemukan' });
    res.json({ success: true, message: 'Pasangan calon berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus paslon');
  }
});

app.get('/api/pemilos/voters', (req, res) => {
  try {
    const { class_name, status, q } = req.query;
    let query = 'SELECT * FROM pemilos_voters WHERE 1=1';
    const params = [];

    if (class_name && class_name !== 'all') {
      query += ' AND class_name = ?';
      params.push(class_name);
    }
    if (status === 'voted') {
      query += ' AND has_voted = 1';
    } else if (status === 'unvoted') {
      query += ' AND has_voted = 0';
    } else if (status === 'present') {
      query += ' AND is_present = 1';
    } else if (status === 'absent') {
      query += ' AND is_present = 0';
    }

    if (q && q.trim()) {
      query += ' AND (voter_name LIKE ? OR voter_id LIKE ? OR class_name LIKE ?)';
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY id ASC';
    const voters = db.prepare(query).all(...params);
    res.json(voters);
  } catch (err) {
    sendError(res, err, 'Gagal memuat DPT');
  }
});

app.post('/api/pemilos/voters', (req, res) => {
  try {
    const { voter_id, voter_name, class_name, voter_role = 'siswa' } = req.body;
    if (!voter_id || !voter_name || !class_name) {
      return res.status(400).json({ success: false, message: 'NIS/ID, Nama pemilih, dan Kelas wajib diisi!' });
    }

    const stmt = db.prepare(`
      INSERT INTO pemilos_voters (voter_id, voter_name, class_name, voter_role, is_present, has_voted)
      VALUES (?, ?, ?, ?, 0, 0)
    `);
    const result = stmt.run(voter_id.trim(), voter_name.trim(), class_name.trim(), voter_role);
    res.status(201).json({ success: true, voterId: result.lastInsertRowid, message: 'Pemilih berhasil ditambahkan ke DPT' });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan DPT');
  }
});

app.put('/api/pemilos/voters/:id/presence', (req, res) => {
  try {
    const { is_present } = req.body;
    const newVal = is_present ? 1 : 0;
    db.prepare('UPDATE pemilos_voters SET is_present = ? WHERE id = ?').run(newVal, req.params.id);
    res.json({ success: true, is_present: newVal, message: newVal ? 'Presensi kehadiran pemilih di TPS tercatat!' : 'Presensi pemilih dibatalkan.' });
  } catch (err) {
    sendError(res, err, 'Gagal mengubah status presensi');
  }
});

app.post('/api/pemilos/vote', (req, res) => {
  try {
    const { voter_id, candidate_id } = req.body;
    if (!voter_id || !candidate_id) {
      return res.status(400).json({ success: false, message: 'ID pemilih dan pilihan kandidat wajib disertakan!' });
    }

    // Pengecekan pemilih
    let voter = db.prepare('SELECT * FROM pemilos_voters WHERE voter_id = ? OR id = ?').get(voter_id, voter_id);
    if (!voter) {
      // Auto-register jika belum ada di DPT
      const insertAuto = db.prepare(`
        INSERT INTO pemilos_voters (voter_id, voter_name, class_name, voter_role, is_present, has_voted)
        VALUES (?, 'Pemilih Mandiri', 'Umum', 'siswa', 1, 0)
      `);
      const autoRes = insertAuto.run(String(voter_id));
      voter = db.prepare('SELECT * FROM pemilos_voters WHERE id = ?').get(autoRes.lastInsertRowid);
    }

    if (voter.has_voted === 1) {
      return res.status(400).json({
        success: false,
        message: 'Hak suara Anda sudah digunakan sebelumnya! Sistem menolak pemungutan suara ganda.'
      });
    }

    if (voter.is_present === 0) {
      return res.status(403).json({
        success: false,
        message: 'Anda belum diverifikasi hadir di Meja Pengawas TPS! Silakan lapor ke petugas KPPS di bilik suara.'
      });
    }

    const candidate = db.prepare('SELECT * FROM pemilos_candidates WHERE id = ?').get(candidate_id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Kandidat pasangan calon tidak ditemukan!' });
    }

    const now = nowStamp();
    
    // Transaksi pemungutan suara (atomik; suara ganda ditolak di level database)
    const recorded = transaction(() => {
      const marked = db.prepare('UPDATE pemilos_voters SET has_voted = 1, voted_candidate_id = ?, voted_at = ? WHERE id = ? AND has_voted = 0').run(candidate.id, now, voter.id);
      if (!marked.changes) return false;
      db.prepare('UPDATE pemilos_candidates SET vote_count = vote_count + 1 WHERE id = ?').run(candidate.id);
      return true;
    });
    if (!recorded) {
      return res.status(400).json({ success: false, message: 'Hak suara Anda sudah digunakan sebelumnya! Sistem menolak pemungutan suara ganda.' });
    }

    const tokenReceipt = `KPOS-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    res.json({
      success: true,
      receipt: {
        tokenReceipt,
        candidateNumber: candidate.candidate_number,
        candidateName: candidate.pair_names,
        voterName: voter.voter_name,
        votedAt: now
      },
      message: `Terima kasih! Suara Anda untuk Paslon No. ${candidate.candidate_number} (${candidate.pair_names}) telah sah dicatat.`
    });
  } catch (err) {
    sendError(res, err, 'Gagal melakukan pemungutan suara');
  }
});

app.post('/api/pemilos/voters/:id/reset', (req, res) => {
  try {
    const voter = db.prepare('SELECT * FROM pemilos_voters WHERE id = ?').get(req.params.id);
    if (!voter) return res.status(404).json({ success: false, message: 'Pemilih tidak ditemukan' });

    transaction(() => {
      if (voter.has_voted && voter.voted_candidate_id) {
        db.prepare('UPDATE pemilos_candidates SET vote_count = MAX(0, vote_count - 1) WHERE id = ?').run(voter.voted_candidate_id);
      }
      db.prepare('UPDATE pemilos_voters SET has_voted = 0, voted_candidate_id = null, voted_at = null WHERE id = ?').run(voter.id);
    });

    res.json({ success: true, message: `Hak suara pemilih ${voter.voter_name} berhasil direset` });
  } catch (err) {
    sendError(res, err, 'Gagal mereset suara');
  }
});

app.post('/api/pemilos/reset-all', (req, res) => {
  try {
    db.prepare('UPDATE pemilos_candidates SET vote_count = 0').run();
    db.prepare('UPDATE pemilos_voters SET has_voted = 0, voted_candidate_id = null, voted_at = null, is_present = 0').run();
    res.json({ success: true, message: 'Seluruh data suara dan presensi pemilu berhasil direset untuk simulasi baru' });
  } catch (err) {
    sendError(res, err, 'Gagal mereset pemilu');
  }
});

app.get('/api/pemilos/supervisors', (req, res) => {
  try {
    const sups = db.prepare('SELECT * FROM pemilos_supervisors ORDER BY id ASC').all();
    res.json(sups);
  } catch (err) {
    sendError(res, err, 'Gagal memuat pengawas');
  }
});

// ==========================================
// 27. SISTEM WALI KELAS TERPADU API (DIGITAL CLASSROOM)
// ==========================================

// Dashboard Aggregated Summary
app.get('/api/walikelas/dashboard', (req, res) => {
  try {
    const info = db.prepare('SELECT * FROM walikelas_info LIMIT 1').get() || {};
    const totalStudents = db.prepare('SELECT count(*) as count FROM walikelas_students').get().count;
    const maleStudents = db.prepare("SELECT count(*) as count FROM walikelas_students WHERE gender = 'L'").get().count;
    const femaleStudents = db.prepare("SELECT count(*) as count FROM walikelas_students WHERE gender = 'P'").get().count;

    const today = todayStr();
    const todayAttRows = db.prepare('SELECT status, count(*) as count FROM walikelas_attendance WHERE date = ? GROUP BY status').all(today);
    const attMap = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    todayAttRows.forEach(r => { attMap[r.status] = r.count; });
    const attendancePct = totalStudents > 0 ? Number(((attMap.Hadir / totalStudents) * 100).toFixed(1)) : 100;

    // Day of week in Indonesian
    const daysId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = daysId[new Date().getDay()];
    const piketToday = db.prepare('SELECT * FROM walikelas_piket WHERE day_name = ?').get(currentDay) || db.prepare("SELECT * FROM walikelas_piket WHERE day_name = 'Senin'").get();
    const scheduleToday = db.prepare('SELECT * FROM walikelas_schedule WHERE day_name = ? ORDER BY period_num ASC').all(currentDay);
    const journalToday = db.prepare('SELECT * FROM walikelas_journal WHERE date = ? ORDER BY id DESC').all(today);

    const activeCasesCount = db.prepare("SELECT count(*) as count FROM walikelas_cases WHERE status != 'Selesai'").get().count;
    const recentCases = db.prepare('SELECT * FROM walikelas_cases ORDER BY id DESC LIMIT 4').all();

    const invTotal = db.prepare('SELECT sum(quantity) as totalQty FROM walikelas_inventory').get().totalQty || 0;
    const invDamaged = db.prepare("SELECT sum(quantity) as damagedQty FROM walikelas_inventory WHERE condition != 'Baik'").get().damagedQty || 0;

    res.json({
      success: true,
      info,
      stats: {
        totalStudents,
        maleStudents,
        femaleStudents,
        attendanceToday: {
          present: attMap.Hadir,
          sick: attMap.Sakit,
          permitted: attMap.Izin,
          absent: attMap.Alpa,
          percentage: attendancePct
        },
        activeCasesCount,
        inventory: {
          total: invTotal,
          damaged: invDamaged,
          good: Math.max(0, invTotal - invDamaged)
        }
      },
      piketToday: piketToday ? { day: piketToday.day_name, members: JSON.parse(piketToday.members_json || '[]'), duties: JSON.parse(piketToday.duties_json || '[]') } : null,
      scheduleToday,
      journalToday,
      recentCases
    });
  } catch (err) {
    sendError(res, err, 'Gagal memuat dashboard wali kelas');
  }
});

// Info Rombel / Profil Kelas
app.get('/api/walikelas/info', (req, res) => {
  try {
    const info = db.prepare('SELECT * FROM walikelas_info LIMIT 1').get();
    res.json(info);
  } catch (err) {
    sendError(res, err, 'Gagal memuat info kelas');
  }
});

app.put('/api/walikelas/info', (req, res) => {
  try {
    const { class_name, academic_year, semester, teacher_name, teacher_nip, room_name, slogan, vision, target_attendance, target_gpa } = req.body;
    db.prepare(`
      UPDATE walikelas_info
      SET class_name = ?, academic_year = ?, semester = ?, teacher_name = ?, teacher_nip = ?, room_name = ?, slogan = ?, vision = ?, target_attendance = ?, target_gpa = ?
      WHERE id = 1
    `).run(class_name, academic_year, semester, teacher_name, teacher_nip, room_name, slogan, vision, Number(target_attendance) || 95.0, Number(target_gpa) || 85.0);
    const updated = db.prepare('SELECT * FROM walikelas_info WHERE id = 1').get();
    res.json({ success: true, info: updated, message: 'Profil dan pengaturan kelas berhasil diperbarui' });
  } catch (err) {
    sendError(res, err, 'Gagal memperbarui info kelas');
  }
});

// Siswa Kelas
app.get('/api/walikelas/students', (req, res) => {
  try {
    const students = db.prepare('SELECT * FROM walikelas_students ORDER BY name ASC').all();
    res.json(students);
  } catch (err) {
    sendError(res, err, 'Gagal memuat data siswa');
  }
});

app.post('/api/walikelas/students', (req, res) => {
  try {
    const { nis, nisn, name, gender, phone_parent, phone_student, address, blood_type, birth_date, notes, avatar } = req.body;
    if (!nis || !name) {
      return res.status(400).json({ success: false, message: 'NIS dan Nama Siswa wajib diisi!' });
    }
    const stmt = db.prepare(`
      INSERT INTO walikelas_students (nis, nisn, name, gender, phone_parent, phone_student, address, blood_type, birth_date, status, notes, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?, ?)
    `);
    const result = stmt.run(nis.trim(), nisn || null, name.trim(), gender || 'L', phone_parent || null, phone_student || null, address || null, blood_type || 'O', birth_date || null, notes || null, avatar || null);
    const newStudent = db.prepare('SELECT * FROM walikelas_students WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, student: newStudent, message: 'Siswa berhasil ditambahkan' });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan siswa');
  }
});

app.put('/api/walikelas/students/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM walikelas_students WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    const body = req.body || {};
    // Pembaruan parsial: field yang tidak dikirim mempertahankan nilai lama.
    const pick = (key, max = 200) => (body[key] === undefined ? existing[key] : (cleanText(body[key], max) || null));
    const nis = cleanText(body.nis ?? existing.nis, 20);
    const name = cleanText(body.name ?? existing.name, 120);
    if (!nis || !name) return res.status(400).json({ success: false, message: 'NIS dan nama siswa wajib diisi.' });
    const gender = ['L', 'P'].includes(body.gender) ? body.gender : existing.gender;
    db.prepare(`
      UPDATE walikelas_students
      SET nis = ?, nisn = ?, name = ?, gender = ?, phone_parent = ?, phone_student = ?, address = ?, blood_type = ?, birth_date = ?, status = ?, notes = ?, avatar = ?
      WHERE id = ?
    `).run(nis, pick('nisn', 20), name, gender, pick('phone_parent', 30), pick('phone_student', 30), pick('address', 300), pick('blood_type', 5) || 'O', pick('birth_date', 20), cleanText(body.status ?? existing.status, 20) || 'aktif', pick('notes', 1000), pick('avatar', 1000), existing.id);
    const updated = db.prepare('SELECT * FROM walikelas_students WHERE id = ?').get(req.params.id);
    res.json({ success: true, student: updated, message: 'Biodata siswa berhasil diperbarui' });
  } catch (err) {
    sendError(res, err, 'Gagal memperbarui siswa');
  }
});

app.delete('/api/walikelas/students/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_students WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Siswa berhasil dihapus dari rombel' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus siswa');
  }
});

// Struktur Pengurus Kelas
app.get('/api/walikelas/officers', (req, res) => {
  try {
    const officers = db.prepare('SELECT * FROM walikelas_officers ORDER BY id ASC').all();
    res.json(officers);
  } catch (err) {
    sendError(res, err, 'Gagal memuat pengurus kelas');
  }
});

app.post('/api/walikelas/officers', (req, res) => {
  try {
    const { position_title, student_id, student_name, phone, tasks, avatar } = req.body;
    const stmt = db.prepare(`
      INSERT INTO walikelas_officers (position_title, student_id, student_name, phone, tasks, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(position_title, student_id || null, student_name, phone || null, tasks || null, avatar || null);
    const newOfficer = db.prepare('SELECT * FROM walikelas_officers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, officer: newOfficer, message: 'Pengurus kelas berhasil ditambahkan' });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan pengurus');
  }
});

app.put('/api/walikelas/officers/:id', (req, res) => {
  try {
    const { position_title, student_name, phone, tasks, avatar } = req.body;
    db.prepare(`
      UPDATE walikelas_officers
      SET position_title = ?, student_name = ?, phone = ?, tasks = ?, avatar = ?
      WHERE id = ?
    `).run(position_title, student_name, phone, tasks, avatar, req.params.id);
    res.json({ success: true, message: 'Data pengurus kelas berhasil diperbarui' });
  } catch (err) {
    sendError(res, err, 'Gagal memperbarui pengurus');
  }
});

app.delete('/api/walikelas/officers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_officers WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Pengurus kelas berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus pengurus');
  }
});

// Jadwal Piket
app.get('/api/walikelas/piket', (req, res) => {
  try {
    const piket = db.prepare('SELECT * FROM walikelas_piket ORDER BY id ASC').all();
    const formatted = piket.map(p => ({
      ...p,
      members: JSON.parse(p.members_json || '[]'),
      duties: JSON.parse(p.duties_json || '[]')
    }));
    res.json(formatted);
  } catch (err) {
    sendError(res, err, 'Gagal memuat jadwal piket');
  }
});

app.put('/api/walikelas/piket/:id', (req, res) => {
  try {
    const { members, duties } = req.body;
    db.prepare(`
      UPDATE walikelas_piket
      SET members_json = ?, duties_json = ?
      WHERE id = ?
    `).run(JSON.stringify(members || []), JSON.stringify(duties || []), req.params.id);
    res.json({ success: true, message: 'Jadwal piket berhasil diperbarui' });
  } catch (err) {
    sendError(res, err, 'Gagal memperbarui jadwal piket');
  }
});

// Denah Tempat Duduk
app.get('/api/walikelas/seating', (req, res) => {
  try {
    const seating = db.prepare('SELECT * FROM walikelas_seating ORDER BY desk_number ASC').all();
    res.json(seating);
  } catch (err) {
    sendError(res, err, 'Gagal memuat denah duduk');
  }
});

const handleSwap = (req, res) => {
  try {
    const seat1_id = req.body.seat1_id || req.body.id1;
    const seat2_id = req.body.seat2_id || req.body.id2;
    const s1 = db.prepare('SELECT * FROM walikelas_seating WHERE id = ?').get(seat1_id);
    const s2 = db.prepare('SELECT * FROM walikelas_seating WHERE id = ?').get(seat2_id);
    if (!s1 || !s2) return res.status(404).json({ success: false, message: 'Data kursi tidak ditemukan' });

    db.prepare('UPDATE walikelas_seating SET student_id = ?, student_name = ? WHERE id = ?').run(s2.student_id, s2.student_name, s1.id);
    db.prepare('UPDATE walikelas_seating SET student_id = ?, student_name = ? WHERE id = ?').run(s1.student_id, s1.student_name, s2.id);

    res.json({ success: true, message: 'Posisi tempat duduk berhasil ditukar!' });
  } catch (err) {
    sendError(res, err, 'Gagal menukar posisi duduk');
  }
};
app.put('/api/walikelas/seating/swap', handleSwap);
app.post('/api/walikelas/seating/swap', handleSwap);

app.put('/api/walikelas/seating/:id', (req, res) => {
  try {
    const { student_id, student_name } = req.body;
    db.prepare('UPDATE walikelas_seating SET student_id = ?, student_name = ? WHERE id = ?').run(student_id || null, student_name || null, req.params.id);
    res.json({ success: true, message: 'Tempat duduk berhasil diperbarui' });
  } catch (err) {
    sendError(res, err, 'Gagal mengubah tempat duduk');
  }
});

// Tata Tertib Kelas
app.get('/api/walikelas/rules', (req, res) => {
  try {
    const rules = db.prepare('SELECT * FROM walikelas_rules ORDER BY id ASC').all();
    res.json(rules);
  } catch (err) {
    sendError(res, err, 'Gagal memuat tata tertib');
  }
});

app.post('/api/walikelas/rules', (req, res) => {
  try {
    const { rule_code, category, title, description, sanction, points } = req.body;
    const result = db.prepare(`
      INSERT INTO walikelas_rules (rule_code, category, title, description, sanction, points)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(rule_code || 'TT', category, title, description || null, sanction || null, Number(points) || 5);
    res.status(201).json({ success: true, ruleId: result.lastInsertRowid, message: 'Tata tertib berhasil ditambahkan' });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan tata tertib');
  }
});

app.delete('/api/walikelas/rules/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_rules WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Tata tertib berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus aturan');
  }
});

// Jadwal Pelajaran Roster
app.get('/api/walikelas/schedule', (req, res) => {
  try {
    const { day } = req.query;
    let query = 'SELECT * FROM walikelas_schedule';
    const params = [];
    if (day && day !== 'all') {
      query += ' WHERE day_name = ?';
      params.push(day);
    }
    query += ' ORDER BY period_num ASC';
    const schedule = db.prepare(query).all(...params);
    res.json(schedule);
  } catch (err) {
    sendError(res, err, 'Gagal memuat jadwal');
  }
});

app.post('/api/walikelas/schedule', (req, res) => {
  try {
    const { day_name, period_num, time_start, time_end, subject_name, teacher_name, room } = req.body;
    const result = db.prepare(`
      INSERT INTO walikelas_schedule (day_name, period_num, time_start, time_end, subject_name, teacher_name, room)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(day_name, Number(period_num) || 1, time_start, time_end, subject_name, teacher_name, room || 'R-101');
    res.status(201).json({ success: true, scheduleId: result.lastInsertRowid, message: 'Jadwal pelajaran berhasil ditambahkan' });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan jadwal');
  }
});

app.delete('/api/walikelas/schedule/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_schedule WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Jadwal pelajaran berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus jadwal');
  }
});

// Presensi Harian Kelas
app.get('/api/walikelas/attendance', (req, res) => {
  try {
    const date = req.query.date || todayStr();
    const records = db.prepare(`
      SELECT s.id as student_id, s.nis, s.name, s.gender,
             COALESCE(a.status, 'Hadir') as status,
             COALESCE(a.notes, '') as notes,
             a.id as attendance_id
      FROM walikelas_students s
      LEFT JOIN walikelas_attendance a ON s.id = a.student_id AND a.date = ?
      ORDER BY s.name ASC
    `).all(date);
    res.json({ date, records });
  } catch (err) {
    sendError(res, err, 'Gagal memuat presensi');
  }
});

app.post('/api/walikelas/attendance', (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Tanggal dan daftar presensi wajib diisi' });
    }

    const upsert = db.prepare(`
      INSERT INTO walikelas_attendance (date, student_id, status, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date, student_id) DO UPDATE SET status = excluded.status, notes = excluded.notes
    `);

    records.forEach(r => {
      upsert.run(date, r.student_id, r.status || 'Hadir', r.notes || null);
    });

    res.json({ success: true, message: `Presensi tanggal ${date} berhasil disimpan!` });
  } catch (err) {
    sendError(res, err, 'Gagal menyimpan presensi');
  }
});

// Jurnal Kelas
app.get('/api/walikelas/journal', (req, res) => {
  try {
    const journal = db.prepare('SELECT * FROM walikelas_journal ORDER BY date DESC, id DESC').all();
    res.json(journal);
  } catch (err) {
    sendError(res, err, 'Gagal memuat jurnal');
  }
});

app.post('/api/walikelas/journal', (req, res) => {
  try {
    const { date, period_range, subject_name, teacher_name, topic_material, attendance_summary, incident_notes, status } = req.body;
    const stmt = db.prepare(`
      INSERT INTO walikelas_journal (date, period_range, subject_name, teacher_name, topic_material, attendance_summary, incident_notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(date || todayStr(), period_range || 'Jam ke 1-2', subject_name, teacher_name, topic_material, attendance_summary || 'Nihil', incident_notes || null, status || 'Terlaksana');
    res.status(201).json({ success: true, journalId: result.lastInsertRowid, message: 'Jurnal KBM berhasil dicatat' });
  } catch (err) {
    sendError(res, err, 'Gagal mencatat jurnal');
  }
});

app.delete('/api/walikelas/journal/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_journal WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Entri jurnal berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus jurnal');
  }
});

// Rekap Nilai Akademik
app.get('/api/walikelas/grades', (req, res) => {
  try {
    const { subject } = req.query;
    let query = `
      SELECT s.id as student_id, s.nis, s.name,
             g.id as grade_id,
             COALESCE(g.subject_name, ?) as subject_name,
             g.task_1, g.task_2, g.mid_exam, g.final_exam, g.final_grade, g.predicate
      FROM walikelas_students s
      LEFT JOIN walikelas_grades g ON s.id = g.student_id AND g.subject_name = ?
      ORDER BY s.name ASC
    `;
    const subj = subject || 'Matematika Peminatan';
    const grades = db.prepare(query).all(subj, subj);
    res.json({ subject: subj, records: grades });
  } catch (err) {
    sendError(res, err, 'Gagal memuat nilai');
  }
});

app.post('/api/walikelas/grades', (req, res) => {
  try {
    const student_id = toNumber(req.body?.student_id);
    const subject_name = cleanText(req.body?.subject_name, 120);
    const scores = ['task_1', 'task_2', 'mid_exam', 'final_exam'].map((key) => toNumber(req.body?.[key]));
    if (!student_id || !db.prepare('SELECT id FROM walikelas_students WHERE id = ?').get(student_id)) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan di rombel ini.' });
    if (!subject_name) return res.status(400).json({ success: false, message: 'Mata pelajaran wajib diisi.' });
    if (scores.some((value) => value === null || value < 0 || value > 100)) return res.status(400).json({ success: false, message: 'Semua komponen nilai harus berupa angka 0-100.' });
    const [t1, t2, me, fe] = scores;
    const final_grade = Math.round((t1 * 0.2) + (t2 * 0.2) + (me * 0.3) + (fe * 0.3));
    let predicate = 'D';
    if (final_grade >= 90) predicate = 'A';
    else if (final_grade >= 80) predicate = 'B';
    else if (final_grade >= 70) predicate = 'C';

    const existing = db.prepare('SELECT id FROM walikelas_grades WHERE student_id = ? AND subject_name = ?').get(student_id, subject_name);
    if (existing) {
      db.prepare(`
        UPDATE walikelas_grades
        SET task_1 = ?, task_2 = ?, mid_exam = ?, final_exam = ?, final_grade = ?, predicate = ?
        WHERE id = ?
      `).run(t1, t2, me, fe, final_grade, predicate, existing.id);
    } else {
      db.prepare(`
        INSERT INTO walikelas_grades (student_id, subject_name, task_1, task_2, mid_exam, final_exam, final_grade, predicate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(student_id, subject_name, t1, t2, me, fe, final_grade, predicate);
    }
    res.json({ success: true, message: 'Nilai siswa berhasil disimpan!' });
  } catch (err) {
    sendError(res, err, 'Gagal menyimpan nilai');
  }
});

// Buku Kasus & Pembinaan
app.get('/api/walikelas/cases', (req, res) => {
  try {
    const cases = db.prepare('SELECT * FROM walikelas_cases ORDER BY id DESC').all();
    res.json(cases);
  } catch (err) {
    sendError(res, err, 'Gagal memuat buku kasus');
  }
});

app.post('/api/walikelas/cases', (req, res) => {
  try {
    const { student_id, student_name, date, incident_type, description, action_taken, parent_notified, status } = req.body;
    const now = todayStr();
    const stmt = db.prepare(`
      INSERT INTO walikelas_cases (student_id, student_name, date, incident_type, description, action_taken, parent_notified, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(Number(student_id) || 1, student_name, date || now, incident_type, description, action_taken, parent_notified ? 1 : 0, status || 'Dalam Pemantauan', now);
    res.status(201).json({ success: true, caseId: result.lastInsertRowid, message: 'Kasus pembinaan berhasil dicatat' });
  } catch (err) {
    sendError(res, err, 'Gagal mencatat kasus');
  }
});

app.put('/api/walikelas/cases/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM walikelas_cases WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Catatan kasus tidak ditemukan.' });
    const { status, action_taken, parent_notified } = req.body || {};
    db.prepare(`
      UPDATE walikelas_cases
      SET status = ?, action_taken = ?, parent_notified = ?
      WHERE id = ?
    `).run(cleanText(status, 60) || existing.status, cleanText(action_taken, 2000) || existing.action_taken, parent_notified === undefined ? existing.parent_notified : (parent_notified ? 1 : 0), existing.id);
    const updated = db.prepare('SELECT * FROM walikelas_cases WHERE id = ?').get(existing.id);
    res.json({ success: true, case: updated, message: 'Status pembinaan kasus berhasil diperbarui' });
  } catch (err) {
    sendError(res, err, 'Gagal memperbarui kasus');
  }
});

app.delete('/api/walikelas/cases/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_cases WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Catatan kasus berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus kasus');
  }
});

// Penilaian P5 (Projek Profil Pelajar Pancasila)
app.get('/api/walikelas/p5', (req, res) => {
  try {
    const p5Records = db.prepare('SELECT * FROM walikelas_p5 ORDER BY id DESC').all();
    res.json(p5Records);
  } catch (err) {
    sendError(res, err, 'Gagal memuat catatan P5');
  }
});

app.post('/api/walikelas/p5', (req, res) => {
  try {
    const { student_id, student_name, project_theme, dimension, predicate, description } = req.body;
    const stmt = db.prepare(`
      INSERT INTO walikelas_p5 (student_id, student_name, project_theme, dimension, predicate, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(Number(student_id) || 1, student_name, project_theme, dimension, predicate || 'BSH', description || null);
    res.status(201).json({ success: true, p5Id: result.lastInsertRowid, message: 'Penilaian P5 berhasil disimpan' });
  } catch (err) {
    sendError(res, err, 'Gagal menyimpan P5');
  }
});

app.delete('/api/walikelas/p5/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_p5 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Penilaian P5 berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus P5');
  }
});

// Inventaris Kelas
app.get('/api/walikelas/inventory', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM walikelas_inventory ORDER BY id ASC').all();
    res.json(items);
  } catch (err) {
    sendError(res, err, 'Gagal memuat inventaris');
  }
});

app.post('/api/walikelas/inventory', (req, res) => {
  try {
    const { item_code, item_name, quantity, unit, condition, source, notes } = req.body;
    const code = item_code || `INV-${Date.now().toString().slice(-4)}`;
    const stmt = db.prepare(`
      INSERT INTO walikelas_inventory (item_code, item_name, quantity, unit, condition, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(code, item_name, Number(quantity) || 1, unit || 'Unit', condition || 'Baik', source || 'Sekolah / BOS', notes || null);
    res.status(201).json({ success: true, itemId: result.lastInsertRowid, message: 'Barang inventaris berhasil ditambahkan' });
  } catch (err) {
    sendError(res, err, 'Gagal menambahkan inventaris');
  }
});

app.put('/api/walikelas/inventory/:id', (req, res) => {
  try {
    const { item_name, quantity, unit, condition, notes } = req.body;
    db.prepare(`
      UPDATE walikelas_inventory
      SET item_name = ?, quantity = ?, unit = ?, condition = ?, notes = ?
      WHERE id = ?
    `).run(item_name, Number(quantity) || 1, unit || 'Unit', condition, notes, req.params.id);
    res.json({ success: true, message: 'Inventaris berhasil diperbarui' });
  } catch (err) {
    sendError(res, err, 'Gagal memperbarui inventaris');
  }
});

app.delete('/api/walikelas/inventory/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_inventory WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Barang inventaris berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus inventaris');
  }
});

// Arsip Dokumen Kelas
app.get('/api/walikelas/documents', (req, res) => {
  try {
    const docs = db.prepare('SELECT * FROM walikelas_documents ORDER BY id DESC').all();
    res.json(docs);
  } catch (err) {
    sendError(res, err, 'Gagal memuat dokumen');
  }
});

app.post('/api/walikelas/documents', (req, res) => {
  try {
    const { doc_title, category, doc_date, file_url, notes } = req.body;
    const stmt = db.prepare(`
      INSERT INTO walikelas_documents (doc_title, category, doc_date, file_url, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(doc_title, category || 'Administrasi', doc_date || todayStr(), file_url || '#', notes || null);
    res.status(201).json({ success: true, docId: result.lastInsertRowid, message: 'Dokumen berhasil diarsipkan' });
  } catch (err) {
    sendError(res, err, 'Gagal mengarsipkan dokumen');
  }
});

app.delete('/api/walikelas/documents/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM walikelas_documents WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Dokumen berhasil dihapus' });
  } catch (err) {
    sendError(res, err, 'Gagal menghapus dokumen');
  }
});

// ==========================================
// PORTAL ORANG TUA (ringkasan anak berdasarkan akun wali)
// ==========================================
app.get('/api/ortu/dashboard', (req, res) => {
  const profile = getSessionProfile(req.auth);
  let student = profile?.student || null;
  // Staf berwenang boleh meninjau ringkasan siswa tertentu melalui ?student_id=.
  if (!student && isStaffRole(req.auth.role) && toNumber(req.query.student_id)) student = getLinkedStudent(toNumber(req.query.student_id));
  if (!student) return res.status(404).json({ success: false, message: 'Akun ini belum terhubung dengan data siswa. Hubungi tata usaha sekolah.' });

  const today = todayStr();
  const attendanceToday = withLateFlag(db.prepare("SELECT * FROM attendance WHERE user_type = 'siswa' AND person_id = ? AND date = ? ORDER BY time ASC").all(student.id, today));
  const recentAttendance = withLateFlag(db.prepare("SELECT * FROM attendance WHERE user_type = 'siswa' AND person_id = ? ORDER BY date DESC, time DESC LIMIT 30").all(student.id));
  const violations = db.prepare('SELECT id, violation_name, category, points, incident_date, action_taken, status FROM violations WHERE student_id = ? ORDER BY incident_date DESC, id DESC LIMIT 20').all(student.id);
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points), 0) AS total FROM violations WHERE student_id = ?').get(student.id).total;
  const sppBills = db.prepare('SELECT * FROM spp_bills WHERE student_id = ? ORDER BY id ASC').all(student.id);
  const otherBills = db.prepare('SELECT * FROM other_bills WHERE student_id = ?').all(student.id);
  const grades = db.prepare('SELECT subject_name, semester, academic_year, final_grade, predicate, teacher_notes FROM grades WHERE student_id = ? ORDER BY academic_year DESC, semester DESC, id DESC LIMIT 40').all(student.id);
  const permissions = db.prepare('SELECT * FROM student_permissions WHERE student_id = ? ORDER BY permission_date DESC, id DESC LIMIT 10').all(student.id);
  const uksVisits = db.prepare('SELECT id, visit_date, visit_time, complaint, action_taken, disposition FROM uks_visits WHERE student_id = ? ORDER BY visit_date DESC, id DESC LIMIT 10').all(student.id);
  const homeroomName = student.class_id ? db.prepare('SELECT homeroom_teacher_name FROM classes WHERE id = ?').get(student.class_id)?.homeroom_teacher_name : null;
  const homeroomTeacher = homeroomName
    ? (db.prepare('SELECT name, phone, email FROM teachers WHERE lower(trim(name)) = lower(trim(?))').get(homeroomName) || { name: homeroomName, phone: null, email: null })
    : null;
  writeAuditLog({ actor: req.auth, action: 'view_sensitive_data', resource: 'ortu_dashboard', req, metadata: { studentId: student.id } });

  res.json({
    success: true,
    student,
    homeroom_teacher: homeroomTeacher,
    parent: profile ? { name: profile.name, phone: profile.phone || student.parent_phone || null } : null,
    attendance: { today: attendanceToday, recent: recentAttendance, late_cutoff: LATE_CUTOFF },
    violations: { records: violations, totalPoints },
    spp: { sppBills, otherBills, unpaid: sppBills.filter((bill) => bill.status !== 'lunas').length },
    grades,
    permissions,
    uks_visits: uksVisits,
  });
});

// ==========================================
// AUDIT & KEAMANAN SISTEM
// ==========================================
app.get('/api/system/audit-log', (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
  const logs = db.prepare(`
    SELECT id, actor_username, actor_role, action, resource, status, request_method, request_path, created_at
    FROM audit_logs
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) AS count FROM audit_logs').get().count;
  res.json({ success: true, data: logs, meta: { total, limit, offset } });
});

// ==========================================
// PRODUCTION FRONTEND STATIC SERVE
// ==========================================
// Endpoint /api yang tidak terdaftar selalu dijawab JSON 404 (bukan HTML),
// baik saat pengembangan (Vite proxy) maupun produksi.
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint ${req.method} ${req.originalUrl} tidak ditemukan` });
});

const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));

  // Cegah pengembalian index.html untuk aset /assets/* yang tidak ditemukan agar browser tidak crash MIME type
  app.get('/assets/*', (req, res) => {
    res.status(404).type('text/plain').send('Asset not found');
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.type('text/plain').send('Server API Sekolah Super App aktif. Jalankan `npm run build` agar antarmuka disajikan dari folder dist, atau gunakan `npm run dev:client` saat pengembangan.');
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'Format data permintaan tidak valid (JSON rusak).' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Ukuran data yang dikirim terlalu besar (maksimal 25 MB).' });
  return sendError(res, err, 'Terjadi kesalahan pada server');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server backend Sekolah Super App berjalan di http://localhost:${PORT} (0.0.0.0:${PORT})`);
});
