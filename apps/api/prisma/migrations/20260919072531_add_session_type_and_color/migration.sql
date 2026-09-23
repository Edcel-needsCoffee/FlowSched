/*
  Warnings:

  - Added the required column `session_type` to the `schedule_slots` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('LECTURE', 'LAB');

-- AlterTable
ALTER TABLE "schedule_slots" ADD COLUMN     "session_type" "SessionType" NOT NULL;

-- AlterTable
ALTER TABLE "workload_assignments" ADD COLUMN     "color" VARCHAR(7);
