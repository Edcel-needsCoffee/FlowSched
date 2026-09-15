# Database Specification

## 1. Database

Database:
PostgreSQL

ORM:
Prisma

Migration System:
Prisma Migrate

---

## 2. Entities

### Entity: User

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | UUID | Yes | auto | Primary key |
| email | string | Yes | — | Unique, login identifier |
| password_hash | string | Yes | — | Never stored or returned in plaintext |
| role | enum(`CHAIR`, `FACULTY`, `ACADEMIC_ADMIN`) | Yes | `FACULTY` | Drives RBAC checks |
| faculty_id | UUID (FK) | No | null | Links a login to a Faculty profile; null for Chair/Admin accounts not tied to a faculty record |
| is_active | boolean | Yes | true | Disables login without deleting the account |
| created_at | timestamp (UTC) | Yes | now() | |
| updated_at | timestamp (UTC) | Yes | now() | |

---

### Entity: Faculty

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | UUID | Yes | auto | Primary key |
| employee_no | string | Yes | — | Unique |
| first_name | string | Yes | — | |
| last_name | string | Yes | — | |
| rank | string | No | null | e.g. Instructor I, Assistant Professor |
| employment_status | enum(`FULL_TIME`, `PART_TIME`) | Yes | `FULL_TIME` | |
| max_units | integer | Yes | 24 | Used by conflict/overload detection |
| created_at | timestamp (UTC) | Yes | now() | |
| updated_at | timestamp (UTC) | Yes | now() | |
| deleted_at | timestamp (UTC) | No | null | Soft delete |

---

### Entity: Subject

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | UUID | Yes | auto | Primary key |
| code | string | Yes | — | Unique, e.g. `IE 411` |
| title | string | Yes | — | e.g. Methods Engineering |
| units | decimal | Yes | — | |
| lecture_hours | decimal | Yes | 0 | Hours per week |
| lab_hours | decimal | Yes | 0 | Hours per week |
| created_at | timestamp (UTC) | Yes | now() | |
| updated_at | timestamp (UTC) | Yes | now() | |
| deleted_at | timestamp (UTC) | No | null | Soft delete |

---

### Entity: Section

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | UUID | Yes | auto | Primary key |
| year_level | integer | Yes | — | 1–5 |
| name | string | Yes | — | e.g. `BSIE 3A` |
| created_at | timestamp (UTC) | Yes | now() | |
| updated_at | timestamp (UTC) | Yes | now() | |

Unique constraint on (`year_level`, `name`).

---

### Entity: Room

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | UUID | Yes | auto | Primary key |
| name | string | Yes | — | Unique, e.g. `IE Lab 1` |
| is_under_maintenance | boolean | Yes | false | Blocks/warns on new schedule placements |
| created_at | timestamp (UTC) | Yes | now() | |
| updated_at | timestamp (UTC) | Yes | now() | |

---

### Entity: AcademicTerm

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | UUID | Yes | auto | Primary key |
| school_year | string | Yes | — | e.g. `2026-2027` |
| semester | enum(`FIRST`, `SECOND`, `SUMMER`) | Yes | — | |
| is_active | boolean | Yes | false | Only one term active at a time (app-enforced) |
| created_at | timestamp (UTC) | Yes | now() | |

Unique constraint on (`school_year`, `semester`).

---

### Entity: WorkloadAssignment

Links a faculty member to a subject and section for a given term. This is the row the workload calculation (FR-03) sums up.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | UUID | Yes | auto | Primary key |
| faculty_id | UUID (FK) | Yes | — | References Faculty |
| subject_id | UUID (FK) | Yes | — | References Subject |
| section_id | UUID (FK) | Yes | — | References Section |
| term_id | UUID (FK) | Yes | — | References AcademicTerm |
| created_at | timestamp (UTC) | Yes | now() | |
| updated_at | timestamp (UTC) | Yes | now() | |
| deleted_at | timestamp (UTC) | No | null | Soft delete — preserves historical workload records |

Unique constraint on (`faculty_id`, `subject_id`, `section_id`, `term_id`) — prevents the same assignment being created twice.

---

### Entity: ScheduleSlot

The actual weekly-grid placement(s) for a workload assignment. One assignment can have several slots (e.g. Mon/Wed/Fri).

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | UUID | Yes | auto | Primary key |
| workload_assignment_id | UUID (FK) | Yes | — | References WorkloadAssignment |
| room_id | UUID (FK) | No | null | References Room; null allowed for TBA |
| day_of_week | enum(`MON`…`SAT`) | Yes | — | |
| start_time | time | Yes | — | |
| end_time | time | Yes | — | Must be after `start_time` |
| created_at | timestamp (UTC) | Yes | now() | |
| updated_at | timestamp (UTC) | Yes | now() | |

---

## 3. Relationships

