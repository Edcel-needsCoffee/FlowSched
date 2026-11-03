-- CreateTable
CREATE TABLE "designations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "default_hours" REAL NOT NULL,
    "service_credit_hours" REAL NOT NULL DEFAULT 0,
    "grants_service_credit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "faculty_designations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "faculty_id" TEXT NOT NULL,
    "designation_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "service_credit" REAL NOT NULL DEFAULT 0,
    "assigned_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    CONSTRAINT "faculty_designations_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "faculty_designations_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "faculty_designations_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "faculty_designations_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "designations_name_idx" ON "designations"("name");

-- CreateIndex
CREATE INDEX "faculty_designations_faculty_id_idx" ON "faculty_designations"("faculty_id");

-- CreateIndex
CREATE INDEX "faculty_designations_designation_id_idx" ON "faculty_designations"("designation_id");

-- CreateIndex
CREATE INDEX "faculty_designations_term_id_idx" ON "faculty_designations"("term_id");

-- CreateIndex
CREATE UNIQUE INDEX "designations_name_key" ON "designations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_designations_faculty_id_designation_id_term_id_key" ON "faculty_designations"("faculty_id", "designation_id", "term_id");

-- Soft-delete-aware uniqueness (docs/4-database.md §7 partial unique index):
-- Prisma's @unique cannot express a partial index, so the equivalent raw SQL
-- lives here. Also re-applied idempotently by prisma/apply-checks.ts.
DROP INDEX IF EXISTS "designations_name_key";
CREATE UNIQUE INDEX "designations_name_key" ON "designations"("name") WHERE "deleted_at" IS NULL;

DROP INDEX IF EXISTS "faculty_designations_faculty_id_designation_id_term_id_key";
CREATE UNIQUE INDEX "faculty_designations_faculty_id_designation_id_term_id_key" ON "faculty_designations"("faculty_id", "designation_id", "term_id") WHERE "deleted_at" IS NULL;
