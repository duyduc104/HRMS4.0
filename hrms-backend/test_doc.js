const { Document } = require('./models');
const { Op } = require('sequelize');

async function test() {
  const docs = await Document.findAll({
    where: { title: { [Op.like]: '%architechture%' } }
  });
  console.log(`Found ${docs.length} docs`);
  for (const doc of docs) {
    console.log(`ID: ${doc.id}, Content Length: ${doc.content ? doc.content.length : 0}`);
  }
}
test().catch(console.error).then(() => process.exit(0));
