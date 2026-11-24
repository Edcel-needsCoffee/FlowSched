import { beforeAll,afterAll,it,expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { createApp } from '../app.js';
import { signAccessToken } from '../services/auth.service.js';
import { attachPlannerSocket } from '../services/planner-socket.js';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
const prefix=`APPROVAL-${Date.now()}-`;const app=createApp();let secondFaculty='',faculty='',term='',own='',chair='',other='';
beforeAll(async()=>{process.env.JWT_SECRET??='test-access-secret';faculty=(await prisma.faculty.create({data:{employee_no:prefix,first_name:'Approval',last_name:'Fixture'}})).id;secondFaculty=(await prisma.faculty.create({data:{employee_no:prefix+'2',first_name:'Second',last_name:'Fixture'}})).id;term=(await prisma.academicTerm.create({data:{school_year:prefix,semester:'FIRST'}})).id;own=signAccessToken({userId:'fixture',role:'FACULTY',facultyId:faculty});chair=signAccessToken({userId:'chair',role:'CHAIR',facultyId:null});other=signAccessToken({userId:'other',role:'FACULTY',facultyId:secondFaculty});});
afterAll(async()=>{await prisma.plannerDraft.deleteMany({where:{term_id:term}});await prisma.facultySession.deleteMany({where:{term_id:term}});await prisma.faculty.deleteMany({where:{id:{in:[faculty,secondFaculty]}}});await prisma.academicTerm.delete({where:{id:term}});});
it('lets only the Chair open a term with a target and locks faculty edits when closed', async()=>{
 const config=`/api/faculty/${faculty}/planner-access?termId=${term}`;
 const sessions=`/api/faculty/${faculty}/sessions?termId=${term}`;
 const data={type:'RESEARCH',day_of_week:'MON',start_time:'08:00',end_time:'08:30'};
 const targets={research:5,extension:2.5,imp:1,consultation:3};
 const auth=(token:string)=>({Authorization:`Bearer ${token}`});
 expect((await request(app).post(sessions).set(auth(own)).send(data)).status).toBe(403);
 expect((await request(app).put(config).set(auth(own)).send({enabled:true,targets})).status).toBe(403);
 expect((await request(app).put(config).set(auth(chair)).send({enabled:true})).status).toBe(400);
 expect((await request(app).put(config).set(auth(chair)).send({enabled:true,targets})).status).toBe(200);
 expect((await request(app).post(sessions).set(auth(other)).send(data)).status).toBe(403);
 const secondConfig=`/api/faculty/${secondFaculty}/planner-access?termId=${term}`;
 expect((await request(app).get(secondConfig).set(auth(other))).body).toEqual({enabled:false,targets:null});
 expect((await request(app).get(config).set(auth(other))).status).toBe(403);
 expect((await request(app).put(secondConfig).set(auth(chair)).send({enabled:false,targets:{...targets,research:8}})).status).toBe(200);
 expect((await request(app).get(config).set(auth(own))).body).toEqual({enabled:true,targets});
 const saved=await request(app).post(sessions).set(auth(own)).send(data);
 expect(saved.status).toBe(201);
 const load=await request(app).get(`/api/faculty/${faculty}/teaching-load?termId=${term}`).set(auth(own));
 expect(load.body.load).toMatchObject({weekly_hours:40,total_faculty_time:0.5,remaining_to_target:39.5,functions:{consultation:{declared:3}}});
 const limits = { research: 1, extension: 0.5, imp: 0, consultation: 0.5 };
 expect((await request(app).put(config).set(auth(chair)).send({enabled:true,targets:limits})).status).toBe(200);
 const add = (type: string, start_time: string, end_time: string) =>
   request(app).post(sessions).set(auth(own)).send({...data,type,start_time,end_time});
 const secondResearch = await add('RESEARCH','09:00','09:30');
 expect(secondResearch.status).toBe(201);
 expect((await add('EXTENSION','10:00','10:30')).status).toBe(201);
 expect((await add('CONSULTATION','10:30','11:00')).status).toBe(201);
 for (const type of ['RESEARCH','EXTENSION','IMP','CONSULTATION']) {
   const denied = await add(type,'11:00','11:30');
   expect(denied.status).toBe(409);
   expect(denied.body.error.code).toBe('FUNCTION_TARGET_EXCEEDED');
 }
 const move = `/api/faculty-sessions/${secondResearch.body.session.id}`;
 expect((await request(app).patch(move).set(auth(own)).send({start_time:'11:00',end_time:'11:30'})).status).toBe(200);
 const extended = await request(app).patch(move).set(auth(own)).send({end_time:'12:00'});
 expect(extended.status).toBe(409);
 expect(extended.body.error.code).toBe('FUNCTION_TARGET_EXCEEDED');
 expect(await prisma.facultySession.findUnique({where:{id:secondResearch.body.session.id}}))
   .toMatchObject({start_time:'11:00',end_time:'11:30'});
 expect((await request(app).put(config).set(auth(chair)).send({enabled:false,targets})).status).toBe(200);
 const session=`/api/faculty-sessions/${saved.body.session.id}`;
 expect((await request(app).patch(session).set(auth(own)).send({start_time:'07:30'})).status).toBe(403);
 expect((await request(app).delete(session).set(auth(own))).status).toBe(403);
 expect((await request(app).get('/api/planner-reviews').set(auth(chair))).status).toBe(404);
});

it('pushes both Chair switch changes to an authenticated faculty socket', async () => {
  const server = app.listen(0, '127.0.0.1');
  attachPlannerSocket(server);
  await once(server, 'listening');
  const url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/api/planner-live`;
  const socket = new WebSocket(url);
  const denied = new WebSocket(url);
  const config = `/api/faculty/${faculty}/planner-access?termId=${term}`;
  const targets = { research: 2, extension: 1, imp: 0, consultation: 2 };
  const nextMessage = () => new Promise(resolve => socket.addEventListener('message', event => resolve(JSON.parse(event.data)), { once: true }));
  try {
    denied.addEventListener('open', () => denied.send(JSON.stringify({token:other,facultyId:faculty,termId:term})), {once:true});
    const rejected = new Promise(resolve => denied.addEventListener('close', event => resolve(event.code), {once:true}));
    socket.addEventListener('open', () => socket.send(JSON.stringify({token:own,facultyId:faculty,termId:term})), {once:true});
    expect(await nextMessage()).toMatchObject({enabled:false});
    expect(await rejected).toBe(1008);
    for (const enabled of [true,false]) {
      const update = nextMessage();
      const saved = await request(server).put(config).set('Authorization', `Bearer ${chair}`).send({enabled,targets});
      expect(saved.status).toBe(200);
      expect(await update).toEqual({enabled,targets});
    }
  } finally {
    socket.close();
    denied.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
