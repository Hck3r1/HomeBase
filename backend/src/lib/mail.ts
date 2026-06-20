import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env, type Env } from '../config/env';
import { verificationEmailContent, passwordResetOtpEmailContent, passwordChangedEmailContent } from './email-templates';
import { logger } from './logger';

interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function verificationUrl(token: string) {
  return `${env().API_BASE_URL}/api/v1/auth/verify-email?token=${token}`;
}

function resolveSmtp(e: Env): SmtpConfig | null {
  if (e.EMAIL_USERNAME) {
    return {
      host: e.SMTP_HOST ?? 'smtp.gmail.com',
      port: e.SMTP_PORT ?? 587,
      user: e.EMAIL_USERNAME,
      pass: (e.EMAIL_PASSWORD ?? e.SMTP_PASS ?? '').replace(/\s/g, ''),
      from: e.EMAIL_FROM ?? e.MAIL_FROM ?? e.EMAIL_USERNAME,
    };
  }
  if (e.SMTP_HOST && e.SMTP_PORT && e.SMTP_USER) {
    return {
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      user: e.SMTP_USER,
      pass: e.SMTP_PASS ?? '',
      from: e.MAIL_FROM ?? e.SMTP_USER,
    };
  }
  return null;
}

function mailProvider(): 'resend' | 'smtp' | 'none' {
  const e = env();
  if (e.RESEND_API_KEY) return 'resend';
  if (resolveSmtp(e)) return 'smtp';
  return 'none';
}

async function sendViaResend(payload: MailPayload) {
  const e = env();
  const resend = new Resend(e.RESEND_API_KEY!);
  const from = e.EMAIL_FROM ?? e.MAIL_FROM ?? 'onboarding@resend.dev';
  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
  if (error) throw new Error(error.message);
}

async function sendViaSmtp(payload: MailPayload) {
  const smtp = resolveSmtp(env());
  if (!smtp?.pass) throw new Error('SMTP password not configured');

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  await transport.sendMail({
    from: smtp.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

function logDevVerificationLink(payload: MailPayload) {
  const verifyUrl = payload.text.match(/https?:\/\/\S+/)?.[0] ?? payload.text;
  logger.warn(
    { to: payload.to, verifyUrl, subject: payload.subject },
    'No mail provider configured — verification link logged to console',
  );
  console.warn('\n========== VERIFICATION EMAIL (dev only) ==========');
  console.warn(`To:   ${payload.to}`);
  console.warn(`Link: ${verifyUrl}`);
  console.warn('Add EMAIL_USERNAME/EMAIL_PASSWORD or RESEND_API_KEY to backend/.env to send real email.\n');
}

async function deliver(payload: MailPayload) {
  const e = env();
  if (e.NODE_ENV === 'test') return;

  const provider = mailProvider();

  if (provider === 'resend') {
    await sendViaResend(payload);
    logger.info({ to: payload.to, provider: 'resend' }, 'Verification email sent');
    return;
  }

  if (provider === 'smtp') {
    await sendViaSmtp(payload);
    logger.info({ to: payload.to, provider: 'smtp' }, 'Verification email sent');
    return;
  }

  if (e.NODE_ENV === 'development') {
    logDevVerificationLink(payload);
    return;
  }

  throw new Error('Email provider not configured');
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = verificationUrl(token);
  const { subject, text, html } = verificationEmailContent(name, url);
  await deliver({ to, subject, text, html });
}

export async function sendPasswordResetOtpEmail(to: string, name: string, otp: string) {
  const { subject, text, html } = passwordResetOtpEmailContent(name, otp);
  await deliver({ to, subject, text, html });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  const { subject, text, html } = passwordChangedEmailContent(name);
  await deliver({ to, subject, text, html });
}

export { verificationUrl, mailProvider };
