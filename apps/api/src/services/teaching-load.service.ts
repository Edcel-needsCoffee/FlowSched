import { prisma } from '../config/prisma.js';
import { DEFAULT_LOAD_CONFIG, type TeachingLoadConfig } from './teaching-load.config.js';

export { DEFAULT_LOAD_CONFIG };

/* -------------------------------------------------------------------------- */
/* Input / output shapes                                                      */
/* -------------------------------------------------------------------------- */

export interface TeachingLoadAssignmentInput {
  subject_id: string;
  lecture_hours: number;
  lab_hours: number;
}

export interface TeachingLoadOtherFunctions {
  research?: number;
  extension?: number;
  imp?: number;
  consultation?: number;
}

export interface TeachingLoadDesignationInput {
  name: string;
  hours: number;
  service_credit: number;
  grants_service_credit: boolean;
}

export interface TeachingLoadInput {
  assignments?: TeachingLoadAssignmentInput[];
  otherFunctions?: TeachingLoadOtherFunctions;
  designations?: TeachingLoadDesignationInput[];
  overload_plotted_hours?: number;
}

export interface TeachingLoadOutput {
  lecture_hours: number;
  lab_hours: number;
  weighted_lab_hours: number;
  teaching_hours: number;
  preps: number;
  prep_ceiling: number;
  prep_ceiling_source: 'NONE' | 'TIER' | 'EXTRAPOLATED';
  teaching_overload: number;
  claimable_overload_hours: number;
  teaching_service_credit: number;
  overload_remaining_to_plot: number;
  claim_session_hours: number;
  regular_teaching_hours: number;
  designation_hours: number;
  total_faculty_time: number;
  remaining_to_target: number;
  service_credits: number;
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Round to 2 decimals — applied to every numeric output. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp0(value: number): number {
  return Math.max(0, value);
}


/* -------------------------------------------------------------------------- */
/* Pure engine — no database access                                           */
/* -------------------------------------------------------------------------- */

/**
 * Calculate a faculty member's teaching load from raw inputs.
 *
 * Pure: accepts plain data, returns plain data, touches no database. All
 * callers (Bite 1 loader, future Bite 2 UI, tests) share the same numbers.
 *
 * Assumptions (documented for the Chairman):
 *   - Labs only earn `labCoefficient` of their hours toward teaching load.
 *   - Preps count distinct subjects, not sections; a subject with both lec
 *     and lab counts as 2 preps.
 *   - The 40-hour weekly target counts REGULAR teaching only — overload is
 *     not part of the 40.
 *   - Preps above the highest tier extrapolate the highest ceiling.
 */
export function calculateTeachingLoad(
  input: TeachingLoadInput,
  config: TeachingLoadConfig = DEFAULT_LOAD_CONFIG,
): TeachingLoadOutput {
  const assignments = input.assignments ?? [];
  const otherFunctions = input.otherFunctions ?? {};
  const designations = input.designations ?? [];
  const overloadPlotted = input.overload_plotted_hours ?? 0;

  const research = otherFunctions.research ?? 0;
  const extension = otherFunctions.extension ?? 0;
  const imp = otherFunctions.imp ?? 0;
  const consultation = otherFunctions.consultation ?? 0;

  const warnings: string[] = [];

  // 1. lecture_hours / lab_hours — every section counts separately.
  const lecture_hours = round2(
    assignments.reduce((sum, a) => sum + (a.lecture_hours ?? 0), 0),
  );
  const lab_hours = round2(
    assignments.reduce((sum, a) => sum + (a.lab_hours ?? 0), 0),
  );

  // 2. weighted lab + total teaching hours.
  const weighted_lab_hours = round2(lab_hours * config.labCoefficient);
  const teaching_hours = round2(lecture_hours + weighted_lab_hours);

  // 3. preps = distinct subjects with lec > 0 + distinct subjects with lab > 0.
  const lecSubjects = new Set(
    assignments.filter((a) => (a.lecture_hours ?? 0) > 0).map((a) => a.subject_id),
  );
  const labSubjects = new Set(
    assignments.filter((a) => (a.lab_hours ?? 0) > 0).map((a) => a.subject_id),
  );
  const preps = lecSubjects.size + labSubjects.size;

  // 4. prep ceiling from the tier table.
  let prep_ceiling: number;
  let prep_ceiling_source: 'NONE' | 'TIER' | 'EXTRAPOLATED';
  const highestTier = config.prepTiers[config.prepTiers.length - 1];
  if (preps === 0) {
    prep_ceiling = 0;
    prep_ceiling_source = 'NONE';
  } else {
    const tier = config.prepTiers.find(
      (t) => preps >= t.minPreps && preps <= t.maxPreps,
    );
    if (tier) {
      prep_ceiling = tier.ceiling;
      prep_ceiling_source = 'TIER';
    } else {
      prep_ceiling = highestTier.ceiling;
      prep_ceiling_source = 'EXTRAPOLATED';
      warnings.push(
        `Preps ${preps} exceed the highest configured tier (${
          highestTier.maxPreps
        }); ceiling extrapolated at ${highestTier.ceiling}.`,
      );
    }
  }

  // 5. Teaching overload — rounded to 2 decimals FIRST.
  const teaching_overload = round2(clamp0(teaching_hours - prep_ceiling));

  // 6. Claimable (whole hours) + fractional service credit.
  const claimable_overload_hours = Math.floor(teaching_overload);
  const teaching_service_credit = round2(
    teaching_overload - claimable_overload_hours,
  );

  // 7. Overload plotting.
  const overload_remaining_to_plot = round2(
    clamp0(claimable_overload_hours - overloadPlotted),
  );
  const claim_session_hours = round2(
    Math.min(overloadPlotted, claimable_overload_hours),
  );
  if (overloadPlotted > claimable_overload_hours) {
    warnings.push(
      `Plotted overload ${overloadPlotted} exceeds claimable ${claimable_overload_hours}; only ${claimable_overload_hours} claimable.`,
    );
  }

  // 8. Regular teaching = min(teaching, ceiling). Overload is NOT part of the
  //    40-hour weekly target (documented assumption above).
  const regular_teaching_hours = round2(Math.min(teaching_hours, prep_ceiling));

  // 9. Designation hours + total faculty time vs the weekly target.
  const designation_hours = round2(
    designations.reduce((sum, d) => sum + (d.hours ?? 0), 0),
  );
  const total_faculty_time = round2(
    regular_teaching_hours +
      research +
      extension +
      imp +
      consultation +
      designation_hours,
  );
  const remaining_to_target = round2(config.facultyWeeklyHours - total_faculty_time);
  if (total_faculty_time > config.facultyWeeklyHours) {
    warnings.push(
      `Total faculty time ${total_faculty_time} exceeds the ${config.facultyWeeklyHours}-hour weekly target by ${round2(
        total_faculty_time - config.facultyWeeklyHours,
      )}.`,
    );
  }

  // 10. Service credits (grants only) — NOT counted in the 40.
  const service_credits = round2(
    designations
      .filter((d) => d.grants_service_credit === true)
      .reduce((sum, d) => sum + (d.service_credit ?? 0), 0),
  );

  // 11. Function minimum warnings (imp min is 0 → never warns).
  if (research < config.minFunctionHours.research) {
    warnings.push(
      `Research ${research} is below the minimum ${config.minFunctionHours.research} hour(s).`,
    );
  }
  if (extension < config.minFunctionHours.extension) {
    warnings.push(
      `Extension ${extension} is below the minimum ${config.minFunctionHours.extension} hour(s).`,
    );
  }
  if (consultation !== config.consultationHours) {
    warnings.push(
      `Consultation ${consultation} differs from the configured ${config.consultationHours} hour(s).`,
    );
  }

  return {
    lecture_hours,
    lab_hours,
    weighted_lab_hours,
    teaching_hours,
    preps,
    prep_ceiling,
    prep_ceiling_source,
    teaching_overload,
    claimable_overload_hours,
    teaching_service_credit,
    overload_remaining_to_plot,
    claim_session_hours,
    regular_teaching_hours,
    designation_hours,
    total_faculty_time,
    remaining_to_target,
    service_credits,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Thin DB loader (Bite 1) — delegates to the pure engine                     */
/* -------------------------------------------------------------------------- */

/**
 * Load a faculty's non-deleted WorkloadAssignments for a term, map each to its
 * Subject's lecture/lab hours, and hand the result to the pure engine.
 *
 * Other functions, designations and plotted overload are zeros/empty for now
 * — DB columns for those do not exist yet (Bite 2).
 */
export async function getFacultyTeachingLoad(
  facultyId: string,
  termId: string,
): Promise<TeachingLoadOutput> {
  const [rows, designationRows] = await Promise.all([
    prisma.workloadAssignment.findMany({
      where: {
        faculty_id: facultyId,
        term_id: termId,
        deleted_at: null,
      },
      select: {
        subject_id: true,
        subject: {
          select: {
            lecture_hours: true,
            lab_hours: true,
          },
        },
      },
    }),
    prisma.facultyDesignation.findMany({
      where: {
        faculty_id: facultyId,
        term_id: termId,
        deleted_at: null,
      },
      include: {
        designation: true,
      },
    }),
  ]);

  // TODO Bite 2b: load other_functions and overload_plotted_hours from their
  // (not-yet-existing) tables and pass them through here.
  const input: TeachingLoadInput = {
    assignments: rows.map((row) => ({
      subject_id: row.subject_id,
      lecture_hours: row.subject.lecture_hours ?? 0,
      lab_hours: row.subject.lab_hours ?? 0,
    })),
    otherFunctions: { research: 0, extension: 0, imp: 0, consultation: 0 },
    designations: designationRows.map((row) => ({
      name: row.designation.name,
      hours: row.hours,
      service_credit: row.service_credit,
      grants_service_credit: row.designation.grants_service_credit,
    })),
    overload_plotted_hours: 0,
  };

  return calculateTeachingLoad(input);
}
