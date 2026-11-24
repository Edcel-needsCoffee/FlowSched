ALTER TABLE "planner_access" ADD COLUMN "function_targets_json" TEXT;
UPDATE "planner_access" SET "enabled" = false;
ALTER TABLE "planner_access" DROP COLUMN "target_hours";
