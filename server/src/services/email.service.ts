import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (host.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const from = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Velo Chat" <${process.env.SMTP_USER}>` : 'noreply@whatsapp-clone.com');

  // If credentials are empty, log to console in dev mode
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.info(`[MAIL MOCK] To: ${to} | Subject: ${subject}`);
    logger.info(`[MAIL MOCK] HTML content:\n${html}`);
    return;
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    logger.info(`Email sent successfully to ${to}`);
  } catch (error) {
    logger.error('Failed to send email to %s: %O', to, error);
  }
};

export const sendVerificationOTPEmail = async (to: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #6366F1; text-align: center;">Welcome to Velo!</h2>
      <p>Thank you for signing up. Please verify your email address using the following 6-digit One-Time Password (OTP):</p>
      <div style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 30px 0; color: #4F46E5;">
        ${otp}
      </div>
      <p>This OTP is valid for 10 minutes. If you did not request this verification, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777; text-align: center;">Velo Chat App Inc.</p>
    </div>
  `;
  await sendEmail(to, 'Verify Your Email - Velo', html);
};

export const sendPasswordResetOTPEmail = async (to: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #EF4444; text-align: center;">Reset Your Password</h2>
      <p>We received a request to reset your Velo password. Use the OTP code below to set a new password:</p>
      <div style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 30px 0; color: #DC2626;">
        ${otp}
      </div>
      <p>This code is valid for 10 minutes. If you did not request this, please secure your account immediately.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777; text-align: center;">Velo Chat App Inc.</p>
    </div>
  `;
  await sendEmail(to, 'Reset Your Password - Velo', html);
};
