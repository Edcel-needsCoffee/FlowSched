# Teaching Load — Calculation Rules

Source of truth: `apps/api/src/services/teaching-load.service.ts` (pure engine)
and `apps/api/src/services/teaching-load.config.ts` (config). No database access
happens inside `calculateTeachingLoad`. The read loader feeds it assignments,
function declarations, valid faculty sessions, active designations and distinct
section student counts. Derived totals are never stored in the database.

---

## Config (`DEFAULT_LOAD_CONFIG`)

All values are overridable by the caller. The prep tiers are CHED-approved
values supplied by the Chairman and must stay configurable so loads can be
re-run when the tiers change without a code deploy.

| Key | Default | Meaning |
|---|---|---|
| `labCoefficient` | `0.7` | Fraction of lab hours that counts toward teaching load |
| `facultyWeeklyHours` | `40` | Weekly hours target for a full-time faculty member |
| `prepTiers` | `[{1-2 → 21}, {3-4 → 18}, {5-6 → 15}]` | Prep ceiling by number of preps |
| `consultationHours` | `4` | Expected weekly consultation hours |
| `minFunctionHours` | `{ research: 1, extension: 1, imp: 0 }` | Min weekly hours per other function |
| `minDesignationSessionHours` | `1` | Minimum valid session duration for all functions, designations and overload |
| `functionCountingRule` | `MIN_DECLARED_PLOTTED` | Named assumption: cap counted hours at declared/assigned and valid plotted hours |

---

## Formulas

All outputs are `snake_case` and every numeric output is rounded with one
`round2` helper (`Math.round((v + Number.EPSILON) * 100) / 100`).

1. **lecture_hours** = Σ `lecture_hours` across ALL assignments (each section
   counts separately). **lab_hours** = Σ `lab_hours` likewise.
2. **weighted_lab_hours** = `lab_hours × labCoefficient`
3. **teaching_hours** = `lecture_hours + weighted_lab_hours`
4. **preps** = (distinct `subject_id` with `lecture_hours > 0`) +
   (distinct `subject_id` with `lab_hours > 0`). Sections do not matter. A
   subject with both lec and lab counts as **2** preps.
5. **prep_ceiling** / **prep_ceiling_source**:
   - 0 preps → ceiling `0`, source `NONE`
   - preps within a tier → that tier's ceiling, source `TIER`
   - preps above the highest tier (7+) → highest tier's ceiling, source
     `EXTRAPOLATED`, plus a warning
6. **teaching_overload** = `round2(max(0, teaching_hours − prep_ceiling))` —
   rounded to 2 decimals **first**.
7. **claimable_overload_hours** = `floor(teaching_overload)`;
   **teaching_service_credit** = `round2(teaching_overload − claimable)`.
8. **overload_remaining_to_plot** = `max(0, claimable − plotted)`;
   **claim_session_hours** = `min(plotted, claimable)`; warn if plotted > claimable.
9. **regular_teaching_hours** = `min(teaching_hours, prep_ceiling)`.
10. **designation_hours** = Σ accepted designation counted hours, each capped at the smaller of assigned and valid plotted hours.
11. **total_faculty_time** = regular teaching plus counted research, extension, IMP, consultation and designations. Each function counts `min(declared, plotted)` only when it has a valid session of at least the configured minimum.
12. **remaining_to_target** = `facultyWeeklyHours − total_faculty_time`; warn if total exceeds target.
13. **service_credits** = Σ `service_credit` for designations where
    `grants_service_credit === true` and the designation is accepted. Chair and
    Dean roles never grant these credits. **Not counted in the weekly target.**

## Warnings (strings)

- research or extension below its `minFunctionHours` minimum
- consultation differs from `consultationHours`
- total faculty time over `facultyWeeklyHours`
- extrapolated prep tier (7+ preps)
- plotted overload above claimable

## Assumptions (documented for the Chairman)

- **Labs only** earn `labCoefficient` of their hours toward teaching load.
- **Preps count distinct subjects, not sections**; a subject with both lec and
  lab counts as 2 preps.
- The 40-hour weekly target counts **regular teaching only** — overload is not
  part of the 40 (`regular_teaching_hours = min(teaching, ceiling)`).
- Preps above the highest tier extrapolate the highest ceiling.

## Assumptions awaiting Chairman confirmation

- The coefficient applies only to laboratory hours.
- The weekly target counts regular teaching capped at the prep ceiling and excludes overload and all service credits.
- `functionCountingRule = MIN_DECLARED_PLOTTED`: counted functions and designations are capped by declared/assigned and valid plotted hours.
- Every other function follows the same session validity rule as a designation. A short session does not qualify.
- Overload is claimed in whole-hour sessions only. The fractional remainder is Teaching Service Credit, distinct from designation Service Credits.
- Student counts belong to faculty + section + term; multiple subjects in one section count that section once.
- Seven or more preparations use the last configured tier and are explicitly marked EXTRAPOLATED because the true ceiling is unknown.

Settings are persisted in the singleton `load_settings` table and are read for every API calculation. `GET /api/load-settings` is authenticated; only Chair can `PUT /api/load-settings`. The existing engine is extended, not duplicated.

