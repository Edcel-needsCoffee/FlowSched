from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

out = r'C:\FLOWSCHEDX\docs\FlowSched Project Overview.docx'
doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(.65); sec.bottom_margin = Inches(.65)
sec.left_margin = Inches(.75); sec.right_margin = Inches(.75)
styles = doc.styles
styles['Normal'].font.name = 'Aptos'; styles['Normal'].font.size = Pt(9.5)
styles['Normal'].font.color.rgb = RGBColor(42, 52, 64)
styles['Title'].font.name = 'Aptos Display'; styles['Title'].font.size = Pt(25)
styles['Title'].font.bold = True; styles['Title'].font.color.rgb = RGBColor(20, 70, 58)
for name, size in [('Heading 1',15),('Heading 2',11)]:
    styles[name].font.name='Aptos Display'; styles[name].font.size=Pt(size)
    styles[name].font.bold=True; styles[name].font.color.rgb=RGBColor(20,70,58)

p=doc.add_paragraph(style='Title'); p.add_run('FlowSched Project Overview')
p=doc.add_paragraph()
r=p.add_run('Teaching workload, schedules, forms and exports  |  November 2026'); r.bold=True; r.font.color.rgb=RGBColor(90,106,120)
doc.add_paragraph('We extended FlowSched into a faculty workload and scheduling workflow. Load totals are calculated from assignments and plotted sessions when requested, while faculty, Chairs and academic administrators see controls appropriate to their roles.')

doc.add_heading('What the system now does', level=1)
for heading, body in [
 ('Teaching load','Adds lecture hours and laboratory hours weighted by a configurable 0.7 coefficient. Preparations count distinct subject and component pairs. Configurable ceilings determine regular teaching and overload.'),
 ('Faculty time and credits','Combines regular teaching with accepted, plotted Research, Extension, IMP, Consultation and Designation time against a configurable 40-hour target. Whole-hour overload claims and fractional Teaching Service Credit are shown separately from designation Service Credits.'),
 ('Weekly planning','Adds a half-hour faculty planner for function and overload sessions, with minimums, duration limits, move/delete controls and checks against teaching and other sessions.'),
 ('Student counts','Lets faculty record counts per handled section and term; each section contributes once to the grand total even when it has multiple subjects.'),
 ('Forms and exports','Provides Chair-managed headers, effectivity, references, logos and signatory choices. Faculty, section and room programs can be printed; Excel exports include schedule sheets and a formula-driven Teaching Load sheet for faculty.'),
 ('Role-scoped access','Faculty manage their own hours, sessions and students. Chair and academic administrators can manage faculty records; Chair controls teaching placement and institutional form/load settings.'),
]:
    p=doc.add_paragraph(); r=p.add_run(heading+' — '); r.bold=True; p.add_run(body)

doc.add_heading('Delivery by phase', level=1)
rows=[
 ('1','Load engine and configurable rules','20ba7eb'),
 ('2','Database, APIs, permissions and validations','35a2881'),
 ('3','Teaching Load page and Dashboard totals','a8dcb5f'),
 ('4','Room, Faculty and Section schedule scopes','b328aa8'),
 ('5','Print forms, signatures and settings','248333b'),
 ('6','Server-generated Excel forms and formulas','773feb0'),
 ('7','Documentation, final checks and screenshots','9a5c852'),
]
t=doc.add_table(rows=1, cols=3); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.style='Light Shading Accent 1'
for c,v in zip(t.rows[0].cells,['Phase','Delivered','Commit']): c.text=v
for row in rows:
    cells=t.add_row().cells
    for c,v in zip(cells,row): c.text=v
for row in t.rows:
    for c in row.cells:
        c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        for p in c.paragraphs:
            for r in p.runs: r.font.size=Pt(8.5)

doc.add_heading('Checks and results',level=1)
doc.add_paragraph('The final run passed 187 API tests and 207 frontend tests. API, web and shared builds completed successfully. The generated faculty workbook was opened in Microsoft Excel and its formulas recalculated after changing assignment and session inputs. Temporary test fixtures were removed.')
doc.add_paragraph('Example F1 results: 15 lecture hours, 6 laboratory hours, 4.2 weighted lab hours, 19.2 teaching hours, 3 preparations, an 18-hour ceiling, 1.2 overload hours, 1 claimable hour and 0.2 Teaching Service Credit. The F4 scenario totals 40 faculty hours.')

doc.add_heading('Items to complete with the Chair',level=1)
for text in [
 'Upload the TUV NORD logo and enter approved Student Class Program and Classroom Utilization reference codes.',
 'Set actual term effectivity dates and replace placeholder designation names with the approved list.',
 'Confirm the seven documented assumptions: lab-only weighting; regular teaching capped at the ceiling counts toward 40; counted function/designation time uses the smaller of declared and valid plotted hours; overload claims use whole-hour sessions; student counts are per faculty, section and term with sections deduplicated; other functions follow designation session validity; and 7+ preparations use an extrapolated top tier.',
]: doc.add_paragraph(text,style='List Bullet')

doc.add_paragraph('The sample faculty print is two A4 landscape pages. For Excel cells where scheduled blocks overlap, the export retains each label and applies the first block’s color.')
footer=sec.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
r=footer.add_run('FlowSched  •  Project overview'); r.font.size=Pt(8); r.font.color.rgb=RGBColor(110,120,130)
doc.core_properties.title='FlowSched Project Overview'
doc.core_properties.subject='Summary of teaching load, scheduling, forms and Excel export implementation'
doc.save(out)
print(out)
