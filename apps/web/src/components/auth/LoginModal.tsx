import { useEffect,useRef,useState,type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginRequest } from '../../lib/api';
import { ForgotPasswordFlow } from './ForgotPasswordFlow';
import { PasswordEyeButton } from '../PasswordField';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import '../../pages/Landing/landing.css';

export function LoginModal(): JSX.Element {
  const {isLoginModalOpen:isOpen,closeLoginModal,theme,loginRole,setLoginRole}=useUiStore();
  const login=useAuthStore(s=>s.login),navigate=useNavigate();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false);
  const [mode,setMode]=useState<'login'|'forgot'>('login'),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const panel=useRef<HTMLDivElement>(null),emailRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    panel.current?.toggleAttribute('inert',!isOpen);
    if(!isOpen)return;
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const timer=window.setTimeout(()=>emailRef.current?.focus(),window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:420);
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){closeLoginModal();opener?.focus();}};
    document.addEventListener('keydown',onKey);
    return()=>{window.clearTimeout(timer);document.removeEventListener('keydown',onKey);};
  },[isOpen,closeLoginModal]);
  useEffect(()=>{if(!isOpen){setMode('login');setError('');setPassword('');}},[isOpen]);
  async function submit(event:FormEvent){
    event.preventDefault();setError('');
    if(!z.string().email().safeParse(email.trim()).success){setError('Enter a valid email address');return;}
    if(!password){setError('Password is required');return;}
    setPending(true);
    try{const result=await loginRequest(email.trim(),password);login({user:result.user,accessToken:result.accessToken,refreshToken:result.refreshToken});closeLoginModal();navigate('/dashboard',{replace:true});}
    catch(err){setError(err instanceof Error?err.message:'Could not sign in. Please try again.');setPassword('');}
    finally{setPending(false);}
  }
  return <div ref={panel} id="fs-login-panel" data-theme={theme} className={`fs-public fs-login-panel${isOpen?' fs-login-open':''}`} role={isOpen?'dialog':undefined} aria-modal="false" aria-hidden={!isOpen} aria-labelledby="login-title">
    <div className="fs-panel-brand"><span className="fs-mark">F</span><div><b>FlowSched</b><small>Engineering Department</small></div><button type="button" className="fs-close" onClick={closeLoginModal} aria-label="Close login dialog"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
    <hr/>
    <h2 id="login-title">{mode==='forgot'?'Reset password':'Welcome back'}</h2><p className="fs-login-subtitle">{mode==='forgot'?'Let’s get you back on track.':'Your next well-planned week starts here.'}</p>
    {mode==='forgot'?<div className="fs-forgot"><ForgotPasswordFlow initialEmail={email} onBackToLogin={()=>setMode('login')} onDone={()=>setMode('login')}/></div>:<>
      <div className="fs-segments" role="group" aria-label="Sign in role">{(['Chair','Faculty'] as const).map(role=><button key={role} type="button" aria-pressed={loginRole===role} className={loginRole===role?'fs-segment-active':''} onClick={()=>setLoginRole(role)}>{role}</button>)}</div>
      <form onSubmit={submit} noValidate>
        {error&&<p className="fs-login-error" role="alert">{error}</p>}
        <label htmlFor="login-email">Email</label><input ref={emailRef} id="login-email" type="email" required autoComplete="email" placeholder="you@department.edu" value={email} onChange={e=>setEmail(e.target.value)}/>
        <label htmlFor="login-password">Password</label><div className="fs-password"><input id="login-password" type={showPassword?'text':'password'} required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}/><PasswordEyeButton visible={showPassword} onToggle={()=>setShowPassword(v=>!v)} label="password"/></div>
        <button className="fs-button fs-primary fs-submit" disabled={pending}>{pending?'Signing in...':'Sign in'}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
        <button type="button" className="fs-forgot-link" onClick={()=>{setError('');setMode('forgot');}}>Forgot password?</button>
      </form></>}
    <hr/><p className="fs-help">Having trouble? Contact your department administrator.</p>
  </div>;
}
