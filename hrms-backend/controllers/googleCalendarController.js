const { google } = require('googleapis');
const { Employee } = require('../models');

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/events/google/callback';

// Các thông tin này người dùng sẽ điền vào .env sau
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Controller tich hop Google Calendar thong qua OAuth 2.0
// Giai thich code khong thuan:
// - Su dung thu vien official googleapis de thuc hien quy trinh OAuth 2.0 Authorization Code Flow.
// - scopes bao gom doc va tao su kien tren Google Calendar (calendar.events).
// - Luu googleRefreshToken vao bang Employee de he thong tu dong lam moi accessToken khi tao lich hop tu dong qua API ma khong can bat nguoi dung dang nhap lai moi lan.

// Ham nay dung de tao URL xac thuc OAuth2 cho nguoi dung chuyen huong sang Google dang nhap va cap quyen Calendar
exports.getAuthUrl = async (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // De luon lay duoc refresh_token
      state: req.user.id // Truyen userId vao state de luc callback xac dinh duoc nhan vien nao
    });

    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo auth url', error: error.message });
  }
};

// Ham nay dung de tiep nhan callback tu Google OAuth2, doi ma code lay refresh_token va luu vao Employee
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Thiếu mã code hoặc state');

    const { tokens } = await oauth2Client.getToken(code);
    
    // state chinh la userId
    const userId = state;
    if (tokens.refresh_token) {
      await Employee.update(
        { googleRefreshToken: tokens.refresh_token },
        { where: { id: userId } }
      );
    }
    
    res.send(`
      <html>
        <body>
          <h2>Liên kết Google Calendar thành công!</h2>
          <p>Bạn có thể đóng cửa sổ này và tiếp tục tạo lịch họp trên HRMS.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Lỗi liên kết Google: ' + error.message);
  }
};

// Ham nay dung de tao Google OAuth2 client da duoc xac thuc tu refresh_token cua nhan vien de goi API tao su kien lich
exports.getAuthenticatedClient = async (userId) => {
  const emp = await Employee.findByPk(userId);
  if (!emp || !emp.googleRefreshToken) return null;
  
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  client.setCredentials({ refresh_token: emp.googleRefreshToken });
  return client;
};
