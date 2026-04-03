# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yoga LMS (Sai Ishani Yogashala) — a course-based learning platform with video playback, enrollment, and PhonePe payment integration. React frontend + PHP backend, deployed to Hostinger shared hosting at `tpslchecklist.in`.

## Commands

```bash
# Development (auto-starts PHP backend on port 8000 via Vite plugin)
npm run dev                         # from root or frontend/
npm run dev --prefix frontend       # from root explicitly

# Build frontend for production
npm run build                       # outputs to frontend/dist/

# Lint & type-check
npm run lint
cd frontend && npx tsc --noEmit     # TypeScript check without emit

# Backend (PHP dev server — normally auto-started by Vite plugin)
cd backend && php -S localhost:8000 -t public
```

No test suite exists. Verify changes with `tsc --noEmit` and `vite build`.

## Architecture

### Two-tier monorepo: `frontend/` + `backend/`

**Frontend** — React 19 + TypeScript + Vite + SCSS Modules
- `src/api/client.ts` — Axios instance with baseURL `/api`, JWT interceptors (auto-refresh on 401), FormData Content-Type handling
- `src/context/AuthContext.tsx` — Auth state, stores access token in memory (not localStorage), refresh token in HttpOnly cookie
- `src/routes/index.tsx` — All route definitions; `ProtectedRoute` and `AdminRoute` wrappers
- `src/utils/pricingPlans.ts` — Pricing plan definitions (plan codes, amounts, durations)
- Path alias: `@/` maps to `src/`
- SCSS: `variables` and `mixins` are auto-injected into every SCSS file via Vite config

**Backend** — PHP 8.0+ with custom Router, PDO/MySQL, JWT auth (firebase/php-jwt)
- `public/index.php` — Local dev entry point; registers all routes
- `src/Router/Router.php` — Simple regex-based router; strips `/api` prefix, supports `:param` placeholders, middleware array per route
- `src/Middleware/AuthMiddleware.php` — Parses `Authorization: Bearer <token>`, sets `$GLOBALS['auth_user']`
- `src/Helpers/FileUpload.php` — Handles image/video uploads; detects `public_html/uploads/` path using `$_ENV['UPLOADS_PATH']`, `DOCUMENT_ROOT`, or `__DIR__`-based traversal
- `src/Helpers/Response.php` — Standardized JSON responses: `{success, data, error, meta}`
- No ORM — raw PDO queries in Model classes

### API Response Format

All endpoints return: `{ success: boolean, data?: T, error?: { code: string, message: string }, meta?: { ... } }`

### Authentication Flow

- Login/register returns `access_token` (short-lived JWT) + sets `refresh_token` as HttpOnly cookie
- Frontend stores access token in memory only (lost on refresh, restored via `/auth/refresh`)
- Public routes (e.g., `/courses/:slug`) use `getOptionalAuthUser()` which manually parses JWT without middleware

### Hostinger Deployment (`deploy/` directory)

Production uses a **different entry point** than local dev:
- `deploy/public_html/api/index.php` — Production entry; loads backend from `yoga-backend/` (sibling of `public_html/`), sets `$_ENV['UPLOADS_PATH']`, auto-fixes `FileUpload.php` if outdated, defines inline route closures for routes that had deploy sync issues
- `deploy/public_html/.htaccess` — HTTPS redirect, `/api` rewrite to `api/index.php`, SPA fallback to `index.html`
- `deploy/public_html/api/.htaccess` — Routes all requests to `index.php`, forwards `Authorization` header to PHP (required for CGI/FastCGI)

**Hostinger file structure:**
```
/home/u602160284/domains/tpslchecklist.in/
├── public_html/          ← frontend dist + api/ + uploads/
│   ├── api/index.php     ← deploy/public_html/api/index.php
│   ├── uploads/          ← thumbnails/ and videos/ (web-accessible)
│   └── assets/           ← Vite build output
└── yoga-backend/         ← backend/src + backend/vendor + .env
```

### Key Hostinger Gotchas

- Apache CGI/FastCGI strips `Authorization` header — must use `.htaccess` `RewriteRule` with `E=HTTP_AUTHORIZATION`
- `DOCUMENT_ROOT` may be unreliable — `FileUpload.php` falls back to `__DIR__`-based path detection
- HTTPS detection requires checking `HTTP_X_FORWARDED_PROTO` (reverse proxy)
- Cookie `secure` flag needs same proxy-aware detection in `AuthController`
- `deploy/public_html/api/index.php` auto-overwrites `FileUpload.php` if it detects the old version (checks for `videos/raw` in content)

### Database

MySQL with 7 tables: `users`, `categories`, `courses`, `videos`, `enrollments`, `video_progress`, `transactions`, `refresh_tokens`. Schema in `backend/migrations/001_initial_schema.sql`.

### Payment

PhonePe integration via `PhonePeService.php`. Flow: initiate → redirect to PhonePe → callback → enrollment creation.
