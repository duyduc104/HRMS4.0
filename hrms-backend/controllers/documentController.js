const { Document, Employee } = require('../models');
const { Op } = require('sequelize');
const elasticService = require('../services/elasticService');
const { GoogleGenAI } = require('@google/genai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');
const { removeAccents } = require('../utils/stringUtils');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let ai;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// Ham nay dung de phan giai duong dan vat ly an toan cua file tai lieu tren he thong
// Giai thich code khong thuan: Ho tro ca thu muc bao mat moi (storage/documents) va thu muc tuong thich cu (public/uploads)
function resolveDocumentFilePath(doc) {
  const path = require('path');
  const fs = require('fs');
  if (!doc || !doc.fileUrl) return null;

  const fileName = path.basename(doc.fileUrl);

  // 1. Kiểm tra trong storage/documents (Thư mục bảo mật)
  const securePath = path.join(__dirname, '../storage/documents', fileName);
  if (fs.existsSync(securePath)) return securePath;

  // 2. Kiểm tra trong public/uploads (File cũ tương thích ngược)
  const publicPath = path.join(__dirname, '../public/uploads', fileName);
  if (fs.existsSync(publicPath)) return publicPath;

  // 3. Fallback đường dẫn tương đối
  const directPath = path.join(__dirname, '..', doc.fileUrl);
  if (fs.existsSync(directPath)) return directPath;

  return null;
}

// Ham nay dung de kiem tra quyen truy cap tai lieu cua nguoi dung
// Giai thich code khong thuan:
// - Tai lieu PUBLIC hoac nguoi dung la Admin hoac la nguoi gui (senderId) thi co toan quyen truy cap
// - Kiem tra quyen phan lop chi tiet dua tren danh sach targetEmployees, targetRoles va targetDepartments
function userCanAccessDocument(doc, user) {
  if (!doc) return false;
  if (doc.visibility === 'PUBLIC') return true;
  
  const userRole = user.role ? user.role.toLowerCase().replace(/\s+/g, '_') : 'employee';
  const userRoles = (user.roles || []).map(r => (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_'));
  const allUserRoles = [userRole, ...userRoles];
  const userDept = user.department ? user.department.toLowerCase().trim() : '';
  const userId = user.id ? user.id.toString() : '';

  if (allUserRoles.includes('admin')) return true;
  if (doc.senderId && doc.senderId.toString() === userId) return true; // Sender can always access

  const targetRoles = (doc.targetRoles || []).map(r => (typeof r === 'string' ? r : '').toLowerCase().replace(/\s+/g, '_'));
  const targetDepartments = (doc.targetDepartments || []).map(d => (typeof d === 'string' ? d : '').toLowerCase().trim());
  const targetEmployees = (doc.targetEmployees || []).map(e => (typeof e === 'object' && e ? e.id : e).toString());

  if (targetEmployees.includes(userId)) return true;
  if (targetRoles.some(r => allUserRoles.includes(r))) return true;
  if (userDept && targetDepartments.some(d => d === userDept)) return true;

  return false;
}

// Ham nay dung de trich xuat van ban thuan tu buffer tep dinh kem (ho tro PDF, DOCX, XLSX, TXT)
// Giai thich code khong thuan:
// - pdf-parse: Trich xuat van ban tu file PDF
// - mammoth: Bóc tach text thuan tu file Word DOCX
// - exceljs: Duyet qua tung sheet va tung row de noi chuoi text tu file Excel
async function extractTextFromBuffer(buffer, mimeType, fileName) {
  let extractedText = '';
  try {
    const isPDF = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isDOCX = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
    const isEXCEL = mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel' || fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
    const isTXT = mimeType === 'text/plain' || fileName.toLowerCase().endsWith('.txt');

    if (isPDF) {
      try {
        const data = await pdfParse(buffer);
        extractedText = data.text || '';
      } catch (err) {
        console.error('pdfParse error:', err.message);
      }
    } else if (isDOCX) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (isEXCEL) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          extractedText += row.values.slice(1).join(' ') + '\n';
        });
      });
    } else if (isTXT) {
      extractedText = buffer.toString('utf-8');
    }
  } catch (err) {
    console.error('Lỗi khi parse file:', err.message);
  }
  return extractedText;
}

