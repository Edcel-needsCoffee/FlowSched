import type { Prisma } from '@prisma/client';
import { EventEmitter } from 'node:events';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../errors/apiError.js';

export type FunctionTargets = Record<'research' | 'extension' | 'imp' | 'consultation', number>;
const accessUpdates = new EventEmitter();
type PlannerAccess = Awaited<ReturnType<typeof readPlannerAccess>>;

export function subscribePlannerAccess(facultyId: string, termId: string, listener: (access: PlannerAccess) => void) {
  const key = `${facultyId}:${termId}`;
  accessUpdates.on(key, listener);
  return () => { accessUpdates.off(key, listener); };
}

export async function readPlannerAccess(facultyId: string, termId: string, db: Prisma.TransactionClient = prisma) {
  const [access] = await db.$queryRaw<{ enabled: boolean; function_targets_json: string | null }[]>`
    SELECT "enabled", "function_targets_json" FROM "faculty_planner_access" WHERE "faculty_id" = ${facultyId} AND "term_id" = ${termId}
  `;
  return { enabled: access?.enabled ?? false, targets: access?.function_targets_json ? JSON.parse(access.function_targets_json) as FunctionTargets : null };
}

export async function savePlannerAccess(facultyId: string, termId: string, enabled: boolean, targets: FunctionTargets) {
  if (!await prisma.academicTerm.findUnique({ where: { id: termId }, select: { id: true } })) {
    throw ApiError.notFound('Term not found');
  }
  await prisma.$executeRaw`
    INSERT INTO "faculty_planner_access" ("faculty_id", "term_id", "enabled", "function_targets_json")
    VALUES (${facultyId}, ${termId}, ${enabled}, ${JSON.stringify(targets)})
    ON CONFLICT ("faculty_id", "term_id") DO UPDATE SET "enabled" = excluded."enabled", "function_targets_json" = excluded."function_targets_json"
  `;
  const access = await readPlannerAccess(facultyId, termId);
  accessUpdates.emit(`${facultyId}:${termId}`, access);
  return access;
}

export async function assertPlannerOpen(facultyId: string, termId: string, db: Prisma.TransactionClient = prisma) {
  if (!(await readPlannerAccess(facultyId, termId, db)).enabled) {
    throw new ApiError(403, 'PLANNER_CLOSED', 'The Chair has closed editing for this faculty planner.');
  }
}
