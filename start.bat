@echo off
title Yoga LMS - Starting...
color 0A
echo ============================================
echo    Yoga LMS - Startup Script
echo ============================================
echo.

:: Step 1: Start MySQL
echo [1/3] Starting MySQL...
net start mysql 2>nul
if %errorlevel% neq 0 (
    echo       MySQL may already be running or needs XAMPP.
    echo       Trying XAMPP MySQL...
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        start "" "C:\xampp\xampp_start.exe" 2>nul
        timeout /t 3 >nul
    )
    if exist "C:\xampp\xampp-control.exe" (
        echo       Opening XAMPP Control Panel - please start MySQL manually.
        start "" "C:\xampp\xampp-control.exe"
        timeout /t 5 >nul
    )
)
echo       MySQL: OK
echo.

:: Step 2: Create database if not exists
echo [2/3] Checking database...
where mysql >nul 2>nul
if %errorlevel% equ 0 (
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS yoga_lms;" 2>nul
    echo       Database: OK
) else (
    if exist "C:\xampp\mysql\bin\mysql.exe" (
        "C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS yoga_lms;" 2>nul
        echo       Database: OK
    ) else (
        echo       WARNING: Could not find mysql command. Make sure yoga_lms database exists.
    )
)
echo.

:: Step 3: Start backend PHP server
echo [3/3] Starting servers...
cd /d "%~dp0backend"
start "Yoga LMS Backend" cmd /k "php -S localhost:8000 -t public"
echo       Backend: http://localhost:8000
echo.

:: Step 4: Start frontend
cd /d "%~dp0frontend"
start "Yoga LMS Frontend" cmd /k "npm run dev"
echo       Frontend: http://localhost:5173
echo.

echo ============================================
echo    All services started!
echo    Open http://localhost:5173 in your browser
echo ============================================
echo.
timeout /t 5 >nul
start http://localhost:5173
