#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const binName = process.platform === 'win32' ? 'Release\\cmatrix.exe' : 'cmatrix';
const binPath = process.platform === 'win32' ? path.join(root, 'build', binName) : path.join(root, 'build', binName);

if (!fs.existsSync(binPath)) {
  console.error('cmatrix: binary not found. Try `npm run build` or ensure CMake is installed so `npm install` can build the binary.');
  process.exit(1);
}

const child = spawn(binPath, process.argv.slice(2), { stdio: 'inherit' });
child.on('exit', code => process.exit(code));
