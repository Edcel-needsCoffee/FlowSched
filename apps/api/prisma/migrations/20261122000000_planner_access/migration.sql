CREATE TABLE "planner_access" (
  "term_id" TEXT PRIMARY KEY NOT NULL REFERENCES "academic_terms"("id") ON DELETE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "target_hours" REAL NOT NULL CHECK ("target_hours" > 0 AND "target_hours" <= 168)
);
