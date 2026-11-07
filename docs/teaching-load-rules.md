# Teaching Load — Calculation Rules (Bite 1)

Source of truth: `apps/api/src/services/teaching-load.service.ts` (pure engine)
and `apps/api/src/services/teaching-load.config.ts` (config). No database access
happens inside `calculateTeachingLoad`; a thin loader feeds it from WorkloadAssignment
rows (Bite 1) and will later feed other-functions/designations (Bite 2).

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
| `minDesignationSessionHours` | `1` | Defined now; used in Bite 2 |

---

## Formulas

All outputs are `snake_case` and every numeric output is rounded with one
`round2` helper (`Math.round(v * 100) / 100`).

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
    `grants_service_credit === true`. **Not counted in the 40.**

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

## Open questions for the Chairman

1. Should `imp` (immersion) carry a minimum other than 0?
2. Confirm whole-hour overload sessions; plotted overload is calculated from sessions, never entered as a stored running total.
3. Should service credits reduce the 40-hour target, or stay strictly outside
   it (current behavior: strictly outside)?
4. Confirm the prep tier ceilings (21 / 18 / 15) are final and CHED-approved.

## Assumptions awaiting Chairman confirmation

- The coefficient applies only to laboratory hours.
- The weekly target counts regular teaching capped at the prep ceiling and excludes overload and all service credits.
- `functionCountingRule = MIN_DECLARED_PLOTTED`: counted functions and designations are capped by declared/assigned and valid plotted hours.
- Every other function follows the same session validity rule as a designation. A short session does not qualify.
- Overload is claimed in whole-hour sessions only. The fractional remainder is Teaching Service Credit, distinct from designation Service Credits.
- Student counts belong to faculty + section + term; multiple subjects in one section count that section once.
- Seven or more preparations use the last configured tier and are explicitly marked EXTRAPOLATED because the true ceiling is unknown.
- Chair and Dean designations never grant Service Credits; other designations grant credits only when flagged and accepted.

Settings are persisted in the singleton `load_settings` table and are read for every API calculation. `GET /api/load-settings` is authenticated; only Chair can `PUT /api/load-settings`. The existing engine is extended, not duplicated.
