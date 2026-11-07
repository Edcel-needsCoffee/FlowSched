import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../errors/apiError.js';
import { prisma } from '../config/prisma.js';
import { formLogoDir } from './form.service.js';
import { getProgramForm } from './program-form.service.js';
import { getLoadConfig } from './load-settings.service.js';
import { round2 } from './teaching-load.service.js';
type Program=Awaited<ReturnType<typeof getProgramForm>>;
const DAYS=['MON','TUE','WED','THU','FRI','SAT'];
const FUNCTION_COLORS:Record<string,string>={RESEARCH:'D1FAE5',EXTENSION:'DBEAFE',IMP:'EDE9FE',CONSULTATION:'FEF3C7',DESIGNATION:'FCE7F3',OVERLOAD:'FFEDD5'};
const thin={style:'thin' as const,color:{argb:'FF000000'}};
const edge={top:thin,bottom:thin,left:thin,right:thin};
const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3,5));
const clock=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const formula=(s:ExcelJS.Worksheet,address:string,text:string,result:number|string)=>{s.getCell(address).value={formula:text,result};s.getCell(address).numFmt=typeof result==='number'?'0.00':'General';};
async function addLogo(wb:ExcelJS.Workbook,s:ExcelJS.Worksheet,url:string|null,col:number,width:number,height:number){
  if(!url)return;
  let bytes:Buffer|undefined;
  if(url==='/school-logo.jpg'){
    for(const candidate of [path.resolve(process.cwd(),'../web/public/school-logo.jpg'),path.resolve(process.cwd(),'apps/web/public/school-logo.jpg')]){try{bytes=await fs.readFile(candidate);break;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
  }else if(/^\/uploads\/form-logos\/[a-f0-9-]+\.(png|jpg)$/.test(url)){
    try{bytes=await fs.readFile(path.join(formLogoDir(),path.basename(url)));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
  if(!bytes)throw ApiError.badRequest('A configured logo is missing. Upload it again in Form Settings.');
  const id=wb.addImage({buffer:bytes as never,extension:url.endsWith('.png')?'png':'jpeg'});
  s.addImage(id,{tl:{col,row:0},ext:{width,height},editAs:'oneCell'});
}
async function addHeader(wb:ExcelJS.Workbook,s:ExcelJS.Worksheet,form:Program){
  s.columns=[{width:18},...Array.from({length:6},()=>({width:20}))];
  for(let r=1;r<=9;r++)s.getRow(r).height=18;
  s.mergeCells('A1:A5');s.mergeCells('F1:G3');
  const lines=form.settings.school_lines.split('\n');
  s.mergeCells('B1:E3');s.getCell('B1').value=form.settings.school_lines;
  for(let r=1;r<=3;r++)s.getRow(r).height=Math.max(18,Math.ceil(lines.length*12/3));
  s.mergeCells('B4:E4');s.getCell('B4').value=form.template.title;s.getCell('B4').font={name:'Arial',size:15,bold:true};
  s.mergeCells('B5:E5');s.getCell('B5').value=form.term.label;
  s.mergeCells('F4:G4');s.getCell('F4').value=`Ref. Code: ${form.template.ref_code}`;
  s.mergeCells('F5:G5');s.getCell('F5').value=`Revision: ${form.template.revision}`;
  s.mergeCells('A7:D7');s.getCell('A7').value=`College: ${form.settings.college_lines}`;
  s.mergeCells('E7:G7');s.getCell('E7').value=`Department: ${form.settings.department}`;
  s.mergeCells('A8:D8');s.getCell('A8').value=`Program: ${form.settings.program}`;
  s.mergeCells('E8:G8');s.getCell('E8').value=`${form.kind==='faculty'?'Faculty':form.kind==='sections'?'Section':'Room'}: ${form.entity.name}`;
  s.mergeCells('A9:G9');s.getCell('A9').value=`Effectivity: ${form.effectivity.start??'Not set'} to ${form.effectivity.end??'Not set'}${form.entity.rank?`     Academic rank: ${form.entity.rank}`:''}`;
  for(let r=1;r<=9;r++)for(let c=1;c<=7;c++){const cell=s.getCell(r,c);cell.font={name:'Arial',size:r===4&&c>=2&&c<=5?15:10,bold:r===2||r===4};cell.alignment={horizontal:r<=5?'center':'left',vertical:'middle',wrapText:true};}
  s.getRow(7).height=Math.max(30,Math.ceil(form.settings.college_lines.length/70)*12,Math.ceil(form.settings.department.length/55)*12);
  s.getRow(8).height=Math.max(30,Math.ceil(form.settings.program.length/70)*12,Math.ceil(form.entity.name.length/55)*12);
  s.getRow(4).height=Math.max(24,Math.ceil(form.template.title.length/45)*18);
  await addLogo(wb,s,form.settings.school_logo_path,0,86,86);
  await addLogo(wb,s,form.settings.tuv_logo_path,5,120,48);
}
export async function buildProgramWorkbook(form:Program){
  const wb=new ExcelJS.Workbook();wb.creator='FlowSched';wb.calcProperties.fullCalcOnLoad=true;
  const s=wb.addWorksheet('Schedule',{views:[{state:'frozen',xSplit:1,ySplit:10,showGridLines:false}]});
  await addHeader(wb,s,form);
  const blocks=[...form.slots.map(slot=>({day:slot.day_of_week,start:minutes(slot.start_time),end:minutes(slot.end_time),text:`${slot.subject_code}${slot.session_type==='LAB'?' L':''}\n${slot.section_label}\n${slot.room_name??'TBA'}`,color:slot.color?.slice(1).toUpperCase()??'D1FAE5'})),...(form.load?.sessions??[]).map(session=>({day:session.day_of_week,start:minutes(session.start_time),end:minutes(session.end_time),text:session.type,color:FUNCTION_COLORS[session.type]}))];
  const start=Math.floor(Math.min(420,...blocks.map(b=>b.start))/30)*30,end=Math.ceil(Math.max(1200,...blocks.map(b=>b.end))/30)*30;
  s.getRow(10).values=['TIME',...DAYS];
  for(let col=1;col<=7;col++){const c=s.getCell(10,col);c.font={name:'Arial',size:10,bold:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC6E0B4'}};c.border=edge;c.alignment={horizontal:'center'};}
  const count=(end-start)/30;
  for(let i=0;i<count;i++){
    const row=i+11,time=start+i*30;s.getRow(row).height=22;s.getCell(row,1).value=`${clock(time)} - ${clock(time+30)}`;
    for(let col=1;col<=7;col++){
      const cell=s.getCell(row,col);cell.font={name:'Arial',size:9};cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};cell.border=edge;
      if(col===1)continue;
      const matches=blocks.filter(b=>b.day===DAYS[col-2]&&b.start<time+30&&b.end>time);
      if(!matches.length)continue;
      cell.value=matches.map(b=>b.text).join('\n\n');
      const hex=/^[A-F\d]{6}$/i.test(matches[0].color)?matches[0].color:'D1FAE5';
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${hex}`}};
      const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
      cell.font={...cell.font,color:{argb:rgb[0]*.299+rgb[1]*.587+rgb[2]*.114<140?'FFFFFFFF':'FF000000'}};
    }
  }
  for(let col=2;col<=7;col++)for(let i=0;i<count;){
    const row=11+i,value=s.getCell(row,col).value;let last=i;
    if(value){while(last+1<count&&s.getCell(12+last,col).value===value)last++;if(last>i)s.mergeCells(row,col,11+last,col);
      const lines=String(value).split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/24)),0);
      for(let r=row;r<=11+last;r++)s.getRow(r).height=Math.max(s.getRow(r).height??22,(lines*11+4)/(last-i+1));
    }i=last+1;
  }
  const footer=11+count+2;
  for(const [index,sig] of form.signatures.entries()){
    const from=[1,4,6][index],to=[3,5,7][index];
    for(let r=footer;r<=footer+3;r++)s.mergeCells(r,from,r,to);
    s.getCell(footer,from).value=`${sig.slot} BY:`;s.getCell(footer+2,from).value=sig.name;s.getCell(footer+3,from).value=sig.title;
    s.getCell(footer+2,from).border={bottom:thin};s.getCell(footer+2,from).font={name:'Arial',size:10,bold:true};
    s.getCell(footer+2,from).alignment={wrapText:true};s.getRow(footer+2).height=28;
  }
  s.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printArea:`A1:G${footer+4}`,margins:{left:.25,right:.25,top:.25,bottom:.25,header:0,footer:0}};
  if(form.load)await addTeachingLoad(wb,form);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
async function addTeachingLoad(wb:ExcelJS.Workbook,form:Program){
  const load=form.load!;const config=await getLoadConfig();
  const assignments=await prisma.workloadAssignment.findMany({where:{faculty_id:form.entity.id,term_id:form.term.id,deleted_at:null},include:{subject:true,section:true},orderBy:[{subject_id:'asc'},{section_id:'asc'}]});
  const s=wb.addWorksheet('Teaching Load',{views:[{state:'normal',showGridLines:false}]});
  s.columns=[{width:44},{width:18},{width:18},{width:23},{width:18},{width:20},{width:20},{width:18},{width:39}];
  s.getCell('A1').value=`Teaching Load — ${form.entity.name}`;s.getCell('A1').font={name:'Arial',size:15,bold:true};
  s.getCell('A2').value='Laboratory coefficient';s.getCell('B2').value=config.labCoefficient;
  s.getCell('A3').value='Weekly faculty time target';s.getCell('B3').value=config.facultyWeeklyHours;
  s.getCell('A4').value='Minimum valid session hours';s.getCell('B4').value=config.minDesignationSessionHours;
  s.getCell('A5').value=form.term.label;
  s.mergeCells('D5:G5');s.getCell('D5').value=`Effectivity: ${form.effectivity.start??'Not set'} to ${form.effectivity.end??'Not set'}`;
  s.getCell('H2').value='Minimum preps';s.getCell('I2').value='Maximum preps';s.getCell('J2').value='Ceiling';s.getColumn(10).width=15;
  config.prepTiers.forEach((tier,i)=>{s.getCell(i+3,8).value=tier.minPreps;s.getCell(i+3,9).value=tier.maxPreps;s.getCell(i+3,10).value=tier.ceiling;});
  const assignmentStart=31,assignmentEnd=assignmentStart+Math.max(1,assignments.length)-1;
  s.getRow(30).values=['Subject','Lecture hours','Lab hours','Section','Preps','Teaching hours'];
  const seenLec=new Set<string>(),seenLab=new Set<string>();
  for(let i=0;i<Math.max(1,assignments.length);i++){
    const row=assignmentStart+i,a=assignments[i];
    if(a){s.getCell(row,1).value=a.subject.code;s.getCell(row,2).value=a.subject.lecture_hours;s.getCell(row,3).value=a.subject.lab_hours;s.getCell(row,4).value=a.section.name;}
    const prep=a?(a.subject.lecture_hours>0&&!seenLec.has(a.subject_id)?1:0)+(a.subject.lab_hours>0&&!seenLab.has(a.subject_id)?1:0):0;
    if(a?.subject.lecture_hours)seenLec.add(a.subject_id);if(a?.subject.lab_hours)seenLab.add(a.subject_id);
    formula(s,`E${row}`,`IF(B${row}>0,IF(COUNTIFS($A$${assignmentStart}:A${row},A${row},$B$${assignmentStart}:B${row},">0")=1,1,0),0)+IF(C${row}>0,IF(COUNTIFS($A$${assignmentStart}:A${row},A${row},$C$${assignmentStart}:C${row},">0")=1,1,0),0)`,prep);
    formula(s,`F${row}`,`ROUND(B${row}+C${row}*$B$2,2)`,a?round2(a.subject.lecture_hours+a.subject.lab_hours*config.labCoefficient):0);
  }
  const functionStart=assignmentEnd+4,functionEnd=functionStart+3,designationStart=functionEnd+4,designationEnd=designationStart+Math.max(1,load.designations.length)-1;
  const studentStart=designationEnd+4,studentEnd=studentStart+Math.max(1,load.students_by_section.length)-1;
  const sessionStart=studentEnd+4,sessionEnd=sessionStart+Math.max(1,load.sessions.length)-1;
  s.getRow(functionStart-1).values=['Other Function','Declared','Plotted valid hours','Counted'];
  for(const [i,key]of(['research','extension','imp','consultation'] as const).entries()){
    const row=functionStart+i,value=load.functions[key];s.getCell(row,1).value=key.toUpperCase();s.getCell(row,2).value=value.declared;
    formula(s,`C${row}`,`SUMIFS($G$${sessionStart}:$G$${sessionEnd},$A$${sessionStart}:$A$${sessionEnd},A${row})`,value.plotted);
    formula(s,`D${row}`,`IF(C${row}>=$B$4,ROUND(MIN(B${row},C${row}),2),0)`,value.counted);
  }
  s.getRow(designationStart-1).values=['Designation','Assigned','Plotted valid hours','Grants credits (1/0)','Counted','Assigned credit','Earned credits','Accepted','Designation ID'];
  for(let i=0;i<Math.max(1,load.designations.length);i++){
    const row=designationStart+i,d=load.designations[i];if(d){s.getCell(row,1).value=d.name;s.getCell(row,2).value=d.hours;s.getCell(row,4).value=d.grants_service_credit&&!/\b(chair|chairman|dean)\b/i.test(d.name)?1:0;s.getCell(row,6).value=d.service_credit;s.getCell(row,9).value=d.id;}
    formula(s,`C${row}`,`SUMIFS($G$${sessionStart}:$G$${sessionEnd},$A$${sessionStart}:$A$${sessionEnd},"DESIGNATION",$B$${sessionStart}:$B$${sessionEnd},I${row})`,d?.plotted_hours??0);
    formula(s,`E${row}`,`IF(C${row}>=$B$4,ROUND(MIN(B${row},C${row}),2),0)`,d?.counted_hours??0);
    formula(s,`G${row}`,`IF(AND(C${row}>=$B$4,D${row}=1),F${row},0)`,d?.accepted&&d.grants_service_credit&&!/\b(chair|chairman|dean)\b/i.test(d.name)?d.service_credit:0);
    formula(s,`H${row}`,`IF(C${row}>=$B$4,"Accepted","Not accepted")`,d?.accepted?'Accepted':'Not accepted');
  }
  s.getRow(studentStart-1).values=['Distinct section','Students'];load.students_by_section.forEach((student,i)=>{s.getCell(studentStart+i,1).value=student.section_name;s.getCell(studentStart+i,2).value=student.student_count;});
  s.getRow(sessionStart-1).values=['Session type','Designation ID','Day','Start','End','Duration','Valid hours'];
  for(let i=0;i<Math.max(1,load.sessions.length);i++){
    const row=sessionStart+i,session=load.sessions[i];if(session){s.getCell(row,1).value=session.type;s.getCell(row,2).value=session.faculty_designation_id;s.getCell(row,3).value=session.day_of_week;s.getCell(row,4).value=minutes(session.start_time)/1440;s.getCell(row,5).value=minutes(session.end_time)/1440;}
    s.getCell(row,4).numFmt=s.getCell(row,5).numFmt='h:mm AM/PM';const duration=session?round2((minutes(session.end_time)-minutes(session.start_time))/60):0;
    formula(s,`F${row}`,`IF(COUNT(D${row}:E${row})=2,ROUND((E${row}-D${row})*24,2),0)`,duration);
    formula(s,`G${row}`,`IF(F${row}>=$B$4,IF(A${row}="OVERLOAD",IF(MOD(F${row},1)=0,F${row},0),F${row}),0)`,duration>=config.minDesignationSessionHours&&(!session||session.type!=='OVERLOAD'||Number.isInteger(duration))?duration:0);
  }
  const metrics:[string,string,number|string][]=[
    ['Lecture hours',`SUM(B${assignmentStart}:B${assignmentEnd})`,load.lecture_hours],['Laboratory hours',`SUM(C${assignmentStart}:C${assignmentEnd})`,load.lab_hours],['Weighted laboratory hours','ROUND(B8*$B$2,2)',load.weighted_lab_hours],['Teaching hours','ROUND(SUM(B7,B9),2)',load.teaching_hours],['Preparations',`SUM(E${assignmentStart}:E${assignmentEnd})`,load.preps],['Regular ceiling',`IF(B11=0,0,LOOKUP(B11,H3:H${config.prepTiers.length+2},J3:J${config.prepTiers.length+2}))`,load.prep_ceiling],['Ceiling source',`IF(B11=0,"NONE",IF(B11>I${config.prepTiers.length+2},"EXTRAPOLATED","TIER"))`,load.prep_ceiling_source],['Teaching Overload','ROUND(MAX(0,B10-B12),2)',load.teaching_overload],['Claimable overload hours','INT(B14)',load.claimable_overload_hours],['Teaching Service Credit','ROUND(B14-B15,2)',load.teaching_service_credit],['Overload plotted hours',`SUMIFS(G${sessionStart}:G${sessionEnd},A${sessionStart}:A${sessionEnd},"OVERLOAD")`,load.overload_plotted_hours],['Claim for Teaching Overload','MIN(B17,B15)',load.claim_session_hours],['Overload remaining to plot','MAX(0,B15-B17)',load.overload_remaining_to_plot],['Regular teaching hours','MIN(B10,B12)',load.regular_teaching_hours],['Designation hours',`SUM(E${designationStart}:E${designationEnd})`,load.designation_hours],['Service Credits (outside weekly target)',`SUM(G${designationStart}:G${designationEnd})`,load.service_credits],['Total faculty time',`ROUND(B20+SUM(D${functionStart}:D${functionEnd})+B21,2)`,load.total_faculty_time],['Remaining to target','ROUND(B3-B23,2)',load.remaining_to_target],['Total students',`SUM(B${studentStart}:B${studentEnd})`,load.total_students],['Overload plot check','IF(B17>B15,"OVERLOAD CAP EXCEEDED","Within claimable")',load.overload_plotted_hours>load.claimable_overload_hours?'OVERLOAD CAP EXCEEDED':'Within claimable'],
  ];
  metrics.forEach(([label,text,value],i)=>{s.getCell(i+7,1).value=label;formula(s,`B${i+7}`,text,value);});
  s.getCell('D2').value='Counting rule: MIN_DECLARED_PLOTTED';s.mergeCells('D2:G2');
  s.getCell('D3').value='Edit declared hours, assignment hours, session times or student counts below.';s.mergeCells('D3:G4');s.getCell('D3').alignment={wrapText:true};
  const prepStart=sessionEnd+4;
  s.getRow(prepStart).values=['Preparation subject','Component'];load.prep_breakdown.forEach((prep,i)=>{s.getCell(prepStart+i+1,1).value=prep.subject_code??prep.subject_id;s.getCell(prepStart+i+1,2).value=prep.component;});
  const warningStart=prepStart+load.prep_breakdown.length+3;
  s.getCell(warningStart,1).value='Warnings at export';load.warnings.forEach((warning,i)=>{s.mergeCells(warningStart+i+1,1,warningStart+i+1,7);s.getCell(warningStart+i+1,1).value=warning;s.getCell(warningStart+i+1,1).alignment={wrapText:true};s.getRow(warningStart+i+1).height=30;});
  for(const row of [30,functionStart-1,designationStart-1,studentStart-1,sessionStart-1])s.getRow(row).eachCell(cell=>{cell.font={name:'Arial',size:10,bold:true};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC6E0B4'}};cell.alignment={wrapText:true};s.getRow(row).height=30;});
  s.eachRow(row=>{row.eachCell(cell=>{cell.font={name:'Arial',size:10,...cell.font};if(!cell.alignment)cell.alignment={vertical:'middle'};});});
  s.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0};
}
