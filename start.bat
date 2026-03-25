@echo off
title Yoga LMS - Starting...
color 0A
echo ============================================
echo    Yoga LMS - Startup Script
echo ============================================
echo.

:: Find PHP
set "PHP_CMD=php"
where php >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\xampp\php\php.exe" (
        set "PHP_CMD=C:\xampp\php\php.exe"
        echo [INFO] PHP found at C:\xampp\php\php.exe
    ) else if exist "D:\xampp\php\php.exe" (
        set "PHP_CMD=D:\xampp\php\php.exe"
        echo [INFO] PHP found at D:\xampp\php\php.exe
    ) else (
        echo [ERROR] PHP not found! Please install XAMPP from https://www.apachefriends.org
        echo         or add PHP to your system PATH.
        pause
        exit /b 1
    )
) else (
    echo [INFO] PHP found in PATH
)
echo.

:: Find MySQL
set "MYSQL_CMD=mysql"
where mysql >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\xampp\mysql\bin\mysql.exe" (
        set "MYSQL_CMD=C:\xampp\mysql\bin\mysql.exe"
    ) else if exist "D:\xampp\mysql\bin\mysql.exe" (
        set "MYSQL_CMD=D:\xampp\mysql\bin\mysql.exe"
    )
)

:: Step 1: Start MySQL via XAMPP
echo [1/3] Starting MySQL...
net start mysql >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\xampp\xampp-control.exe" (
        echo       Starting XAMPP Control Panel...
        start "" "C:\xampp\xampp-control.exe"
        echo       Please make sure MySQL is started in XAMPP Control Panel.
        timeout /t 5 >nul
    ) else if exist "D:\xampp\xampp-control.exe" (
        start "" "D:\xampp\xampp-control.exe"
        timeout /t 5 >nul
    ) else (
        echo       WARNING: Could not start MySQL. Please start it manually.
    )
)
echo       MySQL: OK
echo.

:: Step 2: Create database if not exists
echo [2/3] Checking database...
"%MYSQL_CMD%" -u root -e "CREATE DATABASE IF NOT EXISTS yoga_lms;" 2>nul
if %errorlevel% equ 0 (
    echo       Database yoga_lms: OK
) else (
    echo       WARNING: Could not verify database. Make sure MySQL is running
    echo       and yoga_lms database exists.
)
echo.

:: Step 3: Start backend PHP server
echo [3/3] Starting servers...
cd /d "%~dp0backend"
start "Yoga LMS Backend" cmd /k ""%PHP_CMD%" -S localhost:8000 -t public"
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
