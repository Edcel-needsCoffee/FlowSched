import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { subjectRouter } from './routes/subject.routes.js';
import { facultyRouter } from './routes/faculty.routes.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): express.Express {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', subjectRouter);
  app.use('/api', facultyRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
