const fs = require('fs');
const path = require('path');

function scanFiles(dir, exts) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) {
      if (item !== 'node_modules' && item !== '.git') res = res.concat(scanFiles(p, exts));
    } else if (exts.some(e => p.endsWith(e))) {
      res.push(p);
    }
  }
  return res;
}

// Backend emits
const backendFiles = scanFiles(path.resolve(__dirname, '..'), ['.js']);
const backendEmits = new Set();
const emitRegex = /(?:io|socket)(?:\.to\([^)]+\))?\.emit\(\s*['"]([^'"]+)['"]/g;

for (const f of backendFiles) {
  if (f.includes('scratch') || f.includes('node_modules')) continue;
  const code = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = emitRegex.exec(code)) !== null) {
    backendEmits.add(m[1]);
  }
}

// Frontend listeners
const frontendFiles = scanFiles(path.resolve(__dirname, '../../hrms-frontend/src'), ['.ts', '.tsx']);
const frontendListeners = new Set();
const onRegex = /socket\.on\(\s*['"]([^'"]+)['"]/g;

for (const f of frontendFiles) {
  const code = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = onRegex.exec(code)) !== null) {
    frontendListeners.add(m[1]);
  }
}

console.log('Backend emits events (' + backendEmits.size + '):', Array.from(backendEmits).sort());
console.log('Frontend listens events (' + frontendListeners.size + '):', Array.from(frontendListeners).sort());

// Check which backend events are NOT listened by frontend
const unhandledByFrontend = Array.from(backendEmits).filter(e => !frontendListeners.has(e));
console.log('\nEvents emitted by backend but not listened by frontend:', unhandledByFrontend);

// Check which frontend listeners have no backend emits
const unhandledByBackend = Array.from(frontendListeners).filter(e => !backendEmits.has(e));
console.log('\nEvents listened by frontend but never emitted by backend:', unhandledByBackend);

process.exit(0);

