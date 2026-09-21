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
  // One dependency cache per app. Both dev servers run at once from the same
  // repo, and with a shared node_modules/.vite the caregiver server (which has
  // no react-router-dom) would re-optimize and delete the admin's router
  // bundle, leaving the admin page blank with a "504 Outdated Optimize Dep".
  cacheDir: resolve(__dirname, `node_modules/.vite-${appPage}`),
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
    // Fail loudly instead of drifting to 5175+: the login redirects between the
    // two apps assume exactly these ports.
    strictPort: true,
    fs: {
      allow: [__dirname],
    },
    ...(isAdmin ? {
      proxy: {
        // Regex, not a plain prefix: a plain '/caregiver' key also matches the
        // admin's own '/caregivers' route and proxies it to the caregiver app,
        // which 404s. Match only '/caregiver' exactly or '/caregiver/...'.
        '^/caregiver(?:/|$)': {
          target: 'http://localhost:5174',
          changeOrigin: true,
        },
      },
    } : {}),
  },
});
