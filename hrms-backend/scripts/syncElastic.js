require('dotenv').config();
const { sequelize, Document } = require('../models');
const { checkConnection, createIndexes, indexDocument } = require('../services/elasticService');

const syncDocuments = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to SQL Server');

    await checkConnection();
    await createIndexes();

    console.log('⏳ Đang lấy dữ liệu từ bảng Documents...');
    const documents = await Document.findAll();
    console.log(`Tìm thấy ${documents.length} tài liệu. Bắt đầu đồng bộ lên Elasticsearch...`);

    let count = 0;
    for (const doc of documents) {
      await indexDocument(doc);
      count++;
      if (count % 10 === 0) {
        console.log(`🔄 Đã đồng bộ ${count}/${documents.length} tài liệu...`);
      }
    }

    console.log(`🎉 Đã đồng bộ thành công ${count} tài liệu lên Elasticsearch!`);
  } catch (error) {
    console.error('❌ Quá trình đồng bộ thất bại:', error);
  } finally {
    process.exit(0);
  }
};

syncDocuments();