// Ham nay dung de tao moi mot tai lieu/cong van trong he thong
// Giai thich code khong thuan:
// - Luu file vat ly vao thu muc storage/documents
// - Trich xuat noi dung text va text khong dau (contentUnaccented) de phuc vu tim kiem
// - Tu dong dong bo chi muc tai lieu len Elasticsearch (elasticService.indexDocument)
exports.createDocument = async (req, res) => {
  try {
    const {
      title,
      visibility,
      targetDepartments,
      targetRoles,
      targetEmployees,
      status,
      scheduledPublishAt,
      categoryId
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng upload một file tài liệu.' });
    }

    let { originalname, mimetype, size, buffer } = req.file;
    // Sửa lỗi font tiếng Việt cho tên file từ multer
    originalname = Buffer.from(originalname, 'latin1').toString('utf8');
    
    const path = require('path');
    const safeJsonParse = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
    };

    const fileNameOnDisk = `${Date.now()}_${originalname.replace(/\s+/g, '_')}`;
    const fileUrl = `/storage/documents/${fileNameOnDisk}`;
    const storageDir = path.join(__dirname, '../storage/documents');
    
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const absoluteFilePath = path.join(storageDir, fileNameOnDisk);

    if (buffer) {
      fs.writeFileSync(absoluteFilePath, buffer);
    }

    // Trích xuất text
    const content = await extractTextFromBuffer(buffer || (fs.existsSync(absoluteFilePath) ? fs.readFileSync(absoluteFilePath) : null), mimetype, originalname);
    const contentUnaccented = removeAccents(content);
    const titleUnaccented = removeAccents(title);

    const doc = await Document.create({
      title,
      fileName: originalname,
      fileUrl,
      mimeType: mimetype,
      size,
      content,
      contentUnaccented: `${titleUnaccented} ${contentUnaccented}`,
      visibility: visibility || 'PUBLIC',
      targetDepartments: safeJsonParse(targetDepartments),
      targetRoles: safeJsonParse(targetRoles),
      targetEmployees: safeJsonParse(targetEmployees),
      senderId: req.user.id,
      status: status || 'PUBLISHED',
      scheduledPublishAt: scheduledPublishAt || null,
      categoryId: categoryId || null,
    });

    // Đồng bộ lên Elasticsearch
    await elasticService.indexDocument(doc);

    res.status(201).json(doc);
  } catch (error) {
    console.error('Lỗi tạo document:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de lay danh sach tai lieu co phan trang va tim kiem thong minh
// Giai thich code khong thuan:
// - Loc phan quyen tai tang SQL: Nhan vien chi thay tai lieu PUBLIC, do minh tao, hoac duoc phan quyen theo Department/Role/EmployeeId
// - Tim kiem thong minh: Uu tien tim kiem toan van qua Elasticsearch, neu khong co thi fallback ve SQL LIKE khong dau
exports.getDocuments = async (req, res) => {
  try {
    const { keyword, categoryId, page, limit } = req.query;

    const userRole = req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, '_') : 'employee';
    const userRoles = (req.user.roles || []).map(r => (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_'));
    const allUserRoles = [userRole, ...userRoles];
    const isAdmin = allUserRoles.includes('admin');
    const userDept = req.user.department ? req.user.department.trim() : '';
    const userId = req.user.id ? req.user.id.toString() : '';

    let baseConditions = [];

    // Phân quyền tại tầng SQL: Chỉ query tài liệu người dùng có quyền tiếp cận
    if (!isAdmin) {
      const scopeConditions = [
        { visibility: 'PUBLIC' },
        { senderId: userId }
      ];

      if (userDept) {
        scopeConditions.push({ targetDepartments: { [Op.like]: `%"${userDept}"%` } });
        scopeConditions.push({ targetDepartments: { [Op.like]: `%${userDept}%` } });
      }

      for (const r of allUserRoles) {
        if (r) {
          scopeConditions.push({ targetRoles: { [Op.like]: `%"${r}"%` } });
          scopeConditions.push({ targetRoles: { [Op.like]: `%${r}%` } });
        }
      }

      if (userId) {
        scopeConditions.push({ targetEmployees: { [Op.like]: `%"${userId}"%` } });
        scopeConditions.push({ targetEmployees: { [Op.like]: `%${userId}%` } });
      }

      baseConditions.push({ [Op.or]: scopeConditions });
    }

    if (categoryId) {
      baseConditions.push({ categoryId });
    }

    if (keyword) {
      // 1. Tìm kiếm bằng Elasticsearch
      const matchedIds = await elasticService.searchDocuments(keyword);
      
      if (matchedIds && matchedIds.length > 0) {
        baseConditions.push({ id: { [Op.in]: matchedIds } });
      } else {
        // Fallback về SQL Like
        const cleanKeyword = removeAccents(keyword);
        baseConditions.push({
          [Op.or]: [
            { title: { [Op.like]: `%${keyword}%` } },
            { contentUnaccented: { [Op.like]: `%${cleanKeyword}%` } }
          ]
        });
      }
    }

    const where = baseConditions.length > 0 ? { [Op.and]: baseConditions } : {};

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const isPaginated = !isNaN(pageNum) && pageNum > 0 && !isNaN(limitNum) && limitNum > 0;

    const queryOptions = {
      where,
      include: [
        { model: Employee, as: 'sender', attributes: ['id', 'fullName', 'email', 'department'] }
      ],
      order: [['createdAt', 'DESC']]
    };

    if (isPaginated) {
      queryOptions.limit = limitNum;
      queryOptions.offset = (pageNum - 1) * limitNum;
      const { rows, count } = await Document.findAndCountAll(queryOptions);
      const filteredRows = rows.filter(doc => userCanAccessDocument(doc, req.user));
      return res.json({
        items: filteredRows,
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      });
    }

    const docs = await Document.findAll(queryOptions);
    const accessibleDocs = docs.filter(doc => userCanAccessDocument(doc, req.user));
    res.json(accessibleDocs);
  } catch (error) {
    console.error('Lỗi lấy tài liệu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de tai file tai lieu ve may tinh
// Giai thich code khong thuan: Kiem tra ham userCanAccessDocument truoc khi cho phep res.download de dam bao khong bi lo tai lieu mat
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findByPk(id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    if (!userCanAccessDocument(doc, req.user)) {
      return res.status(403).json({ message: 'Bạn không có quyền tải tài liệu này' });
    }

    const filePath = resolveDocumentFilePath(doc);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File không tồn tại trên hệ thống lưu trữ' });
    }

    res.download(filePath, doc.fileName || path.basename(filePath));
  } catch (error) {
    console.error('Lỗi tải tài liệu:', error);
    res.status(500).json({ message: 'Lỗi server khi tải tài liệu', error: error.message });
  }
};

// Ham nay dung de xem truc tuyen file tai lieu (PDF, anh) tren trinh duyet
// Giai thich code khong thuan: Kiem tra quyen truy cap va su dung fs.createReadStream().pipe(res) voi Content-Disposition: inline
exports.previewDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findByPk(id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    if (!userCanAccessDocument(doc, req.user)) {
      return res.status(403).json({ message: 'Bạn không có quyền xem tài liệu này' });
    }

    const filePath = resolveDocumentFilePath(doc);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File không tồn tại trên hệ thống lưu trữ' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName || 'document')}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Lỗi preview tài liệu:', error);
    res.status(500).json({ message: 'Lỗi server khi xem tài liệu', error: error.message });
  }
};

// Ham nay dung de lay thong tin chi tiet cua mot tai lieu va tu dong tang so luot xem (viewCount)
exports.viewDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findByPk(id, {
      include: [{ model: Employee, as: 'sender', attributes: ['id', 'fullName', 'department'] }]
    });

    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    if (!userCanAccessDocument(doc, req.user)) {
      return res.status(403).json({ message: 'Bạn không có quyền xem tài liệu này.' });
    }

    await doc.increment('viewCount', { by: 1 });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de hoi dap truc tiep voi noi dung tai lieu su dung Google Gemini AI (RAG tren tai lieu)
// Giai thich code khong thuan:
// - Dua noi dung text trich xuat cua tai lieu vao System Instruction
// - Yeu cau AI tra loi bang Markdown va chi dua vao thong tin co trong tai lieu, khong duoc bia dat
exports.askAIDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, history = [] } = req.body;

    if (!question) return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.' });

    const doc = await Document.findByPk(id, {
      include: [{ model: Employee, as: 'sender', attributes: ['id', 'fullName'] }]
    });

    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    if (!userCanAccessDocument(doc, req.user)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập.' });
    }

    if (!ai) return res.json({ answer: 'AI chưa được cấu hình (Thiếu API Key).' });

    const systemPrompt = `Bạn là Trợ lý AI chuyên nghiệp thuộc Hệ thống Quản lý Tài Liệu HRMS.
Nhiệm vụ của bạn là giải đáp thắc mắc dựa TRỰC TIẾP và DUY NHẤT trên nội dung tài liệu sau.

THÔNG TIN TÀI LIỆU:
- Tiêu đề: ${doc.title}
- NỘI DUNG VĂN BẢN TRÍCH XUẤT:
${doc.content || 'Nội dung chưa trích xuất đủ, hãy giải đáp dựa trên thông tin sẵn có.'}

YÊU CẦU TRÌNH BÀY (RẤT QUAN TRỌNG):
1. BẮT BUỘC sử dụng Markdown để định dạng câu trả lời cho đẹp mắt.
2. Dùng bullet points (- hoặc 1. 2.) để liệt kê.
3. In đậm (**chữ đậm**) các từ khóa quan trọng hoặc tiêu đề phụ.
4. Trả lời súc tích, đi thẳng vào trọng tâm câu hỏi.
5. Nếu tài liệu không có thông tin để trả lời, hãy nói rõ: "Rất tiếc, tài liệu này không đề cập đến thông tin bạn hỏi." (Không bịa đặt thông tin).`;

    let formattedHistory = [];
    if (Array.isArray(history)) {
      formattedHistory = history
        .filter(m => m.sender === 'user' || m.sender === 'ai' || m.role === 'user' || m.role === 'model')
        .map(m => ({
          role: (m.sender === 'user' || m.role === 'user') ? 'user' : 'model',
          parts: [{ text: m.text || m.content || '' }]
        }));
    }

    const chat = ai.chats.create({
      model: AI_MODEL,
      history: formattedHistory,
      config: {
        systemInstruction: systemPrompt
      }
    });

    const response = await chat.sendMessage({ message: question });

    res.json({ answer: response.text });
  } catch (error) {
    console.error('Lỗi hỏi AI tài liệu:', error);
    res.status(500).json({ message: 'Lỗi server khi hỏi AI', error: error.message });
  }
};

// Ham nay dung de xoa tai lieu khoi he thong
// Giai thich code khong thuan: Kiem tra quyen Admin hoac chu so huu tai lieu, xoa file vat ly tren disk va xoa index tren Elasticsearch
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findByPk(id);
    
    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    }

    const userRole = req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, '_') : 'employee';
    const userRoles = (req.user.roles || []).map(r => (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_'));
    const allUserRoles = [userRole, ...userRoles];
    const isAdmin = allUserRoles.includes('admin') || allUserRoles.includes('hr_manager');
    const isOwner = doc.senderId && doc.senderId.toString() === req.user.id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa tài liệu này' });
    }

    const filePath = resolveDocumentFilePath(doc);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.error('Lỗi xóa file vật lý:', unlinkErr.message);
      }
    }

    try {
      await elasticService.deleteDocument(doc.id);
    } catch (e) {
      console.log('Lỗi xóa document khỏi elasticsearch', e.message);
    }

    await doc.destroy();
    res.json({ message: 'Xóa tài liệu thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
