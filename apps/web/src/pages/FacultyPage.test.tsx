/**
 * Module B — Faculty page UI tests (mirrors SubjectsPage.test.tsx; Module B
 * specifics: linked-login delete warning + explicit confirmation checkbox).
 */
import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import {
  createFaculty,
  deleteFaculty,
  listFaculty,
  updateFaculty,
  type FacultyMember,
} from '../lib/faculty';
import { useAuthStore, type AuthRole } from '../store/auth.store';
import { FacultyPage } from './FacultyPage';

vi.mock('../lib/faculty', () => ({
  listFaculty: vi.fn(),
  createFaculty: vi.fn(),
  updateFaculty: vi.fn(),
  deleteFaculty: vi.fn(),
}));

const listFacultyMock = vi.mocked(listFaculty);
const createFacultyMock = vi.mocked(createFaculty);
const updateFacultyMock = vi.mocked(updateFaculty);
const deleteFacultyMock = vi.mocked(deleteFaculty);

const FACULTY_A: FacultyMember = {
  id: 'fac-a',
  employee_no: 'TST-001',
  first_name: 'Maria',
  last_name: 'Ramos',
  rank: 'Instructor I',
  employment_status: 'FULL_TIME',
  max_units: 24,
  created_at: '2026-09-14T00:00:00.000Z',
  updated_at: '2026-09-14T00:00:00.000Z',
  user: null,
};

const FACULTY_B: FacultyMember = {
  id: 'fac-b',
  employee_no: 'TST-002',
  first_name: 'Juan',
  last_name: 'Dela Cruz',
  rank: null,
  employment_status: 'PART_TIME',
  max_units: 18,
  created_at: '2026-09-14T00:00:00.000Z',
  updated_at: '2026-09-14T00:00:00.000Z',
  user: { id: 'u-1', email: 'juan@flowsched.local', role: 'FACULTY', is_active: true },
};

const PAGE_OK = { data: [FACULTY_A, FACULTY_B], meta: { total: 2, page: 1, pageSize: 10, pageCount: 1 } };
const PAGE_EMPTY = { data: [], meta: { total: 0, page: 1, pageSize: 10, pageCount: 1 } };

function setRole(role: AuthRole): void {
  useAuthStore.setState({
    user: { id: 'u-1', email: 'user@flowsched.local', role, facultyId: null },
    isAuthenticated: true,
    accessToken: 'test-access-token',
  });
}

function renderPage(): void {
  render(
    <ToastProvider>
      <FacultyPage />
    </ToastProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  setRole('CHAIR');
  listFacultyMock.mockResolvedValue(PAGE_OK);
  createFacultyMock.mockResolvedValue({ faculty: FACULTY_A });
  updateFacultyMock.mockResolvedValue({ faculty: FACULTY_A });
  deleteFacultyMock.mockResolvedValue(undefined);
});

describe('FacultyPage — list rendering', () => {
  it('renders faculty from the API', async () => {
    renderPage();
    expect(await screen.findByText('TST-001')).toBeInTheDocument();
    expect(screen.getByText('Ramos, Maria')).toBeInTheDocument();
    expect(screen.getByText('Dela Cruz, Juan')).toBeInTheDocument();
    expect(screen.getByText('Instructor I')).toBeInTheDocument();
    expect(screen.getByText('Part-time')).toBeInTheDocument();
    expect(screen.getByText('juan@flowsched.local')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1 · 2 faculty')).toBeInTheDocument();
  });

  it('shows the empty state (ui-ux.md §12)', async () => {
    listFacultyMock.mockResolvedValue(PAGE_EMPTY);
    renderPage();
    expect(await screen.findByText('No faculty records yet.')).toBeInTheDocument();
  });

  it('shows an error state with a working Retry (ui-ux.md §13)', async () => {
    listFacultyMock.mockRejectedValueOnce(new Error('network down'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load faculty.");
    listFacultyMock.mockResolvedValueOnce(PAGE_OK);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('TST-001')).toBeInTheDocument();
  });

  it('sorts by the clicked column header', async () => {
    renderPage();
    await screen.findByText('TST-001');
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => {
      expect(listFacultyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'last_name', sortDir: 'asc' }),
      );
    });
  });
});

