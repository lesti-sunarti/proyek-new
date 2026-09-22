@echo off
setlocal
title Sekolah Super App - Server
cd /d "%~dp0"
cls
echo ===================================================
echo     MEMULAI SERVER SEKOLAH SUPER APP TERPADU
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terpasang di sistem ini!
    echo Silakan unduh dan pasang Node.js versi 22 LTS atau lebih baru dari https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
if %NODE_MAJOR% LSS 22 (
    echo [ERROR] Node.js versi %NODE_MAJOR% terdeteksi. Aplikasi memerlukan Node.js 22.5 atau lebih baru.
    echo Unduh versi terbaru dari https://nodejs.org lalu jalankan file ini kembali.
    pause
    exit /b 1
)
echo [OK] Node.js terdeteksi.

if not exist "node_modules\" (
    echo [INFO] Memasang dependensi untuk pertama kali ^(npm install^)... mohon tunggu.
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] npm install gagal. Periksa koneksi internet lalu coba lagi.
        pause
        exit /b 1
    )
)

if not exist "dist\index.html" (
    echo [INFO] Membangun antarmuka web ^(npm run build^)... mohon tunggu.
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Build antarmuka gagal.
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Menjalankan server backend Express di http://localhost:5000 ...
echo [INFO] Data demo dibuat otomatis saat pertama kali dijalankan ^(akun demo ada di jendela login^).
echo [INFO] Browser akan terbuka dalam 3 detik. Tekan Ctrl+C untuk menghentikan server.
echo.

start "" cmd /c "timeout /t 3 >nul & start http://localhost:5000"

node --experimental-sqlite server/index.js
pause
