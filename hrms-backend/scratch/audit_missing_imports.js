const fs = require('fs');
const path = require('path');

function checkUndeclared(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const missing = [];
  if (/\bpath\./.test(code) && !code.includes("require('path')") && !code.includes('require("path")')) {
    missing.push('path');
  }
  if (/\bfs\./.test(code) && !code.includes("require('fs')") && !code.includes('require("fs")')) {
    missing.push('fs');
  }
  return missing;
}

const controllersDir = path.resolve(__dirname, '../controllers');
for (const file of fs.readdirSync(controllersDir)) {
  if (file.endsWith('.js')) {
    const full = path.join(controllersDir, file);
    const m = checkUndeclared(full);
    if (m.length > 0) {
      console.log('⚠️ Potential missing require in', file, ':', m.join(', '));
    }
  }
}

const routesDir = path.resolve(__dirname, '../routes');
for (const file of fs.readdirSync(routesDir)) {
  if (file.endsWith('.js')) {
    const full = path.join(routesDir, file);
    const m = checkUndeclared(full);
    if (m.length > 0) {
      console.log('⚠️ Potential missing require in routes/' + file, ':', m.join(', '));
    }
  }
}

process.exit(0);

