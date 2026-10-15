import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Keyboard, X, RotateCcw, Library, Download, Settings, Users, Upload, Film, Wrench, Play, Undo2, Redo2, Scissors, Eye, ZoomIn, Gauge, Type, Languages } from 'lucide-react';
import { resolveEditorShortcut } from '../../shared/editor-project/editorShortcuts';
import { shortcutLabel } from '../../shared/ui/shortcutLabel';
import { keyboardChord } from '../../shared/ui/keyboardShortcut';
import { commandBindings, commandShortcutStorageKey, defaultCommandShortcuts, readCommandOverrides } from '../../shared/ui/commandShortcuts';
import { registerFloatingMaterial } from '../../shared/ui/floating-material';
export type WorkspaceCommand={id:string;en:string;ar:string;run:()=>void;disabled?:boolean;reason?:string};
export function CommandPalette({ar,commands}:{ar:boolean;commands:WorkspaceCommand[]}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[configure,setConfigure]=useState(false),[recording,setRecording]=useState(''),[message,setMessage]=useState('');
 const [overrides,setOverrides]=useState(readCommandOverrides);
 const bindings=commandBindings(overrides);
 const [showUnavailable,setShowUnavailable]=useState(false),[active,setActive]=useState(0);
 const listId=useId();
 const trigger=useRef<HTMLButtonElement>(null);
 const dialog=useRef<HTMLDialogElement>(null),search=useRef<HTMLInputElement>(null);
 const t=(en:string,arabic:string)=>ar?arabic:en;
 function save(value:Record<string,string>){try{localStorage.setItem(commandShortcutStorageKey,JSON.stringify(value));setOverrides(value);}catch{setMessage(t('Could not save shortcuts.','تعذر حفظ الاختصارات.'));}}
 const close=()=>{setOpen(false);setRecording('');};
 useLayoutEffect(()=>{
  const element=dialog.current;if(!open||!element)return;
  setQuery('');setActive(0);setConfigure(false);setMessage('');setShowUnavailable(false);
  const previous=document.activeElement;element.showModal();const release=registerFloatingMaterial(element);search.current?.focus();
  return()=>{release();element.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[open]);
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>{
   const chord=keyboardChord(e,window.loaderly?.platform ?? 'win32');
   if(!chord)return;
   if(recording){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape'){setRecording('');return;}
    const ownDefault=chord===defaultCommandShortcuts[recording];
    if((!ownDefault&&!/^Mod\+(?:Shift\+)?(?:Key[A-Z]|Digit[0-9]|Enter)$/.test(chord))||chord==='Mod+KeyK'||chord==='Mod+Enter'||['KeyQ','KeyW','KeyR','KeyH','KeyM'].includes(e.code)||(!ownDefault&&resolveEditorShortcut({key:e.key,code:e.code,ctrlKey:e.ctrlKey,metaKey:e.metaKey,shiftKey:e.shiftKey,altKey:e.altKey}))||Object.entries(bindings).some(([id,b])=>id!==recording&&b===chord)){setMessage(t('This shortcut is reserved or already in use. Choose another key combination.','هذا الاختصار محجوز أو مستخدم. اختر تركيبة مفاتيح أخرى.'));return;}
    save({...overrides,[recording]:chord});setRecording('');setMessage('');return;
   }
   if(chord==='Mod+KeyK'){e.preventDefault();e.stopImmediatePropagation();if(!document.querySelector('dialog[open]')||open)setOpen(value=>!value);return;}
   const target=e.target;if(open||document.querySelector('dialog[open], [role=menu], .editor-context-menu, .app-color-picker')||!(target instanceof Element)||target.closest('input,textarea,select,[contenteditable=true],[role=textbox]'))return;
   const command=commands.find(c=>!c.disabled&&bindings[c.id]===chord);if(command){e.preventDefault();e.stopImmediatePropagation();command.run();}
  };
  window.addEventListener('keydown',handler,true);return()=>window.removeEventListener('keydown',handler,true);
 },[commands,bindings,recording,open]);
 const icons:Record<string,typeof Search>={library:Library,downloads:Download,settings:Settings,community:Users,import:Upload,editor:Film,tools:Wrench,'start-downloads':Play,undo:Undo2,redo:Redo2,'tool-cut':Scissors,'tool-blur':Eye,'tool-zoom':ZoomIn,'tool-speed':Gauge,'tool-text':Type,'tool-subtitles':Languages};
 const group=(id:string)=>['library','downloads','settings','community','tools'].includes(id)?'navigation':id==='import'||id==='start-downloads'?'media':'editor';
 const groups=[{id:'navigation',label:t('Go to','الانتقال إلى')},{id:'media',label:t('Media & downloads','الوسائط والتنزيلات')},{id:'editor',label:t('Editing','التحرير')}];
 const matches=commands.filter(c=>`${c.en} ${c.ar}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const filtered=groups.flatMap(g=>matches.filter(c=>group(c.id)===g.id&&(configure||showUnavailable||!c.disabled)));
 const unavailable=matches.filter(c=>c.disabled).length;
 const available=filtered.filter(c=>configure||!c.disabled);
 const current=available[Math.min(active,Math.max(0,available.length-1))];
 function choose(command:WorkspaceCommand){
  if(configure){setRecording(command.id);setMessage(t('Press the new shortcut. Escape cancels.','اضغط الاختصار الجديد. Escape للإلغاء.'));}
  else if(!command.disabled){close();command.run();}
 }
 function navigate(e:React.KeyboardEvent){
  if(recording||!['ArrowDown','ArrowUp','Enter'].includes(e.key))return;
  e.preventDefault();
  if(e.key==='Enter'){if(current)choose(current);return;}
  const index=available.length?(active+(e.key==='ArrowDown'?1:-1)+available.length)%available.length:0;
  setActive(index);document.getElementById(`${listId}-${available[index]?.id}`)?.scrollIntoView({block:'nearest'});search.current?.focus();
 }
 return <><button ref={trigger} type="button" className="product-nav__utility" onClick={()=>setOpen(true)}><Search size={15}/><span>{t('Commands','الأوامر')}</span><kbd dir="ltr">{window.loaderly?.platform === 'darwin'?'⌘':'Ctrl'} K</kbd></button>
 {createPortal(<dialog ref={dialog} className="workspace-command-dialog" dir={ar?'rtl':'ltr'} aria-label={t('Commands','الأوامر')} onCancel={e=>{e.preventDefault();close();}}>
 <header className="workspace-command-heading"><div><h2>{configure?t('Keyboard shortcuts','اختصارات لوحة المفاتيح'):t('Quick commands','الوصول السريع')}</h2><p>{configure?t('Shortcuts are ready to use. Select an action to change its keys. Key positions stay the same in every keyboard language.','الاختصارات جاهزة للاستخدام. اختر إجراءً لتغيير اختصاره. تبقى مواضع المفاتيح نفسها مع جميع لغات لوحة المفاتيح.'):t('Jump to a page or run an action without leaving your keyboard.','انتقل إلى صفحة أو نفّذ إجراءً من مكان واحد.')}</p></div><button className="button secondary" aria-label={t('Close','إغلاق')} onClick={close}><X size={18}/></button></header>
 <label className="workspace-command-search"><Search size={18}/><input ref={search} role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={current?`${listId}-${current.id}`:undefined} aria-label={t('Search commands','البحث في الأوامر')} placeholder={t('Try: downloads, import, settings…','مثل: التنزيلات، استيراد، الإعدادات…')} value={query} onChange={e=>{setQuery(e.target.value);setActive(0);}} onKeyDown={navigate}/>{query&&<button className="workspace-command-clear" aria-label={t('Clear search','مسح البحث')} onClick={()=>{setQuery('');setActive(0);search.current?.focus();}}><X size={16}/></button>}</label>
 {message&&<p className="workspace-command-message" role="status">{message}</p>}
 <div className="workspace-command-list" id={listId} role="listbox" aria-label={t('Available actions','الإجراءات المتاحة')} onKeyDown={navigate}>
 {groups.map(g=>{const rows=filtered.filter(c=>group(c.id)===g.id);return rows.length>0&&<div key={g.id} role="group" aria-label={g.label}><h3>{g.label}</h3>{rows.map(command=>{const Icon=icons[command.id]??Search;return <div className="workspace-command-row" key={command.id}>
 <button type="button" id={`${listId}-${command.id}`} role="option" aria-selected={current?.id===command.id} className="workspace-command" disabled={command.disabled&&!configure} onFocus={()=>setActive(Math.max(0,available.findIndex(c=>c.id===command.id)))} onClick={()=>choose(command)}><Icon size={18}/><span>{ar?command.ar:command.en}{command.disabled&&command.reason&&<small className="workspace-command-reason">{command.reason}</small>}</span>{(recording===command.id||bindings[command.id]||configure)&&<kbd dir="ltr">{recording===command.id?'…':(bindings[command.id] ? shortcutLabel(bindings[command.id],window.loaderly?.platform ?? 'win32') : undefined)??t('Set shortcut','تعيين اختصار')}</kbd>}</button>
 {configure&&overrides[command.id]&&<button className="button secondary" aria-label={t('Reset shortcut','إعادة ضبط الاختصار')} onClick={()=>{const next={...overrides};delete next[command.id];save(next);}}><RotateCcw size={15}/></button>}</div>;})}</div>;})}
 {filtered.length===0&&<p className="workspace-command-empty">{t('No available actions match your search. Try a page or tool name.','لا توجد إجراءات متاحة تطابق البحث. جرّب اسم صفحة أو أداة.')}</p>}
 </div>
 <footer className="workspace-command-footer"><div className="workspace-command-options"><button className="button secondary" aria-pressed={configure} onClick={()=>{setConfigure(v=>!v);setActive(0);setRecording('');setMessage('');}}><Keyboard size={15}/>{configure?t('Back to commands','العودة للأوامر'):t('Customize shortcuts','تخصيص الاختصارات')}</button>{!configure&&unavailable>0&&<label><input type="checkbox" checked={showUnavailable} onChange={e=>{setShowUnavailable(e.target.checked);setActive(0);}}/>{t('Show unavailable','إظهار غير المتاح')} ({unavailable})</label>}</div><small><kbd>↑ ↓</kbd> {t('Navigate','تنقّل')} · <kbd>Enter</kbd> {t('Choose','اختيار')} · <kbd>Esc</kbd> {t('Close','إغلاق')}</small></footer>
 </dialog>, trigger.current?.closest('.app-shell') ?? document.body)}</>;
}
