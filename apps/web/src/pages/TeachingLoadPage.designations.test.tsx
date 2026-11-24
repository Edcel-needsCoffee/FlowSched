import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { TeachingLoadPage } from './TeachingLoadPage';
import { useAuthStore } from '../store/auth.store';
import { useTermStore } from '../store/term.store';
import { ToastProvider } from '../components/Toast';
import { getTeachingLoad,getLoadSettings,getDesignations,type TeachingLoad } from '../lib/teaching-load';
import { listFaculty } from '../lib/faculty';
import { listScheduleSlots } from '../lib/schedule-slots';
import { apiFetch } from '../lib/api';
import { downloadProgramWorkbook } from '../lib/program-download';
vi.mock('../lib/program-download',()=>({downloadProgramWorkbook:vi.fn()}));
vi.mock('../lib/teaching-load',async(importOriginal)=>({...await importOriginal<typeof import('../lib/teaching-load')>(),getTeachingLoad:vi.fn(),getLoadSettings:vi.fn(),getDesignations:vi.fn()}));
vi.mock('../lib/faculty',()=>({listFaculty:vi.fn()}));
vi.mock('../lib/schedule-slots',()=>({listScheduleSlots:vi.fn()}));
vi.mock('../lib/api',()=>({apiFetch:vi.fn()}));
const load:TeachingLoad={lecture_hours:15,lab_hours:6,weighted_lab_hours:4.2,teaching_hours:19.2,preps:3,prep_breakdown:[{subject_id:'subject',subject_code:'IE 322',component:'LAB'}],prep_ceiling:18,prep_ceiling_source:'TIER',teaching_overload:1.2,claimable_overload_hours:1,teaching_service_credit:.2,overload_plotted_hours:0,claim_session_hours:0,overload_remaining_to_plot:1,regular_teaching_hours:18,designation_hours:0,total_faculty_time:18,remaining_to_target:22,service_credits:2,weekly_hours:40,functions:{research:{declared:1,plotted:0,counted:0},extension:{declared:1,plotted:0,counted:0},imp:{declared:0,plotted:0,counted:0},consultation:{declared:4,plotted:0,counted:0}},designations:[],sessions:[],students_by_section:[{section_id:'sec1',section_name:'BSIE 1A',student_count:30},{section_id:'sec2',section_name:'BSIE 2A',student_count:null}],total_students:30,effectivity:{start:null,end:null,source:'TERM'},warnings:['Student counts are missing.']};
beforeEach(()=>{
  vi.clearAllMocks();
  useAuthStore.setState({user:{id:'u',email:'fixture@test.local',role:'FACULTY',facultyId:'f1'},isAuthenticated:true,isInitializing:false});
  useTermStore.setState({status:'ready',selectedTermId:'t1',terms:[{id:'t1',label:'2026–2027 Second Semester',school_year:'2026-2027',semester:'SECOND',is_active:true,created_at:''}]});
  vi.mocked(getTeachingLoad).mockResolvedValue({faculty:{id:'f1',first_name:'Jose',last_name:'Reyes'},load});
  vi.mocked(getLoadSettings).mockResolvedValue({settings:{lab_coefficient:.7,weekly_hours:40,consultation_hours:4,min_research:1,min_extension:1,min_imp:0,min_session_hours:1,prep_tiers:[]}});
  vi.mocked(getDesignations).mockResolvedValue({data:[]});
  vi.mocked(listScheduleSlots).mockResolvedValue({data:[],meta:{total:0}});
  vi.mocked(listFaculty).mockResolvedValue({data:[{id:'f1',first_name:'Jose',last_name:'Reyes',employee_no:'fixture'}] as never,meta:{total:1,page:1,pageSize:100,pageCount:1}});
  vi.mocked(apiFetch).mockResolvedValue({});
});
const mount=()=>render(<ToastProvider><TeachingLoadPage/></ToastProvider>);
afterEach(cleanup);
it('exports the signed-in faculty schedule for the selected term from the weekly planner', async () => {
  vi.mocked(downloadProgramWorkbook).mockResolvedValue(undefined);
  vi.mocked(apiFetch).mockResolvedValue({enabled:false,targets:null});
  render(<ToastProvider><TeachingLoadPage plannerOnly/></ToastProvider>);
  fireEvent.click(await screen.findByRole('button',{name:'Export schedule'}));
  await waitFor(()=>expect(downloadProgramWorkbook).toHaveBeenCalledWith(
    'faculty','f1','t1',expect.stringContaining('Faculty Class Program - Jose Reyes'),
  ));
});
describe('Faculty designation controls',()=>{
  const designation={id:'d1',name:'Coordinator',default_hours:4,service_credit_hours:2,grants_service_credit:true};
  it('lets faculty set their own designation and equivalent service credits without editing the master list',async()=>{
    vi.mocked(getDesignations).mockResolvedValue({data:[designation]});
    mount();fireEvent.click(await screen.findByRole('button',{name:'Set my designation'}));
    expect(screen.queryByRole('button',{name:'Manage list'})).not.toBeInTheDocument();
    const modal=within(screen.getByRole('dialog'));
    fireEvent.change(modal.getByLabelText('Designation'),{target:{value:'d1'}});
    expect(modal.getByLabelText('Assigned hours')).toHaveValue(4);
    expect(modal.getByLabelText('Equivalent service credits (hours)')).toHaveValue(2);
    fireEvent.change(modal.getByLabelText('Equivalent service credits (hours)'),{target:{value:'3'}});
    fireEvent.change(modal.getByRole('textbox'),{target:{value:'Coordinates extension activities'}});
    fireEvent.click(modal.getByRole('button',{name:'Save my designation'}));
    await waitFor(()=>expect(apiFetch).toHaveBeenCalledWith('/api/faculty/f1/designations',expect.objectContaining({method:'POST',body:JSON.stringify({details:'Coordinates extension activities',hours:4,service_credit:3,designation_id:'d1',term_id:'t1'})})));
  });
  it('lets faculty edit their own assigned credit equivalence',async()=>{
    vi.mocked(getTeachingLoad).mockResolvedValue({faculty:{id:'f1',first_name:'Jose',last_name:'Reyes'},load:{...load,designations:[{id:'fd1',name:'Coordinator',details:'Department outreach coordinator',hours:4,service_credit:2,grants_service_credit:true,plotted_hours:0,counted_hours:0,accepted:false}]}});
    mount();fireEvent.click(await screen.findByRole('button',{name:'Edit Coordinator'}));
    const modal=within(screen.getByRole('dialog'));
    expect(modal.getByRole('textbox')).toHaveValue('Department outreach coordinator');
    expect(modal.getByRole('textbox')).toHaveAttribute('maxlength','500');
    fireEvent.change(modal.getByRole('textbox'),{target:{value:''}});
    fireEvent.change(modal.getByLabelText('Equivalent service credits (hours)'),{target:{value:'1.5'}});
    fireEvent.click(modal.getByRole('button',{name:'Save designation'}));
    await waitFor(()=>expect(apiFetch).toHaveBeenCalledWith('/api/faculty-designations/fd1',expect.objectContaining({method:'PATCH',body:JSON.stringify({details:null,hours:4,service_credit:1.5})})));
  });
  it('explains when the designation list is empty instead of saving an invalid selection',async()=>{
    mount();fireEvent.click(await screen.findByRole('button',{name:'Set my designation'}));
    const modal=within(screen.getByRole('dialog'));
    expect(modal.getByText(/No designations are available/)).toBeInTheDocument();
    expect(modal.getByRole('button',{name:'Save my designation'})).toBeDisabled();
  });
});
