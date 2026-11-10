@echo off
title Sistem Perizinan Keluar Area - PT Pupuk Kujang
cd /d "%~dp0"

echo ========================================================
echo   MENJALANKAN SISTEM PERIZINAN KELUAR AREA
echo   PT PUPUK KUJANG (SERVER LOKAL CEPAT MULTI-THREAD)
echo ========================================================
echo.

:: Otomatis membuka peramban web browser ke halaman aplikasi
start "" http://localhost:8080

:: Jalankan server Python multi-threaded yang cepat dan responsif untuk PC & HP
python server.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Gagal menjalankan Python biasa, mencoba py launcher...]
    py server.py
)

pause
