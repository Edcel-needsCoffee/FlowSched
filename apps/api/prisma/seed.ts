import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // One active term for local/dev (database-specification.md §9).
  const term = await prisma.academicTerm.upsert({
    where: { school_year_semester: { school_year: '2026-2027', semester: 'FIRST' } },
    update: { is_active: true },
    create: { school_year: '2026-2027', semester: 'FIRST', is_active: true },
  });

  // Department rooms.
  for (const name of ['IE Lab 1', 'IE Lab 2', 'Room 301', 'Room 302']) {
    await prisma.room.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Starter IE subject catalog (units/lecture/lab hours are dev-plausible examples).
  const subjects = [
    { code: 'IE 105', title: 'Introduction to Industrial Engineering', units: 3, lecture_hours: 3, lab_hours: 0 },
    { code: 'IE 322', title: 'Operations Research 1', units: 3, lecture_hours: 3, lab_hours: 0 },
    { code: 'IE 411', title: 'Methods Engineering', units: 4, lecture_hours: 3, lab_hours: 3 },
  ];
  for (const s of subjects) {
    await prisma.subject.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  // DEV-ONLY placeholder credentials. Never use these outside local dev;
  // real password policy + admin provisioning land in Phase 2 (auth).
  const devPasswordHash = await bcrypt.hash('dev-password-change-me', 10);
  await prisma.user.upsert({
    where: { email: 'chair.dev@flowsched.local' },
    update: {},
    create: {
      email: 'chair.dev@flowsched.local',
      password_hash: devPasswordHash,
      role: 'CHAIR',
    },
  });
  await prisma.user.upsert({
    where: { email: 'admin.dev@flowsched.local' },
    update: {},
    create: {
      email: 'admin.dev@flowsched.local',
      password_hash: devPasswordHash,
      role: 'ACADEMIC_ADMIN',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`[seed] term=${term.school_year} ${term.semester} rooms=4 subjects=3 users=2`);
}

main()
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
