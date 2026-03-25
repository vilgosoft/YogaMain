import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { spawn, execSync } from 'child_process'
import fs from 'fs'

// Find PHP executable — checks PATH first, then common XAMPP locations
function findPhp(): string {
  // Check if php is in PATH
  try {
    execSync('php -v', { stdio: 'ignore' });
    return 'php';
  } catch { /* not in PATH */ }

  // Common XAMPP PHP locations on Windows
  const candidates = [
    'C:\\xampp\\php\\php.exe',
    'C:\\XAMPP\\php\\php.exe',
    'D:\\xampp\\php\\php.exe',
    // WAMP
    'C:\\wamp64\\bin\\php\\php8.2.0\\php.exe',
    'C:\\wamp64\\bin\\php\\php8.1.0\\php.exe',
    // Laragon
    'C:\\laragon\\bin\\php\\php-8.2\\php.exe',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Also try to find any PHP in XAMPP php directory
  const xamppPhpDir = 'C:\\xampp\\php';
  if (fs.existsSync(xamppPhpDir)) {
    const phpExe = path.join(xamppPhpDir, 'php.exe');
    if (fs.existsSync(phpExe)) return phpExe;
  }

  return 'php'; // fallback — will show error if not found
}

// Auto-start the PHP backend server when Vite starts
function phpBackendPlugin() {
  let phpProcess: ReturnType<typeof spawn> | null = null;

  return {
    name: 'php-backend',
    configureServer() {
      const backendDir = path.resolve(__dirname, '../backend');
      const publicDir = path.join(backendDir, 'public');
      const phpPath = findPhp();

      console.log(`\x1b[36m[PHP]\x1b[0m Using: ${phpPath}`);
      console.log(`\x1b[36m[PHP]\x1b[0m Backend server starting on http://localhost:8000`);

      phpProcess = spawn(phpPath, ['-S', 'localhost:8000', '-t', publicDir], {
        cwd: backendDir,
        stdio: 'pipe',
        shell: true,
      });

      phpProcess.stdout?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.log(`\x1b[36m[PHP]\x1b[0m ${msg}`);
      });

      phpProcess.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg && !msg.includes('Accepted') && !msg.includes('Closing')) {
          console.log(`\x1b[36m[PHP]\x1b[0m ${msg}`);
        }
      });

      phpProcess.on('error', (err) => {
        console.error(`\x1b[31m[PHP] Failed to start: ${err.message}\x1b[0m`);
        console.error(`\x1b[33m[PHP] PHP was not found. Install PHP or install XAMPP from https://www.apachefriends.org\x1b[0m`);
      });
    },
    closeBundle() {
      phpProcess?.kill();
    },
  };
}

export default defineConfig({
  plugins: [react(), phpBackendPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables" as *;\n@use "@/styles/mixins" as *;\n`,
      },
    },
  },
})
