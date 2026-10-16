import { useEffect, useState } from 'react';
import type { UpdateState } from '../../shared/releases';

export function useProgramUpdate() {
  const [state, setState] = useState<UpdateState>();
  useEffect(() => {
    let active = true, receivedEvent = false;
    const unsubscribe = window.loaderly?.onProgramUpdate(next => {
      receivedEvent = true;
      if (active) setState(next);
    });
    void window.loaderly?.programUpdate('state').then(next => {
      if (active && !receivedEvent) setState(next);
    }).catch(() => {});
    return () => { active = false; unsubscribe?.(); };
  }, []);
  useEffect(() => {
    if(state?.distribution !== 'store' || !['ready','installed'].includes(state.phase))return;
    let active=true;
    const timer=setInterval(()=>void window.loaderly?.programUpdate('state').then(next=>{if(active)setState(previous=>previous&&['ready','installed'].includes(previous.phase)?next:previous);}).catch(()=>{}),1500);
    return ()=>{active=false;clearInterval(timer);};
  },[state?.distribution,state?.phase]);
  return state;
}
