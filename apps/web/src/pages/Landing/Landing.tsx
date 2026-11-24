import { useEffect,useRef } from 'react';
import { Navigate,useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import reference from './landing-reference.html?raw';
import scrollStyles from './landing-scroll.css?raw';
import scrollScript from './landing-scroll.js?raw';
import './landing.css';
const landingDocument=reference.replace('</head>',`<style>${scrollStyles}</style></head>`).replace('</body>',`<script>${scrollScript}</script></body>`);
export function Landing(): JSX.Element {
 const frame=useRef<HTMLIFrameElement>(null);
 const navigate=useNavigate();
 const authenticated=useAuthStore(s=>s.isAuthenticated);
 const open=useUiStore(s=>s.isLoginModalOpen);
 const openLogin=()=>{useUiStore.getState().openLoginModal();navigate('/login');};
 useEffect(()=>{const listener=(event:MessageEvent)=>{if(event.source===frame.current?.contentWindow&&event.origin===window.location.origin&&event.data?.type==='flowsched-login')openLogin();};window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);},[navigate]);
 useEffect(()=>{frame.current?.contentWindow?.postMessage({type:'flowsched-login-state',open},window.location.origin);},[open]);
 if(authenticated)return <Navigate to="/dashboard" replace/>;
 return <iframe ref={frame} data-testid="landing-page" title="FlowSched engineering scheduling" srcDoc={landingDocument} onLoad={()=>frame.current?.contentWindow?.postMessage({type:'flowsched-login-state',open:useUiStore.getState().isLoginModalOpen},window.location.origin)} style={{display:'block',width:'100%',height:'100svh',border:0,background:'#021a12'}}/>;
}
