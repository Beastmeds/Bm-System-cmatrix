#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

function getAssetName() {
  const plat = process.platform; // 'darwin','linux','win32'
  const arch = process.arch; // 'x64','arm64', etc.
  let name = 'cmatrix';
  if (plat === 'win32') name += '-windows';
  else if (plat === 'darwin') name += '-macos';
  else if (plat === 'linux') name += '-linux';
  name += `-${arch}`;
  if (plat === 'win32') name += '.exe';
  return name;
}

function localBinaryPath() {
  if (process.platform === 'win32') return path.join(root, 'build', 'Release', 'cmatrix.exe');
  return path.join(root, 'build', 'cmatrix');
}

async function downloadReleaseBinary(version, assetName, destPath) {
  const owner = (pkg.repository && pkg.repository.url) ? pkg.repository.url.replace(/(^.*github.com[:\\/]|\\.git$)/g, '') : 'Bm-Systems/cmatrix';
  const tag = `v${version}`;
  const url = `https://github.com/${owner}/releases/download/${tag}/${assetName}`;

  return new Promise((resolve, reject) => {
    const tmp = destPath + '.download';
    const req = https.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // follow redirect
        https.get(res.headers.location, res2 => {
          if (res2.statusCode !== 200) return reject(new Error(`Download failed: ${res2.statusCode}`));
          const file = fs.createWriteStream(tmp, { mode: 0o755 });
          res2.pipe(file);
          file.on('finish', () => {
            fs.renameSync(tmp, destPath);
            resolve(destPath);
          });
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) return reject(new Error(`Download failed: ${res.statusCode}`));
      const file = fs.createWriteStream(tmp, { mode: 0o755 });
      res.pipe(file);
      file.on('finish', () => {
        fs.renameSync(tmp, destPath);
        resolve(destPath);
      });
    });
    req.on('error', reject);
  });
}

async function run() {
  const binPath = localBinaryPath();

  if (!fs.existsSync(binPath)) {
    // try to download prebuilt release
    const asset = getAssetName();
    const dest = binPath;
    try {
      await downloadReleaseBinary(pkg.version, asset, dest);
      fs.chmodSync(dest, 0o755);
    } catch (err) {
      console.error('Prebuilt binary not available or download failed:', err.message);
      console.error('Falling back to local build. Run `npm run build` or install build tools.');
      process.exit(1);
    }
  }

  const child = spawn(binPath, process.argv.slice(2), { stdio: 'inherit' });
  child.on('exit', code => process.exit(code));
}

run();
