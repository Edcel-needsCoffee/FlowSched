import type { Section } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../errors/apiError.js';
import * as sectionRepository from '../repositories/section.repository.js';
import {
  createSectionSchema,
  sectionQuerySchema,
  updateSectionSchema,
  type CreateSectionInput,
  type UpdateSectionInput,
} from '../validation/section.validation.js';

export interface SectionDto {
  id: string;
  year_level: number;
  name: string;
  /** Convenience label used by every section dropdown. */
  label: string;
  student_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface SectionListDto {
  data: SectionDto[];
  meta: { total: number };
}

function parseOrBadRequest<T extends z.ZodTypeAny>(schema: T, payload: unknown): z.infer<T> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid request', parsed.error.flatten());
  }
  return parsed.data as z.infer<T>;
}

function parseTermId(rawTermId: unknown): string | null {
  if (rawTermId === undefined || rawTermId === null || rawTermId === '') return null;
  return parseOrBadRequest(z.string().uuid(), rawTermId);
}

async function ensureTerm(termId: string | null): Promise<void> {
  if (termId && !await prisma.academicTerm.findUnique({ where: { id: termId }, select: { id: true } })) {
    throw ApiError.notFound('Term not found');
  }
}

export function toSectionDto(section: Section, student_count: number | null = null): SectionDto {
  return {
    id: section.id,
    year_level: section.year_level,
    name: section.name,
    label: `${section.name} (Year ${section.year_level})`,
    student_count,
    created_at: section.created_at.toISOString(),
    updated_at: section.updated_at.toISOString(),
  };
}

export async function listSections(rawQuery: unknown): Promise<SectionListDto> {
  const query = parseOrBadRequest(sectionQuerySchema, rawQuery);
  await ensureTerm(query.termId ?? null);
  const rows = await sectionRepository.list({
    search: query.search ?? null,
    yearLevel: query.year_level ?? null,
  });
  const enrollments = query.termId
    ? await sectionRepository.findEnrollments(rows.map((section) => section.id), query.termId)
    : [];
  const counts = new Map(enrollments.map((row) => [row.section_id, row.student_count]));
  return { data: rows.map((section) => toSectionDto(section, counts.get(section.id) ?? null)), meta: { total: rows.length } };
}

export async function getSection(id: string, rawTermId?: unknown): Promise<SectionDto> {
  const section = await sectionRepository.findById(id);
  if (!section) throw ApiError.notFound('Section not found');
  const termId = parseTermId(rawTermId);
  await ensureTerm(termId);
  const enrollment = termId ? await sectionRepository.findEnrollment(id, termId) : null;
  return toSectionDto(section, enrollment?.student_count ?? null);
}

/** Mirrors the DB unique constraint Section(year_level, name). */
async function assertUnique(yearLevel: number, name: string, excludeId?: string): Promise<void> {
  const existing = await sectionRepository.findByYearLevelAndName(yearLevel, name, excludeId);
  if (existing) {
    throw ApiError.conflict(
      'SECTION_DUPLICATE',
      `Section "${existing.name}" already exists for year ${existing.year_level}`,
      { field: 'name', name: existing.name, year_level: existing.year_level },
    );
  }
}

export async function createSection(rawBody: unknown, rawTermId?: unknown): Promise<SectionDto> {
  const input: CreateSectionInput = parseOrBadRequest(createSectionSchema, rawBody);
  const termId = parseTermId(rawTermId);
  if (input.student_count !== undefined && input.student_count !== null && !termId) {
    throw ApiError.badRequest('Select a term to save the student count');
  }
  await ensureTerm(termId);
  await assertUnique(input.year_level, input.name);
  const sectionData = { year_level: input.year_level, name: input.name };
  const section = await sectionRepository.create(sectionData);
  if (termId && input.student_count !== undefined && input.student_count !== null) {
    await sectionRepository.saveEnrollment(section.id, termId, input.student_count);
  }
  return toSectionDto(section, input.student_count ?? null);
}

export async function updateSection(id: string, rawBody: unknown, rawTermId?: unknown): Promise<SectionDto> {
  const input: UpdateSectionInput = parseOrBadRequest(updateSectionSchema, rawBody);
  const termId = parseTermId(rawTermId);
  if (typeof input.student_count === 'number' && !termId) {
    throw ApiError.badRequest('Select a term to save the student count');
  }
  await ensureTerm(termId);
  const existing = await sectionRepository.findById(id);
  if (!existing) throw ApiError.notFound('Section not found');

  const nextYearLevel = input.year_level ?? existing.year_level;
  const nextName = input.name ?? existing.name;
  if (
    input.year_level !== undefined ||
    (input.name !== undefined && input.name.toLowerCase() !== existing.name.toLowerCase())
  ) {
    await assertUnique(nextYearLevel, nextName, id);
  }

  const sectionData = {
    ...(input.year_level !== undefined ? { year_level: input.year_level } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
  };
  const section = Object.keys(sectionData).length
    ? await sectionRepository.update(id, sectionData)
    : existing;

  let studentCount: number | null = null;
  if (termId) {
    if (input.student_count === null) await sectionRepository.clearEnrollment(id, termId);
    else if (input.student_count !== undefined) await sectionRepository.saveEnrollment(id, termId, input.student_count);
    studentCount = input.student_count === undefined
      ? (await sectionRepository.findEnrollment(id, termId))?.student_count ?? null
      : input.student_count;
  }
  return toSectionDto(section, studentCount);
}

export async function deleteSection(id: string): Promise<void> {
  const existing = await sectionRepository.findById(id);
  if (!existing) throw ApiError.notFound('Section not found');
  if (await sectionRepository.hasAssignments(id)) {
    throw ApiError.conflict(
      'SECTION_IN_USE',
      'This section still has workload assignments. Remove them before deleting the section.',
      { field: 'section_id', section_id: id },
    );
  }
  await sectionRepository.remove(id);
}
