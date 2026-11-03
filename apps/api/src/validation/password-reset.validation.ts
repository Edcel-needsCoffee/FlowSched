import { z } from 'zod';

export const forgotRequestSchema = z.object({
  email: z.string().email('Kindly provide a registered email address.'),
});

export type ForgotRequestInput = z.infer<typeof forgotRequestSchema>;

export const verifyPinSchema = z.object({
  email: z.string().email('Kindly provide a registered email address.'),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
});

export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  new_password: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be at most 128 characters'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
