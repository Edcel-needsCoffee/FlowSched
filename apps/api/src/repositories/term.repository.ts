import { Prisma, type AcademicTerm } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface TermCreateData {
  school_year: string;
  semester: Prisma.AcademicTermCreateInput['semester'];
  is_active: boolean;
}

export type TermUpdateData = Partial<TermCreateData>;

export async function list(): Promise<AcademicTerm[]> {
  return prisma.academicTerm.findMany({
    orderBy: [{ school_year: 'desc' }, { semester: 'asc' }],
  });
}

export async function findById(id: string): Promise<AcademicTerm | null> {
  return prisma.academicTerm.findUnique({ where: { id } });
}

export async function findActive(): Promise<AcademicTerm | null> {
  return prisma.academicTerm.findFirst({
    where: { is_active: true },
    orderBy: { created_at: 'asc' },
  });
}

/** Mirrors the DB unique constraint AcademicTerm(school_year, semester). */
export async function findBySchoolYearAndSemester(
  schoolYear: string,
  semester: TermCreateData['semester'],
  excludeId?: string,
): Promise<AcademicTerm | null> {
  return prisma.academicTerm.findFirst({
    where: {
      school_year: { equals: schoolYear },
      semester,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

/**
 * Creates a term. When `is_active` is true the whole write runs in one
 * transaction that first clears every other term's flag, so the
 * "only one active term" invariant (requirements.md) holds atomically —
 * a concurrent reader can never observe two active terms.
 */
export async function create(data: TermCreateData): Promise<AcademicTerm> {
  return prisma.$transaction(async (tx) => {
    if (data.is_active) {
      await tx.academicTerm.updateMany({
        where: { is_active: true },
        data: { is_active: false },
      });
    }
    return tx.academicTerm.create({ data });
  });
}

/** Partial update with the same single-active-term invariant. */
export async function update(id: string, data: TermUpdateData): Promise<AcademicTerm> {
  return prisma.$transaction(async (tx) => {
    if (data.is_active === true) {
      await tx.academicTerm.updateMany({
        where: { is_active: true, id: { not: id } },
        data: { is_active: false },
      });
    }
    return tx.academicTerm.update({ where: { id }, data });
  });
}

export type DeleteTermResult =
  | { status: 'DELETED' }
  | { status: 'NOT_FOUND' }
  | { status: 'ACTIVE' }
  | { status: 'HAS_SAVED_DATA'; counts: Record<string, number> };

/** A saved term can only be removed when it is inactive and has no term data. */
export async function deleteIfEmpty(id: string): Promise<DeleteTermResult> {
  return prisma.$transaction(async (tx) => {
    const term = await tx.academicTerm.findUnique({ where: { id } });
    if (!term) return { status: 'NOT_FOUND' };
    if (term.is_active) return { status: 'ACTIVE' };

    const [assignments, designations, loads, sessions, studentCounts] = await Promise.all([
      tx.workloadAssignment.count({ where: { term_id: id } }),
      tx.facultyDesignation.count({ where: { term_id: id } }),
      tx.facultyLoad.count({ where: { term_id: id } }),
      tx.facultySession.count({ where: { term_id: id } }),
      tx.facultySectionStudents.count({ where: { term_id: id } }),
    ]);
    const effectivity = term.effectivity_start || term.effectivity_end ? 1 : 0;
    const counts = { assignments, designations, loads, sessions, studentCounts, effectivity };
    if (Object.values(counts).some((count) => count > 0)) {
      return { status: 'HAS_SAVED_DATA', counts };
    }

    await tx.academicTerm.delete({ where: { id } });
    return { status: 'DELETED' };
  });
}
