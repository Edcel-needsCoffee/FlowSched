const blocks=[
  {day:0,row:0,length:2,code:'IE 322',name:'Engineering Lab',room:'IE Lab 1',tone:'green'},
  {day:2,row:0,length:1,code:'IE 105',name:'Lecture',room:'Room 204',tone:'yellow'},
  {day:4,row:1,length:2,code:'IE 312',name:'Operations',room:'Room 203',tone:'green'},
  {day:1,row:2,length:2,code:'IE 214',name:'Systems Design',room:'Room 201',tone:'yellow'},
  {day:3,row:3,length:2,code:'IE 322',name:'Engineering Lab',room:'IE Lab 1',tone:'green'},
  {day:0,row:4,length:2,code:'IE 105',name:'Lecture',room:'Room 204',tone:'green'},
  {day:2,row:5,length:1,code:'IE 214',name:'Lecture',room:'Room 201',tone:'yellow'},
];
export function ScheduleArt(): JSX.Element {
  return <div className="fs-art" aria-label="Illustrative weekly schedule with classes placed without conflicts">
    <div className="fs-art-caption"><span aria-hidden="true">↙</span> YOUR WEEK, UNDER CONTROL.</div>
    <div className="fs-schedule-bob"><div className="fs-schedule">
      <div className="fs-schedule-top"><div><span className="fs-live-dot"/> WEEKLY CLASS PROGRAM</div><span className="fs-sample">PREVIEW</span></div>
      <div className="fs-schedule-title"><strong>A place for everything.</strong><span>1ST SEMESTER / 2026–2027</span></div>
      <div className="fs-calendar"><div className="fs-calendar-head"><span>TIME</span>{['MON','TUE','WED','THU','FRI'].map(d=><b key={d}>{d}</b>)}</div>
        <div className="fs-calendar-body"><div className="fs-time-column">{['8 AM','8:30','9 AM','9:30','10 AM','10:30','11 AM'].map(t=><span key={t}>{t}</span>)}</div><div className="fs-cells">{Array.from({length:35},(_,i)=><span key={i} style={{gridColumn:i%5+1,gridRow:Math.floor(i/5)+1}}/>)}{blocks.map((b,i)=><div key={i} className={`fs-class fs-class-${b.tone}`} style={{gridColumn:b.day+1,gridRow:`${b.row+1} / span ${b.length}`}}><b>{b.code}</b><span>{b.name}</span><small>{b.room}</small></div>)}</div></div>
      </div><div className="fs-schedule-bottom"><span><i/> Classes, aligned.</span><span>MON — FRI <b>↗</b></span></div>
    </div></div>
    <div className="fs-float-chip fs-conflict"><span className="fs-chip-icon">!</span><div><b>Conflict caught</b><small>Before it becomes a problem.</small></div></div>
    <div className="fs-float-chip fs-load"><span aria-hidden="true">▥</span><b>Load: 18 units</b></div>
    <div className="fs-float-chip fs-placed"><span className="fs-check-small">✓</span><b>Placed ✓</b></div>
    <div className="fs-sticker"><span>✓</span><b>LESS CHAOS.<br/>MORE FLOW.</b></div>
    <span className="fs-art-spark" aria-hidden="true">✳</span>
  </div>;
}
