# Keamanan dan Operasional

## Yang sudah diterapkan

- Password disimpan sebagai hash `scrypt` dengan salt unik; migrasi otomatis menghapus kolom password lama pada instalasi sebelumnya.
- Sesi menggunakan token acak yang hanya disimpan sebagai hash di database dan dikirim melalui cookie `HttpOnly`, `SameSite=Lax`.
- API privat menegakkan autentikasi dan RBAC di server, bukan hanya lewat penguncian menu React.
- Percobaan login dibatasi sementara untuk mengurangi brute force.
- Endpoint unggahan memerlukan sesi aktif dan hanya menerima gambar JPG, PNG, atau WEBP maksimal 5 MB.
- Aktivitas autentikasi, operasi ubah data, penolakan akses, dan pembukaan data BK dicatat pada audit log.
- Student Timeline menyaring nilai dan catatan pembinaan di API; akses catatan pembinaan menghasilkan audit entry tambahan.
- Header dasar `nosniff`, frame protection, referrer policy, serta permission policy diterapkan.
- Data pribadi (tagihan SPP, riwayat presensi, nilai, izin/UKS, dompet, mutasi, pesanan kantin, jawaban tugas) untuk akun siswa/orang tua dibatasi di server hanya ke siswa yang terkait dengan akun tersebut; aksi pengelolaan (produk kantin, paket ujian, penilaian, tindak lanjut aspirasi/izin) hanya untuk akun staf.
- Operasi tulis multi-langkah (pembayaran SPP, penggajian, pesanan kantin, top-up/transfer dompet, e-voting, peminjaman/pengembalian buku) berjalan dalam transaksi SQLite sehingga tidak ada data setengah jadi.
- Harga dan stok pesanan kantin dihitung ulang dari database (bukan dari klien); saldo dompet diperiksa ulang di dalam transaksi.
- Validasi input server mengembalikan 400 (data tidak valid), 404 (tidak ditemukan), dan 409 (duplikat) dengan pesan yang jelas; error constraint SQLite tidak lagi bocor sebagai 500.

## Pengoperasian produksi

1. Jangan gunakan akun dan password demo.
2. Jalankan dengan `NODE_ENV=production` dan HTTPS agar cookie sesi memakai atribut `Secure`.
3. Cadangkan `school.db` serta direktori `uploads` secara berkala. Uji restore pada lingkungan terpisah.
4. Batasi akses jaringan ke server database dan aplikasi.
5. Ganti rate limiter memori dengan Redis atau layanan setara saat aplikasi dijalankan pada beberapa instance.
6. Tinjau audit log dan hapus sesi kedaluwarsa secara terjadwal.

## Catatan privasi

Catatan BK dan data siswa bersifat sensitif. Aksesnya harus diberikan sesedikit mungkin, audit harus ditinjau, dan data tidak boleh diekspor atau dibagikan tanpa dasar kewenangan sekolah.
