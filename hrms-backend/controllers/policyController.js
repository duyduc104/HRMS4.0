const { PolicyDocument, Employee, Role } = require('../models');
const { Op } = require('sequelize');
const { GoogleGenAI } = require('@google/genai');
const emailService = require('../services/emailService');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');

const apiKey = process.env.GEMINI_API_KEY;
const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let ai;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// Ham nay dung de kiem tra xem mot nhan vien co quyen xem chinh sach/quy dinh nay hay khong dua tren targetRoles
function userCanAccessPolicy(policy, userRole, userRoles = []) {
  if (userRole === 'admin' || userRoles.includes('admin')) return true;
  
  const targetRoles = policy.targetRoles || ["ALL"];
  if (targetRoles.includes("ALL")) return true;
  
  const normalizedUserRoles = [userRole, ...userRoles].map(r => r ? r.toLowerCase().replace(/\s+/g, '_') : '');
  
  return targetRoles.some(r => normalizedUserRoles.includes(r.toLowerCase().replace(/\s+/g, '_')));
}

// Ham nay dung de lay danh sach cac chinh sach, quy che noi bo cua cong ty
// Giai thich code khong thuan: Admin/HR xem duoc tat ca, con nhan vien thuong chi xem duoc cac chinh sach da phat hanh (PUBLISHED) va phu hop voi Role cua minh
// === API Lấy danh sách chính sách (Hỗ trợ phân trang) ===
exports.getPolicies = async (req, res) => {
  try {
    const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
    const userRole = req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, '_') : 'employee';
    const userRoles = (req.user.roles || []).map(r => r.name ? r.name.toLowerCase().replace(/\s+/g, '_') : r.toLowerCase());
    const isAdminOrHR = userRole === 'admin' || userRole === 'hr_manager' || userRoles.includes('admin') || userRoles.includes('hr_manager');

    // Admin/HR có thể xem tất cả trạng thái, nhân viên chỉ xem PUBLISHED
    const whereCondition = {};
    if (!isAdminOrHR) {
      whereCondition.status = 'PUBLISHED';
    }

    const policies = await PolicyDocument.findAll({
      where: whereCondition,
      include: [
        { model: Employee, as: 'contactPerson', attributes: ['id', 'fullName', 'email', 'department', 'username'] },
        { model: Employee, as: 'createdBy', attributes: ['id', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Lọc theo quyền truy cập
    const accessiblePolicies = policies.filter(p => userCanAccessPolicy(p, userRole, userRoles));

    if (isPaginated) {
      const total = accessiblePolicies.length;
      const paginatedItems = accessiblePolicies.slice(offset, offset + limit);
      return formatPaginatedResponse(res, total, paginatedItems, page, limit);
    }

    res.json(accessiblePolicies);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách chính sách:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de tao moi mot chinh sach/quy dinh noi bo trong cong ty
// Giai thich code khong thuan:
// - Ho tro hen gio phat hanh tu dong (neu scheduledPublishAt > now thi trang thai la SCHEDULED, nguoc lai la PUBLISHED)
// - Neu phat hanh ngay, tu dong ban socket realtime 'new_policy_announcement' va goi ham gui email hang loat
// === API Tạo chính sách mới ===
exports.createPolicy = async (req, res) => {
  try {
    const { 
      title, 
      category, 
      description, 
      content, 
      fileUrl, 
      fileName, 
      contactEmployeeId, 
      targetRoles, 
      scheduledPublishAt 
    } = req.body;

    let status = 'PUBLISHED';
    const now = new Date();
    if (scheduledPublishAt && new Date(scheduledPublishAt) > now) {
      status = 'SCHEDULED';
    }

    const policy = await PolicyDocument.create({
      title,
      category: category || 'POLICY',
      description,
      content,
      fileUrl,
      fileName,
      contactEmployeeId: contactEmployeeId || null,
      targetRoles: targetRoles || ["ALL"],
      scheduledPublishAt: scheduledPublishAt || null,
      status,
      createdById: req.user.id
    });

    const fullPolicy = await PolicyDocument.findByPk(policy.id, {
      include: [
        { model: Employee, as: 'contactPerson', attributes: ['id', 'fullName', 'email', 'department', 'username'] },
        { model: Employee, as: 'createdBy', attributes: ['id', 'fullName'] }
      ]
    });

    // Nếu phát hành ngay -> Gửi thông báo Socket.io & Email
    if (status === 'PUBLISHED') {
      const io = req.app.get('io');
      if (io) {
        io.emit('new_policy_announcement', {
          policy: fullPolicy,
          message: `📢 THÔNG BÁO MỚI: ${fullPolicy.title}`
        });
      }

      // Gửi Email thông báo bất đồng bộ
      exports.sendPolicyNotificationEmails(fullPolicy).catch(console.error);
    }

    res.status(201).json(fullPolicy);
  } catch (error) {
    console.error('Lỗi khi tạo chính sách:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de cap nhat noi dung chinh sach
// Giai thich code khong thuan: Neu chinh sach chuyen tu DRAFT/SCHEDULED sang PUBLISHED, tu dong kich hoat ban socket va gui email thong bao
// === API Cập nhật chính sách ===
exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await PolicyDocument.findByPk(id);
    if (!policy) return res.status(404).json({ message: 'Không tìm thấy chính sách' });

    const previousStatus = policy.status;
    await policy.update(req.body);

    const fullPolicy = await PolicyDocument.findByPk(policy.id, {
      include: [
        { model: Employee, as: 'contactPerson', attributes: ['id', 'fullName', 'email', 'department', 'username'] },
        { model: Employee, as: 'createdBy', attributes: ['id', 'fullName'] }
      ]
    });

    // Nếu vừa mới chuyển sang PUBLISHED -> Bắn Socket & Email
    if (previousStatus !== 'PUBLISHED' && fullPolicy.status === 'PUBLISHED') {
      const io = req.app.get('io');
      if (io) {
        io.emit('new_policy_announcement', {
          policy: fullPolicy,
          message: `📢 THÔNG BÁO MỚI: ${fullPolicy.title}`
        });
      }
      exports.sendPolicyNotificationEmails(fullPolicy).catch(console.error);
    }

    res.json(fullPolicy);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de xoa mot chinh sach khoi he thong
// === API Xóa chính sách ===
exports.deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await PolicyDocument.findByPk(id);
    if (!policy) return res.status(404).json({ message: 'Không tìm thấy chính sách' });

    await policy.destroy();
    res.json({ message: 'Đã xóa chính sách thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de hoi dap truc tiep ve mot chinh sach cu the su dung Google Gemini AI (RAG tren noi dung quy dinh)
// Giai thich code khong thuan: Kiem tra quyen truy cap policy, truyen toan bo noi dung van ban vao System Instruction de AI tra loi chuan xac
// === API Hỏi AI Chatbot theo Role về 1 Chính sách cụ thể ===
exports.askAIPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, history = [] } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.' });
    }

    const policy = await PolicyDocument.findByPk(id, {
      include: [
        { model: Employee, as: 'contactPerson', attributes: ['id', 'fullName', 'email', 'department'] }
      ]
    });

    if (!policy) {
      return res.status(404).json({ message: 'Không tìm thấy chính sách / tài liệu này.' });
    }

    // Kiểm tra quyền truy cập theo Role
    const userRole = req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, '_') : 'employee';
    const userRoles = (req.user.roles || []).map(r => r.name ? r.name.toLowerCase().replace(/\s+/g, '_') : r.toLowerCase());

    if (!userCanAccessPolicy(policy, userRole, userRoles)) {
      return res.status(403).json({ 
        message: 'Bạn không có quyền truy cập hoặc hỏi đáp về tài liệu chính sách này.' 
      });
    }

    if (!ai) {
      return res.json({ 
        answer: 'Hệ thống AI chưa được cấu hình API Key. Vui lòng liên hệ Admin để cấu hình GEMINI_API_KEY.' 
      });
    }

    const systemPrompt = `Bạn là Chuyên gia Tư vấn Chính sách Doanh nghiệp của HRMS.
Nhiệm vụ của bạn là giải đáp thắc mắc của nhân viên dựa TRỰC TIẾP trên tài liệu chính sách được cung cấp dưới đây.

THÔNG TIN TÀI LIỆU CHÍNH SÁCH:
- Tiêu đề: ${policy.title}
- Danh mục: ${policy.category}
- Mô tả: ${policy.description || 'Không có'}
- Người phụ trách giải đáp: ${policy.contactPerson ? `${policy.contactPerson.fullName} (${policy.contactPerson.email})` : 'Phòng Nhân sự'}
- NỘI DUNG VĂN BẢN CHI TIẾT:
${policy.content || policy.description || 'Nội dung văn bản chưa trích xuất đủ, hãy giải đáp dựa trên thông tin sẵn có.'}

YÊU CẦU:
1. Trả lời chính xác, ngắn gọn, thân thiện và lịch sự bằng tiếng Việt.
2. Nếu trong văn bản không nhắc tới thông tin câu hỏi, hãy nói rõ: "Tài liệu này không đề cập tới thông tin trên. Bạn có thể liên hệ trực tiếp với người phụ trách: ${policy.contactPerson ? policy.contactPerson.fullName : 'Phòng HR'} để được giải đáp."
3. Trình bày đẹp mắt với Markdown format (bullet points, bold text).`;

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

    const answer = response.text || 'Không thể tạo phản hồi từ AI lúc này.';

    res.json({ 
      answer,
      contactPerson: policy.contactPerson
    });
  } catch (error) {
    console.error('Lỗi khi hỏi AI về chính sách:', error);
    res.status(500).json({ message: 'Lỗi server khi hỏi AI', error: error.message });
  }
};

// Ham nay dung de gui email thong bao ve chinh sach moi toi toan bo nhan vien hoac theo targetRoles
// Giai thich code khong thuan: Loc danh sach email nhan vien thoa man targetRoles, render template HTML va gui qua emailService
// === HÀM GỬI EMAIL THÔNG BÁO CHÍNH SÁCH ===
exports.sendPolicyNotificationEmails = async (policy) => {
  try {
    const targetRoles = policy.targetRoles || ["ALL"];
    
    let employees = [];
    if (targetRoles.includes("ALL")) {
      employees = await Employee.findAll({ 
        where: { isDeleted: false, email: { [Op.ne]: null } },
        attributes: ['id', 'fullName', 'email']
      });
    } else {
      const allTargetedEmps = await Employee.findAll({
        where: { isDeleted: false, email: { [Op.ne]: null } },
        attributes: ['id', 'fullName', 'email'],
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['name']
        }]
      });
      employees = allTargetedEmps.filter(e => {
        const empRoles = (e.roles || []).map(r => r.name.toLowerCase().replace(/\s+/g, '_'));
        if (empRoles.length === 0) empRoles.push('employee');
        return targetRoles.some(tr => empRoles.includes(tr.toLowerCase().replace(/\s+/g, '_')));
      });
    }

    const emailSubject = `[HRMS Thông Báo] ${policy.title}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #4f46e5; border-b: 2px solid #4f46e5; padding-bottom: 8px;">📢 THÔNG BÁO MỚI TỪ CÔNG TY</h2>
        <p>Xin chào,</p>
        <p>Công ty vừa công bố một <strong>tài liệu / chính sách / sự kiện mới</strong> dành cho bạn:</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #6366f1; margin: 15px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #1e1b4b;">${policy.title}</h3>
          <p><strong>Mô tả:</strong> ${policy.description || 'Vui lòng truy cập hệ thống để xem chi tiết.'}</p>
          <p><strong>Người phụ trách giải đáp:</strong> ${policy.contactPerson ? policy.contactPerson.fullName : 'Phòng HR'}</p>
        </div>

        <p>Bạn có thể đăng nhập vào hệ thống HRMS để <strong>xem toàn bộ tài liệu</strong> và <strong>hỏi đáp trực tiếp với Trợ lý AI</strong> về chính sách này.</p>
        
        <div style="text-align: center; margin-top: 25px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/policies" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Xem Chi Tiết Chính Sách</a>
        </div>
      </div>
    `;

    for (const emp of employees) {
      if (emp.email) {
        await emailService.sendEmail(emp.email, emailSubject, emailBody).catch(err => {
          console.error(`Lỗi gửi mail chính sách tới ${emp.email}:`, err.message);
        });
      }
    }
    console.log(`[Policy Email] Đã hoàn tất gửi email thông báo chính sách "${policy.title}" tới ${employees.length} nhân viên.`);
  } catch (err) {
    console.error('Lỗi trong sendPolicyNotificationEmails:', err);
  }
};

// Ham nay dung de trich xuat van ban tu anh/tai lieu bang cong nghe Gemini Multimodal AI OCR
// Giai thich code khong thuan: Nhan anh dang base64, gui vao mo hinh Gemini Vision de doc chu tieng Viet giu nguyen dinh dang
// === API TRÍCH XUẤT VĂN BẢN TỪ FILE / ẢNH (PNG, JPG, PDF, TXT) BẰNG AI OCR ===
exports.extractText = async (req, res) => {
  try {
    const { imageBase64, mimeType, fileName } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ message: 'Thiếu dữ liệu file/ảnh.' });
    }

    if (!ai) {
      return res.status(400).json({ message: 'Chưa cấu hình GEMINI_API_KEY để OCR trích xuất chữ.' });
    }

    const isImage = mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(fileName || '');

    if (isImage) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: cleanBase64
            }
          },
          "Hãy đọc và trích xuất TOÀN BỘ chữ/văn bản có trong bức ảnh chính sách, quy định hoặc thông báo này một cách chính xác, giữ nguyên cấu trúc dòng và đầy đủ chi tiết bằng tiếng Việt."
        ]
      });

      const extractedText = response.text || '';
      return res.json({ 
        extractedText,
        message: 'Trích xuất văn bản từ ảnh bằng Gemini AI OCR thành công!' 
      });
    }

    res.json({ extractedText: '', message: 'File đã nhận' });
  } catch (error) {
    console.error('Lỗi trích xuất văn bản từ ảnh bằng AI OCR:', error);
    res.status(500).json({ message: 'Lỗi khi trích xuất chữ từ ảnh bằng AI', error: error.message });
  }
};
