const aiService = require('../services/aiService');

// Ham nay dung de phan tich doan van ban, email hoac tin nhan de phat hien dau hieu lua dao (Phishing / Scam)
// Giai thich code khong thuan: Su dung Gemini AI phan tich ngu nghia, danh gia muc do rui ro (THAP, TRUNG BINH, CAO, RAT CAO), chi ra cac Red Flags va khuyen nghi xu ly
exports.checkScamText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp văn bản cần phân tích.' });
    }

    const result = await aiService.detectScamText(text);
    if (result.error) {
      return res.status(500).json({ success: false, message: result.error });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Lỗi khi kiểm tra lừa đảo:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi kiểm tra lừa đảo.' });
  }
};

// Ham nay dung de xac thuc tinh hop le cua giay to tuy than (CCCD, Ho chieu, hoa don) va phat hien gia mao
// Giai thich code khong thuan: Gui anh base64 len mo hinh Gemini Multimodal Vision de bóc tach thong tin so the, ho ten, ngay sinh va kiem tra dau hieu chinh sua font/logo
exports.verifyDocument = async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ảnh (base64).' });
    }

    const result = await aiService.analyzeDocument(imageBase64, mimeType || 'image/jpeg');
    if (result.error) {
      return res.status(500).json({ success: false, message: result.error });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Lỗi khi kiểm tra giấy tờ:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi kiểm tra giấy tờ.' });
  }
};
