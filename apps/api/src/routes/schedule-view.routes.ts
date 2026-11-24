import { Router } from 'express';
import { ApiError } from '../errors/apiError.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getRoomScheduleView,
  getRoomsOverview,
  getSectionScheduleView,
} from '../services/schedule-view.service.js';
import { scheduleViewQuerySchema, uuidIdSchema } from '../validation/schedule-view.validation.js';

export const scheduleViewRouter = Router();

function parseId(value: string | undefined, label: string): string {
  const parsed = uuidIdSchema.safeParse(value);
  if (!parsed.success) {
    throw ApiError.badRequest(`Invalid ${label} id`);
  }
  return parsed.data;
}

/**
 * Read-only reshapes of the ScheduleSlot data the drag-and-drop grid writes
 * ("Student Class Program" / "Classroom Utilization"). These views are open
 * to every authenticated role.
 */
scheduleViewRouter.get(
  '/schedule-views/section/:sectionId',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(200).json(await getSectionScheduleView(parseId(req.params.sectionId, 'section'), req.query));
  }),
);

scheduleViewRouter.get(
  '/schedule-views/room/:roomId',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(200).json(await getRoomScheduleView(parseId(req.params.roomId, 'room'), req.query));
  }),
);

scheduleViewRouter.get(
  '/schedule-views/rooms-overview',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(200).json(await getRoomsOverview(req.query));
  }),
);
