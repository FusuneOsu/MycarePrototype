// to anyone reading this: this is a huge hack

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'caregiverPage', 'dist');
const dest = path.join(__dirname, 'adminPage', 'dist', 'caregiver');

if (!fs.existsSync(src)) {
  console.error(`Source not found: ${src}. Did caregiverPage build run first?`);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`Copied ${src} -> ${dest}`);