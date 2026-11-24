import { useUiStore } from '../../store/ui.store';
import { ScheduleArt } from './ScheduleArt';

export function Hero(): JSX.Element {
  const {isLoginModalOpen,openLoginModal,closeLoginModal,setLoginRole}=useUiStore();
  return <main className="fs-hero">
    <section className="fs-hero-copy" aria-labelledby="fs-headline">
      <div className="fs-eyebrow"><span aria-hidden="true">✳</span> Engineering Department · Class scheduling</div>
      <h1 id="fs-headline">WORKLOAD<br/>CHAOS,<br/><span className="fs-highlight">PLOTTED</span><br/>STRAIGHT<span className="fs-period">.</span></h1>
      <p className="fs-intro">A little structure. A lot less chaos. Plot classes, catch conflicts, and keep every faculty workload in line—all in one place.</p>
      <div className="fs-ctas"><button className="fs-button fs-primary" aria-expanded={isLoginModalOpen} aria-controls="fs-login-panel" onClick={isLoginModalOpen?closeLoginModal:openLoginModal}>Log in <span aria-hidden="true">↗</span></button><a className="fs-button" href="#what-it-does">See what it does <span aria-hidden="true">↓</span></a></div>
      <div className="fs-role-entry"><span>SIGN IN AS</span>{(['Chair','Faculty'] as const).map(role=><button className="fs-role-pill" key={role} onClick={()=>{setLoginRole(role);openLoginModal();}}>{role}<span aria-hidden="true">↗</span></button>)}</div>
    </section>
    <div className={`fs-art-wrap${isLoginModalOpen?' fs-art-hidden':''}`} aria-hidden={isLoginModalOpen}><ScheduleArt/></div>
    <section id="what-it-does" className="fs-capabilities" aria-label="What FlowSched does"><div><b>01 / PLOT IT</b><span>Drag classes into place.</span></div><div><b>02 / CATCH IT</b><span>Spot conflicts before they happen.</span></div><div><b>03 / BALANCE IT</b><span>Keep faculty loads in view.</span></div></section>
  </main>;
}
