CREATE TABLE "planner_drafts" ("id" TEXT NOT NULL PRIMARY KEY,"faculty_id" TEXT NOT NULL,"term_id" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'DRAFT',"sessions_json" TEXT NOT NULL DEFAULT '[]',"feedback" TEXT NOT NULL DEFAULT '',"updated_at" DATETIME NOT NULL);
CREATE UNIQUE INDEX "planner_drafts_faculty_id_term_id_key" ON "planner_drafts"("faculty_id","term_id");
