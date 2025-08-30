import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS } from '../../../utils/secrets';

export async function sendZoho(to: string, subject: string, html: string, text?: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: EMAIL_USER.value(), pass: EMAIL_PASS.value() }
  });
  const info = await transporter.sendMail({
    from: `"SOS Expat" <${EMAIL_USER.value()}>`,
    to, subject, html, text
  });
  return info.messageId as string;
}