After migrations, `npm run seed:program --workspace api` adds only missing program
defaults and the local `admin.dev@flowsched.local` account. It preserves edited
settings, templates, signatories and active designation defaults. The normal seed
also calls this helper. This targeted seed does not change existing subjects,
faculty, assignments or active terms.

## Sessions, ownership and editing

Sessions are half-hour-grid intervals, at least the configured minimum (default
one hour). OVERLOAD durations must also be whole-hour multiples. The API rejects
plotted overload above the current claimable total. Read-time calculations cap a
claim and warn if later assignment/settings changes leave a previously valid
plot above the new limit. Overload contributes nothing toward the weekly target.

Function sessions have no room or section. DESIGNATION sessions require an active
faculty designation belonging to the same faculty and term. A designation with
no qualifying session earns zero counted hours and zero Service Credits. Other
functions follow the same session validity rule. Minimums are configurable;
Research and Extension default to one, IMP to zero, Consultation to four.
Consultation inherits the department setting unless Chair explicitly overrides it.

Both directions of same-term overlap are checked: function/overload vs teaching,
and teaching vs faculty sessions. Adjacent intervals are allowed. Teaching keeps
the existing structured 409 and Chair override path. Function sessions cannot
override conflicts. Moves recheck minimums, ownership, capacity and overlaps.

FACULTY users can read/edit only their own hours, sessions and student counts.
CHAIR and ACADEMIC_ADMIN can work with any faculty. Both management roles assign
designations; only Chair controls consultation overrides, teaching placement,
form/load settings, signatories, and term/per-faculty effectivity. The deprecated
`Faculty.max_units` remains for compatibility but no longer drives load status.

## API routes

All routes require authentication and validate UUIDs, bodies and query values.

| Route | Behavior |
|---|---|
| `GET /api/faculty/:id/teaching-load?termId=` | Full computed load, prep breakdown, counted functions/designations, sessions, students, effectivity and warnings |
| `PUT /api/faculty/:id/functions?termId=` | Declared function hours; consultation override restricted to Chair |
| `GET/POST /api/faculty/:id/sessions?termId=` | List/create faculty sessions |
| `PATCH/DELETE /api/faculty-sessions/:id` | Move/update or soft-delete a session |
| `GET/PUT /api/faculty/:id/students?termId=` | Counts per handled distinct section, 0–200 |
| `PUT /api/faculty/:id/effectivity?termId=` | Chair-only override; both null restores term inheritance |
| `GET/PATCH /api/terms/:id/effectivity` | Term defaults; writes restricted to Chair |
| `GET/PUT /api/load-settings` | Configurable coefficient, target, minimums and ordered contiguous prep tiers |
| `GET/PUT /api/form-settings` | Shared institution lines, department, program and logo paths |
| `GET /api/form-templates`, `PUT /api/form-templates/:type` | Separate title, reference and revision for each form |
| `POST /api/form-settings/logos/:school-or-tuv` | PNG/JPG, maximum 2MB, content checked |
| `GET/POST /api/signatory-options`, `PATCH/DELETE /api/signatory-options/:id` | Editable options; deletion makes an option inactive |
| `GET /api/forms/:faculty-or-sections-or-rooms/:id?termId=` | Shared print/export model |
| `GET /api/exports/:faculty-or-sections-or-rooms/:id?termId=` | Server-generated Excel workbook |

Form/export queries also accept `sig_prepared`, `sig_reviewed`, `sig_approved`:
active option UUIDs or custom names. Custom choices are not persisted. Faculty
can print/export only their own faculty program. Management can use all forms.
Existing designation/master-list routes are extended rather than duplicated.

## Form output and setup still needed

Print and Excel share the same server model and computed engine. Print is A4
landscape with app chrome hidden. Faculty workbooks contain Schedule and Teaching
Load sheets; the latter has editable input areas and formulas for prep counting,
ceiling lookup, overload split, declared/plotted counting and distinct-section
student totals. Warnings in Excel are explicitly an export-time snapshot.

Only the supplied faculty form reference was available:
`PIT-COTE-FOR-3-2-01B`. The approved Student Class Program and Classroom Utilization
reference codes remain blank until Chair enters the real codes. No TUV NORD image
was supplied; its upload field is ready and remains empty rather than substituting
another institution's logo. Effectivity dates likewise require the real term dates.
Designation names 1–3 remain editable placeholders for the Chairman's final list.

## Required fixture reconciliation

| Fixture | Lecture | Lab | Weighted lab | Teaching | Preps | Ceiling | Overload | Claimable | Teaching Service Credit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| F1 Reyes | 15 | 6 | 4.2 | 19.2 | 3 | 18 | 1.2 | 1 | 0.2 |
| F2 | 15 | 15 | 10.5 | 25.5 | 2 | 21 | 4.5 | 4 | 0.5 |
| F3 | 18 | 11 | 7.7 | 25.7 | 4 | 18 | 7.7 | 7 | 0.7 |

F4 uses F1 regular teaching 18 plus fully plotted Research 6, Extension 4, IMP 2,
Consultation 4, and Designation 6: total 40, remaining zero. F5 rejects a 0.5-hour
designation from counted hours and credits. Unit/API tests also cover F6–F10,
floating-point rounding, soft-delete/recreation, overload caps, self scope,
same-faculty conflicts in both directions, and exported workbook formulas.