describe('FacultyPage — role-based controls', () => {
  it('shows Add/Edit/Delete for the Chair', async () => {
    renderPage();
    await screen.findByText('TST-001');
    expect(screen.getByRole('button', { name: 'Add Faculty Member' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
  });

  it('hides all edit controls from the Academic Admin (view-only)', async () => {
    setRole('ACADEMIC_ADMIN');
    renderPage();
    await screen.findByText('TST-001');
    expect(screen.queryByRole('button', { name: 'Add Faculty Member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});

describe('FacultyPage — create', () => {
  it('creates a faculty member through the modal with a blank rank sent as null', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Faculty Member' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Add Faculty Member');
    fireEvent.change(screen.getByLabelText('Employee no'), { target: { value: 'TST-100' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Lim' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(createFacultyMock).toHaveBeenCalledWith({
        employee_no: 'TST-100',
        first_name: 'Ana',
        last_name: 'Lim',
        rank: null,
        employment_status: 'FULL_TIME',
        max_units: 24,
      });
    });
    expect(await screen.findByText(/Faculty member created\./)).toBeInTheDocument();
    await waitFor(() => expect(listFacultyMock).toHaveBeenCalledTimes(2)); // initial load + refresh
  });

  it('shows inline validation for zero max units and does not call the API', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Faculty Member' }));
    fireEvent.change(screen.getByLabelText('Employee no'), { target: { value: 'TST-101' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Zero' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Units' } });
    fireEvent.change(screen.getByLabelText('Max units'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Max units must be greater than 0')).toBeInTheDocument();
    expect(createFacultyMock).not.toHaveBeenCalled();
  });

  it('shows inline validation for a missing required name', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Faculty Member' }));
    fireEvent.change(screen.getByLabelText('Employee no'), { target: { value: 'TST-102' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(createFacultyMock).not.toHaveBeenCalled();
  });

  it('keeps the modal open and shows the server error for a duplicate employee_no', async () => {
    createFacultyMock.mockRejectedValue(new Error('Employee no "TST-001" is already in use'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Faculty Member' }));
    fireEvent.change(screen.getByLabelText('Employee no'), { target: { value: 'TST-001' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Dup' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Case' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already in use');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('FacultyPage — edit', () => {
  it('pre-fills the modal and saves edits in place', async () => {
    renderPage();
    const editButtons = await screen.findAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButtons[0] as HTMLElement);
    expect(await screen.findByRole('dialog')).toHaveTextContent('Edit Faculty Member');
    const firstNameInput = screen.getByLabelText('First name') as HTMLInputElement;
    expect(firstNameInput.value).toBe('Maria');
    fireEvent.change(firstNameInput, { target: { value: 'Maria Clara' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(updateFacultyMock).toHaveBeenCalledWith(
        FACULTY_A.id,
        expect.objectContaining({ first_name: 'Maria Clara', rank: 'Instructor I' }),
      );
    });
    expect(await screen.findByText(/Faculty member saved\./)).toBeInTheDocument();
  });
});

describe('FacultyPage — delete', () => {
  it('deletes a faculty member without a login after confirmation', async () => {
    renderPage();
    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete' });
    // First row (FACULTY_A) has no linked login.
    fireEvent.click(deleteButtons[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Maria Ramos (TST-001)');
    expect(dialog).toHaveTextContent('historical workload records are preserved');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteFacultyMock).toHaveBeenCalledWith(FACULTY_A.id, false));
    expect(await screen.findByText(/Faculty member deleted\./)).toBeInTheDocument();
  });

  it('requires an explicit checkbox confirmation before deleting a faculty member with an active login', async () => {
    renderPage();
    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[1] as HTMLElement); // FACULTY_B — has an active login
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(
      'Warning: this faculty member has an active login (juan@flowsched.local).',
    );

    // Delete is disabled until the Chair checks the confirmation box.
    const confirmButton = within(dialog).getByRole('button', { name: 'Delete' });
    expect(confirmButton).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);
    await waitFor(() => expect(deleteFacultyMock).toHaveBeenCalledWith(FACULTY_B.id, true));
    expect(await screen.findByText(/Faculty member deleted\./)).toBeInTheDocument();
  });
});


