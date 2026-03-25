# Deploying Yoga LMS to Hostinger Business Hosting

## Prerequisites
- Hostinger Business Web Hosting plan with a domain
- Node.js installed on your PC (to build the frontend)
- The project files on your PC

---

## Step 1: Build the Project

1. Open a terminal in the project folder
2. Double-click `deploy/build.bat` (Windows)
3. Wait for it to finish — the built files will be in `deploy/hostinger-upload/`

---

## Step 2: Create MySQL Database on Hostinger

1. Log in to **Hostinger hPanel** (hpanel.hostinger.com)
2. Go to **Databases** > **MySQL Databases**
3. Create a new database:
   - Database name: `yoga_lms` (it will become something like `u123456789_yoga_lms`)
   - Username: `yogaadmin` (it will become something like `u123456789_yogaadmin`)
   - Password: **use a strong password and save it**
4. Click **Create**
5. Note down the full database name, username, and password

---

## Step 3: Import Database Tables

1. In hPanel, go to **Databases** > **phpMyAdmin**
2. Click **Enter phpMyAdmin** next to your database
3. Click the **Import** tab at the top
4. Click **Choose File** and select `deploy/hostinger-upload/yoga-backend/migrations/001_initial_schema.sql`
5. Click **Go** to import

---

## Step 4: Upload Backend Files

1. In hPanel, go to **Files** > **File Manager**
2. You should see the `public_html` folder
3. Navigate UP one level (to `/home/username/`)
4. Create a new folder called `yoga-backend`
5. Open `yoga-backend` and upload ALL contents from `deploy/hostinger-upload/yoga-backend/`:
   - `src/` folder
   - `vendor/` folder
   - `migrations/` folder
   - `composer.json`
   - `composer.lock`
   - `.env.example`
6. Rename `.env.example` to `.env`
7. Edit `.env` and fill in your actual values:

```
APP_ENV=production
APP_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com

DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_yoga_lms      <-- your actual database name from Step 2
DB_USER=u123456789_yogaadmin     <-- your actual username from Step 2
DB_PASS=YourPasswordHere         <-- your actual password from Step 2

JWT_SECRET=paste-a-random-64-character-string-here
JWT_ACCESS_TTL=3600
JWT_REFRESH_TTL=2592000

PHONEPE_MERCHANT_ID=YOUR_PRODUCTION_ID
PHONEPE_SALT_KEY=YOUR_PRODUCTION_KEY
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api.phonepe.com/apis/hermes

VIDEO_SIGNING_KEY=paste-another-random-64-character-string-here
STORAGE_PATH=./storage
```

8. Create a `storage` folder inside `yoga-backend` if it doesn't exist

---

## Step 5: Upload Frontend Files

1. Go back to File Manager, open `public_html`
2. **Delete** the default `index.html` or `index.php` that Hostinger puts there
3. Upload ALL contents from `deploy/hostinger-upload/public_html/`:
   - `index.html`
   - `assets/` folder
   - `.htaccess`
   - `api/` folder (contains `.htaccess` and `index.php`)

---

## Step 6: Set PHP Version

1. In hPanel, go to **Advanced** > **PHP Configuration**
2. Set PHP version to **8.1** or **8.2** (must be 8.0+)
3. Make sure these extensions are enabled:
   - `pdo_mysql`
   - `json`
   - `mbstring`

---

## Step 7: Test

1. Visit `https://yourdomain.com` — you should see the Yoga LMS website
2. Visit `https://yourdomain.com/api/health` — you should see:
   ```json
   {"success":true,"data":{"api":true,"database":true}}
   ```
3. Try registering a new account and logging in

---

## Troubleshooting

### "500 Internal Server Error"
- Check PHP version is 8.0+ in hPanel
- Check `.htaccess` files were uploaded correctly
- Check Hostinger error logs: hPanel > **Advanced** > **Error Logs**

### "Cannot connect to database"
- Verify DB credentials in `yoga-backend/.env`
- Make sure the database name includes the prefix (e.g., `u123456789_yoga_lms`)
- Make sure you imported the SQL schema via phpMyAdmin

### API returns 404
- Make sure the `api/` folder exists inside `public_html/`
- Make sure both `.htaccess` files are present (one in `public_html/`, one in `public_html/api/`)
- In hPanel, make sure **mod_rewrite** is enabled (it usually is by default)

### Pages show 404 on refresh
- The `.htaccess` in `public_html/` handles SPA routing
- Make sure it was uploaded correctly and Apache's `AllowOverride All` is set (default on Hostinger)

---

## File Structure on Hostinger

After deployment, your Hostinger file manager should look like this:

```
/home/username/
├── public_html/
│   ├── .htaccess           <-- SPA routing + HTTPS redirect
│   ├── index.html          <-- React app
│   ├── assets/
│   │   ├── index-xxx.js
│   │   └── index-xxx.css
│   └── api/
│       ├── .htaccess       <-- API routing
│       └── index.php       <-- API entry point
├── yoga-backend/
│   ├── .env                <-- YOUR credentials (keep secret!)
│   ├── src/
│   ├── vendor/
│   ├── migrations/
│   ├── storage/
│   ├── composer.json
│   └── composer.lock
```
