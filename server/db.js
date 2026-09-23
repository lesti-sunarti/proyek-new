import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../school.db');

const rawDb = new DatabaseSync(dbPath);

// node:sqlite menolak nilai `undefined` dan boolean saat binding parameter.
// Lapisan tipis ini menormalkan nilai tersebut (undefined → NULL, boolean → 0/1,
// NaN/Infinity → NULL, Date → ISO string) agar field opsional yang kosong dari
// klien tidak membuat endpoint gagal dengan HTTP 500.
function normalizeParam(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function wrapStatement(statement) {
  return {
    run: (...params) => statement.run(...params.map(normalizeParam)),
    get: (...params) => statement.get(...params.map(normalizeParam)),
    all: (...params) => statement.all(...params.map(normalizeParam)),
  };
}

export const db = {
  prepare: (sql) => wrapStatement(rawDb.prepare(sql)),
  exec: (sql) => rawDb.exec(sql),
};

let transactionDepth = 0;
// Menjalankan beberapa perintah tulis secara atomik. Transaksi bersarang ikut
// bergabung ke transaksi terluar sehingga aman dipanggil dari helper lain.
export function transaction(work) {
  if (transactionDepth > 0) return work();
  rawDb.exec('BEGIN IMMEDIATE');
  transactionDepth += 1;
  try {
    const result = work();
    rawDb.exec('COMMIT');
    return result;
  } catch (error) {
    try { rawDb.exec('ROLLBACK'); } catch { /* transaksi sudah ditutup */ }
    throw error;
  } finally {
    transactionDepth -= 1;
  }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, storedHash) {
  try {
    const [algorithm, salt, expected] = String(storedHash).split('$');
    if (algorithm !== 'scrypt' || !salt || !expected) return false;
    const actual = scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  } catch { return false; }
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Aktifkan foreign keys & WAL mode
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

function hasColumn(tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName);
}

// Instalasi lama membatasi holder_role dompet pada 4 peran legacy sehingga akun
// staf (kepala_tu, kepala_sekolah, dst.) tidak bisa mempunyai dompet. Tabel
// dibangun ulang tanpa CHECK tersebut sambil mempertahankan seluruh data.
function relaxWalletRoleConstraint() {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'wallets'").get();
  if (!table || !/CHECK\s*\(\s*holder_role/i.test(table.sql)) return;
  db.exec('PRAGMA foreign_keys = OFF;');
  try {
    db.exec(`
      BEGIN;
      CREATE TABLE wallets_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        card_number TEXT UNIQUE NOT NULL,
        holder_name TEXT NOT NULL,
        holder_role TEXT NOT NULL,
        holder_identifier TEXT,
        balance INTEGER DEFAULT 0,
        pin TEXT DEFAULT '123456',
        status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif', 'dibekukan', 'nonaktif')),
        created_at TEXT NOT NULL
      );
      INSERT INTO wallets_migrated (id, user_id, card_number, holder_name, holder_role, holder_identifier, balance, pin, status, created_at)
        SELECT id, user_id, card_number, holder_name, holder_role, holder_identifier, balance, pin, status, created_at FROM wallets;
      DROP TABLE wallets;
      ALTER TABLE wallets_migrated RENAME TO wallets;
      COMMIT;
    `);
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch { /* tidak ada transaksi aktif */ }
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
}

function migrateLegacyPasswordTable(tableName) {
  if (!hasColumn(tableName, 'password')) return;

  if (tableName === 'users') {
    const legacyRows = db.prepare('SELECT id, username, password, role, name, email, phone, avatar, related_student_id FROM users').all();
    db.exec(`
      ALTER TABLE users RENAME TO users_legacy_passwords;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'guru', 'siswa', 'ortu')),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        avatar TEXT,
        related_student_id INTEGER
      );
    `);
    const insert = db.prepare('INSERT INTO users (id, username, password_hash, role, name, email, phone, avatar, related_student_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    legacyRows.forEach((row) => insert.run(row.id, row.username, hashPassword(row.password), row.role, row.name, row.email, row.phone, row.avatar, row.related_student_id));
    db.exec('DROP TABLE users_legacy_passwords;');
    return;
  }

  const legacyRows = db.prepare('SELECT id, username, password, role, name, title, badge, status FROM staff_accounts').all();
  db.exec(`
    ALTER TABLE staff_accounts RENAME TO staff_accounts_legacy_passwords;
    CREATE TABLE staff_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      badge TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aktif'
    );
  `);
  const insert = db.prepare('INSERT INTO staff_accounts (id, username, password_hash, role, name, title, badge, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  legacyRows.forEach((row) => insert.run(row.id, row.username, hashPassword(row.password), row.role, row.name, row.title, row.badge, row.status));
  db.exec('DROP TABLE staff_accounts_legacy_passwords;');
}

export function initDatabase() {
  db.exec(`
    -- Tabel Pengguna & Autentikasi
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'guru', 'siswa', 'ortu')),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      avatar TEXT,
      related_student_id INTEGER
    );

    -- Akun staf untuk demo akses berbasis jabatan. Dipisahkan dari akun lama
    -- agar peran manajerial tidak dibatasi oleh CHECK role pada tabel users.
    CREATE TABLE IF NOT EXISTS staff_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      badge TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aktif'
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      account_type TEXT NOT NULL CHECK(account_type IN ('staff', 'user')),
      account_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      actor_username TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      request_method TEXT,
      request_path TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);

    -- Tabel Rombel / Kelas
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      major TEXT,
      academic_year TEXT NOT NULL,
      homeroom_teacher_name TEXT
    );

    -- Tabel Siswa (Buku Induk Siswa)
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nisn TEXT UNIQUE NOT NULL,
      nis TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      birth_place TEXT,
      birth_date TEXT,
      address TEXT,
      parent_name TEXT,
      parent_phone TEXT,
      class_id INTEGER,
      status TEXT DEFAULT 'aktif',
      qr_code TEXT,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );

    -- Tabel Guru & Staf (Buku Induk Guru)
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nip TEXT UNIQUE,
      nuptk TEXT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      subject TEXT,
      phone TEXT,
      email TEXT,
      education TEXT,
      position TEXT DEFAULT 'Guru Pengajar',
      status TEXT DEFAULT 'Aktif'
    );

    -- Tabel Mata Pelajaran
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      teacher_name TEXT
    );

    -- Tabel Jadwal Pelajaran
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER,
      subject_id INTEGER,
      teacher_name TEXT,
      day TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room TEXT,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );
    CREATE INDEX IF NOT EXISTS idx_schedules_slot ON schedules(day, start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_schedules_class_slot ON schedules(class_id, day, start_time, end_time);

    -- Tabel Absensi Siswa & Guru
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_type TEXT NOT NULL CHECK(user_type IN ('guru', 'siswa')),
      person_id INTEGER NOT NULL,
      person_name TEXT NOT NULL,
      person_identifier TEXT NOT NULL, -- NISN atau NIP
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('masuk', 'pulang', 'mapel')),
      subject_name TEXT,
      status TEXT NOT NULL CHECK(status IN ('hadir', 'izin', 'sakit', 'alpa')),
      method TEXT NOT NULL CHECK(method IN ('self_scan', 'kiosk_card', 'manual')),
      notes TEXT
    );

    -- Tabel Ujian CBT
    CREATE TABLE IF NOT EXISTS cbt_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      start_time TEXT,
      end_time TEXT,
      total_questions INTEGER DEFAULT 0,
      passing_score INTEGER DEFAULT 75,
      is_active INTEGER DEFAULT 1,
      max_violations INTEGER DEFAULT 3
    );

    -- Tabel Soal CBT (Pilihan Ganda & Essay)
    CREATE TABLE IF NOT EXISTS cbt_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('pg', 'essay')),
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      option_e TEXT,
      correct_option TEXT,
      points INTEGER DEFAULT 10,
      FOREIGN KEY (exam_id) REFERENCES cbt_exams(id) ON DELETE CASCADE
    );

    -- Tabel Sesi Pengerjaan & Pelanggaran Siswa CBT
    CREATE TABLE IF NOT EXISTS cbt_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      submit_time TEXT,
      score REAL DEFAULT 0,
      answers_json TEXT,
      violations_count INTEGER DEFAULT 0,
      violations_log_json TEXT,
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'submitted', 'force_submitted')),
      FOREIGN KEY (exam_id) REFERENCES cbt_exams(id)
    );

    -- Tabel Tagihan SPP Bulanan
    CREATE TABLE IF NOT EXISTS spp_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'belum' CHECK(status IN ('lunas', 'belum', 'menunggu')),
      payment_date TEXT,
      payment_method TEXT,
      proof_url TEXT,
      receipt_number TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    -- Tabel Tagihan Non-SPP (Uang Gedung, Seragam, dll)
    CREATE TABLE IF NOT EXISTS other_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'belum' CHECK(status IN ('lunas', 'belum')),
      payment_date TEXT,
      proof_url TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    -- Tabel Transaksi Keuangan (Pemasukan & Pengeluaran)
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('masuk', 'keluar')),
      category TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      source_or_recipient TEXT,
      proof_file TEXT
    );

    -- Tabel Penggajian (Payroll)
    CREATE TABLE IF NOT EXISTS payrolls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      staff_name TEXT NOT NULL,
      staff_role TEXT NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      base_salary INTEGER NOT NULL,
      allowance INTEGER DEFAULT 0,
      teaching_fee INTEGER DEFAULT 0,
      deductions INTEGER DEFAULT 0,
      net_salary INTEGER NOT NULL,
      status TEXT DEFAULT 'paid' CHECK(status IN ('draft', 'paid')),
      paid_at TEXT
    );

    -- Tabel Blog / Mading Digital
    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      category TEXT NOT NULL,
      cover_image TEXT,
      status TEXT DEFAULT 'published',
      views INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Tabel Agenda Kegiatan
    CREATE TABLE IF NOT EXISTS agenda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      audience TEXT DEFAULT 'semua'
    );

    -- Tabel Broadcast Informasi
    CREATE TABLE IF NOT EXISTS broadcasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_role TEXT DEFAULT 'semua',
      sender_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_urgent INTEGER DEFAULT 0
    );

    -- Tabel Poin Pelanggaran Siswa (Guru BP / BK)
    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      violation_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('ringan', 'sedang', 'berat')),
      points INTEGER NOT NULL,
      incident_date TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      action_taken TEXT,
      status TEXT DEFAULT 'ditindak',
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    -- Tabel Galeri Sekolah
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL
    );

    -- Tabel Alumni (Tracer Study)
    CREATE TABLE IF NOT EXISTS alumni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      graduation_year INTEGER NOT NULL,
      nisn TEXT,
      current_status TEXT NOT NULL,
      institution_name TEXT,
      position_or_major TEXT,
      phone TEXT,
      email TEXT,
      testimonial TEXT
    );

    -- Tabel PPDB Online (Penerimaan Peserta Didik Baru)
    CREATE TABLE IF NOT EXISTS ppdb (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_no TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      nisn TEXT NOT NULL,
      gender TEXT NOT NULL,
      birth_place_date TEXT,
      track TEXT NOT NULL,
      previous_school TEXT NOT NULL,
      average_score REAL,
      parent_name TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      address TEXT,
      status TEXT DEFAULT 'menunggu',
      registered_at TEXT NOT NULL
    );

    -- Tabel Arsip Digital Dokumen
    CREATE TABLE IF NOT EXISTS digital_archives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      doc_number TEXT,
      category TEXT NOT NULL,
      file_url TEXT,
      file_size TEXT,
      upload_date TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      notes TEXT
    );

    -- Tabel E-Learning: Materi Belajar
    CREATE TABLE IF NOT EXISTS elearning_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      video_url TEXT,
      created_at TEXT NOT NULL
    );

    -- Tabel E-Learning: Tugas Siswa
    CREATE TABLE IF NOT EXISTS elearning_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT NOT NULL,
      max_score INTEGER DEFAULT 100,
      created_at TEXT NOT NULL,
      FOREIGN KEY (module_id) REFERENCES elearning_modules(id)
    );

    -- Tabel E-Learning: Pengumpulan Tugas
    CREATE TABLE IF NOT EXISTS elearning_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      submission_text TEXT,
      file_url TEXT,
      submitted_at TEXT NOT NULL,
      score INTEGER,
      feedback TEXT,
      FOREIGN KEY (task_id) REFERENCES elearning_tasks(id)
    );

    -- Tabel E-Learning: Forum Diskusi
    CREATE TABLE IF NOT EXISTS elearning_discussions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (module_id) REFERENCES elearning_modules(id)
    );

    -- ==========================================
    -- FITUR ESENSIAL BARU SEKOLAH
    -- ==========================================

    -- 1. Tabel E-Rapor & Nilai Siswa
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      semester TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      formative_score REAL DEFAULT 0,
      midterm_score REAL DEFAULT 0,
      final_score REAL DEFAULT 0,
      final_grade REAL DEFAULT 0,
      predicate TEXT DEFAULT 'B',
      competence_achievement TEXT,
      teacher_notes TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    -- 2. Tabel Perpustakaan Digital: Katalog Buku
    CREATE TABLE IF NOT EXISTS library_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT,
      category TEXT NOT NULL,
      total_copies INTEGER DEFAULT 1,
      available_copies INTEGER DEFAULT 1,
      shelf_location TEXT,
      cover_url TEXT,
      year_published INTEGER
    );

    -- 3. Tabel Perpustakaan Digital: Peminjaman Buku
    CREATE TABLE IF NOT EXISTS book_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      borrower_type TEXT NOT NULL CHECK(borrower_type IN ('siswa', 'guru')),
      borrower_id INTEGER NOT NULL,
      borrower_name TEXT NOT NULL,
      borrow_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      status TEXT DEFAULT 'dipinjam' CHECK(status IN ('dipinjam', 'dikembalikan', 'terlambat')),
      fine_amount INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (book_id) REFERENCES library_books(id)
    );

    -- 4. Tabel Ekstrakurikuler & Prestasi
    CREATE TABLE IF NOT EXISTS extracurriculars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      coach_name TEXT NOT NULL,
      schedule_day TEXT NOT NULL,
      schedule_time TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT,
      icon_name TEXT,
      member_count INTEGER DEFAULT 0,
      achievements TEXT
    );

    -- 4b. Keanggotaan Ekstrakurikuler (mencegah pendaftaran ganda)
    CREATE TABLE IF NOT EXISTS extracurricular_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extracurricular_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      class_name TEXT,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE,
      UNIQUE(extracurricular_id, student_name)
    );

    -- 5. Tabel Konseling BK Online
    CREATE TABLE IF NOT EXISTS counseling_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      counselor_name TEXT NOT NULL,
      session_date TEXT NOT NULL,
      session_time TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('akademik', 'pribadi', 'sosial', 'karir')),
      topic TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'dijadwalkan' CHECK(status IN ('dijadwalkan', 'selesai', 'dibatalkan')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    -- 6. Tiket Pusat Bantuan & Layanan
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      requester_name TEXT NOT NULL,
      requester_role TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'tinggi')),
      status TEXT DEFAULT 'baru' CHECK(status IN ('baru', 'diproses', 'selesai')),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

    -- 7. Pusat Karier, Magang, dan Beasiswa
    CREATE TABLE IF NOT EXISTS career_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      opportunity_type TEXT NOT NULL CHECK(opportunity_type IN ('magang', 'beasiswa', 'karier', 'webinar')),
      organization TEXT NOT NULL,
      location TEXT,
      description TEXT NOT NULL,
      requirements TEXT,
      deadline TEXT,
      contact_person TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS career_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL,
      applicant_name TEXT NOT NULL,
      applicant_role TEXT NOT NULL,
      class_name TEXT,
      notes TEXT,
      status TEXT DEFAULT 'minat' CHECK(status IN ('minat', 'ditinjau', 'diterima', 'tidak_lolos')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (opportunity_id) REFERENCES career_opportunities(id) ON DELETE CASCADE,
      UNIQUE(opportunity_id, applicant_name)
    );

    CREATE INDEX IF NOT EXISTS idx_career_opportunities_active ON career_opportunities(is_active, deadline);

    -- 8. Ruang Aspirasi dan Perbaikan Berkelanjutan
    CREATE TABLE IF NOT EXISTS school_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_code TEXT UNIQUE NOT NULL,
      sender_name TEXT,
      sender_role TEXT NOT NULL,
      is_anonymous INTEGER DEFAULT 1,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'baru' CHECK(status IN ('baru', 'ditinjau', 'ditindaklanjuti', 'selesai')),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_school_feedback_status ON school_feedback(status, created_at DESC);

    -- 9. UKS & Izin Siswa
    CREATE TABLE IF NOT EXISTS uks_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      student_name TEXT NOT NULL,
      class_name TEXT,
      visit_date TEXT NOT NULL,
      visit_time TEXT NOT NULL,
      complaint TEXT NOT NULL,
      action_taken TEXT,
      disposition TEXT DEFAULT 'kembali_kelas' CHECK(disposition IN ('kembali_kelas', 'istirahat_uks', 'pulang_dengan_izin', 'rujukan')),
      officer_name TEXT NOT NULL,
      parent_contacted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS student_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      student_name TEXT NOT NULL,
      class_name TEXT,
      permission_date TEXT NOT NULL,
      permission_type TEXT NOT NULL CHECK(permission_type IN ('sakit', 'izin', 'dispensasi')),
      reason TEXT NOT NULL,
      parent_name TEXT,
      parent_phone TEXT,
      status TEXT DEFAULT 'menunggu' CHECK(status IN ('menunggu', 'disetujui', 'ditolak')),
      reviewed_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE INDEX IF NOT EXISTS idx_uks_visits_date ON uks_visits(visit_date DESC);
    CREATE INDEX IF NOT EXISTS idx_student_permissions_date ON student_permissions(permission_date DESC, status);

    -- 9. Dompet Digital Sekolah / Kartu Pintar (Smart School Card)
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      card_number TEXT UNIQUE NOT NULL,
      holder_name TEXT NOT NULL,
      holder_role TEXT NOT NULL,
      holder_identifier TEXT,
      balance INTEGER DEFAULT 0,
      pin TEXT DEFAULT '123456',
      status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif', 'dibekukan', 'nonaktif')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      transaction_code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('topup', 'payment_canteen', 'payment_digital', 'transfer_in', 'transfer_out', 'spp')),
      amount INTEGER NOT NULL,
      fee INTEGER DEFAULT 0,
      description TEXT NOT NULL,
      method TEXT NOT NULL,
      status TEXT DEFAULT 'success' CHECK(status IN ('pending', 'success', 'failed')),
      reference_number TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id, created_at DESC);

    -- 10. Kantin Online & Koperasi Sekolah (Makanan, Minuman, Produk Digital)
    CREATE TABLE IF NOT EXISTS canteen_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('makanan', 'minuman', 'digital', 'koperasi')),
      price INTEGER NOT NULL,
      stock INTEGER DEFAULT 50,
      image_url TEXT,
      description TEXT,
      stand_name TEXT DEFAULT 'Kantin Utama Sekolah',
      is_available INTEGER DEFAULT 1,
      digital_type TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS canteen_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_role TEXT NOT NULL,
      buyer_identifier TEXT,
      total_amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('wallet', 'qris', 'cash')),
      payment_status TEXT DEFAULT 'paid' CHECK(payment_status IN ('paid', 'pending', 'cancelled')),
      order_status TEXT DEFAULT 'diproses' CHECK(order_status IN ('diproses', 'siap_diambil', 'selesai', 'dibatalkan')),
      pickup_time TEXT,
      notes TEXT,
      digital_target TEXT,
      serial_number TEXT,
      items_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_canteen_orders_created ON canteen_orders(created_at DESC);

    -- 11. E-PEMILOS (Pemilihan Ketua & Wakil Ketua OSIS / E-Voting KPOS)
    CREATE TABLE IF NOT EXISTS pemilos_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_number INTEGER UNIQUE NOT NULL,
      pair_names TEXT NOT NULL,
      vision TEXT NOT NULL,
      mission TEXT NOT NULL,
      photo_url TEXT,
      vote_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pemilos_voters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id TEXT UNIQUE NOT NULL,
      voter_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      voter_role TEXT DEFAULT 'siswa',
      is_present INTEGER DEFAULT 0,
      has_voted INTEGER DEFAULT 0,
      voted_candidate_id INTEGER,
      voted_at TEXT,
      FOREIGN KEY (voted_candidate_id) REFERENCES pemilos_candidates(id)
    );

    CREATE TABLE IF NOT EXISTS pemilos_supervisors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      tps_name TEXT DEFAULT 'TPS 01 - Bilik Aula Utama',
      status TEXT DEFAULT 'aktif'
    );
  `);

  // Migrasi satu kali dari instalasi demo lama yang menyimpan password biasa.
  // Setelah proses ini selesai, kolom password lama dihapus dari database.
  migrateLegacyPasswordTable('users');
  migrateLegacyPasswordTable('staff_accounts');
  relaxWalletRoleConstraint();
  db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(new Date().toISOString());

  // Akun lokal untuk demonstrasi. Ganti password ini sebelum dipakai di lingkungan produksi.
  const insertStaffAccount = db.prepare(`
    INSERT OR IGNORE INTO staff_accounts (username, password_hash, role, name, title, badge, status)
    VALUES (?, ?, ?, ?, ?, ?, 'aktif')
  `);
  [
    ['kepsek.raka', 'Kepsek!4826', 'kepala_sekolah', 'Dr. Raka Pradana, M.Pd.', 'Kepala Sekolah', 'Kepala Sekolah'],
    ['tu.nadia', 'TU!7319', 'kepala_tu', 'Nadia Kartika, S.E.', 'Kepala Tata Usaha', 'Kepala TU'],
    ['perpus.arya', 'Perpus!5482', 'kepala_perpus', 'Arya Kusuma, S.S.I.', 'Kepala Perpustakaan', 'Kepala Perpustakaan'],
    ['bk.rina', 'BK!6247', 'kepala_bk', 'Rina Marlina, S.Psi.', 'Kepala Bimbingan Konseling', 'Kepala BK'],
    ['wali.budi', 'Wali!3951', 'guru_walikelas', 'Drs. Budi Santoso, M.Pd.', 'Guru Matematika & Wali Kelas X-1', 'Guru / Wali Kelas'],
  ].forEach(([username, password, role, name, title, badge]) => insertStaffAccount.run(username, hashPassword(password), role, name, title, badge));

  // Peluang karier awal agar pusat karier langsung bermanfaat pada instalasi baru.
  const careerCount = db.prepare('SELECT count(*) as count FROM career_opportunities').get().count;
  if (careerCount === 0) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const insertCareer = db.prepare(`
      INSERT INTO career_opportunities (title, opportunity_type, organization, location, description, requirements, deadline, contact_person, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    insertCareer.run('Program Magang Observasi Teknologi', 'magang', 'Nusa Teknologi Indonesia', 'Jakarta Selatan', 'Program pengenalan dunia kerja selama lima hari untuk siswa yang tertarik pada pengembangan produk digital, desain, dan data.', 'Siswa kelas XI/XII, membawa CV singkat dan surat persetujuan orang tua.', '2026-10-15', 'Bimbingan Karier Sekolah', now);
    insertCareer.run('Beasiswa Prestasi Sains & Teknologi', 'beasiswa', 'Yayasan Cendekia Nusantara', 'Nasional', 'Dukungan biaya pendidikan dan mentoring persiapan perguruan tinggi bagi siswa dengan prestasi akademik maupun kompetisi.', 'Rapor terakhir, bukti prestasi bila ada, serta esai singkat.', '2026-10-30', 'Ibu Rina — BK', now);
    insertCareer.run('Kelas Karier: Portofolio untuk Masa Depan', 'webinar', 'Alumni SMAN 1 Harapan Bangsa', 'Aula sekolah & daring', 'Sesi berbagi bersama alumni tentang membangun portofolio, memilih jurusan, dan menyiapkan transisi ke dunia kampus atau kerja.', 'Terbuka untuk seluruh siswa dan orang tua.', '2026-10-05', 'Tim Hubungan Alumni', now);
  }

  // Seeding E-PEMILOS candidates if empty
  const candidateCount = db.prepare('SELECT count(*) as count FROM pemilos_candidates').get().count;
  if (candidateCount === 0) {
    const now = new Date().toISOString().split('T')[0];
    const insertCand = db.prepare(`
      INSERT INTO pemilos_candidates (candidate_number, pair_names, vision, mission, photo_url, vote_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertCand.run(
      1,
      'Raisya & Nauval',
      'Mewujudkan OSIS yang aspiratif, inklusif, dan adaptif terhadap perkembangan teknologi digital untuk memajukan prestasi serta karakter unggul siswa.',
      '1. Mengoptimalkan peran ekstrakurikuler sebagai wadah pengembangan bakat dan minat siswa.\n2. Mengembangkan program kolaborasi digital dan literasi sains berbasis proyek nyata.\n3. Menampung dan memperjuangkan seluruh aspirasi siswa dengan transparan dan bertanggung jawab.',
      '/pemilos/692e8b1f42b80.png',
      18,
      now
    );

    insertCand.run(
      2,
      'Sila & Alwa',
      'Menjadikan sekolah sebagai rumah kedua yang aman, harmonis, disiplin, dan berwawasan lingkungan hijau berkelanjutan.',
      '1. Menjalin komunikasi yang solid antara siswa, dewan guru, dan pengurus kelas.\n2. Mengadakan festival seni, budaya, dan olahraga antar kelas secara berkala.\n3. Menerapkan program peduli lingkungan dan kebersihan sekolah berkelanjutan.',
      '/pemilos/692e8b41d6c46.png',
      14,
      now
    );

    insertCand.run(
      3,
      'Ikhsan & Ririn',
      'Membangun kepemimpinan siswa yang berakhlak mulia, cerdas berteknologi, dan berdaya saing di tingkat kota maupun nasional.',
      '1. Mengadakan workshop peningkatan kepemimpinan, public speaking, dan coding dasar.\n2. Mendorong keikutsertaan siswa dalam berbagai olimpiade dan kompetisi ilmiah.\n3. Menumbuhkan nilai-nilai budi pekerti luhur dan solidaritas antar jenjang kelas.',
      '/pemilos/692e8b5dd818a.png',
      22,
      now
    );

    insertCand.run(
      4,
      'Adit & Euis',
      'Terciptanya ekosistem organisasi siswa yang tanggap sosial, kreatif dalam berkarya, dan berjiwa kewirausahaan mandiri.',
      '1. Memperkuat program pemberdayaan UMKM siswa dan bazar kreatif sekolah.\n2. Melaksanakan bakti sosial peduli sesama dan program mentorship kakak asuh.\n3. Menyediakan saluran aspirasi interaktif berbasis media sosial sekolah.',
      '/pemilos/692e8b7bc55a0.png',
      11,
      now
    );

    // Initial Supervisors
    const insertSup = db.prepare('INSERT INTO pemilos_supervisors (username, full_name, tps_name, status) VALUES (?, ?, ?, ?)');
    insertSup.run('ifa', 'Nursyifa (Petugas KPPS 1)', 'TPS 01 - Gedung Utama', 'aktif');
    insertSup.run('diah', 'Rodiatul Mardiah (Petugas KPPS 2)', 'TPS 02 - Perpustakaan', 'aktif');

    // Initial Voters (DPT) from e-kpos.sql + Demo users
    const insertVoter = db.prepare(`
      INSERT OR IGNORE INTO pemilos_voters (voter_id, voter_name, class_name, voter_role, is_present, has_voted, voted_candidate_id, voted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Demo user
    insertVoter.run('NIS-001', 'Aditya Pratama Putra', 'X MIPA 1', 'siswa', 1, 0, null, null);
    insertVoter.run('NIS-002', 'Dra. Hj. Nurhayati, M.Pd', 'Guru / TU', 'guru', 1, 0, null, null);

    // Initial sample voters from kpos
    const sampleVoters = [
      ['AS007', 'Ust. Yuda Hasan Sulaeman, M.Pd.', 'Asatidz / Guru', 'guru', 1, 1, 1],
      ['AS008', 'Ust. Ahmad Humaedi, S.Pd.I.', 'Asatidz / Guru', 'guru', 1, 1, 2],
      ['AS010', 'Ust. Didin Jamaludin, S.Pd.', 'Asatidz / Guru', 'guru', 1, 1, 3],
      ['AS011', 'Ust Muhammad Indra Nur A. S.Pd.', 'Asatidz / Guru', 'guru', 1, 1, 3],
      ['KP001', 'Adittyan Nugraha', 'Muta\'ali (XII)', 'siswa', 1, 1, 1],
      ['KP002', 'Muhammad Ikhsan', 'Muta\'ali (XII)', 'siswa', 1, 1, 3],
      ['KP003', 'Shiel Shiela', 'Muta\'ali (XII)', 'siswa', 1, 1, 2],
      ['KP004', 'Siti Raysa Juliana', 'Muta\'ali (XII)', 'siswa', 1, 1, 1],
      ['KP005', 'Dimas Nurmauludin Nugraha', 'Mutawasith (XI)', 'siswa', 1, 1, 4],
      ['KP006', 'Dinda Halimatus Sa\'diyah', 'Mutawasith (XI)', 'siswa', 1, 1, 3],
      ['KP007', 'Fatimah Husna Maulida', 'Mutawasith (XI)', 'siswa', 1, 1, 2],
      ['KP008', 'Sahla Amilatul Mahfiyah', 'Mutawasith (XI)', 'siswa', 1, 1, 1],
      ['KP009', 'Sandi Ramadhani', 'Mutawasith (XI)', 'siswa', 1, 1, 4],
      ['KP010', 'Syafa Salsabila Fauziyyah', 'Mutawasith (XI)', 'siswa', 1, 1, 3],
      ['KP011', 'Syifa Salsabila Fauziyyah', 'Mutawasith (XI)', 'siswa', 1, 1, 2],
      ['KP012', 'Maila Khofifah', 'Mutawasith (XI)', 'siswa', 1, 1, 1],
      ['KP013', 'Anhar Azkiya', 'Mubtadi (X)', 'siswa', 1, 1, 4],
      ['KP014', 'Anna Riani Fujiana', 'Mubtadi (X)', 'siswa', 1, 1, 3],
      ['KP015', 'Desi Nurjanah', 'Mubtadi (X)', 'siswa', 1, 1, 2],
      ['KP016', 'Deswita Febriyanti Maharani', 'Mubtadi (X)', 'siswa', 1, 1, 1],
      ['KP017', 'Dinda Ramdhan Gusdina', 'Mubtadi (X)', 'siswa', 1, 1, 3],
      ['KP018', 'Euis Rodianti', 'Mubtadi (X)', 'siswa', 1, 1, 4],
      ['KP019', 'Firda Maulidah', 'Mubtadi (X)', 'siswa', 1, 1, 3],
      ['KP020', 'Ilham Nur Alam Bachtiar', 'Mubtadi (X)', 'siswa', 1, 1, 1],
      ['KP021', 'Isma Sahilla Rizkiana', 'Mubtadi (X)', 'siswa', 0, 0, null],
      ['KP022', 'Kiki Kardiman', 'Mubtadi (X)', 'siswa', 0, 0, null],
      ['KP023', 'Luthfi Dzaki', 'Mubtadi (X)', 'siswa', 0, 0, null],
      ['KP024', 'M Fahri Ilahi Matin', 'Mubtadi (X)', 'siswa', 0, 0, null],
      ['KP025', 'Muhamad Alwa Irafy', 'Mubtadi (X)', 'siswa', 1, 1, 2],
      ['KP026', 'Muhamad Parhan', 'Mubtadi (X)', 'siswa', 0, 0, null],
      ['KP027', 'Naufal Akmal Ghifari', 'Mubtadi (X)', 'siswa', 1, 1, 1],
      ['KP028', 'Noviyatul Husna', 'Mubtadi (X)', 'siswa', 0, 0, null],
      ['KP029', 'Nugie Nugraha Ramadhan', 'Mubtadi (X)', 'siswa', 0, 0, null],
      ['KP030', 'Nur Syifa', 'Mubtadi (X)', 'siswa', 1, 1, 3],
      ['KP038', 'Al Nahyan Wahraniya Abdallah', 'Takhasus', 'siswa', 0, 0, null],
      ['KP039', 'Aura Putri Ramadhani', 'Takhasus', 'siswa', 1, 1, 2],
      ['KP040', 'Devina Zahirah Yusriyah', 'Takhasus', 'siswa', 1, 1, 3],
      ['KP041', 'Ende Nyanyu Marliyah', 'Takhasus', 'siswa', 0, 0, null],
      ['KP042', 'Fariz Haidar Palah', 'Takhasus', 'siswa', 0, 0, null]
    ];

    for (const [vId, vName, vClass, vRole, isPres, hasVoted, candId] of sampleVoters) {
      insertVoter.run(vId, vName, vClass, vRole, isPres, hasVoted, candId, hasVoted ? now : null);
    }
  }

  // ==========================================
  // 12. SISTEM WALI KELAS TERPADU (Digital Classroom Management)
  // ==========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS walikelas_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL DEFAULT 'X MIPA 1',
      academic_year TEXT NOT NULL DEFAULT '2025/2026',
      semester TEXT NOT NULL DEFAULT 'Ganjil',
      teacher_name TEXT NOT NULL DEFAULT 'Dra. Hj. Nurhayati, M.M.',
      teacher_nip TEXT NOT NULL DEFAULT '19750812 200212 2 001',
      room_name TEXT NOT NULL DEFAULT 'Ruang 101 - Gedung A Lantai 2',
      slogan TEXT NOT NULL DEFAULT 'Cerdas, Berkarakter, Disiplin, dan Berprestasi Unggul',
      vision TEXT NOT NULL DEFAULT 'Membentuk generasi pembelajar yang berakhlak mulia, adaptif teknologi, dan berwawasan global.',
      target_attendance REAL DEFAULT 95.0,
      target_gpa REAL DEFAULT 85.0
    );

    CREATE TABLE IF NOT EXISTS walikelas_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nis TEXT UNIQUE NOT NULL,
      nisn TEXT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('L', 'P')),
      phone_parent TEXT,
      phone_student TEXT,
      address TEXT,
      blood_type TEXT DEFAULT 'O',
      birth_date TEXT,
      status TEXT DEFAULT 'aktif',
      notes TEXT,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS walikelas_officers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position_title TEXT NOT NULL,
      student_id INTEGER,
      student_name TEXT NOT NULL,
      phone TEXT,
      tasks TEXT,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS walikelas_piket (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_name TEXT NOT NULL UNIQUE,
      members_json TEXT NOT NULL,
      duties_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS walikelas_seating (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desk_number INTEGER NOT NULL UNIQUE,
      row_num INTEGER NOT NULL,
      col_num INTEGER NOT NULL,
      student_id INTEGER,
      student_name TEXT
    );

    CREATE TABLE IF NOT EXISTS walikelas_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_code TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sanction TEXT,
      points INTEGER DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS walikelas_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_name TEXT NOT NULL,
      period_num INTEGER NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      room TEXT DEFAULT 'R-101'
    );

    CREATE TABLE IF NOT EXISTS walikelas_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Hadir', 'Sakit', 'Izin', 'Alpa')),
      notes TEXT,
      UNIQUE(date, student_id)
    );

    CREATE TABLE IF NOT EXISTS walikelas_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      period_range TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      topic_material TEXT NOT NULL,
      attendance_summary TEXT,
      incident_notes TEXT,
      status TEXT DEFAULT 'Terlaksana'
    );

    CREATE TABLE IF NOT EXISTS walikelas_grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_name TEXT NOT NULL,
      task_1 REAL DEFAULT 0,
      task_2 REAL DEFAULT 0,
      mid_exam REAL DEFAULT 0,
      final_exam REAL DEFAULT 0,
      final_grade REAL DEFAULT 0,
      predicate TEXT DEFAULT 'B',
      notes TEXT,
      UNIQUE(student_id, subject_name)
    );

    CREATE TABLE IF NOT EXISTS walikelas_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      date TEXT NOT NULL,
      incident_type TEXT NOT NULL,
      description TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      parent_notified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Dalam Pemantauan',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS walikelas_p5 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      project_theme TEXT NOT NULL,
      dimension TEXT NOT NULL,
      predicate TEXT NOT NULL CHECK(predicate IN ('BB', 'MB', 'BSH', 'SAB')),
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS walikelas_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_code TEXT NOT NULL UNIQUE,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'Unit',
      condition TEXT NOT NULL CHECK(condition IN ('Baik', 'Rusak Ringan', 'Rusak Berat')),
      source TEXT DEFAULT 'Sekolah / BOS',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS walikelas_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_title TEXT NOT NULL,
      category TEXT NOT NULL,
      doc_date TEXT NOT NULL,
      file_url TEXT,
      notes TEXT
    );
  `);

  // Seeding Walikelas Info
  const infoCount = db.prepare('SELECT count(*) as count FROM walikelas_info').get().count;
  if (infoCount === 0) {
    db.prepare(`
      INSERT INTO walikelas_info (class_name, academic_year, semester, teacher_name, teacher_nip, room_name, slogan, vision, target_attendance, target_gpa)
      VALUES ('X MIPA 1', '2025/2026', 'Ganjil', 'Dra. Hj. Nurhayati, M.M.', '19750812 200212 2 001', 'Ruang 101 - Gedung A Lantai 2', 'Cerdas, Berkarakter, Disiplin, dan Berprestasi Unggul', 'Membentuk generasi pembelajar yang berakhlak mulia, adaptif teknologi, dan berwawasan global.', 95.0, 85.0)
    `).run();
  }

  // Seeding 32 Siswa Kelas X MIPA 1
  const wkStudentCount = db.prepare('SELECT count(*) as count FROM walikelas_students').get().count;
  if (wkStudentCount === 0) {
    const insertWkStudent = db.prepare(`
      INSERT INTO walikelas_students (nis, nisn, name, gender, phone_parent, phone_student, address, blood_type, birth_date, status, notes, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?, ?)
    `);

    const studentsList = [
      ['20250101', '0081234001', 'Aditya Pratama Putra', 'L', '081234567890', '081234567891', 'Jl. Merdeka No. 12, Jakarta', 'O', '2009-04-15', 'Ketua Kelas, aktif di OSIS', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'],
      ['20250102', '0081234002', 'Adittyan Nugraha', 'L', '081234567892', '081234567893', 'Jl. Sudirman No. 45, Jakarta', 'A', '2009-06-20', 'Wakil Ketua Kelas', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'],
      ['20250103', '0081234003', 'Anhar Azkiya', 'L', '081234567894', '081234567895', 'Jl. Gatot Subroto No. 8, Jakarta', 'B', '2009-01-11', 'Seksi Keagamaan', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'],
      ['20250104', '0081234004', 'Anna Riani Fujiana', 'P', '081234567896', '081234567897', 'Jl. Thamrin No. 90, Jakarta', 'AB', '2009-09-05', 'Sekretaris 1', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'],
      ['20250105', '0081234005', 'Aura Putri Ramadhani', 'P', '081234567898', '081234567899', 'Jl. Diponegoro No. 17, Jakarta', 'O', '2009-03-24', 'Bendahara 1', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'],
      ['20250106', '0081234006', 'Desi Nurjanah', 'P', '081234567800', '081234567801', 'Jl. Kartini No. 34, Jakarta', 'A', '2009-12-14', 'Sekretaris 2', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'],
      ['20250107', '0081234007', 'Deswita Febriyanti Maharani', 'P', '081234567802', '081234567803', 'Jl. Pemuda No. 22, Jakarta', 'B', '2009-02-18', 'Bendahara 2', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150'],
      ['20250108', '0081234008', 'Dimas Nurmauludin Nugraha', 'L', '081234567804', '081234567805', 'Jl. Pahlawan No. 56, Jakarta', 'O', '2009-07-29', 'Seksi Olahraga', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'],
      ['20250109', '0081234009', 'Dinda Halimatus Sa\'diyah', 'P', '081234567806', '081234567807', 'Jl. Ahmad Yani No. 101, Jakarta', 'A', '2009-08-19', 'Seksi Kebersihan', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'],
      ['20250110', '0081234010', 'Dinda Ramdhan Gusdina', 'P', '081234567808', '081234567809', 'Jl. Veteran No. 15, Jakarta', 'B', '2009-10-02', 'Anggota Piket Senin', 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=150'],
      ['20250111', '0081234011', 'Ende Nyanyu Marliyah', 'P', '081234567810', '081234567811', 'Jl. Surya Kencana No. 78, Jakarta', 'O', '2009-05-30', 'Anggota PMR', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150'],
      ['20250112', '0081234012', 'Euis Rodianti', 'P', '081234567812', '081234567813', 'Jl. Cempaka Putih No. 63, Jakarta', 'A', '2009-11-23', 'Anggota Pramuka Inti', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150'],
      ['20250113', '0081234013', 'Fariz Haidar Palah', 'L', '081234567814', '081234567815', 'Jl. Rawamangun No. 27, Jakarta', 'AB', '2009-04-03', 'Seksi Keamanan', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'],
      ['20250114', '0081234014', 'Fatimah Husna Maulida', 'P', '081234567816', '081234567817', 'Jl. Salemba Raya No. 40, Jakarta', 'B', '2009-07-12', 'Juara 1 MTQ Sekolah', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150'],
      ['20250115', '0081234015', 'Firda Maulidah', 'P', '081234567818', '081234567819', 'Jl. Matraman No. 88, Jakarta', 'O', '2009-08-31', 'Anggota Paduan Suara', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150'],
      ['20250116', '0081234016', 'Ilham Nur Alam Bachtiar', 'L', '081234567820', '081234567821', 'Jl. Tebet Barat No. 5, Jakarta', 'A', '2009-01-25', 'Tim Basket Sekolah', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150'],
      ['20250117', '0081234017', 'Isma Sahilla Rizkiana', 'P', '081234567822', '081234567823', 'Jl. Manggarai No. 19, Jakarta', 'B', '2009-06-17', 'Klub Robotika', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'],
      ['20250118', '0081234018', 'Kiki Kardiman', 'L', '081234567824', '081234567825', 'Jl. Otista No. 91, Jakarta', 'O', '2009-03-08', 'Klub Coding & Web', 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150'],
      ['20250119', '0081234019', 'Luthfi Dzaki', 'L', '081234567826', '081234567827', 'Jl. Jatinegara Timur No. 3, Jakarta', 'A', '2009-10-15', 'Klub Futsal', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'],
      ['20250120', '0081234020', 'M Fahri Ilahi Matin', 'L', '081234567828', '081234567829', 'Jl. Basuki Rahmat No. 77, Jakarta', 'B', '2009-05-22', 'Pecinta Alam', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'],
      ['20250121', '0081234021', 'Maila Khofifah', 'P', '081234567830', '081234567831', 'Jl. Pramuka No. 14, Jakarta', 'O', '2009-11-09', 'Seksi Mading & Literasi', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'],
      ['20250122', '0081234022', 'Muhamad Alwa Irafy', 'L', '081234567832', '081234567833', 'Jl. Kramat Raya No. 51, Jakarta', 'A', '2009-02-04', 'Kandidat Paslon 2', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'],
      ['20250123', '0081234023', 'Muhamad Parhan', 'L', '081234567834', '081234567835', 'Jl. Percetakan Negara No. 8, Jakarta', 'B', '2009-09-18', 'Tim Paskibra', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'],
      ['20250124', '0081234024', 'Muhammad Ikhsan', 'L', '081234567836', '081234567837', 'Jl. Cikini Raya No. 33, Jakarta', 'O', '2009-04-12', 'Kandidat Paslon 3', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'],
      ['20250125', '0081234025', 'Naufal Akmal Ghifari', 'L', '081234567838', '081234567839', 'Jl. Raden Saleh No. 62, Jakarta', 'A', '2009-08-07', 'Kandidat Paslon 1', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'],
      ['20250126', '0081234026', 'Noviyatul Husna', 'P', '081234567840', '081234567841', 'Jl. Menteng Tenggulun No. 4, Jakarta', 'B', '2009-01-30', 'Klub Tari Tradisional', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'],
      ['20250127', '0081234027', 'Nugie Nugraha Ramadhan', 'L', '081234567842', '081234567843', 'Jl. Johar Baru No. 18, Jakarta', 'O', '2009-12-05', 'Tim Badminton', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'],
      ['20250128', '0081234028', 'Nur Syifa', 'P', '081234567844', '081234567845', 'Jl. Utan Kayu No. 99, Jakarta', 'A', '2009-07-16', 'Anggota Kopsis', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'],
      ['20250129', '0081234029', 'Sahla Amilatul Mahfiyah', 'P', '081234567846', '081234567847', 'Jl. Kayu Manis No. 71, Jakarta', 'B', '2009-03-22', 'Olimpiade Biologi', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'],
      ['20250130', '0081234030', 'Sandi Ramadhani', 'L', '081234567848', '081234567849', 'Jl. Rawasari No. 25, Jakarta', 'O', '2009-10-11', 'Fotografi & Desain', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150'],
      ['20250131', '0081234031', 'Shiel Shiela', 'P', '081234567850', '081234567851', 'Jl. Kebon Sirih No. 16, Jakarta', 'A', '2009-05-14', 'Public Speaking', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150'],
      ['20250132', '0081234032', 'Siti Raysa Juliana', 'P', '081234567852', '081234567853', 'Jl. Wahid Hasyim No. 82, Jakarta', 'B', '2009-11-28', 'Duta Bahasa Sekolah', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150']
    ];

    for (const st of studentsList) {
      insertWkStudent.run(...st);
    }
  }

  // Seeding Struktur Pengurus Kelas
  const officerCount = db.prepare('SELECT count(*) as count FROM walikelas_officers').get().count;
  if (officerCount === 0) {
    const insertOfficer = db.prepare(`
      INSERT INTO walikelas_officers (position_title, student_id, student_name, phone, tasks, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertOfficer.run('Wali Kelas', null, 'Dra. Hj. Nurhayati, M.M.', '0812-7890-1234', 'Membina, mengawasi, dan bertanggung jawab penuh atas seluruh kegiatan serta administrasi kelas.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150');
    insertOfficer.run('Ketua Kelas', 1, 'Aditya Pratama Putra', '0812-3456-7891', 'Memimpin kelas, mengkoordinir teman-teman sekelas, dan menjadi jembatan komunikasi ke guru & wali kelas.', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150');
    insertOfficer.run('Wakil Ketua Kelas', 2, 'Adittyan Nugraha', '0812-3456-7893', 'Mendampingi ketua kelas dan menggantikan peran ketua apabila berhalangan hadir.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
    insertOfficer.run('Sekretaris 1', 4, 'Anna Riani Fujiana', '0812-3456-7897', 'Mencatat agenda kelas, presensi harian, dan mengelola surat-menyurat kelas.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150');
    insertOfficer.run('Sekretaris 2', 6, 'Desi Nurjanah', '0812-3456-7801', 'Membantu pembuatan laporan kegiatan kelas dan notulensi rapat kelas.', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150');
    insertOfficer.run('Bendahara 1', 5, 'Aura Putri Ramadhani', '0812-3456-7899', 'Mengelola uang kas mingguan kelas dan mencatat pembukuan keuangan kelas.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
    insertOfficer.run('Bendahara 2', 7, 'Deswita Febriyanti Maharani', '0812-3456-7803', 'Membantu penarikan kas kelas dan penyusunan kuitansi belanja kebutuhan kelas.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150');
    insertOfficer.run('Seksi Kebersihan', 9, 'Dinda Halimatus Sa\'diyah', '0812-3456-7807', 'Mengawasi pelaksanaan jadwal piket kelas dan menjaga sarana kebersihan ruangan.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150');
    insertOfficer.run('Seksi Keamanan', 13, 'Fariz Haidar Palah', '0812-3456-7815', 'Menjaga ketertiban, keamanan barang kelas, dan kedisiplinan siswa.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150');
    insertOfficer.run('Seksi Keagamaan', 3, 'Anhar Azkiya', '0812-3456-7895', 'Memimpin doa bersama awal/akhir KBM dan kegiatan shalat dhuha/dzuhur berjamaah.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150');
  }

  // Seeding Jadwal Piket Senin - Jumat
  const piketCount = db.prepare('SELECT count(*) as count FROM walikelas_piket').get().count;
  if (piketCount === 0) {
    const insertPiket = db.prepare('INSERT INTO walikelas_piket (day_name, members_json, duties_json) VALUES (?, ?, ?)');
    insertPiket.run('Senin', JSON.stringify(['Aditya Pratama Putra', 'Adittyan Nugraha', 'Anhar Azkiya', 'Anna Riani Fujiana', 'Aura Putri Ramadhani', 'Desi Nurjanah']), JSON.stringify(['Menyapu dan mengepel lantai kelas', 'Membersihkan papan tulis dan spidol', 'Membuang sampah ke tempat pembuangan luar', 'Merapikan meja guru dan taplak meja']));
    insertPiket.run('Selasa', JSON.stringify(['Deswita Febriyanti Maharani', 'Dimas Nurmauludin Nugraha', 'Dinda Halimatus Sa\'diyah', 'Dinda Ramdhan Gusdina', 'Ende Nyanyu Marliyah', 'Euis Rodianti']), JSON.stringify(['Menyapu ruang kelas & teras depan', 'Membersihkan kaca jendela kelas', 'Memastikan proyektor & AC dimatikan seusai KBM', 'Mengisi ulang tinta spidol']));
    insertPiket.run('Rabu', JSON.stringify(['Fariz Haidar Palah', 'Fatimah Husna Maulida', 'Firda Maulidah', 'Ilham Nur Alam Bachtiar', 'Isma Sahilla Rizkiana', 'Kiki Kardiman']), JSON.stringify(['Menyapu dan mengepel kelas', 'Merapikan letak meja & kursi sesuai denah', 'Membersihkan papan tulis & penghapus', 'Menyiram tanaman di pot depan kelas']));
    insertPiket.run('Kamis', JSON.stringify(['Luthfi Dzaki', 'M Fahri Ilahi Matin', 'Maila Khofifah', 'Muhamad Alwa Irafy', 'Muhamad Parhan', 'Muhammad Ikhsan']), JSON.stringify(['Menyapu lantai kelas dan koridor', 'Menguras dan membersihkan tempat cuci tangan/wastafel', 'Mengganti plastik tempat sampah', 'Menata buku-buku di sudut baca kelas']));
    insertPiket.run('Jumat', JSON.stringify(['Naufal Akmal Ghifari', 'Noviyatul Husna', 'Nugie Nugraha Ramadhan', 'Nur Syifa', 'Sahla Amilatul Mahfiyah', 'Sandi Ramadhani', 'Shiel Shiela', 'Siti Raysa Juliana']), JSON.stringify(['Operasi Semut (kebersihan total akhir pekan)', 'Membersihkan kipas angin & filter AC', 'Mengecek kelengkapan inventaris kelas', 'Mengunci pintu dan jendela sebelum pulang']));
  }

  // Seeding Denah Duduk (16 Meja Ganda = 32 Siswa, 4 Baris x 4 Kolom)
  const seatingCount = db.prepare('SELECT count(*) as count FROM walikelas_seating').get().count;
  if (seatingCount === 0) {
    const insertSeat = db.prepare('INSERT INTO walikelas_seating (desk_number, row_num, col_num, student_id, student_name) VALUES (?, ?, ?, ?, ?)');
    const allStudents = db.prepare('SELECT id, name FROM walikelas_students ORDER BY id ASC LIMIT 32').all();
    for (let i = 0; i < 32; i++) {
      const deskNum = Math.floor(i / 2) + 1;
      const row = Math.floor((deskNum - 1) / 4) + 1;
      const col = ((deskNum - 1) % 4) + 1;
      insertSeat.run(i + 1, row, col, allStudents[i]?.id || null, allStudents[i]?.name || `Siswa Kursi ${i + 1}`);
    }
  }

  // Seeding Tata Tertib Kelas
  const rulesCount = db.prepare('SELECT count(*) as count FROM walikelas_rules').get().count;
  if (rulesCount === 0) {
    const insertRule = db.prepare('INSERT INTO walikelas_rules (rule_code, category, title, description, sanction, points) VALUES (?, ?, ?, ?, ?, ?)');
    insertRule.run('TT-01', 'Kedisiplinan', 'Hadir Tepat Waktu', 'Siswa wajib berada di dalam ruang kelas 15 menit sebelum bel masuk berbunyi (pukul 06.45 WIB).', 'Peringatan lisan & bertugas membaca Asmaul Husna / doa di depan kelas', 5);
    insertRule.run('TT-02', 'Kerapian', 'Seragam Resmi Sesuai Jadwal', 'Memakai seragam lengkap, rapi, baju dimasukkan, atribut badge lengkap, kaos kaki putih, dan sepatu hitam.', 'Ditegur oleh ketua kelas & wali kelas, poin pelanggaran tata tertib bertambah', 5);
    insertRule.run('TT-03', 'Ketertiban KBM', 'Dilarang Menggunakan HP Tanpa Instruksi Guru', 'Ponsel pintar disimpan di loker HP kelas selama proses belajar mengajar berlangsung kecuali diinstruksikan oleh guru.', 'Ponsel dititipkan ke meja wali kelas dan diambil saat jam kepulangan', 10);
    insertRule.run('TT-04', 'Kebersihan', 'Kewajiban Piket Harian & Buang Sampah', 'Setiap regu piket wajib membersihkan kelas sebelum KBM dimulai dan merapikan kelas setelah KBM selesai.', 'Denda kebersihan Rp 5.000 (masuk kas kelas) & piket dobel di hari berikutnya', 5);
    insertRule.run('TT-05', 'Karakter & Sopan Santun', 'Menjaga Tutur Kata & Anti-Bullying', 'Dilarang berkata kotor, mengejek, melakukan perundungan (verbal/fisik), atau merusak suasana belajar.', 'Pembinaan khusus wali kelas, pemanggilan orang tua & surat peringatan', 25);
    insertRule.run('TT-06', 'Sarana Prasarana', 'Menjaga Keutuhan Inventaris Ruangan', 'Dilarang mencoret-coret meja, kursi, dinding, dan merusak fasilitas proyektor/AC kelas.', 'Wajib membersihkan atau mengganti kerusakan fasilitas yang diperbuat', 15);
  }

  // Seeding Jadwal Pelajaran (Senin - Jumat)
  const schedCount = db.prepare('SELECT count(*) as count FROM walikelas_schedule').get().count;
  if (schedCount === 0) {
    const insertSched = db.prepare('INSERT INTO walikelas_schedule (day_name, period_num, time_start, time_end, subject_name, teacher_name, room) VALUES (?, ?, ?, ?, ?, ?, ?)');
    
    // Senin
    insertSched.run('Senin', 1, '07:00', '07:45', 'Upacara Bendera', 'Dra. Hj. Nurhayati, M.M.', 'Lapangan Utama');
    insertSched.run('Senin', 2, '07:45', '09:15', 'Matematika Peminatan', 'Bambang Sutedjo, M.Pd.', 'R-101');
    insertSched.run('Senin', 3, '09:30', '11:00', 'Fisika Terapan', 'Dr. Ir. Hendra Saputra', 'Lab Fisika');
    insertSched.run('Senin', 4, '11:00', '12:00', 'Bahasa Indonesia', 'Siti Rahmawati, S.Pd.', 'R-101');
    insertSched.run('Senin', 5, '12:45', '14:15', 'Informatika & Coding', 'Ahmad Zaki, M.Kom.', 'Lab Komputer 1');

    // Selasa
    insertSched.run('Selasa', 1, '07:00', '08:30', 'Biologi Molekuler', 'Dra. Endang Sulastri', 'Lab Biologi');
    insertSched.run('Selasa', 2, '08:30', '10:00', 'Kimia Analitik', 'Arief Rahman, M.Si.', 'Lab Kimia');
    insertSched.run('Selasa', 3, '10:15', '11:45', 'Bahasa Inggris', 'Robert Anderson, B.Ed.', 'R-101');
    insertSched.run('Selasa', 4, '12:30', '14:00', 'Pendidikan Agama & Budi Pekerti', 'Ust. Muhammad Ilyas, M.Pd.I.', 'Masjid Sekolah');

    // Rabu
    insertSched.run('Rabu', 1, '07:00', '08:30', 'Pendidikan Jasmani (Olahraga)', 'Guntur Wibowo, S.Pd.', 'GOR Sekolah');
    insertSched.run('Rabu', 2, '08:30', '10:00', 'Sejarah Indonesia', 'Sri Wahyuni, M.Pd.', 'R-101');
    insertSched.run('Rabu', 3, '10:15', '11:45', 'Pendidikan Pancasila & P5', 'Dra. Hj. Nurhayati, M.M.', 'R-101');
    insertSched.run('Rabu', 4, '12:30', '14:00', 'Seni Budaya & Keterampilan', 'Dewi Sartika, S.Sn.', 'R-101');

    // Kamis
    insertSched.run('Kamis', 1, '07:00', '08:30', 'Matematika Wajib', 'Bambang Sutedjo, M.Pd.', 'R-101');
    insertSched.run('Kamis', 2, '08:30', '10:00', 'Geografi & Kebumian', 'Haryanto, S.Pd.', 'R-101');
    insertSched.run('Kamis', 3, '10:15', '11:45', 'Sosiologi & Karakter', 'Dra. Marlina', 'R-101');
    insertSched.run('Kamis', 4, '12:30', '14:00', 'Bimbingan Konseling & Karir', 'Rahmat Hidayat, M.Psi.', 'R-101');

    // Jumat
    insertSched.run('Jumat', 1, '07:00', '07:45', 'Senam Sehat & Literasi Pagi', 'Seluruh Guru & Siswa', 'Lapangan Utama');
    insertSched.run('Jumat', 2, '07:45', '09:15', 'Prakarya & Kewirausahaan', 'Ratna Juwita, S.E.', 'R-101');
    insertSched.run('Jumat', 3, '09:30', '11:00', 'Ekonomi Terapan', 'Ratna Juwita, S.E.', 'R-101');
    insertSched.run('Jumat', 4, '13:00', '14:30', 'Ekstrakurikuler Wajib Pramuka', 'Kak Pembina Pramuka', 'Lapangan & Aula');
  }

  // Seeding Presensi Hari Ini
  const attCount = db.prepare('SELECT count(*) as count FROM walikelas_attendance').get().count;
  if (attCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    const insertAtt = db.prepare('INSERT OR IGNORE INTO walikelas_attendance (date, student_id, status, notes) VALUES (?, ?, ?, ?)');
    const allSt = db.prepare('SELECT id FROM walikelas_students').all();
    allSt.forEach((s, idx) => {
      let st = 'Hadir';
      let n = 'Hadir tepat waktu';
      if (idx === 6) { st = 'Sakit'; n = 'Surat izin dokter demam'; }
      if (idx === 14) { st = 'Izin'; n = 'Mengikuti lomba olimpiade sains'; }
      insertAtt.run(today, s.id, st, n);
    });
  }

  // Seeding Jurnal Pembelajaran
  const journalCount = db.prepare('SELECT count(*) as count FROM walikelas_journal').get().count;
  if (journalCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    const insertJrn = db.prepare('INSERT INTO walikelas_journal (date, period_range, subject_name, teacher_name, topic_material, attendance_summary, incident_notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertJrn.run(today, 'Jam ke 1-2 (07.00 - 08.30)', 'Matematika Peminatan', 'Bambang Sutedjo, M.Pd.', 'Persamaan dan Pertidaksamaan Trigonometri Lanjut', '30 Siswa Hadir, 1 Sakit, 1 Izin', 'Siswa aktif bertanya, latihan soal nomor 1-5 diselesaikan dengan baik.', 'Terlaksana');
    insertJrn.run(today, 'Jam ke 3-4 (08.30 - 10.00)', 'Informatika & Coding', 'Ahmad Zaki, M.Kom.', 'Struktur Data Dasar & Algoritma Pengurutan (Sorting)', '30 Siswa Hadir, 1 Sakit, 1 Izin', 'Praktik di lab komputer berjalan kondusif, seluruh siswa berhasil menulis program sorting.', 'Terlaksana');
    insertJrn.run(today, 'Jam ke 5-6 (10.15 - 11.45)', 'Fisika Terapan', 'Dr. Ir. Hendra Saputra', 'Hukum Gerak Newton & Praktikum Gaya Gesek', '30 Siswa Hadir, 1 Sakit, 1 Izin', 'Alat praktikum lengkap, laporan percobaan dikumpulkan tepat waktu.', 'Terlaksana');
  }

  // Seeding Buku Kasus & Pembinaan Siswa
  const caseCount = db.prepare('SELECT count(*) as count FROM walikelas_cases').get().count;
  if (caseCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    const insertCase = db.prepare('INSERT INTO walikelas_cases (student_id, student_name, date, incident_type, description, action_taken, parent_notified, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertCase.run(18, 'Kiki Kardiman', today, 'Keterlambatan', 'Terlambat masuk sekolah sebanyak 3 kali berturut-turut pada minggu ini karena kendala transportasi.', 'Diberikan konseling oleh wali kelas, membuat komitmen jadwal bangun pagi, dan koordinasi dengan orang tua.', 1, 'Dalam Pemantauan', today);
    insertCase.run(8, 'Dimas Nurmauludin Nugraha', today, 'Ketertiban Seragam', 'Tidak memakai dasi dan kaos kaki tidak sesuai aturan saat upacara bendera.', 'Peringatan pertama, diarahkan ke ruang BK untuk meminjam atribut resmi.', 0, 'Selesai', today);
    insertCase.run(16, 'Ilham Nur Alam Bachtiar', today, 'Penghargaan / Prestasi', 'Meraih medali perak dalam Kejuaraan Basket Pelajar Tingkat Kota.', 'Pemberian piagam apresiasi di depan kelas dan poin prestasi ditambah 20 poin.', 1, 'Selesai', today);
  }

  // Seeding Catatan P5 (Projek Profil Pelajar Pancasila)
  const p5Count = db.prepare('SELECT count(*) as count FROM walikelas_p5').get().count;
  if (p5Count === 0) {
    const insertP5 = db.prepare('INSERT INTO walikelas_p5 (student_id, student_name, project_theme, dimension, predicate, description) VALUES (?, ?, ?, ?, ?, ?)');
    insertP5.run(1, 'Aditya Pratama Putra', 'Gaya Hidup Berkelanjutan', 'Gotong Royong & Mandiri', 'SAB', 'Sangat aktif memimpin tim pengolahan limbah plastik menjadi produk bernilai guna di sekolah.');
    insertP5.run(4, 'Anna Riani Fujiana', 'Kearifan Lokal', 'Berkebhinekaan Global', 'BSH', 'Mampu menyusun naskah drama tradisional dan mendokumentasikan nilai luhur budaya setempat.');
    insertP5.run(8, 'Dimas Nurmauludin Nugraha', 'Kewirausahaan', 'Kreatif & Bernalar Kritis', 'BSH', 'Menunjukkan ide pemasaran kreatif pada bazar P5 dan aktif dalam pembagian tugas kelompok.');
    insertP5.run(14, 'Fatimah Husna Maulida', 'Suara Demokrasi', 'Beriman & Berakhlak Mulia', 'SAB', 'Mampu menyampaikan argumen dengan santun, toleran terhadap pendapat teman yang berbeda.');
  }

  // Seeding Inventaris Kelas
  const invCount = db.prepare('SELECT count(*) as count FROM walikelas_inventory').get().count;
  if (invCount === 0) {
    const insertInv = db.prepare('INSERT INTO walikelas_inventory (item_code, item_name, quantity, unit, condition, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertInv.run('INV-101-01', 'Meja Siswa Kayu Ganda', 16, 'Unit', 'Baik', 'Pengadaan Sekolah 2024', 'Dilengkapi gantungan tas');
    insertInv.run('INV-101-02', 'Kursi Siswa Besi & Busa', 32, 'Unit', 'Baik', 'Pengadaan Sekolah 2024', 'Kondisi kokoh');
    insertInv.run('INV-101-03', 'Meja Guru & Kursi Kerja', 1, 'Set', 'Baik', 'Pengadaan Sekolah', 'Dilengkapi laci berkunci');
    insertInv.run('INV-101-04', 'Papan Tulis Whiteboard Besar', 1, 'Unit', 'Baik', 'BOS Reguler', 'Ukuran 240 x 120 cm');
    insertInv.run('INV-101-05', 'LCD Proyektor Epson & Screen', 1, 'Set', 'Baik', 'BOS Kinerja', 'Terpasang di plafon ruang kelas');
    insertInv.run('INV-101-06', 'Pendingin Ruangan (AC Split 1.5 PK)', 2, 'Unit', 'Baik', 'Komite Sekolah', 'Suhu dingin terawat');
    insertInv.run('INV-101-07', 'Dispenser Air Minum Kelas', 1, 'Unit', 'Baik', 'Kas Kelas', 'Fungsi panas & dingin normal');
    insertInv.run('INV-101-08', 'Kotak P3K Lengkap Isi Obat', 1, 'Kotak', 'Baik', 'PMR Sekolah', 'Diperbarui berkala');
    insertInv.run('INV-101-09', 'Jam Dinding Seiko', 1, 'Unit', 'Baik', 'Kas Kelas', 'Baterai baru terpasang');
    insertInv.run('INV-101-10', 'Tempat Sampah Pilah (Organik/Anorganik)', 2, 'Buah', 'Baik', 'Sekolah Adiwiyata', 'Tertutup rapi');
    insertInv.run('INV-101-11', 'Loker Penyimpanan Smartphone', 1, 'Unit', 'Baik', 'Komite Kelas', '36 slot berpenutup');
    insertInv.run('INV-101-12', 'Lemari Arsip Dokumen Kelas', 1, 'Unit', 'Rusak Ringan', 'Pengadaan Lama', 'Engsel pintu kiri agak longgar');
  }

  // Seeding Arsip Dokumen Kelas
  const docCount = db.prepare('SELECT count(*) as count FROM walikelas_documents').get().count;
  if (docCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    const insertDoc = db.prepare('INSERT INTO walikelas_documents (doc_title, category, doc_date, file_url, notes) VALUES (?, ?, ?, ?, ?)');
    insertDoc.run('SK Pengangkatan Wali Kelas X MIPA 1 TA 2025/2026', 'SK & Kebijakan', '2025-07-15', '#', 'Ditandatangani oleh Kepala Sekolah SMAN 1 Harapan Bangsa');
    insertDoc.run('Struktur Organisasi & Kepengurusan Resmi Kelas X MIPA 1', 'Administrasi', '2025-08-01', '#', 'Berdasarkan musyawarah mufakat kelas');
    insertDoc.run('Berita Acara Pembagian Tugas Piket & Tata Tertib', 'Administrasi', '2025-08-05', '#', 'Disetujui oleh seluruh wali murid dan siswa');
    insertDoc.run('Surat Izin Orang Tua: Study Tour & Riset Ilmiah Kebun Raya', 'Surat Izin', today, '#', '32 berkas terkumpul lengkap');
    insertDoc.run('Piagam Juara Umum Kelas Terbersih & Terdisiplin Bulan Agustus', 'Prestasi', '2025-08-31', '#', 'Penghargaan dari Kepala Sekolah');
  }

  // Normalisasi format jam jadwal wali kelas pada instalasi lama (HH.MM → HH:MM) agar konsisten & terurut.
  db.prepare("UPDATE walikelas_schedule SET time_start = replace(time_start, '.', ':'), time_end = replace(time_end, '.', ':') WHERE time_start LIKE '%.%' OR time_end LIKE '%.%'").run();

  console.log('✅ SQLite Schema initialized successfully (including Kantin, Dompet, Pemilos & SISTEM WALI KELAS).');

}
