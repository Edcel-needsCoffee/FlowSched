import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildFacultyScheduleWorkbook } from './faculty-schedule-export';
import type { ScheduleSlot } from './schedule-slots';

const template = new Uint8Array(readFileSync(resolve(process.cwd(), 'public/faculty-class-program-template.xlsx')));
const slot = (data: Partial<ScheduleSlot> = {}): ScheduleSlot => ({
  id: 's1', workload_assignment_id: 'w1', faculty_id: 'f1', faculty_name: 'Maria Santos',
  subject_code: 'IT 109', subject_title: 'Information Technology', subject_units: 3,
  section_id: 'sec1', section_label: 'BSIT II-A', term_id: 't1',
  room_id: 'r1', room_name: 'ICT-Lab2', day_of_week: 'MON',
  start_time: '08:00', end_time: '09:00', session_type: 'LECTURE', session_hours: 1,
  color: null, created_at: '', updated_at: '', ...data,
});
async function build(slots: ScheduleSlot[]) {
  const bytes = await buildFacultyScheduleWorkbook({
    faculty: {id:'f1',name:'Maria Santos',rank:'Instructor I'},
    termLabel:'2026-2027 — 2nd Sem', slots, template,
  });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as never);
  return { wb, ws:wb.worksheets[0], bytes };
}
describe('faculty program reference export', () => {
  it('preserves both logos, institution/form details, signatures and computes real lecture/lab hours', async () => {
    const {wb,ws} = await build([
      slot(), slot({id:'s2',day_of_week:'TUE',session_type:'LAB',end_time:'11:00'}),
      slot({id:'other',faculty_id:'f2',subject_code:'EXCLUDED'}),
    ]);
    expect(ws.getImages()).toHaveLength(2);
    expect(wb.model.media).toHaveLength(2);
    expect(ws.getCell('C2').value).toBe('PALOMPON INSTITUTE OF TECHNOLOGY');
    expect(ws.getCell('F1').value).toContain('PIT-COTE-FOR-3-2-01B');
    expect(ws.getCell('B9').value).toBe('Maria Santos');
    expect(ws.getCell('B10').value).toBe('Instructor I');
    expect(ws.getCell('B41').value).toBe(1);
    expect(ws.getCell('C41').value).toBe(3);
    expect(ws.getCell('D41').formula).toBe('B41+(C41*0.7)');
    expect(ws.getCell('D41').result).toBeCloseTo(3.1);
    expect(ws.getCell('D49').formula).toBe('SUM(D41:D48)');
    expect(ws.getCell('D48').formula).toBe('B48+(C48*0.7)');
    expect(ws.getCell('D63').result).toBe(4);
    expect(ws.getCell('D52').formula).toBe('SUM(B52:C52)');
    expect(ws.getCell('C56').formula).toBe('SUM(C52:C55)');
    expect(ws.getCell('F43').formula).toBe('D49-12');
    expect(ws.getCell('B66').value).toBe('Maria Santos');
    expect(ws.getCell('B55').value).toBeNull();
    expect(ws.pageSetup.printArea).toBe('A1:F70');
  });
  it('keeps lunch and Saturday teaching, late hours and more than eight subjects without dropping entries', async () => {
    const slots = Array.from({length:10},(_,i)=>slot({id:`s${i}`,subject_code:`IT ${100+i}`,day_of_week:'SAT',start_time:`${String(7+i).padStart(2,'0')}:00`,end_time:`${String(8+i).padStart(2,'0')}:00`}));
    slots.push(slot({id:'late',subject_code:'LATE',day_of_week:'FRI',start_time:'19:00',end_time:'20:00'}));
    const {ws} = await build(slots);
    expect(ws.getCell('G13').value).toBe('SATURDAY');
    const rows: unknown[] = [];
    ws.eachRow((row) => rows.push(row.values));
    const text = JSON.stringify(rows);
    expect(text).toContain('IT 105'); // Noon class replaces the lunch band.
    expect(text).toContain('LATE');
    expect(text).not.toContain('L  U  N  C  H');
    const totals: {address:string;formula:string}[] = [];
    ws.eachRow((row)=>row.eachCell((cell)=>{if(cell.formula)totals.push({address:cell.address,formula:cell.formula});}));
    expect(totals.some((c)=>c.formula==='SUM(D44:D54)')).toBe(true);
    expect(totals.some((c)=>c.formula==='B55+C55+D62+D67')).toBe(true);
  });
});
