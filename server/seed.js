import { db, hashPassword, initDatabase } from './db.js';

initDatabase();

export function seedDatabase() {
  console.log('🌱 Seeding database with realistic school data...');

  // 1. Classes
  const classCheck = db.prepare('SELECT COUNT(*) as count FROM classes').get();
  if (classCheck.count === 0) {
    const insertClass = db.prepare(`
      INSERT INTO classes (name, grade, major, academic_year, homeroom_teacher_name)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertClass.run('X MIPA 1', '10', 'MIPA', '2024/2025', 'Drs. Budi Santoso, M.Pd');
    insertClass.run('X MIPA 2', '10', 'MIPA', '2024/2025', 'Siti Rahmawati, S.Pd');
    insertClass.run('XI IPS 1', '11', 'IPS', '2024/2025', 'Ahmad Fauzi, S.Si');
    insertClass.run('XII MIPA 1', '12', 'MIPA', '2024/2025', 'Dewi Lestari, M.Kom');
  }

  // 2. Teachers
  const teacherCheck = db.prepare('SELECT COUNT(*) as count FROM teachers').get();
  if (teacherCheck.count === 0) {
    const insertTeacher = db.prepare(`
      INSERT INTO teachers (nip, nuptk, name, gender, subject, phone, email, education, position, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTeacher.run('197503122000031001', '8345753654200012', 'Drs. Budi Santoso, M.Pd', 'Laki-laki', 'Matematika', '081234567801', 'budi.santoso@sekolah.sch.id', 'S2 Pendidikan Matematika', 'Wakasek Kurikulum & Guru', 'Aktif');
    insertTeacher.run('198207152006042003', '4152760662300021', 'Siti Rahmawati, S.Pd', 'Perempuan', 'Bahasa Indonesia', '081234567802', 'siti.rahmawati@sekolah.sch.id', 'S1 Sastra Indonesia', 'Guru Pengajar', 'Aktif');
    insertTeacher.run('198811202010011005', '9241766667100032', 'Ahmad Fauzi, S.Si', 'Laki-laki', 'Fisika & Informatika', '081234567803', 'ahmad.fauzi@sekolah.sch.id', 'S1 Fisika MIPA', 'Kepala Lab Komputer', 'Aktif');
    insertTeacher.run('198004252005012004', '3342758660200043', 'Dewi Lestari, M.Kom', 'Perempuan', 'Informatika & TIK', '081234567804', 'dewi.lestari@sekolah.sch.id', 'S2 Ilmu Komputer', 'Guru Pengajar', 'Aktif');
    insertTeacher.run('198509182008011002', '7435763665100054', 'Hendro Wibowo, S.Pd', 'Laki-laki', 'Bimbingan Konseling (BK)', '081234567805', 'hendro.bk@sekolah.sch.id', 'S1 Bimbingan Konseling', 'Koordinator Guru BK', 'Aktif');
  }

  // 3. Students
  const studentCheck = db.prepare('SELECT COUNT(*) as count FROM students').get();
  if (studentCheck.count === 0) {
    const insertStudent = db.prepare(`
      INSERT INTO students (nisn, nis, name, gender, birth_place, birth_date, address, parent_name, parent_phone, class_id, status, qr_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStudent.run('0061234561', '24001', 'Aditya Pratama Putra', 'Laki-laki', 'Jakarta', '2008-04-12', 'Jl. Merdeka No. 45, Jakarta Selatan', 'Bambang Pratama', '081398765401', 1, 'aktif', 'SISWA-0061234561');
    insertStudent.run('0061234562', '24002', 'Anisa Maharani', 'Perempuan', 'Bandung', '2008-08-25', 'Jl. Flamboyan Blok C-12, Jakarta', 'Ir. Hendra Gunawan', '081398765402', 1, 'aktif', 'SISWA-0061234562');
    insertStudent.run('0061234563', '24003', 'Dimas Satria Wicaksana', 'Laki-laki', 'Surabaya', '2008-01-19', 'Jl. Dahlia No. 10, Jakarta Selatan', 'H. Wibowo Wicaksana', '081398765403', 1, 'aktif', 'SISWA-0061234563');
    insertStudent.run('0051234564', '23015', 'Nadhira Citra Kirana', 'Perempuan', 'Yogyakarta', '2007-06-30', 'Jl. Kenanga Indah No. 8', 'Drs. Suharjo', '081398765404', 3, 'aktif', 'SISWA-0051234564');
    insertStudent.run('0041234565', '22008', 'Rizky Maulana Syah', 'Laki-laki', 'Semarang', '2006-11-14', 'Jl. Cempaka Putih No. 22', 'Syahrul Hidayat', '081398765405', 4, 'aktif', 'SISWA-0041234565');
  }

  // 4. Users (Authentication & Roles)
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCheck.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, name, email, phone, avatar, related_student_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Admin
    insertUser.run('admin', hashPassword('admin123'), 'admin', 'Administrator Tata Usaha', 'admin@sekolah.sch.id', '081122334455', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', null);
    // Guru
    insertUser.run('guru', hashPassword('guru123'), 'guru', 'Drs. Budi Santoso, M.Pd', 'budi.santoso@sekolah.sch.id', '081234567801', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', null);
    // Siswa (Aditya Pratama)
    insertUser.run('siswa', hashPassword('siswa123'), 'siswa', 'Aditya Pratama Putra', 'aditya.pratama@siswa.sch.id', '081398765401', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 1);
    // Orang Tua (Bambang Pratama, ortu Aditya)
    insertUser.run('ortu', hashPassword('ortu123'), 'ortu', 'Bambang Pratama (Wali Siswa)', 'bambang.pratama@gmail.com', '081398765401', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 1);
  }

  // 5. Subjects
  const subjectCheck = db.prepare('SELECT COUNT(*) as count FROM subjects').get();
  if (subjectCheck.count === 0) {
    const insertSubj = db.prepare('INSERT INTO subjects (code, name, teacher_name) VALUES (?, ?, ?)');
    insertSubj.run('MAT-10', 'Matematika Wajib', 'Drs. Budi Santoso, M.Pd');
    insertSubj.run('BIN-10', 'Bahasa Indonesia', 'Siti Rahmawati, S.Pd');
    insertSubj.run('FIS-10', 'Fisika Peminatan', 'Ahmad Fauzi, S.Si');
    insertSubj.run('INF-10', 'Informatika & Coding', 'Dewi Lestari, M.Kom');
  }

  // 6. Schedules
  const scheduleCheck = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
  if (scheduleCheck.count === 0) {
    const insertSched = db.prepare(`
      INSERT INTO schedules (class_id, subject_id, teacher_name, day, start_time, end_time, room)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertSched.run(1, 1, 'Drs. Budi Santoso, M.Pd', 'Senin', '07:30', '09:00', 'R. 101');
    insertSched.run(1, 2, 'Siti Rahmawati, S.Pd', 'Senin', '09:15', '10:45', 'R. 101');
    insertSched.run(1, 3, 'Ahmad Fauzi, S.Si', 'Selasa', '07:30', '09:00', 'Lab Fisika');
    insertSched.run(1, 4, 'Dewi Lestari, M.Kom', 'Rabu', '08:00', '10:00', 'Lab Komputer');
  }

  // 7. Attendance Logs
  const attCheck = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
  if (attCheck.count === 0) {
    const insertAtt = db.prepare(`
      INSERT INTO attendance (user_type, person_id, person_name, person_identifier, date, time, type, subject_name, status, method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const today = new Date().toISOString().split('T')[0];
    insertAtt.run('siswa', 1, 'Aditya Pratama Putra', '0061234561', today, '06:48:15', 'masuk', null, 'hadir', 'self_scan', 'Tepat waktu via Scanner HP');
    insertAtt.run('siswa', 2, 'Anisa Maharani', '0061234562', today, '06:55:00', 'masuk', null, 'hadir', 'kiosk_card', 'Tap kartu pos gerbang');
    insertAtt.run('siswa', 3, 'Dimas Satria Wicaksana', '0061234563', today, '07:10:20', 'masuk', null, 'hadir', 'self_scan', 'Toleransi keterlambatan 10 menit');
    insertAtt.run('guru', 1, 'Drs. Budi Santoso, M.Pd', '197503122000031001', today, '06:40:10', 'masuk', null, 'hadir', 'self_scan', 'Presensi Guru Masuk');
  }

  // 8. CBT Exam & Questions (With Anti-Cheating Settings)
  const cbtCheck = db.prepare('SELECT COUNT(*) as count FROM cbt_exams').get();
  if (cbtCheck.count === 0) {
    const insertExam = db.prepare(`
      INSERT INTO cbt_exams (title, subject_name, class_name, duration_minutes, start_time, end_time, total_questions, passing_score, is_active, max_violations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const exam1 = insertExam.run(
      'Penilaian Tengah Semester (PTS) Informatika 2025',
      'Informatika & Coding',
      'X MIPA 1',
      45,
      '08:00',
      '12:00',
      5,
      75,
      1,
      3
    );
    const examId = exam1.lastInsertRowid;

    const insertQ = db.prepare(`
      INSERT INTO cbt_questions (exam_id, question_text, question_type, option_a, option_b, option_c, option_d, option_e, correct_option, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertQ.run(examId, 'Protokol jaringan yang digunakan untuk mengamankan komunikasi data terenkripsi di web adalah...', 'pg', 'HTTP', 'HTTPS', 'FTP', 'SMTP', 'DNS', 'B', 20);
    insertQ.run(examId, 'Manakah di bawah ini yang merupakan struktur data bertipe LIFO (Last In First Out)?', 'pg', 'Queue', 'Stack', 'Linked List', 'Binary Tree', 'Graph', 'B', 20);
    insertQ.run(examId, 'Komponen utama komputer yang berfungsi sebagai otak pemrosesan instruksi adalah...', 'pg', 'RAM', 'GPU', 'CPU (Processor)', 'Power Supply', 'Hard Disk', 'C', 20);
    insertQ.run(examId, 'Bahasa pemrograman yang berjalan secara native di web browser client-side adalah...', 'pg', 'Python', 'Java', 'C++', 'JavaScript', 'Rust', 'D', 20);
    insertQ.run(examId, 'Jelaskan mengapa fitur Anti-Nyontek seperti Fullscreen Lock dan Tab Detection sangat penting dalam sistem ujian online berbasis web!', 'essay', null, null, null, null, null, null, 20);
  }

  // 9. SPP Bills (12 Months)
  const sppCheck = db.prepare('SELECT COUNT(*) as count FROM spp_bills').get();
  if (sppCheck.count === 0) {
    const insertSpp = db.prepare(`
      INSERT INTO spp_bills (student_id, month, year, amount, status, payment_date, payment_method, receipt_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    months.forEach((m, idx) => {
      if (idx < 7) {
        insertSpp.run(1, m, 2024, 350000, 'lunas', `2024-0${(idx % 9) + 1}-10`, 'Transfer Virtual Account Mandiri', `KW-SPP-2024-${1000 + idx}`);
      } else if (idx === 7) {
        insertSpp.run(1, m, 2025, 350000, 'menunggu', '2025-02-12', 'QRIS Payment Gateway', `KW-SPP-2025-${1000 + idx}`);
      } else {
        insertSpp.run(1, m, 2025, 350000, 'belum', null, null, null);
      }
    });

    const insertOther = db.prepare(`
      INSERT INTO other_bills (student_id, title, category, amount, status, payment_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertOther.run(1, 'Dana Pengembangan Pendidikan (Uang Gedung)', 'gedung', 2500000, 'lunas', '2024-07-05');
    insertOther.run(1, 'Paket Seragam Sekolah & Batik Eksklusif', 'seragam', 650000, 'lunas', '2024-07-06');
    insertOther.run(1, 'Iuran Kegiatan Ekstrakurikuler & OSIS', 'kegiatan', 150000, 'belum', null);
  }

  // 10. Finance Transactions
  const finCheck = db.prepare('SELECT COUNT(*) as count FROM finance_transactions').get();
  if (finCheck.count === 0) {
    const insertFin = db.prepare(`
      INSERT INTO finance_transactions (type, category, amount, date, description, source_or_recipient)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertFin.run('masuk', 'SPP Siswa', 145000000, '2025-02-01', 'Penerimaan SPP Bulan Februari 2025', 'Orang Tua Siswa');
    insertFin.run('masuk', 'BOS Reguler', 98000000, '2025-01-15', 'Penyaluran Dana BOS Tahap I', 'Kemdikbudristek');
    insertFin.run('keluar', 'Gaji & Honor Guru', 78500000, '2025-02-05', 'Pembayaran Payroll Guru dan Staf', 'Bank BNI Payroll');
    insertFin.run('keluar', 'Operasional & Listrik', 12400000, '2025-02-08', 'Tagihan Listrik PLN, Air PDAM, dan Fiber Internet', 'PLN & Telkom');
    insertFin.run('keluar', 'Perawatan Sarpras Lab', 6800000, '2025-02-14', 'Pengadaan SSD & Upgrade RAM Lab Komputer', 'CV Multi Solusindo');
  }

  // 11. Payroll
  const payCheck = db.prepare('SELECT COUNT(*) as count FROM payrolls').get();
  if (payCheck.count === 0) {
    const insertPay = db.prepare(`
      INSERT INTO payrolls (staff_id, staff_name, staff_role, month, year, base_salary, allowance, teaching_fee, deductions, net_salary, status, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPay.run(1, 'Drs. Budi Santoso, M.Pd', 'Wakasek Kurikulum & Guru', 'Februari', 2025, 4500000, 1200000, 800000, 150000, 6350000, 'paid', '2025-02-05');
    insertPay.run(2, 'Siti Rahmawati, S.Pd', 'Guru Bahasa Indonesia', 'Februari', 2025, 3800000, 800000, 600000, 0, 5200000, 'paid', '2025-02-05');
    insertPay.run(3, 'Ahmad Fauzi, S.Si', 'Kepala Lab Komputer', 'Februari', 2025, 4000000, 900000, 700000, 0, 5600000, 'paid', '2025-02-05');
    insertPay.run(5, 'Hendro Wibowo, S.Pd', 'Koordinator Guru BK', 'Februari', 2025, 3900000, 850000, 500000, 50000, 5200000, 'paid', '2025-02-05');
  }

  // 12. Blog & Articles
  const blogCheck = db.prepare('SELECT COUNT(*) as count FROM blogs').get();
  if (blogCheck.count === 0) {
    const insertBlog = db.prepare(`
      INSERT INTO blogs (title, slug, content, author_name, author_role, category, cover_image, status, views, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertBlog.run(
      'Menumbuhkan Generasi Berkarakter dan Melek Digital di Era AI',
      'menumbuhkan-generasi-berkarakter-melek-digital',
      'Perkembangan kecerdasan buatan (Artificial Intelligence) menghadirkan tantangan sekaligus peluang emas bagi dunia pendidikan. Siswa perlu dibekali tidak hanya kemampuan teknis koding, namun juga literasi etika, kritis berpikir, dan integritas akademis tinggi.',
      'Drs. Budi Santoso, M.Pd',
      'Wakasek Kurikulum',
      'Opini Pendidikan',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
      'published',
      342,
      '2025-02-10'
    );
    insertBlog.run(
      'Pengalaman Seru Menjuarai Olimpiade Robotika Nasional 2024',
      'pengalaman-menjuarai-olimpiade-robotika-2024',
      'Melalui latihan rutin di ekstrakurikuler Robotika dan bimbingan intensif dari Bapak Ahmad Fauzi, tim robotik sekolah kami berhasil membawa pulang medali emas. Kuncinya adalah kolaborasi, ketekunan, dan pantang menyerah!',
      'Aditya Pratama Putra',
      'Siswa X MIPA 1',
      'Prestasi Siswa',
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
      'published',
      589,
      '2025-02-14'
    );
  }

  // 13. Agenda
  const agendaCheck = db.prepare('SELECT COUNT(*) as count FROM agenda').get();
  if (agendaCheck.count === 0) {
    const insertAgenda = db.prepare(`
      INSERT INTO agenda (title, description, event_date, start_time, end_time, location, audience)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAgenda.run('Penilaian Tengah Semester (PTS) Genap', 'Pelaksanaan PTS serentak berbasis CBT Anti-Nyontek untuk seluruh jenjang kelas X, XI, XII.', '2025-03-15', '07:30', '13:00', 'Ruang Kelas & Lab Komputer', 'siswa');
    insertAgenda.run('Rapat Pleno Parenting & Laporan Kemajuan Siswa', 'Pertemuan orang tua murid bersama wali kelas dan manajemen sekolah membahas evaluasi akademik dan karakter.', '2025-03-22', '09:00', '12:00', 'Auditorium Utama Graha Saraswati', 'ortu');
    insertAgenda.run('Pekan Olahraga & Seni (PORSENI) Antar Kelas', 'Ajang kompetisi kreativitas seni budaya, tari daerah, dan pertandingan futsal antar kelas.', '2025-04-10', '08:00', '16:00', 'Lapangan Olahraga Sekolah', 'semua');
  }

  // 14. Broadcasts
  const bcastCheck = db.prepare('SELECT COUNT(*) as count FROM broadcasts').get();
  if (bcastCheck.count === 0) {
    const insertBcast = db.prepare(`
      INSERT INTO broadcasts (title, message, target_role, sender_name, created_at, is_urgent)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertBcast.run(
      'Persiapan Ujian CBT Bersama: Wajib Bawa Smartphone dengan Baterai Penuh',
      'Diberitahukan kepada seluruh siswa kelas X, XI, dan XII bahwa pelaksanaan PTS menggunakan CBT Anti-Nyontek. Pastikan browser Google Chrome di ponsel sudah terupdate dan tidak membuka aplikasi floating selama ujian.',
      'semua',
      'Kepala Sekolah & Tim IT',
      '2025-02-20 08:30:00',
      1
    );
    insertBcast.run(
      'Informasi Pelunasan SPP dan Cetak Kartu Peserta PTS',
      'Bagi wali murid, kartu ujian dapat diunduh langsung lewat portal setelah status pembayaran SPP tervalidasi lunas.',
      'ortu',
      'Bagian Keuangan Sekolah',
      '2025-02-18 10:15:00',
      0
    );
  }

  // 15. Student Violations (Guru BP/BK)
  const violCheck = db.prepare('SELECT COUNT(*) as count FROM violations').get();
  if (violCheck.count === 0) {
    const insertViol = db.prepare(`
      INSERT INTO violations (student_id, student_name, class_name, violation_name, category, points, incident_date, reporter_name, action_taken, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertViol.run(3, 'Dimas Satria Wicaksana', 'X MIPA 1', 'Terlambat masuk sekolah > 15 menit', 'ringan', 5, '2025-02-12', 'Hendro Wibowo, S.Pd', 'Bimbingan lisan & pencatatan kartu BK', 'selesai');
    insertViol.run(1, 'Aditya Pratama Putra', 'X MIPA 1', 'Tidak memakai dasi saat upacara bendera', 'ringan', 3, '2025-01-20', 'Hendro Wibowo, S.Pd', 'Teguran lisan pembinaan', 'selesai');
  }

  // 16. Gallery
  const galCheck = db.prepare('SELECT COUNT(*) as count FROM gallery').get();
  if (galCheck.count === 0) {
    const insertGal = db.prepare(`
      INSERT INTO gallery (title, category, image_url, description, date)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertGal.run('Laboratorium Komputer & Multimedia Modern', 'sarpras', 'https://images.unsplash.com/photo-1562774053-701939374585?w=800', 'Dilengkapi 40 unit PC spesifikasi tinggi untuk CBT dan riset informatika.', '2025-01-10');
    insertGal.run('Upacara Peringatan Hari Guru Nasional', 'kegiatan', 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800', 'Apresiasi pengabdian bapak/ibu pendidik dalam mendidik putra-putri bangsa.', '2024-11-25');
    insertGal.run('Penyerahan Piala Juara Umum Futsal Walikota Cup', 'prestasi', 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800', 'Tim Futsal Putra meraih Juara 1 tingkat Provinsi.', '2024-12-18');
    insertGal.run('Perpustakaan Digital Graha Pustaka', 'sarpras', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800', 'Koleksi 15.000 buku fisik dan e-book literasi terbuka.', '2025-01-05');
  }

  // 17. Alumni
  const alumCheck = db.prepare('SELECT COUNT(*) as count FROM alumni').get();
  if (alumCheck.count === 0) {
    const insertAlum = db.prepare(`
      INSERT INTO alumni (name, graduation_year, nisn, current_status, institution_name, position_or_major, phone, email, testimonial)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAlum.run('Muhammad Fajar, S.T.', 2021, '0039871231', 'kerja', 'PT GoTo Gojek Tokopedia', 'Software Engineer', '081299887711', 'fajar.alumni@gmail.com', 'Fondasi logika dan disiplin yang diajarkan di sekolah ini sangat berdampak besar pada karir teknologi saya.');
    insertAlum.run('dr. Sarah Amelia', 2019, '0018765432', 'kerja', 'RSUP Cipto Mangunkusumo', 'Dokter Residen Pediatri', '081322114455', 'sarah.amelia@gmail.com', 'Guru-guru di SMA sangat sabar membimbing saya hingga tembus Fakultas Kedokteran UI.');
    insertAlum.run('Kevin Sanjaya Putra', 2023, '0054321987', 'kuliah', 'Institut Teknologi Bandung (ITB)', 'Teknik Elektro Semester 4', '081566778899', 'kevin.itb@gmail.com', 'Fasilitas Lab Komputer dan internet sekolah sangat mendukung belajar mandiri.');
  }

  // 18. PPDB Online
  const ppdbCheck = db.prepare('SELECT COUNT(*) as count FROM ppdb').get();
  if (ppdbCheck.count === 0) {
    const insertPpdb = db.prepare(`
      INSERT INTO ppdb (registration_no, full_name, nisn, gender, birth_place_date, track, previous_school, average_score, parent_name, parent_phone, address, status, registered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPpdb.run('PPDB-2025-001', 'Bagus Ramadhan Saputra', '0098765431', 'Laki-laki', 'Jakarta, 15 Mei 2009', 'prestasi', 'SMP Negeri 115 Jakarta', 92.5, 'Ir. Ramadhan', '081288990011', 'Jl. Tebet Barat Dalam No. 12', 'diterima', '2025-02-01 09:12:00');
    insertPpdb.run('PPDB-2025-002', 'Cantika Putri Maharani', '0098765432', 'Perempuan', 'Depok, 20 Juli 2009', 'zonasi', 'SMP Negeri 1 Depok', 88.0, 'Maharani Dewi', '081288990022', 'Jl. Margonda Raya No. 89', 'terverifikasi', '2025-02-03 11:30:00');
    insertPpdb.run('PPDB-2025-003', 'Fikri Haikal Rahman', '0098765433', 'Laki-laki', 'Bogor, 10 Maret 2009', 'afirmasi', 'SMP Swasta Harapan Kita', 85.5, 'Abdul Rahman', '081288990033', 'Jl. Raya Pajajaran No. 4', 'menunggu', '2025-02-05 14:05:00');
  }

  // 19. Digital Archives
  const archCheck = db.prepare('SELECT COUNT(*) as count FROM digital_archives').get();
  if (archCheck.count === 0) {
    const insertArch = db.prepare(`
      INSERT INTO digital_archives (title, doc_number, category, file_url, file_size, upload_date, uploaded_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertArch.run('Sertifikat Akreditasi Sekolah Predikat A Unggul', 'BAN-SM/SK/2023/1029', 'akreditasi', '#', '2.4 MB', '2023-11-15', 'Kepala Sekolah', 'Masa berlaku akreditasi hingga November 2028');
    insertArch.run('Surat Keputusan Pembagian Tugas Mengajar Semester Genap 2024/2025', '800/145/SMAN1/I/2025', 'sk', '#', '1.8 MB', '2025-01-02', 'Tata Usaha', 'Pedoman beban mengajar seluruh guru pendidik');
    insertArch.run('Dokumen Kurikulum Merdeka Terpadu & Modul Ajar Satuan Pendidikan', 'KOSP-SMAN1-2024', 'kurikulum', '#', '5.6 MB', '2024-07-10', 'Wakasek Kurikulum', 'Dokumen pedoman pembelajaran tahun ajaran berjalan');
  }

  // 20. E-Learning: Modules, Tasks, Submissions, Discussions
  const elearnCheck = db.prepare('SELECT COUNT(*) as count FROM elearning_modules').get();
  if (elearnCheck.count === 0) {
    const insertMod = db.prepare(`
      INSERT INTO elearning_modules (subject_name, class_name, teacher_name, title, description, file_url, video_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const mod1 = insertMod.run(
      'Informatika & Coding',
      'X MIPA 1',
      'Dewi Lestari, M.Kom',
      'Pertemuan 4: Algoritma Pencarian & Pemrograman Web Modern',
      'Pada modul ini kita mempelajari konsep algoritma Binary Search, pengenalan RESTful API, dan cara kerja enkripsi HTTPS pada aplikasi web client-server.',
      'https://example.com/modul-informatika-p4.pdf',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      '2025-02-10'
    );
    const modId = mod1.lastInsertRowid;

    const insertTask = db.prepare(`
      INSERT INTO elearning_tasks (module_id, title, description, deadline, max_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const task1 = insertTask.run(
      modId,
      'Tugas Praktik 4: Analisis Keamanan Sistem Ujian Web Anti-Nyontek',
      'Tuliskan analisis teknis tentang event listener browser yang digunakan untuk mendeteksi kecurangan (fullscreenchange, visibilitychange, blur, contextmenu). Kumpulkan dalam bentuk teks rangkuman!',
      '2025-03-01 23:59',
      100,
      '2025-02-11'
    );
    const taskId = task1.lastInsertRowid;

    const insertSub = db.prepare(`
      INSERT INTO elearning_submissions (task_id, student_id, student_name, submission_text, file_url, submitted_at, score, feedback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSub.run(
      taskId,
      1,
      'Aditya Pratama Putra',
      'Event visibilitychange mendeteksi saat tab diminimize atau berpindah. Event fullscreenchange mendeteksi keluarnya mode layar penuh. Digabungkan dengan pencegahan F12 dan klik kanan, siswa tidak dapat membuka tab browsing lain maupun devtools.',
      null,
      '2025-02-12 14:20:00',
      95,
      'Analisis sangat komprehensif dan tepat, pertahankan prestasimu!'
    );

    const insertDisc = db.prepare(`
      INSERT INTO elearning_discussions (module_id, user_name, user_role, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertDisc.run(modId, 'Aditya Pratama Putra', 'Siswa', 'Ibu Dewi, apakah event blur di window juga bisa mendeteksi saat pengguna alt-tab ke aplikasi kalkulator atau Word?', '2025-02-11 10:15:00');
    insertDisc.run(modId, 'Dewi Lestari, M.Kom', 'Guru', 'Betul sekali Aditya! window.onblur akan terpicu secara instan ketika fokus layar browser berpindah ke aplikasi apapun di sistem operasi.', '2025-02-11 10:22:00');
  }

  // 21. E-Rapor & Transkrip Nilai Siswa
  const gradeCheck = db.prepare('SELECT COUNT(*) as count FROM grades').get();
  if (gradeCheck.count === 0) {
    const insertGrade = db.prepare(`
      INSERT INTO grades (student_id, student_name, class_name, subject_name, semester, academic_year, formative_score, midterm_score, final_score, final_grade, predicate, competence_achievement, teacher_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const studentGrades = [
      { subject: 'Matematika Wajib', form: 88, mid: 85, fin: 92, grade: 88.5, pred: 'A', comp: 'Sangat baik dalam pemahaman aljabar dan kalkulus diferensial.', notes: 'Tingkatkan ketelitian dalam soal pembuktian rumus.' },
      { subject: 'Bahasa Indonesia', form: 90, mid: 88, fin: 90, grade: 89.4, pred: 'A', comp: 'Sangat terampil dalam menulis teks argumentasi dan analisis sastra.', notes: 'Pertahankan tata bahasa yang sangat baik.' },
      { subject: 'Bahasa Inggris', form: 85, mid: 90, fin: 94, grade: 90.1, pred: 'A', comp: 'Mampu berkomunikasi aktif dan menulis laporan teknis dengan fasih.', notes: 'Kemampuan vocabulary sangat luas.' },
      { subject: 'Informatika & Pemrograman', form: 95, mid: 96, fin: 98, grade: 96.5, pred: 'A', comp: 'Unggul dalam logika algoritma, keamanan jaringan web, dan sintaks coding.', notes: 'Bakat luar biasa dalam bidang teknologi informasi.' },
      { subject: 'Fisika', form: 82, mid: 80, fin: 85, grade: 82.5, pred: 'B', comp: 'Memahami hukum termodinamika dan optik dengan baik.', notes: 'Perbanyak latihan pada materi kinematika gerak melingkar.' },
      { subject: 'Pendidikan Agama & Budi Pekerti', form: 92, mid: 90, fin: 95, grade: 92.4, pred: 'A', comp: 'Menunjukkan akhlak mulia dan toleransi antar sesama siswa.', notes: 'Menjadi teladan disiplin bagi teman-temannya.' }
    ];

    for (const g of studentGrades) {
      insertGrade.run(1, 'Aditya Pratama Putra', 'X MIPA 1', g.subject, 'Ganjil', '2024/2025', g.form, g.mid, g.fin, g.grade, g.pred, g.comp, g.notes);
    }
  }

  // 22. Perpustakaan Digital: Katalog Buku & Peminjaman
  const bookCheck = db.prepare('SELECT COUNT(*) as count FROM library_books').get();
  if (bookCheck.count === 0) {
    const insertBook = db.prepare(`
      INSERT INTO library_books (isbn, title, author, publisher, category, total_copies, available_copies, shelf_location, cover_url, year_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertBook.run('978-602-012-001', 'Matematika Tingkat Lanjut SMA/MA Kelas X', 'Dr. Sukirman, M.Pd.', 'Kemdikbudristek RI', 'Buku Pelajaran', 30, 24, 'Rak A-01', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300', 2023);
    insertBook.run('978-602-012-002', 'Dasar-Dasar Pemrograman Web & Kecerdasan Buatan', 'Ir. Budi Raharjo', 'Informatika Bandung', 'Teknologi', 15, 11, 'Rak B-04', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300', 2024);
    insertBook.run('978-602-012-003', 'Fisika Eksperimental & Fenomena Alam Semesta', 'Prof. Yohanes Surya, Ph.D.', 'Gramedia Pustaka', 'Sains', 20, 16, 'Rak C-02', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=300', 2022);
    insertBook.run('978-602-012-004', 'Laskar Pelangi: Semangat Belajar & Persahabatan', 'Andrea Hirata', 'Bentang Pustaka', 'Fiksi & Sastra', 25, 19, 'Rak D-05', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300', 2020);
    insertBook.run('978-602-012-005', 'Kamus Lengkap Oxford English - Indonesian Edisi 8', 'A.S. Hornby & E. Sadtono', 'Oxford University Press', 'Referensi', 10, 8, 'Rak E-01', 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=300', 2021);
    insertBook.run('978-602-012-006', 'Sejarah Perjuangan Kemerdekaan Indonesia', 'Dr. Anhar Gonggong', 'Pustaka Bangsa', 'Sejarah', 18, 15, 'Rak F-03', 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=300', 2021);

    const insertLoan = db.prepare(`
      INSERT INTO book_loans (book_id, book_title, borrower_type, borrower_id, borrower_name, borrow_date, due_date, return_date, status, fine_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertLoan.run(2, 'Dasar-Dasar Pemrograman Web & Kecerdasan Buatan', 'siswa', 1, 'Aditya Pratama Putra', '2025-02-15', '2025-02-22', null, 'dipinjam', 0, 'Untuk referensi proyek koding ujian praktikum');
    insertLoan.run(4, 'Laskar Pelangi: Semangat Belajar & Persahabatan', 'siswa', 2, 'Siti Nurhaliza', '2025-02-10', '2025-02-17', '2025-02-16', 'dikembalikan', 0, 'Buku dikembalikan tepat waktu dalam kondisi rapi');
    insertLoan.run(1, 'Matematika Tingkat Lanjut SMA/MA Kelas X', 'guru', 1, 'Drs. Bambang Sudarmono', '2025-02-05', '2025-02-12', '2025-02-12', 'dikembalikan', 0, 'Pegangan bahan ajar guru kelas X');
  }

  // 23. Ekstrakurikuler & Prestasi
  const ekskulCheck = db.prepare('SELECT COUNT(*) as count FROM extracurriculars').get();
  if (ekskulCheck.count === 0) {
    const insertEkskul = db.prepare(`
      INSERT INTO extracurriculars (name, category, coach_name, schedule_day, schedule_time, location, description, icon_name, member_count, achievements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEkskul.run('Paskibra Harapan Bangsa', 'Kepemimpinan', 'Sertu M. Ramli', 'Selasa & Jumat', '15:30 - 17:30', 'Lapangan Utama', 'Membina kedisiplinan baris-berbaris, wawasan kebangsaan, dan kepemimpinan generasi muda.', 'Shield', 48, 'Juara 1 Lomba Baris-Berbaris Tingkat Provinsi 2024');
    insertEkskul.run('Pramuka Penegak Gugus Depan 01-002', 'Wajib / Kepanduan', 'Kak H. Suwandi, M.Pd.', 'Sabtu', '08:00 - 11:30', 'Aula Serbaguna & Bumi Perkemahan', 'Gerakan kepanduan membentuk watak mandiri, cinta alam, dan keterampilan survival kepramukaan.', 'Compass', 120, 'Gudep Tergiat Kwartir Cabang 2024');
    insertEkskul.run('Robotika & IT Club (Cyber School)', 'Sains & Teknologi', 'Dewi Lestari, M.Kom', 'Kamis', '15:30 - 17:30', 'Lab Komputer 1', 'Pelatihan pemrograman web, IoT Arduino/ESP32, dan robot maze-solving untuk kompetisi nasional.', 'Cpu', 35, 'Juara 2 National Youth Robotic Competition 2024');
    insertEkskul.run('Palang Merah Remaja (PMR Wira)', 'Kemanusiaan', 'drg. Rina Anggraini', 'Rabu', '15:30 - 17:00', 'Ruang UKS & Lapangan', 'Pendidikan pertolongan pertama (PP), donor darah, kesehatan remaja, dan bakti kemanusiaan.', 'HeartPulse', 52, 'Juara Umum Jumbara PMR Se-Kota 2024');
    insertEkskul.run('Klub Futsal & Sepak Bola', 'Olahraga', 'Coach Hendra Gunawan', 'Senin & Kamis', '16:00 - 18:00', 'Lapangan Futsal Sekolah', 'Pengembangan teknik, fisik, taktik sepak bola modern, dan sportivitas kompetisi liga pelajar.', 'Trophy', 42, 'Juara 1 Turnamen Futsal Piala Walikota 2024');
    insertEkskul.run('Rohani Islam (Rohis Nurul Ilmi)', 'Keagamaan', 'Ust. Ahmad Fauzan, S.Pd.I', 'Jumat', '13:00 - 15:00', 'Masjid Baitul Ilmi', 'Kajian keislaman, bimbingan tahsin/tahfiz Al-Quran, mentoring akhlak, dan bakti sosial.', 'BookOpen', 65, 'Juara 1 Lomba MTQ & Da\'i Remaja 2024');
  }

  // 24. Konseling BK Online
  const bkCheck = db.prepare('SELECT COUNT(*) as count FROM counseling_sessions').get();
  if (bkCheck.count === 0) {
    const insertBk = db.prepare(`
      INSERT INTO counseling_sessions (student_id, student_name, class_name, counselor_name, session_date, session_time, category, topic, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertBk.run(1, 'Aditya Pratama Putra', 'X MIPA 1', 'Rina Marlina, S.Psi', '2025-02-20', '09:30', 'karir', 'Konsultasi Peminatan Jurusan Kuliah IT / Informatika UI & ITB', 'Siswa memiliki minat dan potensi sangat kuat di bidang Computer Science.', 'selesai', '2025-02-18 10:00:00');
    insertBk.run(2, 'Siti Nurhaliza', 'X MIPA 1', 'Rina Marlina, S.Psi', '2025-02-25', '13:00', 'akademik', 'Manajemen Waktu Belajar Menjelang Penilaian Tengah Semester', 'Diberikan metode penjadwalan Pomodoro dan teknik relaksasi belajar.', 'selesai', '2025-02-21 11:30:00');
    insertBk.run(3, 'Muhammad Rayhan Pratama', 'X MIPA 2', 'Rina Marlina, S.Psi', '2025-03-05', '10:00', 'sosial', 'Adaptasi Sosial & Kerjasama Kelompok Praktikum Sains', 'Sesi tatap muka dijadwalkan di ruang konseling BK lantai 2.', 'dijadwalkan', '2025-02-26 14:00:00');
  }

  // 25. Wallets (Kartu Pintar E-Money Siswa, Guru & Admin)
  const walletCheck = db.prepare('SELECT COUNT(*) as count FROM wallets').get();
  if (walletCheck.count === 0) {
    const insertWallet = db.prepare(`
      INSERT INTO wallets (user_id, card_number, holder_name, holder_role, holder_identifier, balance, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertWallet.run(3, 'CARD-7721-0061', 'Aditya Pratama Putra', 'siswa', '0061234561', 125000, 'aktif', '2025-01-01 08:00:00');
    insertWallet.run(2, 'CARD-1975-1001', 'Drs. Budi Santoso, M.Pd', 'guru', '197503122000031001', 450000, 'aktif', '2025-01-01 08:00:00');
    insertWallet.run(1, 'CARD-0001-ADMIN', 'Dra. Hj. Nurhayati, M.M.', 'admin', 'ADMIN-001', 2500000, 'aktif', '2025-01-01 08:00:00');
    insertWallet.run(4, 'CARD-9901-0061', 'Bambang Pratama (Wali Siswa)', 'ortu', '081398765401', 350000, 'aktif', '2025-01-01 08:00:00');

    // Initial seed transactions for Aditya
    const insertTx = db.prepare(`
      INSERT INTO wallet_transactions (wallet_id, transaction_code, type, amount, fee, description, method, status, reference_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTx.run(1, 'TX-TOPUP-992101', 'topup', 100000, 0, 'Top-Up Saldo Dompet via QRIS BCA', 'qris', 'success', 'QRIS-BCA-883192', '2025-02-01 09:15:00');
    insertTx.run(1, 'TX-TOPUP-992102', 'topup', 50000, 0, 'Top-Up Saldo dari Orang Tua via Mandiri VA', 'va', 'success', 'VA-MANDIRI-771829', '2025-02-10 14:20:00');
    insertTx.run(1, 'TX-KANTIN-10041', 'payment_canteen', 20000, 0, 'Pembelian Nasi Goreng & Es Teh Manis Kantin', 'wallet_deduct', 'success', 'KNT-2025-0012', '2025-02-12 12:15:00');
    insertTx.run(1, 'TX-DIGITAL-10042', 'payment_digital', 5000, 0, 'Voucher Buku Digital Perpustakaan Gramedia', 'wallet_deduct', 'success', 'KNT-2025-0013', '2025-02-14 10:45:00');
  }

  // 26. Kantin Online & Koperasi Sekolah
  const canteenCheck = db.prepare('SELECT COUNT(*) as count FROM canteen_products').get();
  if (canteenCheck.count === 0) {
    const insertProd = db.prepare(`
      INSERT INTO canteen_products (name, category, price, stock, image_url, description, stand_name, is_available, digital_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Makanan
    insertProd.run('Nasi Goreng Spesial Telur Ceplok', 'makanan', 15000, 35, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', 'Nasi goreng harum bumbu rempah dengan telur mata sapi, kerupuk, dan acar segar.', 'Stand 1 - Bu Sumi', 1, null, '2025-01-01');
    insertProd.run('Mie Ayam Bakso Pangsit Krispi', 'makanan', 14000, 40, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400', 'Mie ayam kenyal dengan potongan ayam kecap gurih, 2 butir bakso sapi, dan pangsit renyah.', 'Stand 2 - Mas Joko', 1, null, '2025-01-01');
    insertProd.run('Bento Chicken Katsu + Saus Teriyaki', 'makanan', 18000, 25, 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400', 'Ayam fillet katsu krispi, nasi pulen hangat, salad sayur mayonaise, dan saus teriyaki gurih.', 'Stand 3 - Bento Ceria', 1, null, '2025-01-01');
    insertProd.run('Roti Bakar Coklat Keju Susu', 'makanan', 10000, 30, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', 'Roti tebal dipanggang renyah dengan lelehan meises coklat dan keju cheddar parut melimpah.', 'Stand 4 - Kafe Siswa', 1, null, '2025-01-01');
    insertProd.run('Dimsum Ayam Keju Halal (Isi 4)', 'makanan', 12000, 30, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400', 'Dimsum ayam padat dan lembut dengan topping keju leleh, disajikan dengan saus cabai asam manis.', 'Stand 1 - Bu Sumi', 1, null, '2025-01-01');
    insertProd.run('Pastel Sayur Telur & Risoles Mayo (2 Pcs)', 'makanan', 6000, 50, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', 'Camilan renyah isi sayur bihun telur dan risoles smoked beef mayonaise gurih.', 'Stand 2 - Mas Joko', 1, null, '2025-01-01');

    // Minuman
    insertProd.run('Es Teh Manis Jumbo Segar', 'minuman', 5000, 100, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', 'Teh seduh wangi melati asli khas Solo dengan es kristal dan pemanis gula tebu murni.', 'Stand 5 - Aneka Minuman', 1, null, '2025-01-01');
    insertProd.run('Jus Alpukat Kental Coklat', 'minuman', 10000, 25, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400', 'Jus buah alpukat mentega asli yang creamy dengan drizzle susu kental manis coklat.', 'Stand 5 - Aneka Minuman', 1, null, '2025-01-01');
    insertProd.run('Susu Ultra Milk UHT 250ml (Coklat/Full Cream)', 'minuman', 7000, 60, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', 'Susu segar kaya kalsium dan vitamin untuk nutrisi harian di sekolah.', 'Koperasi Sekolah', 1, null, '2025-01-01');
    insertProd.run('Kopi Susu Gula Aren Barista', 'minuman', 10000, 30, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400', 'Kopi susu espresso blend dengan gula aren asli, favorit bapak/ibu guru saat jeda mengajar.', 'Stand 4 - Kafe Siswa', 1, null, '2025-01-01');
    insertProd.run('Air Mineral Botol 600ml Dingin', 'minuman', 4000, 120, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400', 'Air mineral higienis menjaga hidrasi selama kegiatan belajar dan olahraga.', 'Koperasi Sekolah', 1, null, '2025-01-01');

    // Produk Digital (PPOB & Edukasi)
    insertProd.run('Pulsa All Operator Rp 10.000', 'digital', 11500, 999, 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400', 'Isi ulang pulsa reguler Telkomsel, Indosat, XL, Tri, Axis, Smartfren. Masuk detik itu juga.', 'Server PPOB Sekolah', 1, 'pulsa', '2025-01-01');
    insertProd.run('Pulsa All Operator Rp 25.000', 'digital', 26000, 999, 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400', 'Isi ulang pulsa instan untuk masa aktif kartu dan komunikasi harian.', 'Server PPOB Sekolah', 1, 'pulsa', '2025-01-01');
    insertProd.run('Paket Kuota Internet Pelajar 10 GB', 'digital', 25000, 999, 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400', 'Paket internet khusus akses e-learning, Zoom/Meet, Google Classroom, dan browsing edukasi 30 hari.', 'Server PPOB Sekolah', 1, 'kuota', '2025-01-01');
    insertProd.run('Token Listrik PLN Prabayar Rp 20.000', 'digital', 22000, 999, 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400', 'Token listrik 20 digit resmi PLN. Kode stroom langsung tampil di layar dan struk digital.', 'Server PPOB Sekolah', 1, 'pln', '2025-01-01');
    insertProd.run('Voucher Buku Digital Gramedia Rp 20.000', 'digital', 20000, 500, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400', 'Voucher membaca e-book materi pelajaran, sains, dan novel edukasi di platform digital.', 'Server Edukasi', 1, 'buku_digital', '2025-01-01');
    insertProd.run('Voucher Google Play / Edu-Game Rp 20.000', 'digital', 22000, 500, 'https://images.unsplash.com/photo-1612287233207-626a575a74ef?w=400', 'Kode voucher digital untuk pembelian aplikasi edukatif dan game di Google Play Store.', 'Server PPOB Sekolah', 1, 'voucher', '2025-01-01');

    // Koperasi & Atribut Sekolah
    insertProd.run('Dasi Sekolah Resmi Bordir Logo', 'koperasi', 15000, 45, 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400', 'Dasi panjang standar sekolah dengan jahitan rapi dan emblem logo berkelas.', 'Koperasi Siswa', 1, null, '2025-01-01');
    insertProd.run('Topi Upacara Hari Senin Bordir', 'koperasi', 20000, 35, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400', 'Topi upacara bahan berkualitas dengan perekat belakang fleksibel dan logo sekolah.', 'Koperasi Siswa', 1, null, '2025-01-01');
    insertProd.run('Kaos Kaki Putih Logo Sekolah (1 Pasang)', 'koperasi', 12000, 80, 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=400', 'Kaos kaki katun tebal, adem, tidak mudah melar, bertuliskan nama sekolah.', 'Koperasi Siswa', 1, null, '2025-01-01');
    insertProd.run('Buku Tulis Spiral Garis A5 (Pack 3)', 'koperasi', 18000, 50, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400', 'Buku tulis spiral kertas tebal 80 GSM isi 100 lembar untuk catatan mata pelajaran.', 'Koperasi Siswa', 1, null, '2025-01-01');
    insertProd.run('Paket Alat Tulis Lengkap (3 Pen + 1 Pensil + Penghapus)', 'koperasi', 15000, 60, 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400', 'Set alat tulis ujian dan harian berkualitas tinggi.', 'Koperasi Siswa', 1, null, '2025-01-01');

    // Sample initial order
    const insertOrder = db.prepare(`
      INSERT INTO canteen_orders (order_number, buyer_name, buyer_role, buyer_identifier, total_amount, payment_method, payment_status, order_status, pickup_time, notes, digital_target, serial_number, items_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const sampleItems = JSON.stringify([
      { id: 1, name: 'Nasi Goreng Spesial Telur Ceplok', price: 15000, quantity: 1, category: 'makanan' },
      { id: 7, name: 'Es Teh Manis Jumbo Segar', price: 5000, quantity: 1, category: 'minuman' }
    ]);
    insertOrder.run('KNT-2025-0012', 'Aditya Pratama Putra', 'siswa', '0061234561', 20000, 'wallet', 'paid', 'selesai', 'Istirahat 1 (09.30)', 'Tidak pakai cabai rawit', null, null, sampleItems, '2025-02-12 12:15:00');
  }

  console.log('✅ Database seeded successfully with 100% complete mock data (including Kantin & Dompet Digital)!');
}

seedDatabase();
