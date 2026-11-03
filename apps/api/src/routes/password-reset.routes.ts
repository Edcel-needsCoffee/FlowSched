import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  forgotRequestSchema,
  resetPasswordSchema,
  verifyPinSchema,
} from '../validation/password-reset.validation.js';
import {
  requestPasswordReset,
  resetPasswordWithToken,
  verifyResetPin,
} from '../services/password-reset.service.js';

export const passwordResetRouter = Router();

/**
 * POST /api/auth/forgot-password — request a 6-digit PIN by email (Gmail SMTP).
 * Always returns the generic message so accounts cannot be enumerated.
 */
passwordResetRouter.post(
  '/auth/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = forgotRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() },
      });
      return;
    }
    try {
      await requestPasswordReset(parsed.data.email);
      res.status(200).json({
        message: 'A 6-digit code was sent to your Gmail.',
      });
    } catch (err) {
      // Unregistered / non-CHAIR emails land here with a clear message the
      // client renders as a red danger error; real mail failures (bad App
      // Password, network, quota) answer 502 with the Gmail reason.
      const message = err instanceof Error ? err.message : 'Could not send the reset email';
      // eslint-disable-next-line no-console
      console.error('[auth] forgot-password failure:', message);
      const status =
        message === 'Kindly provide a registered email address and try again.'
          ? 404
          : message === 'Only CHAIR accounts can use the forgot-password PIN.'
            ? 403
            : 502;
      res.status(status).json({
        error: {
          code:
            status === 404
              ? 'EMAIL_NOT_REGISTERED'
              : status === 403
                ? 'FORBIDDEN_ROLE'
                : 'MAIL_SEND_FAILED',
          message: status === 502 ? `${message}. Try again later.` : message,
        },
      });
    }
  }),
);

/** POST /api/auth/verify-pin — trade a 6-digit PIN for a reset token. */
passwordResetRouter.post(
  '/auth/verify-pin',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = verifyPinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() },
      });
      return;
    }
    try {
      const resetToken = await verifyResetPin(parsed.data.email, parsed.data.code);
      res.status(200).json({ resetToken });
    } catch {
      res.status(400).json({
        error: { code: 'INVALID_PIN', message: 'Invalid or expired code' },
      });
    }
  }),
);

/** POST /api/auth/reset-password — set the new password with a reset token. */
passwordResetRouter.post(
  '/auth/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() },
      });
      return;
    }
    try {
      await resetPasswordWithToken(parsed.data.resetToken, parsed.data.new_password);
      res.status(200).json({ message: 'Password changed. You can now sign in.' });
    } catch (err) {
      res.status(400).json({
        error: { code: 'INVALID_RESET_TOKEN', message: err instanceof Error ? err.message : 'Could not reset password' },
      });
    }
  }),
);
