import nodemailer from 'nodemailer';

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.HEDGI_APP_SECRET,
  },
});

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using the configured transporter
 * @param params - Email parameters
 * @returns Promise<boolean> - Success status
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER || 'hjalmar@hedgi.ai',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Generate password reset email HTML template
 * @param resetLink - The password reset link
 * @param language - Language for the email (en or pt-BR)
 * @returns HTML string
 */
export function generatePasswordResetEmailHTML(resetLink: string, language: string = 'en'): string {
  const isPortuguese = language === 'pt-BR';
  
  const translations = {
    subject: isPortuguese ? 'Redefinir sua senha - Hedgi' : 'Reset your password - Hedgi',
    greeting: isPortuguese ? 'Olá' : 'Hello',
    resetText: isPortuguese 
      ? 'Você solicitou uma redefinição de senha para sua conta Hedgi. Clique no botão abaixo para criar uma nova senha:'
      : 'You requested a password reset for your Hedgi account. Click the button below to create a new password:',
    buttonText: isPortuguese ? 'Redefinir Senha' : 'Reset Password',
    expireText: isPortuguese 
      ? 'Este link expirará em 1 hora por motivos de segurança.'
      : 'This link will expire in 1 hour for security reasons.',
    noRequestText: isPortuguese 
      ? 'Se você não solicitou uma redefinição de senha, ignore este email com segurança.'
      : 'If you did not request a password reset, you can safely ignore this email.',
    supportText: isPortuguese 
      ? 'Se você tiver alguma dúvida, entre em contato conosco em'
      : 'If you have any questions, please contact us at',
    regards: isPortuguese ? 'Atenciosamente' : 'Best regards',
    team: isPortuguese ? 'Equipe Hedgi' : 'The Hedgi Team'
  };

  return `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${translations.subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #2563eb;
          font-size: 28px;
          margin: 0;
          font-weight: 700;
        }
        .reset-button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .reset-button:hover {
          background-color: #1d4ed8;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>Hedgi</h1>
        </div>
        
        <p>${translations.greeting},</p>
        
        <p>${translations.resetText}</p>
        
        <div class="button-container">
          <a href="${resetLink}" class="reset-button">${translations.buttonText}</a>
        </div>
        
        <div class="warning">
          <strong>⚠️ ${translations.expireText}</strong>
        </div>
        
        <p>${translations.noRequestText}</p>
        
        <div class="footer">
          <p>${translations.supportText} <a href="mailto:hjalmar@hedgi.ai">hjalmar@hedgi.ai</a></p>
          <p>${translations.regards},<br>${translations.team}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

