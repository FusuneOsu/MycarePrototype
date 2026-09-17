import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const projects = ['adminPage', 'caregiverPage'];
const children = projects.map((project) => spawn('npm.cmd', ['run', 'dev'], {
  cwd: resolve(root, project),
  stdio: 'inherit',
  shell: true,
}));

const shutdown = () => children.forEach((child) => child.kill());
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

children.forEach((child, index) => {
  child.on('exit', (code) => {
    if (code && code !== 130) {
      console.error(`${projects[index]} stopped with exit code ${code}`);
    }
  });
});
