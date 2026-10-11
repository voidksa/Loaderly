import { useEffect, useRef, useState } from 'react';
import { Heart, Megaphone, X } from 'lucide-react';
import { shouldShowWhatsNew, whatsNewBuild, whatsNewIntro, whatsNewSections, whatsNewVersion } from '../../shared/whatsNew';
import { supportUrl } from '../../shared/supportReminder';
import { announceSupportOpened, SupportNotice } from './SupportNotice';
const seenKey='loaderly:whats-new-seen';
const installedBuild=window.loaderly?.appBuild||whatsNewBuild;
export function WhatsNew({ar,noticeVisible,supportBusy=false}:{ar:boolean;noticeVisible:boolean;supportBusy?:boolean}) {
  const [banner,setBanner]=useState(()=>{try{return shouldShowWhatsNew(window.loaderly?.appVersion??'',localStorage.getItem(seenKey),installedBuild);}catch{return false;}});
  const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null);
  const t=(en:string,a:string)=>ar?a:en;
  const markSeen=()=>{try{localStorage.setItem(seenKey,installedBuild);}catch{}setBanner(false);};
  useEffect(()=>{const show=()=>{markSeen();setOpen(true);};window.addEventListener('loaderly:whats-new',show);return()=>window.removeEventListener('loaderly:whats-new',show);},[]);
  useEffect(()=>{if(!open)return;const previous=document.activeElement;dialog.current?.showModal();return()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[open]);
  return <>{banner&&!noticeVisible&&<div className="activity-notice update-notice" role="status"><Megaphone size={18}/><span>{t(`What's new in Loaderly ${whatsNewVersion}`,`الجديد في Loaderly ${whatsNewVersion}`)}</span><button className="notice-folder" onClick={()=>{markSeen();setOpen(true);}}>{t('See what’s new','اكتشف الجديد')}</button><button aria-label={t('Dismiss','إغلاق')} onClick={markSeen}><X size={15}/></button></div>}
    {open&&<dialog ref={dialog} className="app-dialog whats-new-dialog" dir={ar?'rtl':'ltr'} aria-labelledby="whats-new-title" onCancel={()=>setOpen(false)}>
      <header className="app-dialog-heading"><div><h2 id="whats-new-title">{t('What’s new','ما الجديد؟')}</h2><p><bdi>Loaderly {whatsNewVersion}</bdi></p></div><button className="button secondary" autoFocus aria-label={t('Close','إغلاق')} onClick={()=>setOpen(false)}><X size={17}/></button></header>
      <div className="whats-new-content" role="region" aria-label={t('Update details','تفاصيل التحديث')} tabIndex={0}>
        <p className="whats-new-intro">{whatsNewIntro[ar?'ar':'en']}</p>
        {whatsNewSections.map(section=><section key={section.id} aria-labelledby={`whats-new-${section.id}`}>
          <h3 id={`whats-new-${section.id}`}>{section.title[ar?'ar':'en']}</h3>
          <ul>{section.items.map((item,i)=><li key={i}><strong>{item[ar?'ar':'en'][0]}</strong><p>{item[ar?'ar':'en'][1]}</p></li>)}</ul>
        </section>)}
      </div>
      <footer><div className="whats-new-support"><a className="button secondary whats-new-support__button" href={supportUrl(ar)} target="_blank" rel="noopener noreferrer" onClick={announceSupportOpened}><Heart size={16} aria-hidden="true"/>{t('Support Loaderly','ساهم في تطوير Loaderly')}</a><p>{t('Your support helps us improve Loaderly and bring you better updates.','دعمك يساعدنا على تطوير البرنامج وتقديم تحديثات أفضل.')}</p></div><button className="button primary" onClick={()=>setOpen(false)}>{t('Got it','فهمت')}</button></footer>
    </dialog>}<SupportNotice ar={ar} blocked={noticeVisible||banner||open||supportBusy}/></>;
}
