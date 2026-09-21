import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// Start both admin and caregiver development servers with VITE_APP_PAGE env var
const admin = spawn('npm', ['run', 'dev:admin'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

// Wait a moment for admin to claim port 5173, then start caregiver
setTimeout(() => {
  const caregiver = spawn('npm', ['run', 'dev:caregiver'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });

  const shutdown = () => {
    admin.kill();
    caregiver.kill();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  [admin, caregiver].forEach((child, index) => {
    child.on('exit', (code) => {
      if (code && code !== 130) {
        console.error(`Server ${index === 0 ? 'admin' : 'caregiver'} stopped with exit code ${code}`);
      }
    });
  });
}, 1000);
