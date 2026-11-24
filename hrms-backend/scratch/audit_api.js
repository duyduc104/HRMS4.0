const fs = require('fs');
const path = require('path');

// 1. Collect all backend routes
const serverCode = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
const routeMounts = {};
const mountRegex = /app\.use\(['"](\/api\/[a-z0-9_-]+)['"],\s*(?:require\(['"](\.[^'"]+)['"]\)|([a-zA-Z0-9_]+Routes))/g;
let m;
while ((m = mountRegex.exec(serverCode)) !== null) {
  const mountPath = m[1];
  const fileRel = m[2] || './routes/' + m[3] + '.js';
  routeMounts[mountPath] = fileRel;
}

console.log('Mounted backend routes:', Object.keys(routeMounts).length);

// Parse routes files to find registered endpoints
const backendEndpoints = [];
for (const [mount, fileRel] of Object.entries(routeMounts)) {
  const fullPath = path.resolve(__dirname, '..', fileRel.endsWith('.js') ? fileRel : fileRel + '.js');
  if (fs.existsSync(fullPath)) {
    const code = fs.readFileSync(fullPath, 'utf8');
    const rRegex = /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]*)['"]/g;
    let rm;
    while ((rm = rRegex.exec(code)) !== null) {
      const method = rm[1].toUpperCase();
      let subPath = rm[2];
      if (subPath === '/') subPath = '';
      if (!subPath.startsWith('/') && subPath !== '') subPath = '/' + subPath;
      backendEndpoints.push({ method, path: mount + subPath, full: method + ' ' + mount + subPath });
    }
  } else {
    console.warn('Missing route file:', fullPath);
  }
}

console.log('Total backend registered endpoints:', backendEndpoints.length);

// 2. Scan frontend API calls
const frontendServicesDir = path.resolve(__dirname, '../../hrms-frontend/src');
function scanDir(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) {
      files = files.concat(scanDir(p));
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      files.push(p);
    }
  }
  return files;
}

const frontendFiles = scanDir(frontendServicesDir);
const frontendCalls = [];
const apiCallRegex = /api\.(get|post|put|delete|patch)(?:<[^>]+>)?\(\s*[`'"]([^`'"]*)[`'"]/g;

for (const file of frontendFiles) {
  const code = fs.readFileSync(file, 'utf8');
  let am;
  while ((am = apiCallRegex.exec(code)) !== null) {
    const method = am[1].toUpperCase();
    let url = am[2];
    frontendCalls.push({ method, url, file: path.relative(path.resolve(__dirname, '../..'), file) });
  }
}

console.log('Total frontend API calls found:', frontendCalls.length);

// 3. Match frontend calls against backend
const unmatched = [];
for (const call of frontendCalls) {
  let norm = call.url;
  if (!norm.startsWith('/api')) norm = '/api' + (norm.startsWith('/') ? '' : '/') + norm;
  const regexPattern = norm
    .replace(/\$\{[^}]+\}/g, '[^/]+')
    .replace(/\/[0-9a-fA-F-]{8,}/g, '/[^/]+')
    .replace(/\/[0-9]+/g, '/[^/]+')
    .split('?')[0];

  const matched = backendEndpoints.some(be => {
    if (be.method !== call.method) return false;
    const beRegex = new RegExp('^' + be.path.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$');
    return beRegex.test(norm.split('?')[0]) || new RegExp('^' + regexPattern + '$').test(be.path);
  });

  if (!matched) {
    unmatched.push({ method: call.method, raw: call.url, normalized: norm.split('?')[0], file: call.file });
  }
}

console.log('\n=== POTENTIAL UNMATCHED / SUSPICIOUS FRONTEND CALLS (' + unmatched.length + ') ===');
const uniqueUnmatched = {};
for (const u of unmatched) {
  const key = u.method + ' ' + u.normalized;
  if (!uniqueUnmatched[key]) uniqueUnmatched[key] = [];
  uniqueUnmatched[key].push(u.file);
}

for (const [k, files] of Object.entries(uniqueUnmatched)) {
  console.log('❓', k, 'in', files.slice(0, 2).join(', ') + (files.length > 2 ? '...' : ''));
}
process.exit(0);

