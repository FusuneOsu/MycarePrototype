import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const appPage = process.env.VITE_APP_PAGE || 'admin';
const isAdmin = appPage === 'admin';
const isCaregiver = appPage === 'caregiver';

const basePath = isAdmin ? '/' : '/caregiver/';
const outDir = isAdmin ? 'dist' : 'dist/caregiver';
const rootDir = isAdmin ? resolve(__dirname, 'adminPage') : resolve(__dirname, 'caregiverPage');

export default defineConfig({
  plugins: [react()],
  base: basePath,
  root: rootDir,
  build: {
    outDir: resolve(__dirname, outDir),
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    emptyOutDir: false,
  },
  server: {
    port: isAdmin ? 5173 : 5174,
    fs: {
      allow: [__dirname],
    },
    ...(isAdmin ? {
      proxy: {
        '/caregiver': {
          target: 'http://localhost:5174',
          changeOrigin: true,
        },
      },
    } : {}),
  },
});
