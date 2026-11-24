const { AdvanceRequest, Employee, Payroll } = require('../models');

class SepayController {
  // Ham nay dung de tiep nhan va xu ly webhook bien dong so du ngan hang tu cong thanh toan SePay (hoac simulator test)
  // Giai thich code khong thuan:
  // - Xac thuc chu ky API Token qua Authorization: Bearer <SEPAY_WEBHOOK_TOKEN> de phong chong request gia mao
  // - Chi xu ly giao dich transferType === 'out' (cong ty chuyen khoan ra de giai ngan)
  // - Dung bieu thuc chinh quy (Regex) bóc tach ma don:
  //   + /TU(\d+)/i: Ma don tam ung (vi du TU105), tu dong danh dau isPaid = true va ghi nhan paymentDate
  //   + /L(\d+)/i: Ma bang luong (vi du L201), tu dong danh dau status = 'Paid'
  // - Ban su kien Socket.io realtime 'advance_payment_success' va 'payroll_payment_success' den client cua nhan vien
  static async handleWebhook(req, res) {
    try {
      // Xác thực API Token từ SePay (Lấy từ Header Authorization: Bearer <TOKEN>)
      // Cho phép bypass nếu là môi trường mô phỏng (Simulator từ Frontend gửi cờ isSimulation)
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.SEPAY_WEBHOOK_TOKEN;
      const isSimulation = req.body.isSimulation === true;

      if (expectedToken && !isSimulation) {
        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedToken) {
          return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API Token' });
        }
      }

      // payload giả định: { transferType: 'out', transferAmount: 5000000, content: 'TU123', ... }
      const { transferType, content } = req.body;
      
      console.log('[SePay Webhook] Received:', req.body);

      // Chỉ quan tâm tiền xuất ra (Outbound) đối với Giải ngân
      if (transferType === 'out' && content) {
        // Tìm chữ "TU" và lấy ID phía sau
        const match = content.match(/TU(\d+)/i);
        if (match && match[1]) {
          const advanceId = parseInt(match[1], 10);
          
          const request = await AdvanceRequest.findByPk(advanceId, {
            include: [{ model: Employee, as: 'employee' }]
          });

          // Kiểm tra nếu đơn đang ở trạng thái Approved và chưa Paid
          if (request && request.status === 'Approved' && !request.isPaid) {
            await request.update({
              isPaid: true,
              paymentDate: new Date()
            });

            console.log(`[SePay Webhook] Đã giải ngân thành công cho AdvanceRequest ID ${advanceId}`);

            // Gửi Socket io tới employee
            const io = req.app.get('io');
            if (io && request.employeeId) {
              io.to(request.employeeId.toString()).emit('advance_payment_success', {
                message: `Ting ting! Kế toán đã chuyển khoản giải ngân ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(request.amount)} cho Tạm ứng Tháng ${request.periodMonth}/${request.periodYear}. Vui lòng kiểm tra tài khoản!`,
                requestId: advanceId
              });
            }
          }
        }

        // Tìm chữ "L" và lấy ID phía sau cho phần Thanh toán Lương
        const matchPayroll = content.match(/L(\d+)/i);
        if (matchPayroll && matchPayroll[1]) {
          const payrollId = parseInt(matchPayroll[1], 10);
          
          const payroll = await Payroll.findByPk(payrollId, {
            include: [{ model: Employee, as: 'employee' }]
          });

          // Kiểm tra nếu lương đang ở trạng thái Approved
          if (payroll && payroll.status === 'Approved') {
            await payroll.update({
              status: 'Paid',
              paymentDate: new Date()
            });

            console.log(`[SePay Webhook] Đã thanh toán lương thành công cho Payroll ID ${payrollId}`);

            // Gửi Socket io tới employee
            const io = req.app.get('io');
            if (io && payroll.employeeId) {
              io.to(payroll.employeeId.toString()).emit('payroll_payment_success', {
                message: `Ting ting! Kế toán đã chuyển khoản thanh toán Lương Tháng ${payroll.periodMonth}/${payroll.periodYear}. Vui lòng kiểm tra tài khoản!`,
                payrollId: payrollId
              });
            }
          }
        }
      }

      res.status(200).json({ success: true, message: 'Webhook received successfully' });
    } catch (error) {
      console.error('[SePay Webhook] Lỗi:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = SepayController;
