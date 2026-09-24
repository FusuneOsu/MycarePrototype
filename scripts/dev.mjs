import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const admin = spawn('npm', ['run', 'dev:admin'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

// Registered immediately, not inside the setTimeout below — a crash in
// admin's first second (e.g. port already in use with strictPort: true)
// must not go unreported just because caregiver hasn't started yet.
admin.on('exit', (code) => {
  if (code && code !== 130) console.error(`Server admin stopped with exit code ${code}`);
});

setTimeout(() => {
  const caregiver = spawn('npm', ['run', 'dev:caregiver'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });

  caregiver.on('exit', (code) => {
    if (code && code !== 130) console.error(`Server caregiver stopped with exit code ${code}`);
  });

  const shutdown = () => {
    admin.kill();
    caregiver.kill();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}, 1000);