import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { useAuthStore, type AuthRole } from '../store/auth.store';
import { listWorkloadAssignments, createWorkloadAssignment, updateWorkloadAssignment, deleteWorkloadAssignment } from '../lib/workload-assignments';
import type { WorkloadAssignment, WorkloadAssignmentListMeta } from '../lib/workload-assignments';
import { listFaculty, type FacultyMember } from '../lib/faculty';
import type { Section } from '../lib/sections';
import { listSubjects, type Subject } from '../lib/subjects';
import { WorkloadAssignmentPage } from './WorkloadAssignmentPage';

vi.mock('../lib/workload-assignments', () => ({
  listWorkloadAssignments: vi.fn(),
  createWorkloadAssignment: vi.fn(),
  updateWorkloadAssignment: vi.fn(),
  deleteWorkloadAssignment: vi.fn(),
}));

vi.mock('../lib/faculty', () => ({ listFaculty: vi.fn() }));
vi.mock('../lib/sections', () => ({ listSections: vi.fn() }));
vi.mock('../lib/subjects', () => ({ listSubjects: vi.fn() }));

const listWorkloadAssignmentsMock = vi.mocked(listWorkloadAssignments);
import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { useAuthStore, type AuthRole } from '../store/auth.store';
import {
  listWorkloadAssignments,
  createWorkloadAssignment,
  updateWorkloadAssignment,
  deleteWorkloadAssignment,
} from '../lib/workload-assignments';
import type { WorkloadAssignment, WorkloadAssignmentListMeta } from '../lib/workload-assignments';
import { listFaculty, type FacultyMember } from '../lib/faculty';
import type { Section } from '../lib/sections';
import { listSubjects, type Subject } from '../lib/subjects';
import { WorkloadAssignmentPage } from './WorkloadAssignmentPage';

vi.mock('../lib/workload-assignments', () => ({
  listWorkloadAssignments: vi.fn(),
  createWorkloadAssignment: vi.fn(),
  updateWorkloadAssignment: vi.fn(),
  deleteWorkloadAssignment: vi.fn(),
}));

vi.mock('../lib/faculty', () => ({ listFaculty: vi.fn() }));
vi.mock('../lib/sections', () => ({ listSections: vi.fn() }));
vi.mock('../lib/subjects', () => ({ listSubjects: vi.fn() }));

const listWorkloadAssignmentsMock = vi.mocked(listWorkloadAssignments);
const createWorkloadAssignmentMock = vi.mocked(createWorkloadAssignment);
const updateWorkloadAssignmentMock = vi.mocked(updateWorkloadAssignment);
const deleteWorkloadAssignmentMock = vi.mocked(deleteWorkloadAssignment);
const listFacultyMock = vi.mocked(listFaculty);
const listSectionsMock = vi.mocked(listSections);
const listSubjectsMock = vi.mocked(listSubjects);

const createWorkloadAssignmentMock = vi.mocked(createWorkloadAssignment);
const updateWorkloadAssignmentMock = vi.mocked(updateWorkloadAssignment);
const deleteWorkloadAssignmentMock = vi.mocked(deleteWorkloadAssignment);
const listFacultyMock = vi.mocked(listFaculty);
const listSectionsMock = vi.mocked(listSections);
const listSubjectsMock = vi.mocked(listSubjects);