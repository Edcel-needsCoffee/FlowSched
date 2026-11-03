import 'dotenv/config';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { hashPassword } from './auth.service.js';
import { sendResetPinMail } from './mail.service.js';

/** How long a 6-digit PIN stays valid after it is issued. */
export const RESET_PIN_TTL_MINUTES = 10;
/** Max verification attempts per PIN before it is invalidated. */
export const RESET_PIN_MAX_ATTEMPTS = 5;
/** Throttle: at most this many PIN requests per email per hour. */
export const RESET_REQUESTS_PER_HOUR = 5;
/** How long a verified reset token stays valid (for the change-password step). */
export const RESET_TOKEN_TTL_MINUTES = 15;

export function generateResetPin(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

function getResetSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-only-change-me-access-secret';
}

export interface ResetTokenPayload {
  /** "password-reset" marker so the token can never be used as an access token. */
  purpose: 'password-reset';
  userId: string;
  email: string;
}

/**
 * Forgot-password is a CHAIR-only feature. Shared by all three steps so an
 * unregistered, inactive, or non-CHAIR identity is rejected with a clear
 * reason instead of the old always-generic answer.
 */
function assertChairResetAccount(user: { role: string; is_active: boolean } | null): void {
  if (!user || !user.is_active) {
    throw new Error('Kindly provide a registered email address and try again.');
  }
  if (user.role !== 'CHAIR') {
    throw new Error('Only CHAIR accounts can use the forgot-password PIN.');
  }
}

export function signResetToken(payload: Omit<ResetTokenPayload, 'purpose'>): string {
  return jwt.sign({ ...payload, purpose: 'password-reset' }, getResetSecret(), {
    expiresIn: `${RESET_TOKEN_TTL_MINUTES}m`,
  });
}

export function verifyResetToken(token: string): Omit<ResetTokenPayload, 'purpose'> {
  const decoded = jwt.verify(token, getResetSecret()) as JwtPayload & Partial<ResetTokenPayload>;
  if (decoded.purpose !== 'password-reset' || typeof decoded.userId !== 'string' || typeof decoded.email !== 'string') {
    throw new Error('Invalid reset token');
  }
  return { userId: decoded.userId, email: decoded.email };
}

/**
 * Step 1 — request a PIN. Unknown, inactive, or non-CHAIR emails are rejected
 * with a clear red error instead of the old always-generic answer.
 */
export async function requestPasswordReset(rawEmail: string): Promise<{ mailed: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  assertChairResetAccount(user);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.passwordReset.count({
    where: { email, created_at: { gte: oneHourAgo } },
  });
  if (recentCount >= RESET_REQUESTS_PER_HOUR) {
    return { mailed: false };
  }

  // Invalidate older unconsumed PINs so only the newest code works.
  await prisma.passwordReset.updateMany({
    where: { email, consumed_at: null, expires_at: { gt: new Date() } },
    data: { consumed_at: new Date() },
  });

  const pin = generateResetPin();
  await prisma.passwordReset.create({
    data: {
      email,
      code_hash: await hashPin(pin),
      expires_at: new Date(Date.now() + RESET_PIN_TTL_MINUTES * 60 * 1000),
    },
  });

  const { mailed } = await sendResetPinMail({ to: email, code: pin, expiresMinutes: RESET_PIN_TTL_MINUTES });
  return { mailed };
}

/**
 * Step 2 — verify the 6-digit PIN. Returns a short-lived reset token for the
 * change-password step. Wrong codes count against the attempt limit.
 */
export async function verifyResetPin(rawEmail: string, code: string): Promise<string> {
  const email = rawEmail.trim().toLowerCase();
  const record = await prisma.passwordReset.findFirst({
    where: { email, consumed_at: null, expires_at: { gt: new Date() } },
    orderBy: { created_at: 'desc' },
  });
  if (!record) {
    throw new Error('Invalid or expired code');
  }
  if (record.attempts >= RESET_PIN_MAX_ATTEMPTS) {
    await prisma.passwordReset.update({ where: { id: record.id }, data: { consumed_at: new Date() } });
    throw new Error('Invalid or expired code');
  }
  const ok = await bcrypt.compare(code, record.code_hash);
  if (!ok) {
    await prisma.passwordReset.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw new Error('Invalid or expired code');
  }
  await prisma.passwordReset.update({ where: { id: record.id }, data: { consumed_at: new Date() } });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid or expired code');
  try {
    assertChairResetAccount(user);
  } catch {
    throw new Error('Invalid or expired code');
  }
  return signResetToken({ userId: user.id, email: user.email });
}

/** Step 3 — set the new password using a verified reset token. */
export async function resetPasswordWithToken(resetToken: string, newPassword: string): Promise<void> {
  let payload: { userId: string; email: string };
  try {
    payload = verifyResetToken(resetToken);
  } catch {
    throw new Error('Reset link expired. Request a new code.');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.is_active || user.email.toLowerCase() !== payload.email.toLowerCase()) {
    throw new Error('Reset link expired. Request a new code.');
  }
  try {
    assertChairResetAccount(user);
  } catch {
    throw new Error('Only CHAIR accounts can use the forgot-password PIN.');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: await hashPassword(newPassword) },
  });
}
