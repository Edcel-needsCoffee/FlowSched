import './teaching-load.css';
import { useEffect, useState } from 'react';
import { motion,useReducedMotion } from 'framer-motion';
import { apiAssetUrl, apiFetch } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useTermStore,selectSelectedTerm } from '../store/term.store';
import { listFaculty,type FacultyMember } from '../lib/faculty';
import { listScheduleSlots,type ScheduleSlot } from '../lib/schedule-slots';
import { getTeachingLoad,getLoadSettings,getDesignations,type TeachingLoad,type LoadSettings,type Designation,type LoadDesignation } from '../lib/teaching-load';
import { TeachingLoadPlanner,type SessionInput } from './TeachingLoadPlanner';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { downloadProgramWorkbook } from '../lib/program-download';

const FUNCTION_LABELS = { research: 'Research', extension: 'Extension', imp: 'IMP', consultation: 'Consultation' } as const;
type FunctionKey = keyof typeof FUNCTION_LABELS;
const functionKeys = Object.keys(FUNCTION_LABELS) as FunctionKey[];
type PlannerAccess = { enabled: boolean; targets: Record<FunctionKey, number> | null };

/** Reads the existing server engine; no client-side duplicate calculation. */
export function TeachingLoadPage({plannerOnly=false}:{plannerOnly?:boolean}): JSX.Element {
  const user=useAuthStore(s=>s.user);const manage=user?.role==='CHAIR';
  const [accessResult,setAccess]=useState<{scope:string;value:PlannerAccess}|null>(null);
  const [editingTargets,setEditingTargets]=useState<string|null>(null);
  const [accessError,setAccessError]=useState<string|null>(null);
  const [targetInputs,setTargetInputs]=useState<Partial<Record<FunctionKey,string>>>({});
  const [selected,setSelected]=useState('');
  const [facultyName,setFacultyName]=useState('');
  const [exporting,setExporting]=useState(false);


  const facultyId=manage?selected:user?.facultyId;
  const termId = useTermStore((s) => s.selectedTermId);
  const termStatus=useTermStore(s=>s.status),loadTerms=useTermStore(s=>s.loadTerms),terms=useTermStore(s=>s.terms),selectTerm=useTermStore(s=>s.selectTerm),term=useTermStore(selectSelectedTerm);
  const [load,setLoad]=useState<TeachingLoad|null>(null);const [settings,setSettings]=useState<LoadSettings|null>(null);
  const [faculties,setFaculties]=useState<FacultyMember[]>([]),[designations,setDesignations]=useState<Designation[]>([]);
  const [slots,setSlots]=useState<ScheduleSlot[]>([]),[tick,setTick]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [students,setStudents]=useState<Record<string,string>>({});
  const [assign,setAssign]=useState(false),[master,setMaster]=useState(false),[designationId,setDesignationId]=useState('');
  const [assignedHours,setAssignedHours]=useState(0),[assignedCredit,setAssignedCredit]=useState(0);
  const [editingAssignment,setEditingAssignment]=useState<LoadDesignation|null>(null);
  const [designationDetails,setDesignationDetails]=useState('');
  const canSetDesignation=manage||(user?.role==='FACULTY'&&facultyId===user.facultyId);
  function openDesignation(assignment:LoadDesignation|null=null){setEditingAssignment(assignment);setDesignationDetails(assignment?.details??'');setDesignationId('');setAssignedHours(assignment?.hours??0);setAssignedCredit(assignment?.service_credit??0);setAssign(true);}
  const [editing,setEditing]=useState(''),[draft,setDraft]=useState({name:'',default_hours:0,service_credit_hours:0,grants_service_credit:false});
  const reduce=useReducedMotion(),{pushToast}=useToast();
  const field='load-field rounded-lg border border-leaf-200 bg-white px-3 py-2 text-sm text-ink';
  const panel='load-panel rounded-2xl border border-leaf-100 bg-white p-5';
  const button='load-button rounded-lg bg-leaf-500 px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50';
  useEffect(()=>{if(termStatus==='idle')void loadTerms();},[termStatus,loadTerms]);
  useEffect(()=>{if(!manage)return;let active=true;void listFaculty({pageSize:100}).then(async(first)=>{
    const rest=await Promise.all(Array.from({length:Math.max(0,first.meta.pageCount-1)},(_,i)=>listFaculty({pageSize:100,page:i+2})));
    if(active)setFaculties([...first.data,...rest.flatMap(r=>r.data)]);
  }).catch(()=>{if(active)setError('Could not load faculty choices.');});return()=>{active=false;};},[manage]);
  useEffect(() => {
    let current = true;
    setLoad(null);setError('');
    if(facultyId&&termId)void Promise.all([getTeachingLoad(facultyId,termId),getLoadSettings(),getDesignations(),listScheduleSlots({facultyId,termId})]).then(([res,config,master,placed])=>{
      if(!current)return;setFacultyName([res.faculty?.first_name,res.faculty?.last_name].filter(Boolean).join(' '));setLoad(res.load);setSettings(config.settings);setDesignations(master.data);setSlots(placed.data);
      setStudents(Object.fromEntries(res.load.students_by_section.map(s=>[s.section_id,s.student_count===null?'':String(s.student_count)])));
    }).catch(()=>{if(current)setError('Could not load teaching load. Please retry.');});
    return () => {current=false;};
  },[facultyId,termId,tick]);
  const accessEndpoint = `/api/faculty/${facultyId}/planner-access?termId=${termId}`;
  const access = accessResult?.scope === accessEndpoint ? accessResult.value : null;
  useEffect(() => {
    setAccess(null);
    setTargetInputs({});
    setEditingTargets(null);
    setAccessError(null);
    if (!termId || !facultyId) return;
    let current = true;
    let live = false;
    let socket: WebSocket | undefined;
    let reconnect: number | undefined;
    const applyAccess = (value: PlannerAccess) => {
      setAccess({scope:accessEndpoint,value});
      setAccessError(null);
    };
    const refresh = () => void apiFetch<PlannerAccess>(accessEndpoint)
      .then(value => { if (current && !live) applyAccess(value); })
      .catch(() => { if (current && !live) { setAccess(null); setAccessError(accessEndpoint); } });
    function connect() {
      const token = useAuthStore.getState().accessToken;
      if (!current || !token) return;
      const url = new URL(apiAssetUrl('/api/planner-live')!, window.location.origin);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const connection = new WebSocket(url);
      socket = connection;
      connection.onopen = () => {
        connection.send(JSON.stringify({token,facultyId,termId}));
      };
      connection.onmessage = event => {
        if (!current) return;
        try {
          const value = JSON.parse(event.data) as PlannerAccess;
          if (typeof value.enabled !== 'boolean') return;
          live = true;
          applyAccess(value);
        } catch { /* Keep the previous state until a valid update arrives. */ }
      };
      connection.onclose = () => {
        if (!current) return;
        live = false;
        refresh();
        reconnect = window.setTimeout(connect, 3000);
      };
    }
    refresh();
    if (user?.role === 'FACULTY') connect();
    const timer = user?.role === 'FACULTY' ? window.setInterval(() => { if (!live) refresh(); }, 10000) : undefined;
    return () => {
      current = false;
      window.clearInterval(timer);
      window.clearTimeout(reconnect);
      socket?.close();
    };
  }, [accessEndpoint, facultyId, termId, user?.role, tick]);
  async function saveAccess(enabled: boolean, targets = Object.fromEntries(functionKeys.map(key => [key, Number(targetInputs[key] ?? access?.targets?.[key])]))) {
    setBusy(true);
    try {
      const value = await apiFetch<PlannerAccess>(accessEndpoint, {
        method:'PUT', body:JSON.stringify({enabled,targets}),
      });
      setAccess({scope:accessEndpoint,value});
      setEditingTargets(null);
      setTargetInputs({});
      if (facultyId) await refreshCurrentLoad();
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Could not save planner settings.');
    } finally { setBusy(false); }
  }
  async function exportOwnSchedule() {
    if (!plannerOnly || user?.role !== 'FACULTY' || !user.facultyId || !termId || exporting) return;
    setExporting(true);
    try {
      const name = ['Faculty Class Program', facultyName, term?.label].filter(Boolean).join(' - ');
      await downloadProgramWorkbook('faculty', user.facultyId, termId, name);
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Could not export your schedule.');
    } finally {
      setExporting(false);
    }
  }
  const endpoint=(part:string)=>`/api/faculty/${facultyId}/${part}?termId=${termId}`;
  async function mutate(path:string,method:string,body?:unknown){setBusy(true);try{await apiFetch(path,{method,...(body===undefined?{}:{body:JSON.stringify(body)})});setTick(v=>v+1);pushToast('success','Program updated.');}catch(e){pushToast('error',e instanceof Error?e.message:'Could not update program');throw e;}finally{setBusy(false);}}
  const run=(promise:Promise<unknown>)=>{void promise.catch(()=>{});};
  async function refreshCurrentLoad(){if(!facultyId||!termId)return;const result=await getTeachingLoad(facultyId,termId);setLoad(result.load);}
  async function saveSession(data:SessionInput,id?:string){
setBusy(true);try{await apiFetch(id?`/api/faculty-sessions/${id}`:endpoint('sessions'),{method:id?'PATCH':'POST',body:JSON.stringify(data)});await refreshCurrentLoad();pushToast('success','Session updated.');}catch(e){pushToast('error',e instanceof Error?e.message:'Could not update session');throw e;}finally{setBusy(false);}}
  async function deleteSession(id:string){
setBusy(true);try{await apiFetch(`/api/faculty-sessions/${id}`,{method:'DELETE'});await refreshCurrentLoad();pushToast('success','Session removed.');}catch(e){pushToast('error',e instanceof Error?e.message:'Could not remove session');throw e;}finally{setBusy(false);}}
  const selectedFaculty = faculties.find(faculty => faculty.id === facultyId);
  const hasFacultyLogin = selectedFaculty?.user?.role === 'FACULTY' && selectedFaculty.user.is_active;
  const weeklyTarget = load?.weekly_hours ?? 40;
  const remainingHours = Number((weeklyTarget - (load?.total_faculty_time ?? 0)).toFixed(2));
  const selectedDesignation=editingAssignment??designations.find(d=>d.id===designationId);
  return <motion.div initial={reduce?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} className="teaching-load-page space-y-5 text-ink">
    <div className="load-toolbar flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">{plannerOnly?'Weekly Function Planner':'Teaching Load'}</h1><p className="text-sm text-ink/60">{plannerOnly?'Plot your other functions when the Chair opens the planner.':'Weekly faculty time, functions, designations and overload claims.'}</p></div>
      {(manage||!plannerOnly)&&<div className="flex flex-wrap gap-3">{manage&&<label className="text-sm">Faculty<select aria-label="Teaching load faculty" className={`${field} ml-2`} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select faculty...</option>{faculties.map(f=><option key={f.id} value={f.id}>{f.last_name}, {f.first_name}{user?.role==='CHAIR'&&(!f.user?.is_active||f.user.role!=='FACULTY')?' (no active faculty login)':''}</option>)}</select></label>}
      {!plannerOnly&&<label className="text-sm">Term<select aria-label="Teaching load term" className={`${field} ml-2`} value={termId??''} onChange={e=>selectTerm(e.target.value)}><option value="">Select term...</option>{terms.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>}</div>}
    </div>
    {error?<div role="alert" className={panel}>{error}<button onClick={()=>setTick(v=>v+1)} className={`${button} ml-3`}>Retry</button></div>:!facultyId||!termId?<div className={`${panel} border-dashed`}>{!facultyId&&!manage?'Your account must be linked to a faculty record by the Chair.':'Select a faculty member and term to view the program.'}</div>:!load||!settings?<div role="status" className={`${panel} animate-pulse h-48`}>Loading teaching load…</div>:<>
      {!plannerOnly&&<>
      <div className="grid gap-3 lg:grid-cols-3">{[
        ['Teaching hours',`${load.teaching_hours}h`],['Preps',String(load.preps)],['Regular ceiling',`${load.prep_ceiling}h · ${load.prep_ceiling_source}`],
      ].map(([label,value],i)=><motion.div key={label} initial={reduce?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:reduce?0:i*.04}} className={panel}><p className="text-xs text-ink/60">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p>{label==='Teaching hours'&&<p className="mt-1 text-sm text-ink/60">{load.lecture_hours}h lecture + ({load.lab_hours}h lab × {settings.lab_coefficient}) = {load.teaching_hours}h</p>}{label==='Preps'&&<details className="text-xs"><summary>Preparation breakdown</summary>{load.prep_breakdown.map(p=><p key={p.subject_id+p.component}>{p.subject_code??'Subject'} · {p.component}</p>)}</details>}</motion.div>)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><section className={`${panel} flex items-center gap-5`}>
        <div className="relative h-28 w-28 shrink-0"><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="#E2F0E5" strokeWidth="8"/><circle cx="50" cy="50" r="42" fill="none" stroke="#2FBF71" strokeWidth="8" strokeDasharray="264" strokeDashoffset={264*(1-Math.min(1,load.total_faculty_time/weeklyTarget))}/></svg><div className="absolute inset-0 flex items-center justify-center text-xl font-bold">{load.total_faculty_time}h</div></div>
        <div><h2 className="font-semibold">Weekly faculty time</h2><p>of {weeklyTarget} hours</p><p className="text-sm text-ink/60">{remainingHours > 0 ? `${remainingHours}h remaining` : remainingHours < 0 ? `${-remainingHours}h above target` : 'Target completed'}</p><p className="mt-2 text-xs">Overload and service credits excluded.</p></div>
      </section><section className={panel}><h2 className="font-semibold">Teaching overload</h2><p className="mt-2 text-2xl font-bold">{load.teaching_overload}h</p><p className="text-sm">Claimable: {load.claimable_overload_hours}h</p><p className="text-sm">Teaching Service Credit: {load.teaching_service_credit}h</p></section>
      <section className={panel}><h2 className="font-semibold">Service Credits</h2><p className="mt-2 text-2xl font-bold">{load.service_credits}h</p><p className="text-sm text-ink/60">From accepted, eligible designations. Not counted in {weeklyTarget}.</p></section></div>
      <section className={panel}><h2 className="font-semibold">Claim for Teaching Overload</h2><p className="my-2 text-sm">Claimable {load.claimable_overload_hours}h · Plotted {load.overload_plotted_hours}h · Remaining to plot {load.overload_remaining_to_plot}h · Claim session hours {load.claim_session_hours}h</p>
        <progress aria-label="Overload claim progress" value={load.claim_session_hours} max={Math.max(1,load.claimable_overload_hours)} className="w-full accent-leaf-500"/>
        {load.sessions.filter(s=>s.type==='OVERLOAD').length===0?<p className="text-sm text-ink/60">No overload sessions plotted.</p>:<ul className="mt-2 text-sm">{load.sessions.filter(s=>s.type==='OVERLOAD').map(s=><li key={s.id}>{s.day_of_week} {s.start_time}–{s.end_time}</li>)}</ul>}
      </section>
      <section className={panel}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Designations</h2>{canSetDesignation&&<div className="flex gap-2"><button className={button} disabled={busy} onClick={()=>openDesignation()}>{manage?'Assign designation':'Set my designation'}</button>{manage&&<button className={field} onClick={()=>setMaster(true)}>Manage list</button>}</div>}</div>
        {load.designations.length===0?<p className="mt-3 text-sm text-ink/60">No designations assigned for this term.</p>:<ul className="mt-3 space-y-3">{load.designations.map(d=><li key={d.id} className="flex justify-between gap-3 border-b border-leaf-100 pb-2"><div><strong className="text-sm">{d.name}</strong>{d.details&&<p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink/70">{d.details}</p>}<p className="text-xs">{d.hours}h assigned · {d.plotted_hours}h plotted · {d.counted_hours}h counted · {d.accepted?'Accepted':'Not accepted'}</p><p className="mt-1 text-xs text-ink/60">Equivalent service credits: {d.service_credit}h{!d.grants_service_credit?' · Not credit-eligible':''}</p></div>{canSetDesignation&&<div className="flex items-start gap-3"><button type="button" className="text-xs" disabled={busy} onClick={()=>openDesignation(d)} aria-label={'Edit '+d.name}>Edit</button><button type="button" disabled={busy} className="text-xs text-red-700" onClick={()=>run(mutate(`/api/faculty-designations/${d.id}`,'DELETE'))}>Remove</button></div>}</li>)}</ul>}
      </section>
      {manage&&<section className={panel}><h2 className="font-semibold">Term effectivity</h2><p className="text-sm">{load.effectivity.start??'Not set'} to {load.effectivity.end??'Not set'} · Applies to the whole term. Manage it in Form Settings.</p></section>}
      {manage&&load.warnings.length>0&&<section className={`${panel} border-amber-200 bg-amber-50`}><h2 className="font-semibold">Warnings</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{load.warnings.map(w=><li key={w}>{w}</li>)}</ul></section>}
      </>}
      {(manage||plannerOnly)&&<>
      {!manage && <div role="status">
        {access?.enabled ? (
          <div className="planner-open-banner">
            <strong className="planner-open-label"><span aria-hidden="true" />Planner open</strong>
            <span className="planner-open-track"><span>You can add or edit your functions.</span></span>
            {term?.label && <span className="planner-open-term">{term.label}</span>}
          </div>
        ) : (
          <p className={panel}>
            {access ? 'Planner closed. The Chair will open editing when it is ready.' : 'Checking planner access…'}
            {term?.label && <span className="block text-xs text-ink/60">{term.label}</span>}
          </p>
        )}
      </div>}
      {user?.role==='CHAIR'&&<section className="function-target-card" aria-label="Faculty function targets">
        <div className="function-target-header">
          <div><h2>Function targets</h2><p>{selectedFaculty?.first_name} {selectedFaculty?.last_name} · {term?.label}</p></div>
          <button type="button" className={button} disabled={busy||!access} onClick={()=>{setTargetInputs({});setEditingTargets(accessEndpoint);}}>{access?.targets?'Edit targets':'Assign targets'}</button>
        </div>
        {access?.targets ? <dl className="function-target-values">{functionKeys.map(key=><div key={key}><dt>{FUNCTION_LABELS[key]}</dt><dd>{access.targets?.[key]} <span>h</span></dd></div>)}</dl>
          : <p className="function-target-empty">{accessError===accessEndpoint?'Could not load planner settings.':access?'Assign weekly targets to open this faculty member’s planner.':'Loading planner settings…'} {accessError===accessEndpoint&&<button type="button" className="underline" onClick={()=>setTick(v=>v+1)}>Retry</button>}</p>}
        <div className="function-target-footer"><div><span>Faculty editing</span><p className="function-target-empty !my-0">{hasFacultyLogin ? selectedFaculty?.user?.email : 'This faculty record needs an active linked login before it can be opened for faculty editing.'}</p></div><button type="button" role="switch" aria-label="Faculty planner editing" aria-checked={access?.enabled===true} disabled={busy||!access?.targets||(!access.enabled&&!hasFacultyLogin)} onClick={()=>{if(access?.targets&&(access.enabled||hasFacultyLogin))void saveAccess(!access.enabled,access.targets);}} className="function-target-switch"><span aria-hidden="true"/>{access?.enabled?'Open':'Closed'}</button></div>
      </section>}
      {plannerOnly && <section className={panel}><h2 className="font-semibold">Other Functions</h2><p className="text-xs text-ink/60">Time allotted from plotted sessions.</p>
        {(()=>{const keys=['research','extension','imp','consultation'] as const;const colors=['#22c55e','#3b82f6','#8b5cf6','#eab308'];const total=Math.round(keys.reduce((sum,key)=>sum+load.functions[key].plotted,0)*100)/100;return <><p className="mt-4 text-2xl font-bold">{total}h <span className="text-sm font-normal">total allotted</span></p><div className="mt-3 flex h-5 overflow-hidden rounded-lg border border-ink/30 bg-ink/5" role="img" aria-label={`Other functions: ${total} hours allotted`}>{keys.map((key,index)=><div key={key} title={`${key}: ${load.functions[key].plotted}h`} style={{width:total?`${load.functions[key].plotted/total*100}%`:'0%',backgroundColor:colors[index]}}/>)}</div><div className="mt-4 grid grid-cols-2 gap-3">{keys.map((key,index)=><div key={key} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2 capitalize"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:colors[index]}}/>{key==='imp'?'IMP':key}</span><strong>{load.functions[key].plotted}h{access?.targets && ` / ${access.targets[key]}h`}</strong></div>)}</div>{total===0&&<p className="mt-3 text-xs text-ink/60">No function sessions plotted yet.</p>}</>;})()}

      </section>}
      <TeachingLoadPlanner slots={slots} sessions={load.sessions} designations={load.designations} minimum={0.5} readOnly={!manage&&access?.enabled!==true} functionLimits={access?.targets ? {RESEARCH:access.targets.research,EXTENSION:access.targets.extension,IMP:access.targets.imp,CONSULTATION:access.targets.consultation} : undefined} targets={{RESEARCH:access?.targets?.research??settings.min_research,EXTENSION:access?.targets?.extension??settings.min_extension,IMP:access?.targets?.imp??settings.min_imp,CONSULTATION:access?.targets?.consultation??load.functions.consultation.declared,OVERLOAD:load.claimable_overload_hours}} onSave={saveSession} onDelete={id=>run(deleteSession(id))} headerActions={manage?<div className="planner-header-actions"><a href={`/print/faculty/${facultyId}?termId=${termId}`} className="planner-program-print">Print Faculty Class Program</a><button type="button" className={button} disabled={busy} onClick={()=>run(downloadProgramWorkbook('faculty',facultyId,termId,'Faculty Class Program').catch(error=>pushToast('error',error.message)))}>Export Faculty Excel</button><span className="planner-term-badge">{term?.label}</span></div>:plannerOnly&&user?.role==='FACULTY'?<button type="button" className={button} disabled={exporting} aria-busy={exporting} onClick={()=>void exportOwnSchedule()}>{exporting?'Exporting…':'Export schedule'}</button>:undefined}/>
      {plannerOnly&&user?.role==='FACULTY'&&<form className={panel} onSubmit={e=>{e.preventDefault();run(mutate(endpoint('students'),'PUT',{students:Object.entries(students).filter(([,v])=>v!=='').map(([section_id,value])=>({section_id,student_count:Number(value)}))}));}}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Students per section</h2><p className="text-sm text-ink/60">Each section counts once across all subjects.</p></div><span className="rounded-full border border-ink/20 bg-white px-3 py-1 text-xs font-semibold text-ink">{load.students_by_section.length} {load.students_by_section.length===1?'section':'sections'}</span></div>
        {load.students_by_section.length===0?<p className="my-4 rounded-lg border border-dashed border-ink/30 p-4 text-sm text-ink/60">No sections are assigned to your teaching load for this term.</p>:<div className="my-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{load.students_by_section.map(s=><label key={s.section_id} className="rounded-xl border-2 border-ink/15 bg-white p-3 text-sm font-medium shadow-[2px_2px_0_#0b0b0b]">{s.section_name}<input aria-label={`Students in ${s.section_name}`} type="number" min="0" max="200" step="1" placeholder="Enter student count" className={`${field} mt-2 w-full`} value={students[s.section_id]??''} onChange={e=>setStudents(v=>({...v,[s.section_id]:e.target.value}))}/></label>)}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-3"><p className="font-semibold">Total students: {Object.values(students).reduce((n,v)=>n+(Number(v)||0),0)}</p><button disabled={busy||load.students_by_section.length===0} className={button}>Save student counts</button></div>
      </form>}
      </>}
    </>}
    <Modal open={editingTargets===accessEndpoint&&!!access} onClose={()=>{if(!busy)setEditingTargets(null);}} title={access?.targets?'Edit function targets':'Assign function targets'}>
      <form className="space-y-5" onSubmit={event=>{event.preventDefault();void saveAccess(access?.enabled??false);}}>
        <div className="function-target-fields">{functionKeys.map(key=><label key={key}>{FUNCTION_LABELS[key]} (hours)<input className={field+' block w-full'} type="number" min="0" max="168" step="0.5" required value={targetInputs[key]??access?.targets?.[key]??''} onChange={event=>setTargetInputs(previous=>({...previous,[key]:event.target.value}))}/></label>)}</div>
        <div className="flex justify-end gap-2"><button type="button" className={field} disabled={busy} onClick={()=>setEditingTargets(null)}>Cancel</button><button className={button} disabled={busy}>{busy?'Saving…':'Save targets'}</button></div>
      </form>
    </Modal>
    <Modal open={assign} onClose={()=>{if(!busy)setAssign(false);}} title={editingAssignment?'Edit designation':manage?'Assign designation':'Set my designation'}><form className="space-y-3 p-6 pt-0" onSubmit={e=>{e.preventDefault();const values={details:designationDetails.trim()||null,hours:assignedHours,service_credit:selectedDesignation?.grants_service_credit?assignedCredit:0};run(mutate(editingAssignment?`/api/faculty-designations/${editingAssignment.id}`:`/api/faculty/${facultyId}/designations`,editingAssignment?'PATCH':'POST',editingAssignment?values:{...values,designation_id:designationId,term_id:termId}).then(()=>setAssign(false)));}}>
      {editingAssignment?<p className="text-sm font-semibold">{editingAssignment.name}</p>:<label className="block text-sm">Designation<select required disabled={busy} className={`${field} w-full`} value={designationId} onChange={e=>{setDesignationId(e.target.value);const d=designations.find(v=>v.id===e.target.value);setAssignedHours(d?.default_hours??0);setAssignedCredit(d?.service_credit_hours??0);}}><option value="">Select…</option>{designations.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
      {!editingAssignment&&designations.length===0&&<p className="text-sm text-ink/60">No designations are available. Ask your chair to add one to the list.</p>}
      <label className="block text-sm">Designation details (optional)<textarea disabled={busy} maxLength={500} rows={3} className={`${field} w-full`} placeholder="e.g. Coordinator for the department’s extension activities" value={designationDetails} onChange={e=>setDesignationDetails(e.target.value)}/><span className="mt-1 block text-xs text-ink/60">Describe your specific role or what this designation is for. {designationDetails.length}/500</span></label>
      <label className="block text-sm">Assigned hours<input disabled={busy} className={`${field} w-full`} type="number" min="0" step="0.5" required value={assignedHours} onChange={e=>setAssignedHours(Number(e.target.value))}/></label>
      {selectedDesignation?.grants_service_credit?<label className="block text-sm">Equivalent service credits (hours)<input disabled={busy} required className={`${field} w-full`} type="number" min="0" step="0.5" value={assignedCredit} onChange={e=>setAssignedCredit(Number(e.target.value))}/></label>:<p className="text-xs text-ink/60">Only eligible designations grant service credits.</p>}
      <p className="text-xs text-ink/60">Credits count after eligible designation sessions are plotted. Service credits stay separate from the weekly hours target.</p>
      <button disabled={busy||(!editingAssignment&&!designationId)} className={button}>{editingAssignment?'Save designation':manage?'Assign':'Save my designation'}</button>
    </form></Modal>
    <Modal open={master} onClose={()=>setMaster(false)} title="Designation list"><div className="max-h-[70vh] overflow-y-auto p-6 pt-0"><ul className="mb-4 space-y-2">{designations.map(d=><li key={d.id} className="flex items-center justify-between gap-2 text-sm">{d.name} · {d.default_hours}h<div className="flex gap-2"><button onClick={()=>{setEditing(d.id);setDraft({name:d.name,default_hours:d.default_hours,service_credit_hours:d.service_credit_hours,grants_service_credit:d.grants_service_credit});}}>Edit</button><button className="text-red-700" onClick={()=>run(mutate(`/api/designations/${d.id}`,'DELETE'))}>Remove</button></div></li>)}</ul><form className="space-y-2" onSubmit={e=>{e.preventDefault();run(mutate(`/api/designations${editing?`/${editing}`:''}`,editing?'PATCH':'POST',draft).then(()=>{setEditing('');setDraft({name:'',default_hours:0,service_credit_hours:0,grants_service_credit:false});}));}}>
      <label className="block text-sm">Name<input required value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} className={`${field} w-full`}/></label><label className="block text-sm">Default hours<input required min="0" step="0.5" type="number" value={draft.default_hours} onChange={e=>setDraft(v=>({...v,default_hours:Number(e.target.value)}))} className={`${field} w-full`}/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.grants_service_credit} onChange={e=>setDraft(v=>({...v,grants_service_credit:e.target.checked}))}/>Grants Service Credit</label><label className="block text-sm">Default Service Credit<input min="0" step="0.5" type="number" value={draft.service_credit_hours} onChange={e=>setDraft(v=>({...v,service_credit_hours:Number(e.target.value)}))} className={`${field} w-full`}/></label><button disabled={busy} className={button}>{editing?'Update designation':'Create designation'}</button>
    </form></div></Modal>
  </motion.div>;
}
