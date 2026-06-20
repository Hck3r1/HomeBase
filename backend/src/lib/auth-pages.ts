import { brand, escapeHtml } from './brand';

function houseIconSvg(color: string, size = 56): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10 28 L32 10 L54 28" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 26 V52 H48 V26" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M27 52 V38 H37 V52" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="24" r="3" stroke="${color}" stroke-width="2.4"/>
  </svg>`;
}

function checkIconSvg(color: string): string {
  return `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="28" cy="28" r="28" fill="${brand.colors.chip}"/>
    <circle cx="28" cy="28" r="22" fill="${color}" opacity="0.15"/>
    <path d="M18 28.5 L25 35.5 L39 21.5" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function errorIconSvg(color: string): string {
  return `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="28" cy="28" r="28" fill="#FDEEEE"/>
    <path d="M28 18 V30" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="28" cy="37" r="2" fill="${color}"/>
  </svg>`;
}

function pageLayout(title: string, icon: string, heading: string, body: string, footer?: string): string {
  const { primary, primaryDark, ink, muted, white, line } = brand.colors;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · ${brand.name}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at top, ${brand.colors.chip} 0%, #dfe9e6 45%, #d4e0dc 100%);
      color: ${ink};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: ${white};
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(21, 32, 29, 0.12);
      overflow: hidden;
      border: 1px solid ${line};
    }
    .header {
      background: linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%);
      padding: 24px;
      text-align: center;
      color: ${white};
    }
    .brand {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.2px;
    }
    .content {
      padding: 32px 28px 28px;
      text-align: center;
    }
    .icon { margin-bottom: 20px; }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
      line-height: 1.25;
      letter-spacing: -0.3px;
    }
    p {
      margin: 0;
      font-size: 15px;
      line-height: 1.6;
      color: ${muted};
    }
    .footer {
      padding: 0 28px 28px;
      text-align: center;
    }
    .hint {
      margin-top: 20px;
      padding: 14px 16px;
      background: ${brand.colors.chip};
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      color: ${ink};
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="margin-bottom:8px;">${houseIconSvg(white, 40)}</div>
      <div class="brand">${brand.name}</div>
    </div>
    <div class="content">
      <div class="icon">${icon}</div>
      <h1>${heading}</h1>
      <p>${body}</p>
    </div>
    ${footer ? `<div class="footer">${footer}</div>` : ''}
  </div>
</body>
</html>`;
}

export function verifyEmailSuccessPage(): string {
  return pageLayout(
    'Email verified',
    checkIconSvg(brand.colors.success),
    'You&apos;re all set!',
    'Your email has been verified. Open the HomeBase app on your phone and sign in to continue.',
    `<div class="hint"><strong>Next step:</strong> Return to the app, enter your email and password, and you&apos;re in.</div>`,
  );
}

export function verifyEmailErrorPage(message: string): string {
  return pageLayout(
    'Verification failed',
    errorIconSvg(brand.colors.danger),
    'This link didn&apos;t work',
    escapeHtml(message),
    `<div class="hint"><strong>What to do:</strong> Links expire after 24 hours. Open the HomeBase app, sign up again, or request a new verification email if that option is available.</div>`,
  );
}

export function verifyEmailMissingTokenPage(): string {
  return verifyEmailErrorPage('The verification link is missing a token. Please use the full link from your email.');
}
