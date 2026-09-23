import { Router } from 'express';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/prisma.js';
import {
  MAX_AVATAR_BYTES,
  deleteAvatarFile,
  saveAvatarFile,
  validateAvatarUpload,
} from '../services/avatar.service.js';
import { ApiError } from '../errors/apiError.js';

export const userRouter = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
});

/** Promisify the multer middleware so its errors flow into the central handler. */
function runAvatarUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    avatarUpload.single('avatar')(req, res, (err: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function mapMulterError(err: unknown): ApiError {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiError.badRequest('Photo must be 2MB or smaller', { field: 'avatar', reason: 'too_large' });
    }
    return ApiError.badRequest('Avatar upload failed', { field: 'avatar', reason: err.code });
  }
  return ApiError.server();
}

/**
 * POST /api/users/me/avatar — multipart profile-photo upload (all roles).
 * Validates type (JPG/PNG/WebP, content-sniffed) and size (≤2MB), stores the
 * file under the local uploads dir (tech-stack.md LOCAL storage; S3 driver in
 * production), mirrors avatar_url onto the linked faculty record, and replaces
 * (deleting) any previous photo.
 */
userRouter.post(
  '/users/me/avatar',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    try {
      await runAvatarUpload(req, res);
    } catch (err) {
      throw mapMulterError(err);
    }
    const file = req.file;
    if (!file) {
      throw ApiError.badRequest('Attach an image in the "avatar" form field', {
        field: 'avatar',
        reason: 'missing_file',
      });
    }
    const ext = validateAvatarUpload(file);
    const avatarUrl = saveAvatarFile(req.user.userId, ext, file.buffer);

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      deleteAvatarFile(avatarUrl);
      throw ApiError.notFound('User not found');
    }
    const previous = user.avatar_url;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatar_url: avatarUrl,
        ...(user.faculty_id ? { faculty: { update: { avatar_url: avatarUrl } } } : {}),
      },
    });
    // Replace, don't accumulate: remove the old file only after the DB commit.
    if (previous) {
      deleteAvatarFile(previous);
    }
    res.status(200).json({
    avatar_url: updated.avatar_url,
    avatar_path: updated.avatar_url ? updated.avatar_url.replace('/uploads/avatars/', '') : null,
  });
  }),
);
