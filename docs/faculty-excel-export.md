# Department program Excel exports

The active exporter is server-side ExcelJS in
`apps/api/src/services/program-export.service.ts`. The three routes are
`GET /api/exports/{faculty|sections|rooms}/:id?termId=`. Faculty accounts can export
only their own faculty program; Chair and Academic Administrator can export any
program. Authentication and ownership are enforced before workbook generation.

Print and Excel use `getProgramForm` and the same FormSettings, FormTemplate and
SignatoryOption data. Each form has its own title/reference/revision, institution
and TUV logo locations, semester/year, effectivity, department/program, entity and
signature footer. Query parameters `sig_prepared`, `sig_reviewed`, `sig_approved`
accept active option IDs or custom names. Custom names are not saved.

Schedule has a Mon–Sat half-hour grid, merged assignment-colored class blocks,
and type-only function sessions. If an approved override creates overlapping
blocks, Excel retains all labels together in the affected cells. Print uses
separate lanes. Text/row heights expand to preserve block details.

Faculty workbooks also contain a Teaching Load sheet with configuration inputs,
one row per assignment/section, declared/plotted functions, designations, session
times, distinct-section students and prep breakdown. Its formulas calculate
lecture/lab totals, weighted teaching, component preparations, ceiling lookup,
overload split/cap, counted hours, service credits, weekly time and students.
The source rules are documented in `docs/teaching-load-rules.md`.

The supplied faculty reference code is retained. Its former fixed 12-hour
overload calculation and actual-hours grand total are superseded by the new
prep-tier/40-hour rules. The latest request also specifies A4 landscape and a
shared school/TUV header instead of the old folio portrait layout. The school
logo is available; the real TUV NORD image and approved student/room reference
codes must be configured by Chair.

Verification covers server output/authorization, embedded artwork, selected
signatures, formulas/cached values and native Excel recalculation after editing
assignment and session inputs. The final screenshot assets are under
`outputs/teaching-load-verification/`.
