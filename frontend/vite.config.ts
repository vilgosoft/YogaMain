import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'

function normalizeApiBaseUrl(apiUrl: string): string {
  const trimmed = apiUrl.trim().replace(/\/+$/, '')
  return trimmed || '/api'
}

function extractProxyTarget(apiBaseUrl: string): string | null {
  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    return null
  }

  const url = new URL(apiBaseUrl)
  return url.origin
}

function extractProxyPrefix(apiBaseUrl: string): string {
  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    return apiBaseUrl
  }

  const url = new URL(apiBaseUrl)
  return url.pathname === '/' ? '/api' : url.pathname.replace(/\/+$/, '')
}

function resolvePhpExecutable(): string | null {
  const configuredPath = process.env.PHP_EXECUTABLE?.trim()
  if (configuredPath) {
    return configuredPath
  }

  const candidates = process.platform === 'win32'
    ? [
        'php',
        'C:\\xampp\\php\\php.exe',
        'C:\\laragon\\bin\\php\\php.exe',
        'C:\\wamp64\\bin\\php\\php.exe',
      ]
    : ['php', '/usr/bin/php', '/usr/local/bin/php']

  for (const candidate of candidates) {
    if (candidate === 'php' || fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

// Auto-start the PHP backend server when Vite starts
function phpBackendPlugin() {
  let phpProcess: ReturnType<typeof spawn> | null = null;

  return {
    name: 'php-backend',
    configureServer() {
      const backendDir = path.resolve(__dirname, '../backend');
      const publicDir = path.join(backendDir, 'public');
      const phpExecutable = resolvePhpExecutable()

      if (!phpExecutable) {
        console.error('\x1b[31m[PHP] No PHP executable found.\x1b[0m')
        console.error('\x1b[33m[PHP] Install PHP or set PHP_EXECUTABLE to your php.exe path.\x1b[0m')
        return
      }

      phpProcess = spawn(phpExecutable, ['-S', 'localhost:8000', '-t', publicDir], {
        cwd: backendDir,
        stdio: 'pipe',
        shell: false,
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
        console.error('\x1b[33m[PHP] Make sure PHP is installed or set PHP_EXECUTABLE to your php.exe path\x1b[0m');
      });

      console.log(`\x1b[36m[PHP]\x1b[0m Backend server starting on http://localhost:8000 using ${phpExecutable}`);
    },
    closeBundle() {
      phpProcess?.kill();
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = normalizeApiBaseUrl(env.VITE_API_URL || '/api')
  const proxyTarget = extractProxyTarget(apiBaseUrl) || 'http://localhost:8000'
  const proxyPrefix = extractProxyPrefix(apiBaseUrl)

  return {
    plugins: [react(), phpBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        [proxyPrefix]: {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables";\n@import "@/styles/mixins";\n`,
        },
      },
    },
  }
})
