import {useId, useState, type ReactNode} from 'react';

export type ControlPage = {id:string; label:ReactNode; icon?:ReactNode; content:ReactNode};

/** Keep panels mounted so changing sections preserves unfinished input and picker state. */
export function ControlDeck({label, pages, className=''}:{label:string; pages:ControlPage[]; className?:string}) {
  const prefix=useId(), [selected,setSelected]=useState(pages[0]?.id);
  const active=pages.some(page=>page.id===selected)?selected:pages[0]?.id;
  return <div className={`control-deck ${className}`}>
    <div className="control-deck__tabs" role="tablist" aria-label={label} onKeyDown={event=>{
      const tabs=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      const index=tabs.indexOf(document.activeElement as HTMLButtonElement);
      if(index<0)return;
      const rtl=getComputedStyle(event.currentTarget).direction==='rtl';
      let next=index;
      if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else if(event.key==='ArrowRight')next=(index+(rtl?-1:1)+tabs.length)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index+(rtl?1:-1)+tabs.length)%tabs.length;
      else return;
      event.preventDefault();setSelected(pages[next].id);tabs[next].focus();
    }}>
      {pages.map(page=><button key={page.id} type="button" role="tab" id={`${prefix}-tab-${page.id}`} aria-controls={`${prefix}-panel-${page.id}`} aria-selected={active===page.id} tabIndex={active===page.id?0:-1} onClick={()=>setSelected(page.id)}>{page.icon}<span>{page.label}</span></button>)}
    </div>
    {pages.map(page=><div key={page.id} className="control-deck__panel" role="tabpanel" id={`${prefix}-panel-${page.id}`} aria-labelledby={`${prefix}-tab-${page.id}`} hidden={active!==page.id}>{page.content}</div>)}
  </div>;
}
