# Faculty planner approval

Faculty session edits are saved separately as a per-faculty, per-term draft. Existing sessions remain the final approved plan. Faculty cannot mutate final sessions through the legacy session APIs.

Saving starts a DRAFT; submission validates the whole sheet and marks it PENDING. The submitted teaching table and function sessions are preserved for preview. Only CHAIR can list and review submissions. APPROVE revalidates current teaching conflicts, designation ownership, session minima and overload caps, then atomically replaces final sessions and marks the draft APPROVED. RETURNED requires feedback and preserves the previous final sessions. Faculty may revise an approved or returned draft and submit again.

Notifications in the Chair header show a red pending count and poll every 15 seconds. Faculty pending status also polls every 15 seconds. Final load summaries and exports continue reading approved sessions; the faculty planner explicitly displays draft sessions.

Chair and academic admin direct planner edits retain existing permissions. Existing final sessions at migration time remain approved without requiring resubmission. Tests create unique fixtures and remove them afterwards.

Editing a pending submission atomically withdraws it to DRAFT. The old review can no longer be approved; faculty must submit again.
