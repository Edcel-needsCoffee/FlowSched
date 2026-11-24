CREATE TABLE "faculty_planner_access" (
  "faculty_id" TEXT NOT NULL REFERENCES "faculty"("id") ON DELETE CASCADE,
  "term_id" TEXT NOT NULL REFERENCES "academic_terms"("id") ON DELETE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "function_targets_json" TEXT NOT NULL,
  PRIMARY KEY ("faculty_id", "term_id")
);
