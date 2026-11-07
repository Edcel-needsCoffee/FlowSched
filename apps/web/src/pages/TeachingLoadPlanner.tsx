import { useState } from 'react';
import { DndContext,PointerSensor,KeyboardSensor,useSensor,useSensors,useDraggable,useDroppable,type DragEndEvent } from '@dnd-kit/core';
import { motion,useReducedMotion } from 'framer-motion';
import { DurationPicker } from './Schedule/SchedulePage';
import { Modal } from '../components/Modal';
import { type FacultySession,type FunctionType,type LoadDesignation,sessionDuration } from '../lib/teaching-load';
import type { ScheduleSlot } from '../lib/schedule-slots';
export const FUNCTION_COLORS:Record<FunctionType,string>={RESEARCH:'#D1FAE5',EXTENSION:'#DBEAFE',IMP:'#EDE9FE',CONSULTATION:'#FEF3C7',DESIGNATION:'#FCE7F3',OVERLOAD:'#FFEDD5'};
const days=['MON','TUE','WED','THU','FRI','SAT'];
const mins=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export type SessionInput=Omit<FacultySession,'id'>;
function Chip({type,id,label}:{type:FunctionType;id?:string;label:string}){
  const drag=useDraggable({id:`chip-${type}-${id??''}`,data:{type,faculty_designation_id:id??null}});
  return <button ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} className="rounded-full border border-leaf-200 px-3 py-2 text-xs font-medium text-ink touch-none" style={{background:FUNCTION_COLORS[type]}}>{label}</button>;
}
function DropCell({day,start}:{day:string;start:string}){
  const drop=useDroppable({id:`${day}-${start}`,data:{day,start}});
  return <div ref={drop.setNodeRef} className={`h-7 border-b border-leaf-100 ${drop.isOver?'bg-leaf-200':'even:bg-leaf-50/30'}`} aria-label={`${day} ${start}`} />;
}
function SessionBlock({session,start,onDelete}:{session:FacultySession;start:number;onDelete:(id:string)=>void}){
  const drag=useDraggable({id:session.id,data:{...session,sessionId:session.id}});
  return <div ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} style={{position:'absolute',top:(mins(session.start_time)-start)/30*28,height:sessionDuration(session)*56,left:2,right:2,background:FUNCTION_COLORS[session.type],transform:drag.transform?`translate(${drag.transform.x}px,${drag.transform.y}px)`:undefined,zIndex:drag.isDragging?30:10}} className="group overflow-hidden rounded border border-ink/20 p-1 text-[10px] text-ink touch-none">
    <strong>{session.type}</strong><div>{session.start_time}–{session.end_time}</div>
    <button className="absolute right-1 bottom-1 rounded bg-white px-1" onPointerDown={e=>e.stopPropagation()} onClick={()=>onDelete(session.id)} aria-label={`Delete ${session.type} ${session.day_of_week} ${session.start_time}`}>Remove</button>
  </div>;
}
export function TeachingLoadPlanner({slots,sessions,designations,minimum,onSave,onDelete}:{slots:ScheduleSlot[];sessions:FacultySession[];designations:LoadDesignation[];minimum:number;onSave:(data:SessionInput,id?:string)=>Promise<void>;onDelete:(id:string)=>void}){
  const reduce=useReducedMotion();
  const [duration,setDuration]=useState(Math.max(1,minimum));
  const [message,setMessage]=useState('');const [shake,setShake]=useState(0);const [open,setOpen]=useState(false);
  const [type,setType]=useState<FunctionType>('RESEARCH');const [designation,setDesignation]=useState('');const [day,setDay]=useState('MON');const [startTime,setStartTime]=useState('08:00');const [busy,setBusy]=useState(false);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor));
  const start=Math.min(420,...slots.map(s=>mins(s.start_time)),...sessions.map(s=>mins(s.start_time)));
  const end=Math.max(1200,...slots.map(s=>mins(s.end_time)),...sessions.map(s=>mins(s.end_time)));
  const periods=Array.from({length:Math.ceil((end-start)/30)},(_,i)=>time(start+i*30));
  async function save(data:SessionInput,id?:string){setBusy(true);setMessage('');try{await onSave(data,id);setOpen(false);}catch(error){setMessage(error instanceof Error?error.message:'Could not save session');setShake(n=>n+1);}finally{setBusy(false);}}
  function onDrop(event:DragEndEvent){
    const data=event.active.data.current;const target=event.over?.data.current;if(!data || !target)return;
    const hours=data.sessionId?sessionDuration(data as FacultySession):duration;
    const end=mins(target.start)+hours*60;
    if(end>=1440){setMessage('Session must end before midnight');return;}
    void save({type:data.type,faculty_designation_id:data.faculty_designation_id,day_of_week:target.day,start_time:target.start,end_time:time(end)},data.sessionId);
  }
  return <section className="rounded-2xl border border-leaf-100 bg-white p-5">
    <div className="flex items-center justify-between"><h2 className="font-semibold">Weekly function planner</h2><button className="rounded-lg bg-leaf-500 px-3 py-2 text-sm" onClick={()=>setOpen(true)}>Add session</button></div>
    <p className="my-2 text-xs text-ink/60">Drag a type onto the half-hour grid. Teaching is read-only. Drag existing sessions to move them.</p>
    <DurationPicker value={duration} remaining={12} cap={12} minimum={minimum} note={`Minimum ${minimum}h; overload requires whole hours.`} onStep={delta=>setDuration(v=>Math.max(minimum,Math.min(12,v+delta*.5)))} onCommit={raw=>{const v=Number(raw);if(Number.isFinite(v)&&v>=minimum&&v<=12&&Number.isInteger(v*2))setDuration(v);}} />
    <motion.div key={shake} animate={reduce?{}:{x:message?[0,-5,5,-3,0]:0}}>{message&&<p role="alert" className="my-2 text-sm text-red-700">{message}</p>}</motion.div>
    <DndContext sensors={sensors} onDragEnd={onDrop}>
      <div className="my-3 flex flex-wrap gap-2" aria-label="Session types and color legend">{(['RESEARCH','EXTENSION','IMP','CONSULTATION','OVERLOAD'] as FunctionType[]).map(t=><Chip key={t} type={t} label={t} />)}{designations.map(d=><Chip key={d.id} type="DESIGNATION" id={d.id} label={d.name}/>)}</div>
      <div className="overflow-x-auto"><div className="grid min-w-[900px]" style={{gridTemplateColumns:'64px repeat(6,minmax(120px,1fr))'}}>
        <div className="text-xs">TIME</div>{days.map(d=><div key={d} className="text-center text-xs font-semibold">{d}</div>)}
        <div>{periods.map(t=><div key={t} className="h-7 border-b border-leaf-100 text-[10px]">{t}</div>)}</div>
        {days.map(d=><div key={d} className="relative border-l border-leaf-100" style={{height:periods.length*28}}>
          {periods.map(t=><DropCell key={t} day={d} start={t}/>)}
          {slots.filter(s=>s.day_of_week===d).map(s=><div key={s.id} className="pointer-events-none absolute left-1 right-1 overflow-hidden rounded bg-slate-200 p-1 text-[10px] text-ink opacity-50" style={{top:(mins(s.start_time)-start)/30*28,height:(mins(s.end_time)-mins(s.start_time))/30*28}}>{s.subject_code}<br/>{s.section_label}<br/>{s.room_name??'TBA'}</div>)}
          {sessions.filter(s=>s.day_of_week===d).map(s=><SessionBlock key={s.id} session={s} start={start} onDelete={onDelete}/>)}
        </div>)}
      </div></div>
    </DndContext>
    <Modal open={open} onClose={()=>setOpen(false)} title="Add function session"><form className="space-y-3 p-6 pt-0" onSubmit={e=>{e.preventDefault();void save({type,faculty_designation_id:type==='DESIGNATION'?designation:null,day_of_week:day,start_time:startTime,end_time:time(mins(startTime)+duration*60)});}}>
      <label className="block">Type<select aria-label="Session type" value={type} onChange={e=>setType(e.target.value as FunctionType)} className="ml-2 rounded border p-2">{Object.keys(FUNCTION_COLORS).map(t=><option key={t}>{t}</option>)}</select></label>
      {type==='DESIGNATION'&&<label className="block">Designation<select required value={designation} onChange={e=>setDesignation(e.target.value)} className="ml-2 rounded border p-2"><option value="">Select…</option>{designations.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
      <label className="block">Day<select value={day} onChange={e=>setDay(e.target.value)} className="ml-2 rounded border p-2">{days.map(d=><option key={d}>{d}</option>)}</select></label>
      <label className="block">Start<input type="time" step={1800} value={startTime} onChange={e=>setStartTime(e.target.value)} className="ml-2 rounded border p-2" required/></label>
      <p className="text-sm">Duration: {duration} hours (set above the planner).</p>
      {message&&<p role="alert" className="text-red-700">{message}</p>}<button disabled={busy} className="rounded bg-leaf-500 px-4 py-2">{busy?'Saving…':'Save session'}</button>
    </form></Modal>
  </section>;
}
