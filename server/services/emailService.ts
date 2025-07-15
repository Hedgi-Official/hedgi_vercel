import nodemailer from 'nodemailer';
import { createHash } from 'crypto';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      const resetUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://hedgi.replit.app'}/confirm-reset?token=${resetToken}`;
      
      const mailOptions = {
        from: 'hjalmar@hedgi.ai',
        to: email,
        subject: 'Reset Your Hedgi Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Hedgi Password</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background: #f8fafc; }
              .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reset Your Password</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password for your Hedgi account. Click the button below to reset your password:</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>If you didn't request this password reset, please ignore this email. Your password will not be changed.</p>
                <p>This link will expire in 1 hour for security reasons.</p>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              </div>
              <div class="footer">
                <p>© 2025 Hedgi. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('[Email Service] Password reset email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('[Email Service] Error sending email:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('[Email Service] SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('[Email Service] SMTP connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();