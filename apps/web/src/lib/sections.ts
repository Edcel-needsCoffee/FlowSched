import { apiFetch } from './api';

export interface Section {
  id: string;
  year_level: number;
  name: string;
  /** "1A (Year 1)" — ready-made dropdown label from the API. */
  label: string;
  student_count?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SectionListResult {
  data: Section[];
  meta: { total: number };
}

export interface SectionInput {
  year_level: number;
  name: string;
  student_count?: number | null;
}

export function listSections(
  query: { search?: string; year_level?: number; termId?: string } = {},
): Promise<SectionListResult> {
  const params = new URLSearchParams();
  if (query.search) {
    params.set('search', query.search);
  }
  if (query.year_level !== undefined) {
    params.set('year_level', String(query.year_level));
  }
  if (query.termId) {
    params.set('termId', query.termId);
  }
  const qs = params.toString();
  return apiFetch<SectionListResult>(`/api/sections${qs ? `?${qs}` : ''}`);
}

export function createSection(input: SectionInput, termId?: string): Promise<{ section: Section }> {
  const params = termId ? `?termId=${encodeURIComponent(termId)}` : '';
  return apiFetch<{ section: Section }>(`/api/sections${params}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSection(id: string, input: Partial<SectionInput>, termId?: string): Promise<{ section: Section }> {
  const params = termId ? `?termId=${encodeURIComponent(termId)}` : '';
  return apiFetch<{ section: Section }>(`/api/sections/${id}${params}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteSection(id: string): Promise<void> {
  await apiFetch<unknown>(`/api/sections/${id}`, { method: 'DELETE' });
}
