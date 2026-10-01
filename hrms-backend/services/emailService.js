const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
      user: process.env.SMTP_USER || 'test@ethereal.email',
      pass: process.env.SMTP_PASS || 'pass'
  }
});

class EmailService {
  static async sendMail(to, subject, html) {
    try {
      await transporter.sendMail({
        from: '"HRMS System" <admin@hrms.com>',
        to,
        subject,
        html
      });
      console.log(`[EmailService] Sent email to ${to}`);
      return true;
    } catch (error) {
      console.error(`[EmailService] Error sending email to ${to}:`, error);
      return false;
    }
  }
}

module.exports = EmailService;
