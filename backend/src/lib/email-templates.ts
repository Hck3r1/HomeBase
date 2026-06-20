import { brand, escapeHtml, firstName } from './brand';

function emailLayout(content: string, footer?: string): string {
  const { primary, primaryDark, ink, muted, line, white } = brand.colors;
  const footerText =
    footer ??
    `You received this email because someone used your address with ${brand.name}. If this wasn&apos;t you, you can safely ignore it.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#EAF1EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#EAF1EF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td style="background:linear-gradient(135deg,${primary} 0%,${primaryDark} 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:${white};letter-spacing:-0.3px;">${brand.name}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">Find your next home</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:${white};padding:32px;border-left:1px solid ${line};border-right:1px solid ${line};">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:${white};border-radius:0 0 16px 16px;padding:0 32px 28px;border:1px solid ${line};border-top:none;">
              <p style="margin:0;font-size:12px;line-height:18px;color:${muted};text-align:center;">${footerText}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmailContent(name: string, verifyUrl: string): { subject: string; text: string; html: string } {
  const greeting = escapeHtml(firstName(name));
  const safeUrl = escapeHtml(verifyUrl);
  const subject = `Verify your ${brand.name} account`;

  const text = `Hi ${firstName(name)},

Welcome to ${brand.name}! Confirm your email to finish setting up your account:

${verifyUrl}

This link expires in 24 hours.

— The ${brand.name} team`;

  const html = emailLayout(`
    <p style="margin:0 0 8px;font-size:15px;line-height:22px;color:${brand.colors.ink};">Hi ${greeting},</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;font-weight:700;color:${brand.colors.ink};letter-spacing:-0.3px;">
      Confirm your email
    </h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:${brand.colors.muted};">
      Thanks for joining ${brand.name}. Tap the button below to verify your email and start exploring listings.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
      <tr>
        <td style="border-radius:999px;background-color:${brand.colors.primary};">
          <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">
            Verify email address
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${brand.colors.muted};">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 24px;font-size:12px;line-height:18px;word-break:break-all;">
      <a href="${safeUrl}" style="color:${brand.colors.primary};text-decoration:underline;">${safeUrl}</a>
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${brand.colors.chip};border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-size:13px;line-height:20px;color:${brand.colors.ink};">
          This link expires in <strong>24 hours</strong>. After verifying, open the ${brand.name} app and sign in.
        </td>
      </tr>
    </table>
  `);

  return { subject, text, html };
}

export function passwordResetOtpEmailContent(name: string, otp: string): { subject: string; text: string; html: string } {
  const greeting = escapeHtml(firstName(name));
  const safeOtp = escapeHtml(otp);
  const subject = `Your ${brand.name} password reset code`;

  const text = `Hi ${firstName(name)},

Your password reset code is: ${otp}

This code expires in 10 minutes. If you didn't request a reset, ignore this email.

— The ${brand.name} team`;

  const html = emailLayout(
    `
    <p style="margin:0 0 8px;font-size:15px;line-height:22px;color:${brand.colors.ink};">Hi ${greeting},</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;font-weight:700;color:${brand.colors.ink};letter-spacing:-0.3px;">
      Reset your password
    </h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:${brand.colors.muted};">
      Use the code below in the ${brand.name} app to continue resetting your password.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="background-color:${brand.colors.chip};border-radius:14px;padding:20px 16px;">
          <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${brand.colors.muted};margin-bottom:8px;">Your code</div>
          <div style="font-size:36px;font-weight:700;letter-spacing:0.35em;color:${brand.colors.primary};padding-left:0.35em;">${safeOtp}</div>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FFF8E6;border-radius:12px;border:1px solid #F0E4C8;">
      <tr>
        <td style="padding:14px 16px;font-size:13px;line-height:20px;color:${brand.colors.ink};">
          This code expires in <strong>10 minutes</strong>. Never share it with anyone — ${brand.name} will never ask for it.
        </td>
      </tr>
    </table>
  `,
    `If you didn&apos;t request a password reset, you can ignore this email. Your password will stay the same.`,
  );

  return { subject, text, html };
}

export function passwordChangedEmailContent(name: string): { subject: string; text: string; html: string } {
  const greeting = escapeHtml(firstName(name));
  const subject = `Your ${brand.name} password was changed`;

  const text = `Hi ${firstName(name)},

Your ${brand.name} password was successfully changed. If you didn't make this change, contact support immediately.

— The ${brand.name} team`;

  const html = emailLayout(
    `
    <p style="margin:0 0 8px;font-size:15px;line-height:22px;color:${brand.colors.ink};">Hi ${greeting},</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;font-weight:700;color:${brand.colors.ink};letter-spacing:-0.3px;">
      Password updated
    </h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:${brand.colors.muted};">
      Your password was changed successfully. You can now sign in to ${brand.name} with your new password.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${brand.colors.chip};border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-size:13px;line-height:20px;color:${brand.colors.ink};">
          <strong>Didn&apos;t do this?</strong> If you didn&apos;t change your password, secure your account immediately and contact our support team.
        </td>
      </tr>
    </table>
  `,
    `This is a security notification for your ${brand.name} account.`,
  );

  return { subject, text, html };
}
