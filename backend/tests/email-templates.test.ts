import {
  verificationEmailContent,
  passwordResetOtpEmailContent,
  passwordChangedEmailContent,
} from '../src/lib/email-templates';
import { verifyEmailSuccessPage, verifyEmailErrorPage } from '../src/lib/auth-pages';

describe('verificationEmailContent', () => {
  it('includes branded content and verify link', () => {
    const { subject, text, html } = verificationEmailContent('Moyo Ade', 'https://example.com/verify?token=abc');
    expect(subject).toContain('HomeBase');
    expect(text).toContain('Moyo');
    expect(text).toContain('https://example.com/verify?token=abc');
    expect(html).toContain('Verify email address');
    expect(html).toContain('#3B7A6F');
    expect(html).toContain('https://example.com/verify?token=abc');
  });

  it('escapes html in user name', () => {
    const { html } = verificationEmailContent('<script>alert(1)</script>', 'https://example.com');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('password reset emails', () => {
  it('includes otp in reset email', () => {
    const { html, subject } = passwordResetOtpEmailContent('Moyo Ade', '482910');
    expect(subject).toContain('password reset');
    expect(html).toContain('482910');
    expect(html).toContain('Reset your password');
  });

  it('includes confirmation in password changed email', () => {
    const { html, subject } = passwordChangedEmailContent('Moyo Ade');
    expect(subject).toContain('password was changed');
    expect(html).toContain('Password updated');
  });
});

describe('auth pages', () => {
  it('renders success page', () => {
    const html = verifyEmailSuccessPage();
    expect(html).toContain('You&apos;re all set');
    expect(html).toContain('HomeBase');
  });

  it('renders error page with message', () => {
    const html = verifyEmailErrorPage('Invalid or expired verification link');
    expect(html).toContain('Invalid or expired verification link');
    expect(html).toContain('This link didn&apos;t work');
  });
});
