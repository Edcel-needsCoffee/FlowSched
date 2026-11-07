import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import request from 'supertest';
import { prisma } from '../config/prisma.js';
import { createApp } from '../app.js';
import { signAccessToken } from '../services/auth.service.js';
const prefix=`FSP-${process.pid}-${Date.now()}-`;
let faculty='',other='',term='',assignment='',section='',designation='',chair='',own='',outsider='',admin='';
const app=createApp();
const session=(extra:Record<string,unknown>={})=>({type:'RESEARCH',day_of_week:'MON',start_time:'08:00',end_time:'09:00',...extra});
const endpoint=(part:string,id=faculty)=>`/api/faculty/${id}/${part}?termId=${term}`;
beforeAll(async()=>{
  process.env.JWT_SECRET??='test-access-secret';
  const a=await prisma.faculty.create({data:{employee_no:prefix+'A',first_name:'Fixture',last_name:'A'}});faculty=a.id;
  other=(await prisma.faculty.create({data:{employee_no:prefix+'B',first_name:'Fixture',last_name:'B'}})).id;
  term=(await prisma.academicTerm.create({data:{school_year:prefix+'2026',semester:'SECOND',effectivity_start:'2026-11-01',effectivity_end:'2027-03-31'}})).id;
  const subject=await prisma.subject.create({data:{code:prefix+'IE',title:'Fixture subject',units:3,lecture_hours:3,lab_hours:3}});
  for(let i=0;i<5;i++){
    const s=await prisma.section.create({data:{name:prefix+i,year_level:1}});
    const a=await prisma.workloadAssignment.create({data:{faculty_id:faculty,term_id:term,subject_id:subject.id,section_id:s.id}});
    if(!assignment){assignment=a.id;section=s.id;}
  }
  designation=(await prisma.designation.create({data:{name:prefix+'Coordinator',default_hours:6,grants_service_credit:true,service_credit_hours:2}})).id;
  chair=signAccessToken({userId:'test-chair',role:'CHAIR',facultyId:null});
  own=signAccessToken({userId:'test-faculty',role:'FACULTY',facultyId:faculty});
  outsider=signAccessToken({userId:'test-other',role:'FACULTY',facultyId:other});
  admin=signAccessToken({userId:'test-admin',role:'ACADEMIC_ADMIN',facultyId:null});
});
beforeEach(async()=>{
  await prisma.workloadAssignment.deleteMany({where:{term_id:term,subject:{code:prefix+'SECOND'}}});
  await prisma.subject.deleteMany({where:{code:prefix+'SECOND'}});
  await prisma.facultySession.deleteMany({where:{term_id:term}});
  await prisma.scheduleSlot.deleteMany({where:{workload_assignment:{term_id:term}}});
  await prisma.facultyLoad.deleteMany({where:{term_id:term}});
  await prisma.facultySectionStudents.deleteMany({where:{term_id:term}});
  await prisma.facultyDesignation.deleteMany({where:{term_id:term}});
});
afterAll(async()=>{
  await prisma.facultySession.deleteMany({where:{term_id:term}});
  await prisma.facultyDesignation.deleteMany({where:{term_id:term}});
  await prisma.workloadAssignment.deleteMany({where:{term_id:term}});
  await prisma.faculty.deleteMany({where:{employee_no:{startsWith:prefix}}});
  await prisma.subject.deleteMany({where:{code:{startsWith:prefix}}});
  await prisma.section.deleteMany({where:{name:{startsWith:prefix}}});
  await prisma.academicTerm.deleteMany({where:{id:term}});
  await prisma.designation.deleteMany({where:{name:{startsWith:prefix}}});
  await prisma.signatoryOption.deleteMany({where:{name:{startsWith:prefix}}});
});
describe('faculty program APIs',()=>{
  it('schedule slots accept faculty, section and room scopes with validated UUIDs',async()=>{
    await prisma.scheduleSlot.create({data:{workload_assignment_id:assignment,session_type:'LECTURE',day_of_week:'MON',start_time:'14:00',end_time:'15:00'}});
    for(const query of [`facultyId=${faculty}`,`sectionId=${section}`]){
      const res=await request(app).get(`/api/schedule-slots?termId=${term}&${query}`).set('Authorization',`Bearer ${chair}`);expect(res.status).toBe(200);expect(res.body.data).toHaveLength(1);
    }
    expect((await request(app).get(`/api/schedule-slots?termId=${term}&facultyId=${other}`).set('Authorization',`Bearer ${chair}`)).body.data).toHaveLength(0);
    const roomScope=await request(app).get(`/api/schedule-slots?termId=${term}&roomId=${section}`).set('Authorization',`Bearer ${chair}`);expect(roomScope.status).toBe(200);expect(roomScope.body.data).toHaveLength(0);
    expect((await request(app).get('/api/schedule-slots?roomId=invalid').set('Authorization',`Bearer ${chair}`)).status).toBe(400);
  });
  it('F10: faculty cannot read or edit someone else’s load, sessions, functions, or students',async()=>{
    for(const part of ['teaching-load','sessions','students']) expect((await request(app).get(endpoint(part)).set('Authorization',`Bearer ${outsider}`)).status).toBe(403);
    for(const part of ['functions','students']) expect((await request(app).put(endpoint(part)).set('Authorization',`Bearer ${outsider}`).send({})).status).toBe(403);
    expect((await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${outsider}`).send(session())).status).toBe(403);
  });
  it('validates minima and permits only Chair to override consultation',async()=>{
    const data={research_hours:6,extension_hours:4,imp_hours:0,consultation_hours:4};
    expect((await request(app).put(endpoint('functions')).set('Authorization',`Bearer ${own}`).send({...data,research_hours:0})).status).toBe(400);
    expect((await request(app).put(endpoint('functions')).set('Authorization',`Bearer ${own}`).send({...data,consultation_hours:3})).status).toBe(403);
    expect((await request(app).put(endpoint('functions')).set('Authorization',`Bearer ${admin}`).send({...data,consultation_hours:3})).status).toBe(403);
    expect((await request(app).put(endpoint('functions')).set('Authorization',`Bearer ${chair}`).send({...data,consultation_hours:3})).status).toBe(200);
  });
  it('counts declared vs plotted functions from persisted sessions on read',async()=>{
    await request(app).put(endpoint('functions')).set('Authorization',`Bearer ${own}`).send({research_hours:6,extension_hours:4,imp_hours:0});
    expect((await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({end_time:'10:00'}))).status).toBe(201);
    const res=await request(app).get(endpoint('teaching-load')).set('Authorization',`Bearer ${own}`);
    expect(res.status).toBe(200);expect(res.body.load.functions.research).toEqual({declared:6,plotted:2,counted:2});expect(res.body.load.total_faculty_time).toBe(23);
  });
  it('F8: overload accepts 4 hours, rejects 5 and rejects sub-hour/non-whole sessions',async()=>{
    for(const end_time of ['08:30','09:30']) expect((await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({type:'OVERLOAD',end_time}))).status).toBe(400);
    expect((await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({type:'OVERLOAD',end_time:'12:00'}))).status).toBe(201);
    const extra=await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({type:'OVERLOAD',start_time:'13:00',end_time:'14:00'}));
    expect(extra.status).toBe(409);expect(extra.body.error.code).toBe('OVERLOAD_CAP_EXCEEDED');
    const res=await request(app).get(endpoint('teaching-load')).set('Authorization',`Bearer ${own}`);expect(res.body.load.claim_session_hours).toBe(4);expect(res.body.load.overload_remaining_to_plot).toBe(0);
  });
  it('designations require valid sessions and only accepted flagged designations earn credit',async()=>{
    const assigned=await request(app).post(`/api/faculty/${faculty}/designations`).set('Authorization',`Bearer ${admin}`).send({designation_id:designation,term_id:term,hours:6,service_credit:2});
    expect(assigned.status).toBe(201);const id=assigned.body.designation.id;
    const duplicate=await request(app).post(`/api/faculty/${faculty}/designations`).set('Authorization',`Bearer ${admin}`).send({designation_id:designation,term_id:term,hours:6});expect(duplicate.status).toBe(409);
    expect((await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({type:'DESIGNATION',faculty_designation_id:id,end_time:'08:30'}))).status).toBe(400);
    expect((await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({type:'DESIGNATION',faculty_designation_id:id,end_time:'14:00'}))).status).toBe(201);
    const res=await request(app).get(endpoint('teaching-load')).set('Authorization',`Bearer ${own}`);expect(res.body.load.designation_hours).toBe(6);expect(res.body.load.service_credits).toBe(2);
  });
  it('rejects function-vs-function conflicts and supports move, delete, then same-time recreation',async()=>{
    const first=await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session());expect(first.status).toBe(201);
    expect((await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({type:'EXTENSION'}))).status).toBe(409);
    expect((await request(app).patch(`/api/faculty-sessions/${first.body.session.id}`).set('Authorization',`Bearer ${own}`).send({start_time:'10:00',end_time:'11:00'})).status).toBe(200);
    expect((await request(app).delete(`/api/faculty-sessions/${first.body.session.id}`).set('Authorization',`Bearer ${outsider}`)).status).toBe(403);
    expect((await request(app).delete(`/api/faculty-sessions/${first.body.session.id}`).set('Authorization',`Bearer ${own}`)).status).toBe(204);
    expect((await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({start_time:'10:00',end_time:'11:00'}))).status).toBe(201);
  });
  it('rejects session-vs-teaching and teaching-vs-session with existing override flow',async()=>{
    await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session());
    const placement={workload_assignment_id:assignment,session_type:'LECTURE',day_of_week:'MON',start_time:'08:00',end_time:'09:00'};
    const clash=await request(app).post('/api/schedule-slots').set('Authorization',`Bearer ${chair}`).send(placement);
    expect(clash.status).toBe(409);expect(clash.body.error.details.conflicting_slots[0].subject_code).toBe('RESEARCH');
    const {workload_assignment_id,...override}=placement;
    expect((await request(app).post(`/api/schedule-slots/${assignment}/confirm-override`).set('Authorization',`Bearer ${chair}`).send(override)).status).toBe(201);
    const next=await request(app).post(endpoint('sessions')).set('Authorization',`Bearer ${own}`).send(session({type:'EXTENSION'}));expect(next.status).toBe(409);
  });
  it('validates student ranges/handled sections and deduplicates sections across subjects',async()=>{
    const second=await prisma.subject.create({data:{code:prefix+'SECOND',title:'Other subject',units:3,lecture_hours:3}});
    await prisma.workloadAssignment.create({data:{faculty_id:faculty,term_id:term,section_id:section,subject_id:second.id}});
    for(const count of [-1,201,2.5]) expect((await request(app).put(endpoint('students')).set('Authorization',`Bearer ${own}`).send({students:[{section_id:section,student_count:count}]})).status).toBe(400);
    const res=await request(app).put(endpoint('students')).set('Authorization',`Bearer ${own}`).send({students:[{section_id:section,student_count:35}]});expect(res.status).toBe(200);expect(res.body.total_students).toBe(35);expect(res.body.students).toHaveLength(5);
  });
  it('validates real dates and applies faculty override then falls back to term defaults',async()=>{
    expect((await request(app).patch(`/api/terms/${term}/effectivity`).set('Authorization',`Bearer ${chair}`).send({effectivity_start:'2026-02-30',effectivity_end:'2026-02-01'})).status).toBe(400);
    const res=await request(app).put(endpoint('effectivity')).set('Authorization',`Bearer ${chair}`).send({effectivity_start:'2026-12-01',effectivity_end:'2027-01-31'});expect(res.status).toBe(200);
    const load=await request(app).get(endpoint('teaching-load')).set('Authorization',`Bearer ${own}`);expect(load.body.load.effectivity).toEqual({start:'2026-12-01',end:'2027-01-31',source:'FACULTY'});
  });
  it('protects Chair settings, validates signatories, and soft-deletes options',async()=>{
    for(const path of ['/api/load-settings','/api/form-settings']) expect((await request(app).put(path).set('Authorization',`Bearer ${admin}`).send({})).status).toBe(403);
    const option=await request(app).post('/api/signatory-options').set('Authorization',`Bearer ${chair}`).send({slot:'PREPARED',name:prefix+'Signatory',title:'Fixture'});expect(option.status).toBe(201);
    expect((await request(app).delete(`/api/signatory-options/${option.body.option.id}`).set('Authorization',`Bearer ${chair}`)).status).toBe(204);
    expect((await prisma.signatoryOption.findUnique({where:{id:option.body.option.id}}))?.active).toBe(false);
  });
  it('shares form settings and signatory options, accepts print-only custom signatures, and scopes forms',async()=>{
    const res=await request(app).get(`/api/forms/faculty/${faculty}?termId=${term}&sig_prepared=Fixture%20Custom`).set('Authorization',`Bearer ${own}`);
    expect(res.status).toBe(200);expect(res.body.template.type).toBe('FACULTY_CLASS_PROGRAM');expect(res.body.signatures[0].name).toBe('Fixture Custom');
    expect(res.body.effectivity).toEqual({start:'2026-11-01',end:'2027-03-31',source:'TERM'});
    expect(res.body.load.teaching_hours).toBe(25.5);
    expect((await prisma.signatoryOption.count({where:{name:'Fixture Custom'}}))).toBe(0);
    expect((await request(app).get(`/api/forms/faculty/${faculty}?termId=${term}`).set('Authorization',`Bearer ${outsider}`)).status).toBe(403);
    expect((await request(app).get(`/api/forms/sections/${section}?termId=${term}`).set('Authorization',`Bearer ${own}`)).status).toBe(403);
    const student=await request(app).get(`/api/forms/sections/${section}?termId=${term}`).set('Authorization',`Bearer ${chair}`);expect(student.status).toBe(200);expect(student.body.template.type).toBe('STUDENT_CLASS_PROGRAM');
  });
});
