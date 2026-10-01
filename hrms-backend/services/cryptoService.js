const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const ALGORITHM = 'aes-256-cbc';

class CryptoService {
  static encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted.toString('hex') 
    }
  }

  static decrypt(encrypteData, iv) {
    if (!encrypteData || !iv) return null;
    try {
      const ivBuffer = Buffer.from(iv, 'hex');
      const dataBuffer = Buffer.from(encrypteData, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), ivBuffer);
      let decrypted = decipher.update(dataBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error('Error decrypting data:', error.message);
      return null;
    }
  }
}

module.exports = CryptoService;







