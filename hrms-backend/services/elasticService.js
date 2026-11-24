const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://127.0.0.1:9200',
  // Nếu bật security trên production, thêm auth: { username, password } hoặc tls config ở đây
});

// Service tich hop cong cu tim kiem toan van Full-text Search Elasticsearch
// Giai thich code khong thuan:
// - Su dung Elasticsearch Client de index noi dung tai lieu noi bo (PDF, Docx, Excel sau khi parse text).
// - multi_match query ket hop boost trong so: Tieu de duoc nhan diem uu tien cao nhat (title^3), noi dung khong dau (contentUnaccented^2).
// - fuzziness AUTO: Ap dung thuat toan Levenshtein Distance cho phep tim dung ket qua ngay ca khi nguoi dung go sai chinh ta 1-2 ky tu.

// Ham nay dung de kiem tra trang thai ket noi toi cum cluster Elasticsearch
const checkConnection = async () => {
  try {
    const health = await client.cluster.health({});
    console.log(`✅ Elasticsearch Connected! Cluster Status: ${health.status}`);
  } catch (error) {
    console.error('❌ Elasticsearch Connection Error:', error.message);
  }
};

// Ham nay dung de tu dong khoi tao index "documents" voi schema mapping kieu du lieu neu chua ton tai
const createIndexes = async () => {
  try {
    const indexExists = await client.indices.exists({ index: 'documents' });
    if (!indexExists) {
      await client.indices.create({
        index: 'documents',
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: { type: 'text' },
              content: { type: 'text' }, // Mac dinh standard analyzer
              contentUnaccented: { type: 'text' },
              categoryId: { type: 'integer' },
              senderId: { type: 'integer' }
            }
          }
        }
      });
      console.log('✅ Index "documents" created successfully');
    }
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
};

// Ham nay dung de dong bo va luu tru du lieu tai lieu vao Elasticsearch kem lam moi chi muc (refresh)
const indexDocument = async (doc) => {
  try {
    await client.index({
      index: 'documents',
      id: doc.id.toString(),
      document: {
        id: doc.id,
        title: doc.title,
        content: doc.content || '',
        contentUnaccented: doc.contentUnaccented || '',
        categoryId: doc.categoryId,
        senderId: doc.senderId
      }
    });
    // Refresh index de ket qua search co ngay lap tuc
    await client.indices.refresh({ index: 'documents' });
  } catch (error) {
    console.error(`❌ Error indexing document ${doc.id}:`, error.message);
  }
};

// Ham nay dung de tim kiem tai lieu toan van theo tu khoa, ho tro do khop gan dung (fuzzy) va tra ve danh sach ID tai lieu
const searchDocuments = async (keyword) => {
  try {
    // Tim kiem trong title, content va contentUnaccented
    const result = await client.search({
      index: 'documents',
      body: {
        query: {
          multi_match: {
            query: keyword,
            fields: ['title^3', 'content', 'contentUnaccented^2'], // title duoc uu tien diem cao hon (boost: 3)
            fuzziness: 'AUTO' // Cho phep sai chinh ta nhe
          }
        },
        _source: ['id'] // Chi lay ID de toi uu hieu nang
      }
    });
    
    // Trich xuat danh sach ID tu hits
    const hits = result.hits.hits;
    return hits.map(hit => hit._source.id);
  } catch (error) {
    console.error('❌ Error searching documents:', error.message);
    return [];
  }
};

module.exports = {
  client,
  checkConnection,
  createIndexes,
  indexDocument,
  searchDocuments
};
