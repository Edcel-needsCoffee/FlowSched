import nodemailer, { type Transporter } from 'nodemailer';

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getMailConfig(): MailConfig | null {
  const user = (process.env.SMTP_USER ?? '').trim();
  const pass = (process.env.SMTP_PASS ?? '').trim();
  if (!user || !pass) return null;
  const host = (process.env.SMTP_HOST ?? 'smtp.gmail.com').trim() || 'smtp.gmail.com';
  // Gmail App-Password recipe (same as Bitshub admin_login.php): STARTTLS on
  // 587. Only use implicit TLS on 465 when SMTP_SECURE is explicitly "true".
  const port = Number(process.env.SMTP_PORT ?? 587) || 587;
  const rawSecure = (process.env.SMTP_SECURE ?? '').trim().toLowerCase();
  const secure = rawSecure === 'true' || (rawSecure === '' && port === 465);
  const from =
    (process.env.SMTP_FROM ?? '').trim() || `"FlowSched" <${user}>`;
  return { host, port, secure, user, pass, from };
}

let cachedTransporter: Transporter | null = null;

function getTransporter(config: MailConfig): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      // Same shape as Bitshub's PHPMailer STARTTLS setup: upgrade the plain
      // 587 connection to TLS, and fail fast instead of sending cleartext.
      requireTLS: !config.secure,
      tls: { minVersion: 'TLSv1.2' },
    });
  }
  return cachedTransporter;
}

/** Test hook: forget the cached transporter between tests. */
export function clearMailTransporterForTests(): void {
  cachedTransporter = null;
}

export interface ResetPinMail {
  to: string;
  code: string;
  expiresMinutes: number;
}

function pinMailHtml(code: string, expiresMinutes: number): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="margin:0 0 8px;color:#1e3a8a">FlowSched password reset</h2>
      <p style="margin:0 0 16px;color:#475569">Use this 6-digit PIN to reset your password. It expires in ${expiresMinutes} minutes.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:#f1f5f9;border-radius:8px;padding:16px 8px;color:#0f172a">${code}</div>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">If you did not request this, you can ignore this email.</p>
    </div>`;
}

/**
 * Send the 6-digit reset PIN via Gmail SMTP.
 *
 * There is no dev fallback on purpose: if SMTP is unconfigured or Gmail
 * rejects the send, this throws and the caller answers 502 MAIL_SEND_FAILED
 * (same spirit as Bitshub's "Mailer Error ... Try again later"), so a silent
 * delivery failure can never look like success. The PIN is only ever logged
 * as a messageId confirmation, never its value.
 */
export async function sendResetPinMail(input: ResetPinMail): Promise<{ mailed: boolean }> {
  const config = getMailConfig();
  if (!config) {
    throw new Error('SMTP is not configured (SMTP_USER/SMTP_PASS missing)');
  }
  const transporter = getTransporter(config);
  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: 'FlowSched password reset code',
      text: `Your FlowSched password reset code is ${input.code}. It expires in ${input.expiresMinutes} minutes.`,
      html: pinMailHtml(input.code, input.expiresMinutes),
    });
    // eslint-disable-next-line no-console
    console.log(`[auth] reset PIN mailed to ${input.to} (messageId=${info.messageId ?? 'n/a'})`);
    return { mailed: true };
  } catch (err) {
    // Loud on purpose: Bitshub's 2FA fails the same way (the PHP catch renders
    // "Mailer Error ... Try again later"), and the dev fallback must never
    // mask a real SMTP outage.
    // eslint-disable-next-line no-console
    console.error(`[auth] SMTP send to ${input.to} FAILED:`, err instanceof Error ? err.message : err);
    throw err instanceof Error ? err : new Error('Could not send the reset email');
  }
}
