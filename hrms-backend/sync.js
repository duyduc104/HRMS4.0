const sequelize = require('./config/database');

async function sync() {
  try {
    await sequelize.query(`
      ALTER TABLE OnboardingRecords 
      ADD bankName VARCHAR(255), bankAccountNumber VARCHAR(255), bankAccountName VARCHAR(255);
    `);
    console.log('Added bank columns to OnboardingRecords');
  } catch (error) {
    if (error.original && error.original.message.includes('already exists')) {
      console.log('Columns already exist.');
    } else {
      console.error('Error adding columns:', error.message);
    }
  }
  process.exit();
}

sync();