```text
User
 └── belongs to Faculty (optional, 1:1)

Faculty
 └── has many WorkloadAssignment

Subject
 └── has many WorkloadAssignment

Section
 └── has many WorkloadAssignment

AcademicTerm
 └── has many WorkloadAssignment

WorkloadAssignment
 ├── belongs to Faculty
 ├── belongs to Subject
 ├── belongs to Section
 ├── belongs to AcademicTerm
 └── has many ScheduleSlot

ScheduleSlot
 ├── belongs to WorkloadAssignment
 └── belongs to Room (optional)

Room
 └── has many ScheduleSlot
```

---

## 4. Constraints

- **Primary keys:** UUID on every entity.
- **Foreign keys:** `User.faculty_id → Faculty.id`; `WorkloadAssignment.faculty_id → Faculty.id`; `WorkloadAssignment.subject_id → Subject.id`; `WorkloadAssignment.section_id → Section.id`; `WorkloadAssignment.term_id → AcademicTerm.id`; `ScheduleSlot.workload_assignment_id → WorkloadAssignment.id`; `ScheduleSlot.room_id → Room.id`.
- **Unique constraints:** `User.email`; `Faculty.employee_no`; `Subject.code`; `Room.name`; `Section(year_level, name)`; `AcademicTerm(school_year, semester)`; `WorkloadAssignment(faculty_id, subject_id, section_id, term_id)`.
- **Required fields:** as marked `Yes` in each entity table above.
- **Check constraints:** `ScheduleSlot.end_time > start_time`; `Faculty.max_units > 0`; `Subject.units > 0`.
- **Delete behavior:**
  - `Faculty`, `Subject`, `Room` → soft delete (or restrict) when referenced by any `WorkloadAssignment`/`ScheduleSlot`, so historical schedules and workload reports are never orphaned.
  - `WorkloadAssignment` → soft delete; deleting it cascades a soft/hard delete to its `ScheduleSlot` rows.
  - `AcademicTerm`, `Section` → restrict deletion if any `WorkloadAssignment` references them.

---

## 5. Indexes

- `User.email` (unique lookup — login)
- `Faculty.employee_no` (unique lookup)
- `Subject.code` (unique lookup, frequently searched when building the catalog)
- `WorkloadAssignment.faculty_id` (workload-per-faculty queries, FR-03/FR-06)
- `WorkloadAssignment.term_id` (filtering the active term)
- `ScheduleSlot.room_id, day_of_week` (composite — room-conflict checks)
- `ScheduleSlot.workload_assignment_id, day_of_week` (composite — faculty-conflict checks)

Do not create additional indexes beyond these — the tables are small (department-scale data), so extra indexes add write overhead without a meaningful read benefit.

---

## 6. Timestamps

All entities include `created_at` and `updated_at`, stored in UTC. `ScheduleSlot.start_time`/`end_time` are stored as local wall-clock time (department operates in a single timezone), not UTC, since they represent a recurring weekly slot rather than a fixed instant.

---

## 7. Soft Delete

`Faculty`, `Subject`, and `WorkloadAssignment` use `deleted_at` soft deletion, since historical workload and schedule records must remain available for past-term reports even after a faculty member leaves or a subject is discontinued.

Soft-deleted records are excluded from active selectors (faculty rosters, subject catalog dropdowns, current-term workload views) by default, and only included when a query explicitly asks for historical/archived data (e.g. a past-term report).

`Room` and `ScheduleSlot` are hard-deleted, since a removed room or an edited/cancelled slot has no standalone reporting value once its parent `WorkloadAssignment` is preserved.

---

## 8. Migrations

All schema changes go through Prisma Migrate. Every schema change has a corresponding migration file committed alongside the code that depends on it.

An already-released migration is never edited to accommodate a new change — a new migration is created instead, even for small corrections, so that every environment that already applied the old migration stays consistent.

---

## 9. Seed Data

- **AcademicTerm:** one active term for local/dev environments (e.g. `2026-2027`, `FIRST`, `is_active = true`).
- **Rooms:** the department's known rooms (e.g. `IE Lab 1`, `IE Lab 2`, `Room 301`, `Room 302`).
- **Users:** one seeded Chair account and one seeded Academic Administrator account for initial login.
- **Subjects (optional):** a starter IE subject catalog (e.g. `IE 105`, `IE 322`, `IE 411`) so the schedule grid isn't empty on first run.

---

## 10. Data Integrity

Database constraints protect the rules that matter most, in addition to application-level validation performed by the service layer:

- The unique constraint on `WorkloadAssignment(faculty_id, subject_id, section_id, term_id)` prevents duplicate assignments at the database level, even if application-level validation is ever bypassed or has a bug.
- The `end_time > start_time` check constraint guarantees no schedule slot is stored backwards.
- Foreign keys guarantee a `ScheduleSlot` or `WorkloadAssignment` can never reference a faculty member, subject, section, term, or room that doesn't exist.
- For stronger protection against double-booking, an optional PostgreSQL `EXCLUDE` constraint (via the `btree_gist` extension) can be added on `ScheduleSlot(room_id, day_of_week, time-range)` to reject overlapping room bookings at the database level, as a backstop to the application-level conflict detection (FR-05).