@echo off
title Yoga LMS - Build for Hostinger
color 0E
echo ============================================
echo    Building Yoga LMS for Hostinger Deploy
echo ============================================
echo.

:: Clean previous build
if exist "%~dp0hostinger-upload" rmdir /s /q "%~dp0hostinger-upload"
mkdir "%~dp0hostinger-upload"
mkdir "%~dp0hostinger-upload\public_html"
mkdir "%~dp0hostinger-upload\yoga-backend"

:: Step 1: Build React frontend
echo [1/4] Building frontend...
cd /d "%~dp0..\frontend"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)
echo       Frontend build: OK
echo.

:: Step 2: Copy frontend build to public_html
echo [2/4] Copying frontend files...
xcopy /s /e /y "%~dp0..\frontend\dist\*" "%~dp0hostinger-upload\public_html\" >nul
echo       Frontend files copied: OK
echo.

:: Step 3: Copy .htaccess and API entry point
echo [3/4] Setting up API routing...
copy /y "%~dp0public_html\.htaccess" "%~dp0hostinger-upload\public_html\.htaccess" >nul
mkdir "%~dp0hostinger-upload\public_html\api" 2>nul
copy /y "%~dp0public_html\api\.htaccess" "%~dp0hostinger-upload\public_html\api\.htaccess" >nul
copy /y "%~dp0public_html\api\index.php" "%~dp0hostinger-upload\public_html\api\index.php" >nul
echo       API routing setup: OK
echo.

:: Step 4: Copy backend (excluding .env and storage contents)
echo [4/4] Copying backend files...
xcopy /s /e /y "%~dp0..\backend\src\*" "%~dp0hostinger-upload\yoga-backend\src\" >nul
xcopy /s /e /y "%~dp0..\backend\vendor\*" "%~dp0hostinger-upload\yoga-backend\vendor\" >nul
xcopy /s /e /y "%~dp0..\backend\migrations\*" "%~dp0hostinger-upload\yoga-backend\migrations\" >nul
copy /y "%~dp0..\backend\composer.json" "%~dp0hostinger-upload\yoga-backend\composer.json" >nul
copy /y "%~dp0..\backend\composer.lock" "%~dp0hostinger-upload\yoga-backend\composer.lock" >nul
copy /y "%~dp0..\backend\.env.production" "%~dp0hostinger-upload\yoga-backend\.env.example" >nul
mkdir "%~dp0hostinger-upload\yoga-backend\storage" 2>nul
echo       Backend files copied: OK
echo.

echo ============================================
echo    BUILD COMPLETE!
echo ============================================
echo.
echo    Upload folder: deploy\hostinger-upload\
echo.
echo    Upload instructions:
echo    1. Upload "public_html" contents to your Hostinger public_html/
echo    2. Upload "yoga-backend" folder next to public_html/
echo    3. Rename yoga-backend/.env.example to .env and fill in DB credentials
echo    4. Import migrations/001_initial_schema.sql via phpMyAdmin
echo.
echo    See DEPLOY-GUIDE.md for detailed steps.
echo ============================================
pause
