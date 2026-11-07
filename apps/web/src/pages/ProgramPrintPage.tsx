import { useEffect,useState } from 'react';
import { useParams,useSearchParams } from 'react-router-dom';
import { apiAssetUrl } from '../lib/api';
import { getProgramForm,type ProgramForm } from '../lib/program-forms';
import { FUNCTION_COLORS } from './TeachingLoadPlanner';
import { textArgbFor } from '../lib/schedule-export';
import { downloadProgramWorkbook } from '../lib/program-download';
import './program-print.css';
const days=['MON','TUE','WED','THU','FRI','SAT'];
const minutes=(v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3,5));
const clock=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export function ProgramTimetable({form}:{form:ProgramForm}){
  const blocks=[...form.slots.map(s=>({id:s.id,day:s.day_of_week,start:s.start_time,end:s.end_time,label:`${s.subject_code}${s.session_type==='LAB'?' L':''}\n${s.section_label}\n${s.room_name??'TBA'}`,color:s.color??'#D1FAE5'})),...(form.load?.sessions??[]).map(s=>({id:s.id,day:s.day_of_week,start:s.start_time,end:s.end_time,label:s.type,color:FUNCTION_COLORS[s.type]}))];
  const start=Math.floor(Math.min(420,...blocks.map(b=>minutes(b.start)))/30)*30,end=Math.ceil(Math.max(1200,...blocks.map(b=>minutes(b.end)))/30)*30;
  const rows=Array.from({length:(end-start)/30},(_,i)=>start+i*30);
  const heights=rows.map(()=>18);
  for(const block of blocks){const first=Math.max(0,Math.floor((minutes(block.start)-start)/30)),last=Math.ceil((minutes(block.end)-start)/30);const required=(block.label.split('\n').length*11+6)/(last-first);for(let i=first;i<last;i++)heights[i]=Math.max(heights[i],required);}
  const offsets=[0];for(const height of heights)offsets.push(offsets[offsets.length-1]+height);
  return <div className="program-timetable" style={{gridTemplateColumns:'70px repeat(6,minmax(0,1fr))'}}><strong>TIME</strong>{days.map(day=><strong key={day}>{day}</strong>)}<div>{rows.map((v,i)=><div className="program-period" style={{height:heights[i]}} key={v}>{clock(v)}–{clock(v+30)}</div>)}</div>
    {days.map(day=><div key={day} className="program-day" style={{height:offsets[offsets.length-1]}}>{rows.map((v,i)=><div key={v} style={{height:heights[i]}} className="program-period"/>)}{blocks.filter(b=>b.day===day).map(b=><div key={b.id} className="program-block" style={{top:offsets[Math.floor((minutes(b.start)-start)/30)],height:offsets[Math.ceil((minutes(b.end)-start)/30)]-offsets[Math.floor((minutes(b.start)-start)/30)],background:b.color,color:`#${textArgbFor(b.color).slice(2)}`}}>{b.label}</div>)}</div>)}
  </div>;
}
export function ProgramLoadSummary({form}:{form:ProgramForm}){
  const load=form.load;if(!load)return null;
  const metrics=[['Lecture hours',load.lecture_hours],['Laboratory hours',load.lab_hours],['Weighted laboratory hours',load.weighted_lab_hours],['Teaching hours',load.teaching_hours],['Preparations',load.preps],['Regular ceiling',`${load.prep_ceiling} (${load.prep_ceiling_source})`],['Regular teaching hours',load.regular_teaching_hours],['Teaching Overload',load.teaching_overload],['Claimable overload',load.claimable_overload_hours],['Overload plotted',load.overload_plotted_hours],['Claim for Teaching Overload',load.claim_session_hours],['Overload remaining to plot',load.overload_remaining_to_plot],['Teaching Service Credit',load.teaching_service_credit],['Service Credits (not counted in 40)',load.service_credits],...Object.entries(load.functions).map(([key,value])=>[`${key} (declared / plotted / counted)`,`${value.declared} / ${value.plotted} / ${value.counted}`]),['Designation hours',load.designation_hours],['Total faculty time / target',`${load.total_faculty_time} / ${load.weekly_hours}`],['Remaining to target',load.remaining_to_target]];
  return <div className="program-summary"><h2>Teaching Load</h2><table><tbody>{metrics.map(([label,value])=><tr key={label}><th>{label}</th><td>{value}</td></tr>)}</tbody></table>
    <h3>Designations</h3><table><thead><tr><th>Designation</th><th>Assigned</th><th>Plotted</th><th>Counted</th><th>Accepted</th></tr></thead><tbody>{load.designations.map(d=><tr key={d.id}><td>{d.name}</td><td>{d.hours}</td><td>{d.plotted_hours}</td><td>{d.counted_hours}</td><td>{d.accepted?'Yes':'No'}</td></tr>)}</tbody></table>
    <h3>Claim for Teaching Overload — sessions</h3><table><tbody>{load.sessions.filter(s=>s.type==='OVERLOAD').map(s=><tr key={s.id}><td>{s.day_of_week}</td><td>{s.start_time}–{s.end_time}</td></tr>)}</tbody></table>
    <h3>Students per distinct section</h3><table><tbody>{load.students_by_section.map(s=><tr key={s.section_id}><td>{s.section_name}</td><td>{s.student_count??'Not entered'}</td></tr>)}<tr><th>Total students</th><td>{load.total_students}</td></tr></tbody></table>
    {load.warnings.length>0&&<div className="program-warnings"><h3>Warnings</h3><ul>{load.warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
  </div>;
}
export function ProgramPrintPage(){
  const {kind='',id=''}=useParams();const [query]=useSearchParams();const termId=query.get('termId')??'';
  const [form,setForm]=useState<ProgramForm|null>(null),[error,setError]=useState(''),[tick,setTick]=useState(0);
  const [selected,setSelected]=useState<Record<string,string>>({}),[custom,setCustom]=useState<Record<string,string>>({});
  const [downloading,setDownloading]=useState(false),[exportError,setExportError]=useState('');
  useEffect(()=>{let active=true;setForm(null);setError('');void getProgramForm(kind,id,new URLSearchParams({termId})).then(data=>{if(active){setForm(data);setSelected(Object.fromEntries(data.signatures.map(s=>[s.slot,s.option_id??'custom'])));setCustom(Object.fromEntries(data.signatures.map(s=>[s.slot,s.name])));}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Could not load form');});return()=>{active=false;};},[kind,id,termId,tick]);
  useEffect(()=>{document.body.classList.add('printing-program');return()=>document.body.classList.remove('printing-program');},[]);
  if(error)return <div role="alert">{error}<button onClick={()=>setTick(n=>n+1)}>Retry</button></div>;
  if(!form)return <p role="status">Loading program form…</p>;
  const signatures=form.signatures.map(s=>{const option=form.signatory_options.find(o=>o.id===selected[s.slot]);return {...s,name:selected[s.slot]==='custom'?custom[s.slot]??'':option?.name??s.name,title:selected[s.slot]==='custom'?'':option?.title??s.title};});
  const invalid=signatures.some(s=>!s.name.trim());
  return <div className="program-print-root"><div className="no-print mb-5 rounded-xl border border-leaf-200 bg-white p-4"><h1 className="text-lg font-semibold">Print {form.template.title}</h1><p className="my-2 text-sm">Choose signatories before printing. Custom names apply to this print only.</p><div className="flex flex-wrap gap-3">{signatures.map(s=><label key={s.slot} className="text-sm">{s.slot}<select aria-label={`${s.slot} signatory`} className="mx-2 rounded border p-2" value={selected[s.slot]??''} onChange={e=>setSelected(v=>({...v,[s.slot]:e.target.value}))}>{form.signatory_options.filter(o=>o.slot===s.slot).map(o=><option key={o.id} value={o.id}>{o.name} — {o.title}</option>)}<option value="custom">Custom name</option></select>{selected[s.slot]==='custom'&&<input aria-label={`${s.slot} custom name`} maxLength={160} className="rounded border p-2" value={custom[s.slot]??''} onChange={e=>setCustom(v=>({...v,[s.slot]:e.target.value}))}/>}</label>)}</div><button disabled={invalid} onClick={()=>window.print()} className="mt-3 rounded-lg bg-leaf-500 px-4 py-2 disabled:opacity-50">Print program</button>{!form.template.ref_code&&<p className="mt-2 text-sm text-amber-700">This form’s approved reference code needs to be set in Form Settings.</p>}{!form.settings.tuv_logo_path&&<p className="mt-2 text-sm text-amber-700">TUV NORD logo has not been uploaded.</p>}</div>
    <div className="no-print mb-4"><button disabled={invalid||downloading} onClick={()=>{setDownloading(true);setExportError('');const signatures=Object.fromEntries(form.signatures.map(s=>[`sig_${s.slot.toLowerCase()}`,selected[s.slot]==='custom'?custom[s.slot]:selected[s.slot]]));void downloadProgramWorkbook(form.kind,form.entity.id,termId,`${form.template.title} - ${form.entity.name}`,signatures).catch(e=>setExportError(e instanceof Error?e.message:'Could not export workbook')).finally(()=>setDownloading(false));}} className="rounded-lg border border-leaf-300 bg-white px-4 py-2 disabled:opacity-50">{downloading?'Preparing Excel…':'Export Excel with these signatories'}</button>{exportError&&<p role="alert" className="text-red-700">{exportError}</p>}</div>
    <article className="program-sheet"><div className="program-header"><div>{form.settings.school_logo_path&&<img src={apiAssetUrl(form.settings.school_logo_path)??''} alt="School logo"/>}</div><div>{form.settings.school_lines.split('\n').map((line,i)=><p key={i}>{line}</p>)}<h1>{form.template.title}</h1><p>{form.term.label}</p></div><div className="program-control">{form.settings.tuv_logo_path&&<img src={apiAssetUrl(form.settings.tuv_logo_path)??''} alt="TUV NORD logo"/>}<p>Ref. Code: {form.template.ref_code}</p><p>Revision: {form.template.revision}</p></div></div>
      <div className="program-fields"><p><strong>{form.kind==='faculty'?'Faculty':form.kind==='sections'?'Section':'Room'}:</strong> {form.entity.name}</p><p><strong>Effectivity:</strong> {form.effectivity.start??'Not set'} to {form.effectivity.end??'Not set'}</p><p><strong>College:</strong> {form.settings.college_lines}</p><p><strong>Department:</strong> {form.settings.department}</p><p><strong>Program:</strong> {form.settings.program}</p>{form.entity.rank&&<p><strong>Academic rank:</strong> {form.entity.rank}</p>}</div>
      <ProgramTimetable form={form}/><ProgramLoadSummary form={form}/><div className="program-signatures">{signatures.map(s=><div key={s.slot}><p>{s.slot} BY:</p><strong>{s.name}</strong><p>{s.title}</p></div>)}</div>
    </article></div>;
}
