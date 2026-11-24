import { PrismaClient } from '@prisma/client';
import { seedProgramDefaults } from './seed-program-defaults.js';
const prisma=new PrismaClient();
seedProgramDefaults(prisma)
  .then(()=>console.log('Added missing program defaults; existing settings were preserved.'))
  .catch(error=>{console.error(error);process.exitCode=1;})
  .finally(()=>prisma.$disconnect());
