# Sekolah Super App — SMAN 1 Harapan Bangsa

Sistem informasi sekolah terpadu berbasis web: portal publik, PPDB online, buku induk, akademik & jadwal, presensi QR, ujian CBT anti-nyontek, e-rapor, e-learning, sistem wali kelas, BK & UKS, perpustakaan, keuangan/SPP/penggajian, kantin & dompet digital, e-pemilos, ruang aspirasi, pusat bantuan, dan jejak audit.

## Teknologi

- **Frontend:** React 18 + Vite 6 + Tailwind CSS 3 (PWA, siap dipasang di HP).
- **Backend:** Express 4 + SQLite bawaan Node.js (`node:sqlite`, tanpa instalasi database terpisah).
- **Autentikasi:** sesi cookie `HttpOnly`, password di-hash `scrypt`, RBAC per modul di server (`src/config/access.js`), audit log.

## Persyaratan

- Node.js **22.5 atau lebih baru** (disarankan versi LTS terbaru) — diperlukan untuk modul `node:sqlite`.

## Cara menjalankan (Windows, paling mudah)

Klik dua kali **`JALANKAN_SEKOLAH_APP.bat`**. Skrip akan:

1. memeriksa versi Node.js,
2. memasang dependensi (`npm install`) bila belum ada,
3. membangun antarmuka (`npm run build`) bila folder `dist/` belum ada,
4. menjalankan server di `http://localhost:5000` dan membuka browser.

Data demo (kelas, siswa, guru, akun, jadwal, produk kantin, dsb.) dibuat otomatis saat server pertama kali dijalankan.

## Cara menjalankan (manual / Linux / macOS)

```bash
npm install
npm run build        # membangun antarmuka ke folder dist/
npm start            # server + antarmuka di http://localhost:5000
```

Mode pengembangan (hot reload):

```bash
npm run dev:server   # terminal 1: API di port 5000
npm run dev:client   # terminal 2: Vite dev server di http://localhost:5173 (proxy ke API)
```

Perintah lain: `npm run seed` (isi ulang data demo untuk tabel yang kosong), `npm run check` (cek sintaks server).

## Akun demo

| Peran | Username | Password |
| --- | --- | --- |
| Kepala Sekolah (akses penuh) | `kepsek.raka` | `Kepsek!4826` |
| Kepala Tata Usaha | `tu.nadia` | `TU!7319` |
| Kepala Perpustakaan | `perpus.arya` | `Perpus!5482` |
| Kepala BK | `bk.rina` | `BK!6247` |
| Guru / Wali Kelas | `wali.budi` | `Wali!3951` |
| Administrator (legacy) | `admin` | `admin123` |
| Guru (legacy) | `guru` | `guru123` |
| Siswa (Aditya Pratama Putra) | `siswa` | `siswa123` |
| Orang Tua / Wali (Bambang Pratama) | `ortu` | `ortu123` |

Ganti seluruh kredensial demo sebelum digunakan di lingkungan nyata.

## Struktur proyek

```
server/index.js   # seluruh endpoint API Express (RBAC, validasi, transaksi SQLite)
server/db.js      # skema database, migrasi ringan, helper hash & transaksi
server/seed.js    # data demo (idempoten; dipanggil otomatis oleh server)
src/App.jsx       # layout utama & routing modul
src/pages/        # 30+ modul halaman (PPDB, CBT, Wali Kelas, Kantin, Pemilos, ...)
src/components/   # navbar, sidebar, login, command palette, dsb.
src/config/access.js  # matriks hak akses peran → modul (dipakai React & server)
public/           # manifest PWA, service worker, ikon, foto paslon
uploads/          # berkas unggahan pengguna (dibuat otomatis)
```

## Catatan operasional

- Database tersimpan di `school.db` (mode WAL). Cadangkan berkas ini beserta folder `uploads/` secara berkala.
- Untuk produksi: jalankan dengan `NODE_ENV=production` di belakang HTTPS agar cookie sesi memakai atribut `Secure`.
- Dokumen tambahan: `docs/ARCHITECTURE.md` dan `docs/SECURITY.md`.
