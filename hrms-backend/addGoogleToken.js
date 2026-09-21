const sequelize = require('./config/database');
async function run() {
  try {
    await sequelize.query('ALTER TABLE Employees ADD googleRefreshToken VARCHAR(MAX);');
    console.log('Added googleRefreshToken to Employees');
  } catch(e) {
    if(e.message.includes('already exists')) console.log('Already exists');
    else console.error(e);
  }
  process.exit();
}
run();
