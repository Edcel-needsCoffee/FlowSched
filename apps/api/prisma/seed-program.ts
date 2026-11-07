import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { seedProgramDefaults } from './seed-program-defaults.js';
const prisma=new PrismaClient();
seedProgramDefaults(prisma,await bcrypt.hash('dev-password-change-me',10))
  .then(()=>console.log('Added missing program defaults and development academic-admin account; existing settings were preserved.'))
  .catch(error=>{console.error(error);process.exitCode=1;})
  .finally(()=>prisma.$disconnect());
