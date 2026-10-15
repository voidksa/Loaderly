import { registerFloatingMaterial } from './floating-material';
// One text-only tooltip layer, shared by the app and its offline designer.
export function installTooltips(doc:Document) {
 const win=doc.defaultView!;
 const tip=doc.createElement('div');tip.className='app-tooltip';tip.id='loaderly-tooltip';tip.role='tooltip';tip.popover='manual';
 let active:HTMLElement|undefined,hovered:HTMLElement|undefined,focused:HTMLElement|undefined;
 let timer:number|undefined,leaveTimer:number|undefined,insideTip=false;
 let releaseMaterial:(()=>void)|undefined;
 const anchor=(target:EventTarget|null)=>target instanceof win.Element?target.closest<HTMLElement>('[data-tooltip]')??undefined:undefined;
 const clear=()=>{win.clearTimeout(timer);win.clearTimeout(leaveTimer);};
 const hide=()=>{
  releaseMaterial?.();releaseMaterial=undefined;
  clear();if(active){const ids=(active.getAttribute('aria-describedby')??'').split(/\s+/).filter(id=>id&&id!==tip.id);if(ids.length)active.setAttribute('aria-describedby',ids.join(' '));else active.removeAttribute('aria-describedby');}
  if(tip.matches(':popover-open'))tip.hidePopover();active=undefined;insideTip=false;
 };
 const position=()=>{
  if(!active?.isConnected){hide();return;}
  const rect=active.getBoundingClientRect(),box=tip.getBoundingClientRect(),pad=10,gap=8;
  const left=Math.max(pad,Math.min(win.innerWidth-box.width-pad,rect.left+(rect.width-box.width)/2));
  const below=rect.bottom+gap,top=below+box.height<=win.innerHeight-pad?below:Math.max(pad,rect.top-box.height-gap);
  tip.style.left=`${left}px`;tip.style.top=`${top}px`;
 };
 const show=(target:HTMLElement)=>{
  // Background hints must not compete with an open choice menu.
  if(doc.querySelector('.desktop-menu__content:popover-open'))return;
  const text=target.dataset.tooltip?.trim();if(!text||!target.isConnected||target.getClientRects().length===0)return;
  hide();active=target;tip.textContent=text;tip.dir=win.getComputedStyle(target).direction;
  // Keep modal tooltips in the modal's accessible subtree; the popover top layer
  // prevents the editor, scrollers and titlebar from clipping them.
  (target.closest('dialog[open]')??doc.body).append(tip);
  tip.style.left='0px';tip.style.top='0px';tip.showPopover();position();
  releaseMaterial=registerFloatingMaterial(tip);
  const ids=new Set((target.getAttribute('aria-describedby')??'').split(/\s+/).filter(Boolean));ids.add(tip.id);target.setAttribute('aria-describedby',[...ids].join(' '));
 };
 const schedule=(target:HTMLElement|undefined,delay=400)=>{
  clear();if(target===active)return;if(!target){hide();return;}hide();timer=win.setTimeout(()=>show(target),delay);
 };
 const maybeLeave=()=>{win.clearTimeout(timer);leaveTimer=win.setTimeout(()=>{if(!insideTip)schedule(hovered??focused,0);},180);};
 const over=(event:PointerEvent)=>{
  if(event.pointerType==='touch')return;
  if(tip.contains(event.target as Node)){insideTip=true;win.clearTimeout(leaveTimer);return;}
  const next=anchor(event.target);if(next===hovered)return;hovered=next;schedule(next??focused);
 };
 const out=(event:PointerEvent)=>{
  if(tip.contains(event.target as Node)){if(!tip.contains(event.relatedTarget as Node)){insideTip=false;maybeLeave();}return;}
  if(hovered&&!hovered.contains(event.relatedTarget as Node)){hovered=undefined;maybeLeave();}
 };
 const focus=(event:FocusEvent)=>{focused=anchor(event.target);schedule(focused,0);};
 const blur=()=>{focused=undefined;maybeLeave();};
 const dismiss=()=>{hovered=undefined;focused=undefined;hide();};
 const key=(event:KeyboardEvent)=>{if(event.key==='Escape')dismiss();};
 const scroll=(event:Event)=>{if(!tip.contains(event.target as Node))dismiss();};
 const observer=new MutationObserver(records=>{
  if(active&&(!active.isConnected||doc.querySelector('.desktop-menu__content:popover-open')))hide();
  else if(active&&records.some(r=>r.target===active&&r.attributeName==='data-tooltip')){tip.textContent=active.dataset.tooltip??'';if(!tip.textContent)hide();else position();}
 });
 observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-tooltip']});
 doc.addEventListener('pointerover',over);doc.addEventListener('pointerout',out);doc.addEventListener('focusin',focus);doc.addEventListener('focusout',blur);
 doc.addEventListener('pointerdown',dismiss);doc.addEventListener('keydown',key,true);doc.addEventListener('scroll',scroll,true);win.addEventListener('resize',dismiss);win.addEventListener('blur',dismiss);
 return ()=>{hide();observer.disconnect();tip.remove();doc.removeEventListener('pointerover',over);doc.removeEventListener('pointerout',out);doc.removeEventListener('focusin',focus);doc.removeEventListener('focusout',blur);doc.removeEventListener('pointerdown',dismiss);doc.removeEventListener('keydown',key,true);doc.removeEventListener('scroll',scroll,true);win.removeEventListener('resize',dismiss);win.removeEventListener('blur',dismiss);};
}
