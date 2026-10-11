import { DesktopMenu } from './DesktopMenu';
import { useState } from 'react';
import { Palette, SlidersHorizontal, AudioLines, Pencil, FolderOpen } from 'lucide-react';
import type { DesignDraft } from '../../shared/communityDrafts';
export function designKindLabel(kind:string,ar:boolean) { return kind==='sound'?(ar?'إعداد صوتي':'Sound preset'):kind==='theme'?(ar?'ثيم البرنامج':'App theme'):(ar?'طيف صوتي':'Audio visualizer'); }
export function DesignLibrary({items,busy,ar,onSelect}:{items:DesignDraft[];activeId?:string;busy:boolean;ar:boolean;onSelect:(item:DesignDraft)=>void}) {
 const [filter,setFilter]=useState('all'),[search,setSearch]=useState(''),[sort,setSort]=useState('recent');
 const t=(en:string,a:string)=>ar?a:en;
 const filtered=items.filter(item=>(filter==='all'||item.kind===filter)&&item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 const ordered=[...filtered].sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):b.updatedAt.localeCompare(a.updatedAt));
 return <div className="studio-designs">
  <div className="studio-library-toolbar">
   <div className="segmented-control" aria-label={t('Design type','نوع التصميم')}>{['all','sound','theme','visualizer'].map(kind=><button key={kind} className={filter===kind?'active':''} aria-pressed={filter===kind} onClick={()=>setFilter(kind)}>{kind==='all'?t('All designs','كل التصاميم'):designKindLabel(kind,ar)}</button>)}</div>
   <input type="search" aria-label={t('Search my designs','البحث في تصاميمي')} placeholder={t('Search my designs','ابحث في تصاميمي')} value={search} onChange={e=>setSearch(e.target.value)}/>
   <DesktopMenu ariaLabel={t('Sort designs','ترتيب التصاميم')} value={sort} valueLabel={sort==='recent'?t('Recently edited','آخر تعديل'):t('Name','الاسم')} options={[{value:'recent',label:t('Recently edited','آخر تعديل')},{value:'name',label:t('Name','الاسم')}]} onChange={setSort}/>
  </div>
  {[false,true].map(published=>{
   const matches=ordered.filter(item=>item.published===published);
   return matches.length>0&&<section key={String(published)} className="design-library-group">
    <h3>{published?t('Published in Loaderly','منشور في Loaderly'):t('Private designs','تصاميم خاصة')} <small>({matches.length})</small></h3>
    <div className="design-library-grid">{matches.map(item=><article key={item.id} className="design-library-card" data-design-id={item.id}>
     <span className="design-library-icon" aria-hidden="true">{item.kind==='theme'?<Palette size={23}/>:item.kind==='sound'?<SlidersHorizontal size={23}/>:<AudioLines size={23}/>}</span>
     <div className="design-library-title"><small>{designKindLabel(item.kind,ar)}</small><h4 dir="auto">{item.name}</h4></div>
     <div className="design-library-meta"><span>{item.revision>0?t('Device + account','الجهاز والحساب'):t('On this device','على هذا الجهاز')}</span>{item.updatedAt&&!Number.isNaN(Date.parse(item.updatedAt))&&<time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString(ar?'ar':'en',{month:'short',day:'numeric'})}</time>}</div>
     <button className="button secondary" disabled={busy} aria-label={`${t('Edit','تعديل')} ${item.name}`} onClick={()=>onSelect(item)}><Pencil size={14}/>{t('Edit design','تعديل التصميم')}</button>
    </article>)}</div>
   </section>;
  })}
  {!filtered.length&&<div className="design-library-empty"><FolderOpen size={26}/><strong>{items.length?t('No matching designs','لا توجد تصاميم مطابقة'):t('Your designs belong here','مكان تصاميمك هنا')}</strong><p>{items.length?t('Try another name or design type.','جرّب اسمًا أو نوع تصميم آخر.'):t('Create a theme, visualizer or sound preset, or import a settings file.','أنشئ ثيمًا أو طيفًا أو إعدادًا صوتيًا، أو استورد ملف إعدادات.')}</p></div>}
 </div>;
}
