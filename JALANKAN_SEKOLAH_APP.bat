@echo off
title Sekolah Super App - Server
cls
echo ===================================================
echo     MEMULAI SERVER SEKOLAH SUPER APP TERPADU
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terpasang di sistem ini!
    echo Silakan unduh dan pasang Node.js dari https://nodejs.org
    pause
    exit /b
)

echo [OK] Node.js terdeteksi.
echo [INFO] Menjalankan server backend Express di http://localhost:5000 ...
echo [INFO] Membuka web browser dalam 2 detik...
echo.

start "" cmd /c "timeout /t 2 >nul & start http://localhost:5000"

node --experimental-sqlite server/index.js
pause

