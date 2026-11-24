const fs = require('fs');
const path = require('path');

const indexCode = fs.readFileSync(path.resolve(__dirname, '../models/index.js'), 'utf8');

// Collect all defined associations
// e.g. Employee.hasMany(Attendance, { foreignKey: 'employeeId', as: 'attendances' });
const definedAssoc = new Set();
const assocRegex = /([A-Za-z0-9_]+)\.(hasMany|belongsTo|hasOne|belongsToMany)\(\s*([A-Za-z0-9_]+)\s*,\s*\{[^}]*as:\s*['"]([^'"]+)['"]/g;
let m;
while ((m = assocRegex.exec(indexCode)) !== null) {
  const fromModel = m[1];
  const toModel = m[3];
  const asName = m[4];
  definedAssoc.add(`${fromModel}->${asName}`);
  definedAssoc.add(`*->${asName}`); // loose match
}

console.log('Defined associations in models/index.js:', definedAssoc.size);

// Scan all controllers for `include`
const controllersDir = path.resolve(__dirname, '../controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

const issues = [];
for (const file of files) {
  const code = fs.readFileSync(path.join(controllersDir, file), 'utf8');
  // Match include: [{ model: ModelName, as: 'asName' }] or include: [{ as: 'asName' }]
  const incRegex = /model:\s*([A-Za-z0-9_]+)[^}]*as:\s*['"]([^'"]+)['"]/g;
  let im;
  while ((im = incRegex.exec(code)) !== null) {
    const targetModel = im[1];
    const asName = im[2];
    if (!definedAssoc.has(`*->${asName}`)) {
      issues.push({ file, targetModel, asName });
    }
  }
}

console.log('Associations check issues found:', issues.length);
for (const iss of issues) {
  console.log(`⚠️ ${iss.file}: include model ${iss.targetModel} with as '${iss.asName}' is NOT defined in models/index.js!`);
}

process.exit(0);

