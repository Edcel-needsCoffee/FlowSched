import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { subjectRouter } from './routes/subject.routes.js';
import { facultyRouter } from './routes/faculty.routes.js';
import { roomRouter } from './routes/room.routes.js';
import { sectionRouter } from './routes/section.routes.js';
import { termRouter } from './routes/term.routes.js';
import { workloadAssignmentRouter } from './routes/workload-assignment.routes.js';
import { scheduleSlotRouter } from './routes/schedule-slot.routes.js';
import { scheduleViewRouter } from './routes/schedule-view.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { avatarDir } from './services/avatar.service.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): express.Express {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());

  // Uploaded profile photos (avatar upload) are stored on disk in development
  // (tech-stack.md LOCAL storage) and served statically at /uploads/avatars/*.
  app.use(
    '/uploads/avatars',
    express.static(avatarDir(), {
      fallthrough: false,
      maxAge: '1h',
    }),
  );

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', userRouter);
  app.use('/api', subjectRouter);
  app.use('/api', facultyRouter);
  app.use('/api', roomRouter);
  app.use('/api', sectionRouter);
  app.use('/api', termRouter);
  app.use('/api', workloadAssignmentRouter);
  app.use('/api', scheduleSlotRouter);
  app.use('/api', scheduleViewRouter);
  app.use('/api', dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** Ensure the uploads dir exists before the server starts accepting traffic. */
export function ensureUploadDirs(): void {
  fs.mkdirSync(avatarDir(), { recursive: true });
}

