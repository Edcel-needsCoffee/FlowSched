import { useUiStore } from '../../store/ui.store';

export function Nav(): JSX.Element {
  const { theme,toggleTheme,isLoginModalOpen,openLoginModal,closeLoginModal }=useUiStore();
  return <header className="fs-nav"><nav aria-label="Landing">
    <div className="fs-institute"><img src="/school-logo.jpg" alt="PIT logo" width="48" height="48"/><strong>Palompon Institute of Technology</strong></div>
    <a className="fs-brand" href="/" aria-label="FlowSched home"><span className="fs-mark">F</span><span>FLOWSCHED</span></a>
    <div className="fs-nav-actions"><button className="fs-button fs-theme" aria-label={`Switch to ${theme==='light'?'dark':'light'} mode`} aria-pressed={theme==='dark'} onClick={toggleTheme}>
      {theme==='light'
        ? <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
        : <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>}
    </button>
    <button className="fs-button" aria-label="Log in" aria-expanded={isLoginModalOpen} aria-controls="fs-login-panel" onClick={isLoginModalOpen?closeLoginModal:openLoginModal}>Log in <span aria-hidden="true">↗</span></button></div>
  </nav></header>;
}
