import type { PrismaClient } from '@prisma/client';

/** Add missing defaults only. Never reset a Chair's edited institutional data. */
export async function seedProgramDefaults(prisma:PrismaClient,devPasswordHash:string){
  await prisma.user.upsert({where:{email:'admin.dev@flowsched.local'},update:{},create:{email:'admin.dev@flowsched.local',password_hash:devPasswordHash,role:'ACADEMIC_ADMIN'}});
  await prisma.loadSettings.upsert({where:{id:'singleton'},create:{id:'singleton'},update:{}});
  await prisma.formSettings.upsert({where:{id:'singleton'},create:{id:'singleton'},update:{}});
  for(const form of [
    {type:'FACULTY_CLASS_PROGRAM',title:'FACULTY CLASS PROGRAM',ref_code:'PIT-COTE-FOR-3-2-01B'},
    {type:'STUDENT_CLASS_PROGRAM',title:'STUDENT CLASS PROGRAM',ref_code:''},
    {type:'CLASSROOM_UTILIZATION',title:'CLASSROOM UTILIZATION',ref_code:''},
  ])await prisma.formTemplate.upsert({where:{type:form.type},create:{...form,revision:'00'},update:{}});
  for(const option of [
    {slot:'PREPARED',name:'Dearielyn C. Maskarino',title:'Chairman'},
    {slot:'REVIEWED',name:'Ronald B. Lacaba',title:'Dean'},
    {slot:'APPROVED',name:'Jennifer A. Gorumba',title:'VP Academic Affairs'},
  ])if(!await prisma.signatoryOption.findFirst({where:{slot:option.slot,name:option.name}}))await prisma.signatoryOption.create({data:option});
  // PLACEHOLDERS: replace with the Chairman's real list. Chair never grants credit.
  const designations=[
    {name:'Department Chair',default_hours:0,service_credit_hours:0,grants_service_credit:false},
    {name:'Designation 1',default_hours:2,service_credit_hours:1,grants_service_credit:true},
    {name:'Designation 2',default_hours:1,service_credit_hours:1,grants_service_credit:true},
    {name:'Designation 3',default_hours:1,service_credit_hours:1,grants_service_credit:true},
  ];
  for(const designation of designations)if(!await prisma.designation.findFirst({where:{name:designation.name,deleted_at:null}}))await prisma.designation.create({data:designation});
  return designations.length;
}
