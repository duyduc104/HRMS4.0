const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../public/uploads/temp');
const ATTACH_DIR = path.join(__dirname, '../public/uploads/attachments');

// Controller xu ly tai len file dung luong lon theo co che chia nho manh (Chunk Upload)
// Giai thich code khong thuan:
// - Ap dung ky thuat Chunked Upload: file lon duoc cat thanh nhieu manh nho o Frontend va gui doc lap len Backend de tranh tran RAM va timeout mang.
// - mergeChunks su dung Node.js WriteStream de noi tuan tu tung block du lieu nhi phan vao file dich, sau do tu dong xoa bo cac chunk tam de tiet kiem dung luong o dia.

// Tao thu muc neu chua ton tai
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(ATTACH_DIR)) fs.mkdirSync(ATTACH_DIR, { recursive: true });

// Ham nay dung de tiep nhan va luu tung manh file chunk vao thu muc tam rieng biet theo fileId
exports.uploadChunk = (req, res) => {
  try {
    const { fileId, chunkIndex } = req.body;
    const chunk = req.file;

    if (!fileId || chunkIndex === undefined || !chunk) {
      return res.status(400).json({ message: 'Thiếu dữ liệu chunk.' });
    }

    // Tao thu muc rieng cho tung file (neu nhieu nguoi cung up)
    const fileDir = path.join(TEMP_DIR, fileId);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Di chuyen file chunk vao dung thu muc
    const chunkPath = path.join(fileDir, `${chunkIndex}`);
    fs.renameSync(chunk.path, chunkPath);

    res.json({ message: `Đã tải lên chunk ${chunkIndex}` });
  } catch (error) {
    console.error('Lỗi upload chunk:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de ghep noi toan bo cac manh chunk lai thanh 1 file hoan chinh bang Stream va xoa sach thu muc tam
exports.mergeChunks = async (req, res) => {
  try {
    const { fileId, fileName, totalChunks } = req.body;

    if (!fileId || !fileName || !totalChunks) {
      return res.status(400).json({ message: 'Thiếu tham số để ghép file.' });
    }

    const fileDir = path.join(TEMP_DIR, fileId);
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const finalFilePath = path.join(ATTACH_DIR, safeFileName);
    
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(fileDir, `${i}`);
      
      if (!fs.existsSync(chunkPath)) {
        writeStream.end();
        return res.status(400).json({ message: `Thiếu chunk ${i}. Vui lòng thử lại.` });
      }

      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);
      
      // Xoa chunk sau khi gop
      fs.unlinkSync(chunkPath);
    }

    writeStream.end();

    // Xoa thu muc tam
    if (fs.existsSync(fileDir)) {
      fs.rmdirSync(fileDir);
    }

    // Tra ve ket qua duong dan an toan (de gui nodemailer)
    res.json({ 
      message: 'Ghép file thành công', 
      file: {
        filename: fileName,
        path: finalFilePath,
        url: `/uploads/attachments/${safeFileName}`
      }
    });

  } catch (error) {
    console.error('Lỗi merge chunk:', error);
    res.status(500).json({ message: 'Lỗi ghép file', error: error.message });
  }
};
