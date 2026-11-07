import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { MemoryRouter,Route,Routes } from 'react-router-dom';
import { ProgramPrintPage } from './ProgramPrintPage';
import { getProgramForm,type ProgramForm } from '../lib/program-forms';
vi.mock('../lib/program-forms',()=>({getProgramForm:vi.fn()}));
const form:ProgramForm={kind:'faculty',entity:{id:'f1',name:'Jose Reyes',rank:'Instructor I'},term:{id:'t1',label:'2026–2027 Second Semester'},settings:{school_lines:'Republic of the Philippines\nPALOMPON INSTITUTE OF TECHNOLOGY',college_lines:'College of Technology and Engineering',department:'Industrial Engineering',program:'BSIE',school_logo_path:'/school-logo.jpg',tuv_logo_path:null},template:{type:'FACULTY_CLASS_PROGRAM',title:'FACULTY CLASS PROGRAM',ref_code:'PIT-COTE-FOR-3-2-01B',revision:'00'},effectivity:{start:'2026-11-01',end:'2027-03-31',source:'TERM'},slots:[],load:null,signatory_options:[{id:'p',slot:'PREPARED',name:'Dearielyn C. Maskarino',title:'Chairman',active:true},{id:'r',slot:'REVIEWED',name:'Ronald B. Lacaba',title:'Dean',active:true},{id:'a',slot:'APPROVED',name:'Jennifer A. Gorumba',title:'VP Academic Affairs',active:true}],signatures:[{slot:'PREPARED',option_id:'p',name:'Dearielyn C. Maskarino',title:'Chairman'},{slot:'REVIEWED',option_id:'r',name:'Ronald B. Lacaba',title:'Dean'},{slot:'APPROVED',option_id:'a',name:'Jennifer A. Gorumba',title:'VP Academic Affairs'}]};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(getProgramForm).mockResolvedValue(form);vi.spyOn(window,'print').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const mount=()=>render(<MemoryRouter initialEntries={['/print/faculty/f1?termId=t1']}><Routes><Route path="/print/:kind/:id" element={<ProgramPrintPage/>}/></Routes></MemoryRouter>);
describe('department program print',()=>{
  it('renders the shared header, full Mon–Sat grid, effectivity and three signatory selectors',async()=>{
    mount();await screen.findByText('Jose Reyes');expect(screen.getByText('Ref. Code: PIT-COTE-FOR-3-2-01B')).toBeInTheDocument();
    expect(screen.getByText('Revision: 00')).toBeInTheDocument();expect(screen.getByText(/2026-11-01 to 2027-03-31/)).toBeInTheDocument();
    for(const day of ['MON','TUE','WED','THU','FRI','SAT'])expect(screen.getByText(day)).toBeInTheDocument();
    for(const slot of ['PREPARED','REVIEWED','APPROVED'])expect(screen.getByLabelText(`${slot} signatory`)).toBeInTheDocument();
    expect(document.body).toHaveClass('printing-program');fireEvent.click(screen.getByRole('button',{name:'Print program'}));expect(window.print).toHaveBeenCalledOnce();
  });
  it('uses a custom name for this print without persisting or reloading the server configuration',async()=>{
    mount();await screen.findByText('Jose Reyes');fireEvent.change(screen.getByLabelText('PREPARED signatory'),{target:{value:'custom'}});
    fireEvent.change(screen.getByLabelText('PREPARED custom name'),{target:{value:'Print Only Name'}});expect(screen.getByText('Print Only Name')).toBeInTheDocument();expect(getProgramForm).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText('PREPARED custom name'),{target:{value:''}});expect(screen.getByRole('button',{name:'Print program'})).toBeDisabled();
  });
});
