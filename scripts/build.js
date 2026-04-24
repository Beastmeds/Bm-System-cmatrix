const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args, opts = {}){
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, Object.assign({stdio: 'inherit', shell: false}, opts));
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
    p.on('error', reject);
  });
}

async function main(){
  try{
    const root = path.resolve(__dirname, '..');
    const buildDir = path.join(root, 'build');

    // If a stale build directory or CMakeCache exists (from developer machine),
    // remove it so CMake config starts clean inside package install dir.
    if (fs.existsSync(buildDir)) {
      try {
        fs.rmSync(buildDir, { recursive: true, force: true });
      } catch (e) {
        // fallback for older Node versions
        const rimraf = require('child_process').spawnSync('rm', ['-rf', buildDir]);
        if (rimraf.status !== 0) {
          console.warn('Could not remove stale build directory, continuing...');
        }
      }
    }
    fs.mkdirSync(buildDir, { recursive: true });

    if (process.platform === 'win32'){
      // Configure and build using CMake on Windows
      await run('cmake', ['-S', root, '-B', buildDir]);
      await run('cmake', ['--build', buildDir, '--config', 'Release']);
    } else {
      // Unix-like: configure then make
      await run('cmake', ['-S', root, '-B', buildDir]);
      await run('cmake', ['--build', buildDir]);
    }

    console.log('Build finished.');
  }catch(err){
    console.error('Build failed:', err.message || err);
    process.exit(1);
  }
}

main();
