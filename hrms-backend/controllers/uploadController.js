const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../public/uploads/temp');
const ATTACH_DIR = path.join(__dirname, '../public/uploads/attachments');

// Tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(ATTACH_DIR)) fs.mkdirSync(ATTACH_DIR, { recursive: true });

exports.uploadChunk = (req, res) => {
  try {
    const { fileId, chunkIndex } = req.body;
    const chunk = req.file;

    if (!fileId || chunkIndex === undefined || !chunk) {
      return res.status(400).json({ message: 'Thiếu dữ liệu chunk.' });
    }

    // Tạo thư mục riêng cho từng file (nếu nhiều người cùng up)
    const fileDir = path.join(TEMP_DIR, fileId);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Di chuyển file chunk vào đúng thư mục
    const chunkPath = path.join(fileDir, `${chunkIndex}`);
    fs.renameSync(chunk.path, chunkPath);

    res.json({ message: `Đã tải lên chunk ${chunkIndex}` });
  } catch (error) {
    console.error('Lỗi upload chunk:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

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
      
      // Xóa chunk sau khi gộp
      fs.unlinkSync(chunkPath);
    }

    writeStream.end();

    // Xóa thư mục tạm
    if (fs.existsSync(fileDir)) {
      fs.rmdirSync(fileDir);
    }

    // Trả về kết quả đường dẫn an toàn (để gửi nodemailer)
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
