# Arsitektur School Digital Ecosystem

## Prinsip

Platform memakai satu basis data SQLite sebagai sumber data operasional. Antarmuka React tidak menjadi sumber kebenaran hak akses; setiap API privat diverifikasi kembali oleh server.

```
React (Vite) → API Express → layanan domain/modul → SQLite
                      └→ sesi, RBAC, audit log, unggahan tervalidasi
```

## Modul yang tersedia

Portal publik, PPDB, akademik, absensi, CBT, e-rapor, wali kelas, BK, UKS, perpustakaan, keuangan, SPP, penggajian, dokumen, komunikasi/pengumuman, kegiatan, kantin/dompet, pemilos, karier, dukungan, serta audit keamanan.

Setiap modul menggunakan entitas bersama seperti `students`, `teachers`, `classes`, `subjects`, `schedules`, dan `attendance`. Perubahan data harus dilakukan melalui API modul agar relasi dan audit tetap terjaga.

### Integrasi yang sudah berjalan

- **Smart Schedule Engine:** pembuatan jadwal memvalidasi kelas, guru pengampu, ruangan, hari, serta jam. API menolak tabrakan dengan `409 SCHEDULE_CONFLICT`; antarmuka menampilkan pasangan jadwal yang perlu diperbaiki.
- **Student Timeline:** Buku Induk menyusun riwayat dari presensi, nilai, dan pembinaan. Pengembalian nilai serta catatan BK disaring ulang berdasarkan permission di server, bukan disembunyikan hanya di antarmuka.
- **Attendance Intelligence:** API membaca log presensi tanpa mengubahnya, lalu menyajikan cakupan scan kelas, scan di luar ambang waktu, dan daftar verifikasi berbasis aturan transparan. Insight ini tidak membuat diagnosis atau keputusan otomatis tentang siswa.

## Akses

Hak akses didefinisikan sekali di `src/config/access.js` dan digunakan oleh React serta server. Peran aktif saat ini adalah Kepala Sekolah, Kepala TU, Kepala Perpustakaan, Kepala BK, dan Guru/Wali Kelas. Struktur ini dapat diperluas tanpa mengubah navigasi atau middleware.

## Tahap pengembangan berikutnya

1. Migrasi role statis menuju tabel `roles`, `permissions`, dan penugasan permission per akun.
2. Student Timeline dari absensi, nilai, prestasi, pelanggaran, dan perpindahan kelas.
3. Conflict detector jadwal untuk guru, ruangan, dan kelas.
4. Inventaris/laboratorium, surat-disposisi, dan pusat notifikasi persistensi.
5. Dashboard analitik per peran serta ekspor laporan.

## Inisialisasi & data demo

`server/db.js` membuat skema (idempoten) dan menjalankan migrasi ringan; `server/seed.js` mengisi data demo hanya untuk tabel yang masih kosong dan dipanggil otomatis saat server start, sehingga instalasi baru langsung siap dicoba tanpa langkah tambahan. Tanggal operasional (presensi, jurnal, transaksi) memakai zona waktu lokal server.

Lapisan DB menormalkan parameter (`undefined` → NULL, boolean → 0/1) dan menyediakan helper `transaction()` untuk operasi tulis multi-langkah.

## Batasan saat ini

Ini adalah aplikasi demonstrasi lokal satu sekolah. Untuk penerapan produksi diperlukan PostgreSQL, penyimpanan berkas terpisah, HTTPS, backup terjadwal, observability, dan pengelolaan rahasia melalui environment variables.
