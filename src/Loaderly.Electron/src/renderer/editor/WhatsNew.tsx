import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Heart, Megaphone, X } from 'lucide-react';
import { shouldShowWhatsNew, whatsNewBuild, whatsNewHighlights, whatsNewSections, whatsNewVersion } from '../../shared/whatsNew';
import { supportUrl } from '../../shared/supportReminder';
import { announceSupportOpened, SupportNotice } from './SupportNotice';
import { registerFloatingMaterial } from '../../shared/ui/floating-material';
const seenKey='loaderly:whats-new-seen';
const installedBuild=window.loaderly?.appBuild||whatsNewBuild;
function WhatsNewSection({section,ar}:{section:typeof whatsNewSections[number];ar:boolean}) {
  const [expanded,setExpanded]=useState(false),id=useId(),locale=ar?'ar':'en';
  return <section className="whats-new-section" data-section={section.id}>
    <h4><button type="button" id={`${id}-toggle`} className="button secondary preset-library-toggle" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(value=>!value)}>
      <span>{section.title[locale]}</span><bdi className="whats-new-section__count" aria-label={ar?`عدد البنود: ${section.items.length}`:`${section.items.length} entries`}>{section.items.length}</bdi><ChevronDown className="disclosure-chevron" size={16} aria-hidden="true"/>
    </button></h4>
    <div id={id} hidden={!expanded} aria-labelledby={`${id}-toggle`}>
      <ul>{section.items.map((item,i)=><li key={i}><strong>{item[locale][0]}</strong><p>{item[locale][1]}</p></li>)}</ul>
    </div>
  </section>;
}
export function WhatsNew({ar,noticeVisible,supportBusy=false}:{ar:boolean;noticeVisible:boolean;supportBusy?:boolean}) {
  const [banner,setBanner]=useState(()=>{try{return shouldShowWhatsNew(window.loaderly?.appVersion??'',localStorage.getItem(seenKey),installedBuild);}catch{return false;}});
  const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),notice=useRef<HTMLDivElement>(null);
  const t=(en:string,a:string)=>ar?a:en;
  const markSeen=()=>{try{localStorage.setItem(seenKey,installedBuild);}catch{}setBanner(false);};
  useEffect(()=>{const show=()=>{markSeen();setOpen(true);};window.addEventListener('loaderly:whats-new',show);return()=>window.removeEventListener('loaderly:whats-new',show);},[]);
  useLayoutEffect(()=>{
    const element=notice.current;if(!banner||noticeVisible||!element)return;
    element.showPopover();const release=registerFloatingMaterial(element);
    return()=>{release();element.hidePopover();};
  },[banner,noticeVisible]);
  useLayoutEffect(()=>{
    const element=dialog.current;if(!open||!element)return;
    const previous=document.activeElement;element.showModal();const release=registerFloatingMaterial(element);
    return()=>{release();element.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
  },[open]);
  return <>{banner&&!noticeVisible&&<div ref={notice} popover="manual" className="activity-notice update-notice" role="status"><Megaphone size={18}/><span>{t(`What's new in Loaderly ${whatsNewVersion}`,`الجديد في Loaderly ${whatsNewVersion}`)}</span><button className="notice-folder" onClick={()=>{markSeen();setOpen(true);}}>{t('See what’s new','اكتشف الجديد')}</button><button aria-label={t('Dismiss','إغلاق')} onClick={markSeen}><X size={15}/></button></div>}
    {open&&<dialog ref={dialog} className="app-dialog whats-new-dialog" dir={ar?'rtl':'ltr'} aria-labelledby="whats-new-title" onCancel={()=>setOpen(false)}>
      <header className="app-dialog-heading"><div><h2 id="whats-new-title">{t('What’s new','ما الجديد؟')}</h2><p><bdi>Loaderly {whatsNewVersion}</bdi></p></div><button className="button secondary" autoFocus aria-label={t('Close','إغلاق')} onClick={()=>setOpen(false)}><X size={17}/></button></header>
      <div className="whats-new-content" role="region" aria-label={t('Update details','تفاصيل التحديث')} tabIndex={0}>
        <section className="whats-new-highlights" aria-labelledby="whats-new-highlights-title">
          <h3 id="whats-new-highlights-title">{t('Highlights','أبرز التغييرات')}</h3>
          <ul>{whatsNewHighlights.map((item,i)=><li key={i}><strong>{item[ar?'ar':'en'][0]}</strong>{': '}<span>{item[ar?'ar':'en'][1]}</span></li>)}</ul>
        </section>
        <section className="whats-new-details" aria-labelledby="whats-new-details-title">
          <h3 id="whats-new-details-title">{t('All additions and fixes','كل الإضافات والإصلاحات')}</h3>
          <p className="whats-new-details__hint">{t('Open a section to see every detail.','افتح أي قسم للاطلاع على تفاصيله كاملة.')}</p>
          {whatsNewSections.map(section=><WhatsNewSection key={section.id} section={section} ar={ar}/>)}
        </section>
      </div>
      <footer><div className="whats-new-support"><a className="button secondary whats-new-support__button" href={supportUrl(ar)} target="_blank" rel="noopener noreferrer" onClick={announceSupportOpened}><Heart size={16} aria-hidden="true"/>{t('Support Loaderly','ساهم في تطوير Loaderly')}</a><p>{t('Your support helps us improve Loaderly and bring you better updates.','دعمك يساعدنا على تطوير البرنامج وتقديم تحديثات أفضل.')}</p></div><button className="button primary" onClick={()=>setOpen(false)}>{t('Got it','فهمت')}</button></footer>
    </dialog>}<SupportNotice ar={ar} blocked={noticeVisible||banner||open||supportBusy}/></>;
}
