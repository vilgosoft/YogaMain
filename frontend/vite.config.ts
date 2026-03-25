import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { spawn } from 'child_process'

// Auto-start the PHP backend server when Vite starts
function phpBackendPlugin() {
  let phpProcess: ReturnType<typeof spawn> | null = null;

  return {
    name: 'php-backend',
    configureServer() {
      const backendDir = path.resolve(__dirname, '../backend');
      const publicDir = path.join(backendDir, 'public');

      phpProcess = spawn('php', ['-S', 'localhost:8000', '-t', publicDir], {
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
        console.error('\x1b[33m[PHP] Make sure PHP is installed and in your PATH\x1b[0m');
      });

      console.log('\x1b[36m[PHP]\x1b[0m Backend server starting on http://localhost:8000');
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
    host: true,
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
        additionalData: `@import "@/styles/variables";\n@import "@/styles/mixins";\n`,
      },
    },
  },
})
