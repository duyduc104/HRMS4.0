const sequelize = require('./config/database');

async function dropConstraint() {
  try {
    await sequelize.query('ALTER TABLE ScheduledEvents DROP CONSTRAINT CK__Scheduled__statu__1E6F845E;');
    console.log('Constraint dropped successfully');
  } catch (e) {
    console.error('Failed to drop constraint:', e.message);
  }
  process.exit();
}

dropConstraint();
