import { z } from 'zod';
export const termIdQuery = z.object({termId:z.string().uuid()});
export const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v)=>!Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,'Invalid calendar date');
export const effectivitySchema = z.object({effectivity_start:dateText.nullable(),effectivity_end:dateText.nullable()}).strict().refine(d=>(d.effectivity_start===null && d.effectivity_end===null)||!!(d.effectivity_start && d.effectivity_end && d.effectivity_end>=d.effectivity_start),'Supply both dates with end on or after start');
const hours=z.number().finite().min(0).max(168);
export const functionsSchema=z.object({research_hours:hours,extension_hours:hours,imp_hours:hours,consultation_hours:hours.optional()}).strict();
export const sessionSchema=z.object({
  type:z.enum(['RESEARCH','EXTENSION','IMP','CONSULTATION','DESIGNATION','OVERLOAD']),
  faculty_designation_id:z.string().uuid().nullable().optional(),
  day_of_week:z.enum(['MON','TUE','WED','THU','FRI','SAT']),
  start_time:z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|30)$/),
  end_time:z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|30)$/),
}).strict().refine(d=>d.end_time>d.start_time,'End time must be after start time')
  .refine(d=>d.type==='DESIGNATION'?!!d.faculty_designation_id:!d.faculty_designation_id,'Only DESIGNATION sessions require a designation');
export const studentsSchema=z.object({students:z.array(z.object({section_id:z.string().uuid(),student_count:z.number().int().min(0).max(200)}).strict()).max(500)}).strict().refine(d=>new Set(d.students.map(s=>s.section_id)).size===d.students.length,'Duplicate section');
