CREATE TABLE "section_enrollments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "section_id" TEXT NOT NULL,
  "term_id" TEXT NOT NULL,
  "student_count" INTEGER NOT NULL,
  CONSTRAINT "section_enrollments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "section_enrollments_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "section_enrollments_section_id_term_id_key" ON "section_enrollments"("section_id", "term_id");
CREATE INDEX "section_enrollments_term_id_idx" ON "section_enrollments"("term_id");
INSERT INTO "section_enrollments" ("id", "section_id", "term_id", "student_count")
SELECT MIN("id"), "section_id", "term_id", MAX("student_count")
FROM "faculty_section_students"
GROUP BY "section_id", "term_id";
