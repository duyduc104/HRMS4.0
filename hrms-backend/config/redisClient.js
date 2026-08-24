const redis = require('redis');

// Khởi tạo client kết nối đến Redis server (mặc định localhost:6379)
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => console.log('❌ Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Đã kết nối tới Redis Server'));

// Kết nối
redisClient.connect().catch(console.error);

module.exports = redisClient;
