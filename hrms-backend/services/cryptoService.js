const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const ALGORITHM = 'aes-256-cbc';

class CryptoService {
  // Ham nay dung de ma hoa chuoi van ban (nhu vector khuon mat hoac du lieu nhay cam) bang thuat toan AES-256-CBC
  // Giai thich code khong thuan:
  // - Sinh ngau nhien Initialization Vector (IV) 16 bytes dam bao tinh doc nhat cho moi lan ma hoa
  // - cipher.update va cipher.final de thuc hien ma hoa khoi (block cipher) theo chuan CBC
  // - Ket qua tra ve gom iv dang hex va encryptedData dang hex
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

  // Ham nay dung de giai ma du lieu hex ve lai chuoi van ban goc
  // Giai thich code khong thuan:
  // - Chuyen doi chuoi iv va du lieu hex thanh Buffer
  // - Khoi tao decipher voi cung thuat toan AES-256-CBC va khoa bi mat ENCRYPTION_KEY
  // - Tra ve chuoi van ban goc hoac null neu giai ma that bai
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







