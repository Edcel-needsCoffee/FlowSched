import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHECKS = [
  'ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_time_range_check" CHECK ("end_time" > "start_time")',
  'ALTER TABLE "faculty" ADD CONSTRAINT "faculty_max_units_check" CHECK ("max_units" > 0)',
  'ALTER TABLE "subjects" ADD CONSTRAINT "subjects_units_check" CHECK ("units" > 0)',
];

// Soft-delete-aware uniqueness (database-specification.md §7: "a common
// pattern is a partial unique index"). Soft-deleted rows keep their history
// without blocking reuse of their code / employee_no by future records.
// Prisma's @unique only emits full unique indexes, so these are applied
// outside migrations, like the check constraints above.
const SOFT_DELETE_INDEXES = [
  'DROP INDEX IF EXISTS "subjects_code_key"',
  'CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code") WHERE "deleted_at" IS NULL',
  'DROP INDEX IF EXISTS "faculty_employee_no_key"',
  'CREATE UNIQUE INDEX "faculty_employee_no_key" ON "faculty"("employee_no") WHERE "deleted_at" IS NULL',
];

async function main(): Promise<void> {
  for (const sql of [...CHECKS, ...SOFT_DELETE_INDEXES]) {
    try {
      await prisma.$executeRawUnsafe(sql);
      // eslint-disable-next-line no-console
      console.log('[checks] applied:', sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already exists')) {
        // eslint-disable-next-line no-console
        console.log('[checks] already present, skipping:', sql);
        continue;
      }
      throw err;
    }
  }
}

main()
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[checks] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
