import { z } from 'zod';
import { EmploymentStatus } from '@prisma/client';

/** Shared UUID param validation (same contract as subject.validation.ts). */
export { uuidIdSchema } from './subject.validation.js';

/**
 * Required, trimmed text — blank strings are treated as missing so the
 * "required" message surfaces (mirrors subject.validation.ts presentString).
 */
function presentString(label: string, max: number) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
      .trim()
      .min(1, `${label} is required`)
      .max(max, `${label} must be at most ${max} characters`),
  );
}

/** Optional, trimmed text; '' normalizes to null (rank is optional per spec). */
function optionalText(label: string, max: number) {
  return z.preprocess(
    (value) => {
      if (value === null) {
        return null;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return null;
      }
      return value;
    },
    z
      .string({ invalid_type_error: `${label} must be text` })
      .trim()
      .max(max, `${label} must be at most ${max} characters`)
      .nullable()
      .optional(),
  );
}

/** Integer via z.int()/Number.isInteger — 24.5 must fail, 0 must fail. */
function intFrom(label: string) {
  return z.preprocess(
    (value) => (value === null || (typeof value === 'string' && value.trim() === '') ? undefined : value),
    z.coerce
      .number({ invalid_type_error: `${label} must be a number` })
      .refine(Number.isInteger, `${label} must be a whole number`),
  );
}

/** Faculty.max_units: required on create, int > 0 (DB check constraint). */
export const maxUnitsSchema = intFrom('Max units')
  .refine((n) => n > 0, 'Max units must be greater than 0')
  .refine((n) => n <= 99, 'Max units must be 99 or less');

export const employmentStatusSchema = z.preprocess(
  (value) => (value === undefined || value === null || value === '' ? undefined : value),
  z.nativeEnum(EmploymentStatus, {
    errorMap: () => ({ message: 'Employment status must be FULL_TIME or PART_TIME' }),
  }),
);

export const createFacultySchema = z
  .object({
    employee_no: presentString('Employee no', 40),
    first_name: presentString('First name', 120),
    last_name: presentString('Last name', 120),
    rank: optionalText('Rank', 120),
    employment_status: employmentStatusSchema.default(EmploymentStatus.FULL_TIME),
    max_units: maxUnitsSchema.default(24),
  })
  .strict();

export type CreateFacultyInput = z.infer<typeof createFacultySchema>;

export const updateFacultySchema = createFacultySchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update' });

export type UpdateFacultyInput = z.infer<typeof updateFacultySchema>;

export const facultyQuerySchema = z.object({
  search: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
  ),
  page: z.coerce
    .number({ invalid_type_error: 'Page must be a number' })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  pageSize: z.coerce
    .number({ invalid_type_error: 'Page size must be a number' })
    .int('Page size must be an integer')
    .min(1, 'Page size must be at least 1')
    .max(100, 'Page size must be at most 100')
    .default(10),
  sortBy: z.enum(['employee_no', 'last_name', 'max_units', 'created_at']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export type FacultyQueryInput = z.infer<typeof facultyQuerySchema>;