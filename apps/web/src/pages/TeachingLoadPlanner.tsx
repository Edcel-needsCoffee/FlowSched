import { useRef,useState,type ReactNode } from 'react';
import { DndContext,DragOverlay,PointerSensor,KeyboardSensor,pointerWithin,rectIntersection,useSensor,useSensors,useDraggable,useDroppable,type CollisionDetection,type DragEndEvent,type DragStartEvent } from '@dnd-kit/core';
import { motion,useReducedMotion } from 'framer-motion';
import { DurationPicker } from './Schedule/SchedulePage';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { type FacultySession,type FunctionType,type LoadDesignation,sessionDuration } from '../lib/teaching-load';
import type { ScheduleSlot } from '../lib/schedule-slots';
import { formatTime12h } from './Schedule/schedule-time';
export const FUNCTION_COLORS:Record<FunctionType,string>={RESEARCH:'#D1FAE5',EXTENSION:'#DBEAFE',IMP:'#EDE9FE',CONSULTATION:'#FEF3C7',DESIGNATION:'#FCE7F3',OVERLOAD:'#FFEDD5'};
const days=['MON','TUE','WED','THU','FRI'];
const mins=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export type SessionInput=Omit<FacultySession,'id'>;
const plannerCollision: CollisionDetection = args =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
function Chip({type,id,label,plotted,target,locked}:{type:FunctionType;id?:string;label:string;plotted:number;target?:number;locked:boolean}){
  const drag=useDraggable({id:`chip-${type}-${id??''}`,disabled:locked,data:{type,faculty_designation_id:id??null}});
  return <button ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} disabled={locked} className="tlp-chip rounded-xl border border-black px-3 py-2 text-xs font-semibold text-black touch-none" style={{background:FUNCTION_COLORS[type]}}><span className="block text-sm">{label}</span><span className="block font-medium">{target&&target>0?`${plotted} of ${target}h · ${plotted>=target?'Completed':`${Number((target-plotted).toFixed(2))}h left`}`:`${plotted}h plotted`}</span>{target!==undefined&&target>0&&<progress aria-label={label+' progress'} className="mt-1 block h-1.5 w-full accent-emerald-600" value={Math.min(plotted,target)} max={target}/>}</button>;
}
function DropCell({day,start}:{day:string;start:string}){
  const drop=useDroppable({id:`${day}-${start}`,data:{day,start}});
  return <div ref={drop.setNodeRef} className={`tlp-drop-cell h-7 border-b border-black ${drop.isOver?'tlp-drop-active':'bg-white'}`} aria-label={`${day} ${formatTime12h(start)}`} />;
}
function SessionBlock({session,start,onDelete,readOnly}:{session:FacultySession;start:number;onDelete:(session:FacultySession)=>void;readOnly:boolean}){
  const drag=useDraggable({id:session.id,disabled:readOnly,data:{...session,sessionId:session.id}});
  return <motion.div ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} layout={!drag.isDragging} transition={{type:'spring',stiffness:500,damping:30}} style={{position:'absolute',top:(mins(session.start_time)-start)/30*28,height:sessionDuration(session)*56,left:2,right:2,background:FUNCTION_COLORS[session.type],transform:drag.transform?`translate(${drag.transform.x}px,${drag.transform.y}px)`:undefined,zIndex:drag.isDragging?30:10}} className={`tlp-session group overflow-hidden rounded border border-ink/20 p-1 text-[10px] text-ink touch-none ${drag.isDragging?'opacity-0':''}`}>
    <strong>{session.type}</strong><div>{formatTime12h(session.start_time)} - {formatTime12h(session.end_time)}</div>
    {!readOnly&&<button className="tlp-remove absolute right-1 bottom-1 rounded border border-black bg-white px-1 font-semibold text-black" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDelete(session);}} aria-label={`Remove ${session.type} ${session.day_of_week} ${formatTime12h(session.start_time)}`}>Remove</button>}
  </motion.div>;
}
export function TeachingLoadPlanner({slots,sessions,designations,minimum,onSave,onDelete,readOnly=false,headerActions,targets={},functionLimits={}}:{slots:ScheduleSlot[];sessions:FacultySession[];designations:LoadDesignation[];minimum:number;onSave:(data:SessionInput,id?:string)=>Promise<void>;onDelete:(id:string)=>void;readOnly?:boolean;headerActions?:ReactNode;targets?:Partial<Record<FunctionType,number>>;functionLimits?:Partial<Record<FunctionType,number>>}){
  const reduce=useReducedMotion();
  const gridMinimum=Math.ceil(minimum*2)/2;
  const maximum=23.5;
  const [duration,setDuration]=useState(gridMinimum);
  const [message,setMessage]=useState('');
  const [activeDrag,setActiveDrag]=useState<Record<string,unknown>|null>(null);
  const [sessionToDelete,setSessionToDelete]=useState<FacultySession|null>(null);
  const [activeWidth,setActiveWidth]=useState(132);const gridRef=useRef<HTMLDivElement|null>(null);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor));
  const start=Math.min(420,...slots.map(s=>mins(s.start_time)),...sessions.map(s=>mins(s.start_time)));
  const end=Math.max(1200,...slots.map(s=>mins(s.end_time)),...sessions.map(s=>mins(s.end_time)));
  const periods=Array.from({length:Math.ceil((end-start)/30)},(_,i)=>time(start+i*30));
  const activeHours=activeDrag?.sessionId?sessionDuration(activeDrag as unknown as FacultySession):duration;
  async function save(data:SessionInput,id?:string){
    try {
      await onSave(data,id);
    } catch (error) {
      setMessage(error instanceof Error?error.message:'Could not save session');
    }
  }
  function onDrop(event:DragEndEvent){
    const data=event.active.data.current;const target=event.over?.data.current;if(!data || !target)return;
    const hours=data.sessionId?sessionDuration(data as FacultySession):duration;
    const end=mins(target.start)+hours*60;
    if(end>=1440){setMessage('Session must end before midnight');return;}
    if(readOnly)return;
    const endTime = time(end);
    const overlaps = (block: { day_of_week:string; start_time:string; end_time:string }) =>
      block.day_of_week === target.day && target.start < block.end_time && endTime > block.start_time;
    const session = sessions.find(block => block.id !== data.sessionId && overlaps(block));
    const teaching = slots.find(overlaps);
    const conflict = session ?? teaching;
    if (conflict) {
      const label = session?.type ?? teaching?.subject_code ?? 'a scheduled block';
      setMessage(`This time overlaps ${label} on ${target.day}, ${formatTime12h(conflict.start_time)}–${formatTime12h(conflict.end_time)}. Choose a free slot.`);
      return;
    }
    const limit = functionLimits[data.type as FunctionType];
    const previous = sessions.find(block => block.id === data.sessionId && block.type === data.type);
    const previousHours = previous ? sessionDuration(previous) : 0;
    if (limit !== undefined && hours > previousHours) {
      const plotted = sessions.filter(block => block.type === data.type)
        .reduce((total, block) => total + sessionDuration(block), 0);
      const remaining = Math.max(0, limit - plotted);
      if (hours - previousHours > remaining) {
        setMessage(`${data.type} has a ${limit}h weekly limit. ${remaining}h left to add.`);
        return;
      }
    }
    void save({type:data.type,faculty_designation_id:data.faculty_designation_id,day_of_week:target.day,start_time:target.start,end_time:endTime},data.sessionId);
  }
  return <section className={`teaching-load-planner ${readOnly?'planner-readonly':''} rounded-2xl border border-leaf-100 bg-white p-5`}>
    <div className="tlp-title-row"><div><h2 className="font-semibold">Weekly function planner</h2><p className="my-2 text-xs text-ink/60">{readOnly?'The Chair has closed editing for this term.':'Drag a type onto the half-hour grid. Teaching is read-only. Drag existing sessions to move them.'}</p></div>{headerActions&&<div className="tlp-header-actions">{headerActions}</div>}</div>
    {!readOnly&&<DurationPicker value={duration} remaining={maximum} cap={maximum} minimum={gridMinimum} note="Functions can be plotted in 30-minute sessions. Overload requires whole hours." onStep={delta=>setDuration(v=>Math.max(gridMinimum,Math.min(maximum,v+delta*.5)))} onCommit={raw=>{const v=Number(raw);if(Number.isFinite(v)&&v>=gridMinimum&&v<=maximum&&Number.isInteger(v*2))setDuration(v);}} />}
    <DndContext collisionDetection={plannerCollision} sensors={readOnly?[]:sensors} onDragStart={(event:DragStartEvent)=>{if(readOnly)return;setActiveDrag(event.active.data.current as Record<string,unknown>);const column=gridRef.current?.querySelector<HTMLElement>('.tlp-day-column');if(column)setActiveWidth(Math.max(40,column.getBoundingClientRect().width-4));}} onDragEnd={event=>{onDrop(event);setActiveDrag(null);}} onDragCancel={()=>setActiveDrag(null)}>
      <div className="my-3 flex flex-wrap gap-2" aria-label="Session types and color legend">{(['RESEARCH','EXTENSION','IMP','CONSULTATION','OVERLOAD'] as FunctionType[]).map(t=><Chip key={t} type={t} label={t} locked={readOnly} plotted={sessions.filter(s=>s.type===t).reduce((total,s)=>total+sessionDuration(s),0)} target={targets[t]}/>)}{designations.map(d=><Chip key={d.id} type="DESIGNATION" id={d.id} label={d.name} locked={readOnly} plotted={d.plotted_hours} target={d.hours}/>)}</div>
      <div className="tlp-viewport overflow-x-auto rounded-lg border border-black bg-white"><div ref={gridRef} className="tlp-grid grid min-w-[900px]" style={{gridTemplateColumns:'76px repeat(5,minmax(120px,1fr))'}}>
        <div className="tlp-heading text-xs">TIME</div>{days.map(d=><div key={d} className="tlp-heading text-center text-xs font-semibold">{d}</div>)}
        <div>{periods.map(t=><div key={t} className="tlp-time h-7 border-b text-[10px]">{formatTime12h(t)}</div>)}</div>
        {days.map(d=><div key={d} className="tlp-day-column relative border-l border-black" style={{height:periods.length*28}}>
          {periods.map(t=><DropCell key={t} day={d} start={t}/>)}
          <div aria-label="Lunch Break, 12:00 PM to 1:00 PM" className="pointer-events-none absolute inset-x-0 z-[1] flex items-center justify-center border-y border-neutral-400 bg-neutral-300/65 text-[11px] font-semibold text-neutral-700 dark:border-neutral-500 dark:bg-neutral-600/60 dark:text-neutral-100" style={{top:(720-start)/30*28,height:56}}>Lunch Break</div>
          {slots.filter(s=>s.day_of_week===d).map(s=><div key={s.id} className="tlp-teaching pointer-events-none absolute left-1 right-1 overflow-hidden rounded p-1 text-[10px]" style={{top:(mins(s.start_time)-start)/30*28,height:(mins(s.end_time)-mins(s.start_time))/30*28}}>{s.subject_code}<br/>{s.section_label}<br/>{s.room_name??'TBA'}</div>)}
          {sessions.filter(s=>s.day_of_week===d).map(s=><SessionBlock key={s.id} session={s} start={start} readOnly={readOnly} onDelete={s=>{if(!readOnly)setSessionToDelete(s);}}/>)}
        </div>)}
      </div></div>
      <DragOverlay dropAnimation={reduce?null:{duration:180,easing:'cubic-bezier(0.18, 0.67, 0.6, 1.22)'}}>
        {activeDrag&&<div className="tlp-drag-overlay box-border overflow-hidden rounded-md border-2 border-dashed border-black p-2 text-sm font-bold text-black" style={{width:activeWidth,height:activeHours*56,backgroundColor:FUNCTION_COLORS[activeDrag.type as FunctionType]??'#D1D5DB',opacity:.45}}>{String(activeDrag.type??'SESSION')}<br/>{activeDrag.start_time&&activeDrag.end_time?`${formatTime12h(String(activeDrag.start_time))} – ${formatTime12h(String(activeDrag.end_time))}`:`${activeHours} hour${activeHours===1?'':'s'} · drop into a time slot`}</div>}
      </DragOverlay>
    </DndContext>
    <Modal open={Boolean(message)} title="Could not place session" onClose={()=>setMessage('')}>
      <p role="alert" className="text-sm">{message}</p>
      <div className="mt-4 flex justify-end"><button type="button" className="load-button rounded-lg px-4 py-2 text-sm font-semibold" onClick={()=>setMessage('')}>OK</button></div>
    </Modal>
    <ConfirmDialog open={Boolean(sessionToDelete)} title="Remove function session?" message={sessionToDelete?`Remove the ${sessionToDelete.type.toLowerCase()} session on ${sessionToDelete.day_of_week} from ${formatTime12h(sessionToDelete.start_time)} to ${formatTime12h(sessionToDelete.end_time)}?`:''} confirmLabel="Remove session" onConfirm={()=>{if(sessionToDelete){onDelete(sessionToDelete.id);setSessionToDelete(null);}}} onCancel={()=>setSessionToDelete(null)} />
  </section>;
}
