import {formatTimecode} from '../../shared/editor-timeline/timecode';
import {useEffect,useRef,useState} from 'react';
import {CheckCheck,Download,ListMusic,LoaderCircle,RefreshCw,Search,X} from 'lucide-react';
import {selectedPlaylistEntries,type PlaylistEntry,type PlaylistPreview} from '../../shared/download-url/playlist';

export function PlaylistPicker({url,ar,initialSelection,onRemember,onDone}:{url:string;ar:boolean;initialSelection?:string[];onRemember:(ids:string[])=>void;onDone:(entries:PlaylistEntry[]|null)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [playlist,setPlaylist]=useState<PlaylistPreview>();
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [search,setSearch]=useState(''),[quantity,setQuantity]=useState('10');
  const t=(en:string,a:string)=>ar?a:en;
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>{
    let disposed=false;let started=false;setLoading(true);setError('');
    const timer=setTimeout(()=>{started=true;
    void window.loaderly?.playlistPreview(url).then(result=>{
      if(disposed)return;
      if(!result.ok){setError(result.message);return;}
      setPlaylist(result.playlist);
      const allowed=result.playlist.entries.filter(e=>e.available).map(e=>e.id);
      setSelected(new Set(initialSelection?initialSelection.filter(id=>allowed.includes(id)):allowed));
    }).catch(()=>{if(!disposed)setError(t('Could not load the playlist. Please try again.','تعذّر تحميل القائمة. حاول مجددًا.'));}).finally(()=>{if(!disposed)setLoading(false);});
    },0);
    return()=>{disposed=true;clearTimeout(timer);if(started)void window.loaderly?.cancelPlaylist();};
  },[url,retry]);
  const choose=(ids:string[])=>{setSelected(new Set(ids));onRemember(ids);};
  const entries=playlist?.entries??[],available=entries.filter(e=>e.available),chosen=selectedPlaylistEntries(entries,[...selected]);
  const visible=entries.filter(e=>`${e.title} ${e.author??''}`.toLowerCase().includes(search.toLowerCase()));
  return <dialog ref={dialog} className="playlist-dialog" aria-labelledby="playlist-title" onCancel={e=>{e.preventDefault();onDone(null);}}>
    <header><ListMusic size={23}/><div><h2 id="playlist-title">{t('Choose from playlist','اختر من قائمة التشغيل')}</h2><p dir="auto">{playlist?.title??t('YouTube playlist','قائمة يوتيوب')}</p></div><button className="button secondary" aria-label={t('Cancel playlist','إلغاء القائمة')} onClick={()=>onDone(null)}><X size={17}/></button></header>
    {loading?<div className="playlist-loading" role="status"><LoaderCircle size={24}/>{t('Reading the playlist… No downloads have started.','جارٍ قراءة القائمة… لم يبدأ تنزيل أي مقطع.')}</div>:error?<div className="playlist-loading" role="alert"><p>{error}</p><button className="button secondary" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={15}/>{t('Try again','حاول مجددًا')}</button></div>:<>
      <div className="playlist-controls">
        <label className="playlist-search"><Search size={16}/><input aria-label={t('Search playlist','بحث في القائمة')} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Search titles or channels','ابحث بالعنوان أو القناة')}/></label>
        <div className="playlist-selection-tools"><button className="button secondary" onClick={()=>choose(available.map(e=>e.id))}><CheckCheck size={15}/>{t('Select all','تحديد الكل')}</button><button className="button secondary" onClick={()=>choose([])}><X size={15}/>{t('Clear selection','إلغاء التحديد')}</button><label>{t('First','أول')} <input aria-label={t('Number of videos','عدد المقاطع')} type="number" min="1" max={available.length} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><button className="button secondary" disabled={!Number.isInteger(Number(quantity))||Number(quantity)<1||!available.length} onClick={()=>choose(available.slice(0,Math.min(available.length,Number(quantity))).map(e=>e.id))}><CheckCheck size={15}/>{t('Select count','تحديد العدد')}</button></div>
        <p className="playlist-count" role="status">{chosen.length} / {available.length} {t('selected','محدد')}{playlist?.truncated&&` · ${t('Showing the first 1,000 playlist positions.','نعرض أول ١٬٠٠٠ موضع في القائمة.')}`}{entries.length>available.length&&` · ${entries.length-available.length} ${t('unavailable','غير متاح')}`}</p>
      </div>
      <div className="playlist-entries">{visible.map(entry=><label className={`playlist-entry${selected.has(entry.id)?' is-selected':''}`} key={entry.id}><input type="checkbox" disabled={!entry.available} checked={selected.has(entry.id)} onChange={e=>choose(e.target.checked?[...selected,entry.id]:[...selected].filter(id=>id!==entry.id))}/><span className="playlist-index">{entry.index}</span><span className="playlist-entry-title"><strong dir="auto">{entry.title}</strong><small dir="auto">{entry.available?entry.author:t('Unavailable on YouTube','غير متاح في يوتيوب')}</small></span><span className="playlist-duration">{entry.duration===undefined?'—':formatTimecode(entry.duration,false)}</span></label>)}{!visible.length&&<p>{t('No matching videos.','لا توجد مقاطع مطابقة.')}</p>}</div>
    </>}
    <footer><small>{t('Only your selection is added to the queue. Your download format stays the same.','تُضاف المقاطع المحددة فقط إلى قائمة التنزيل وبالصيغة التي اخترتها.')}</small><button className="button secondary" onClick={()=>onDone(null)}><X size={15}/>{t('Cancel','إلغاء')}</button><button className="button primary" disabled={loading||!!error||!chosen.length} onClick={()=>{onRemember([...selected]);onDone(chosen);}}><Download size={15}/>{t(`Add ${chosen.length} to downloads`,`إضافة ${chosen.length} للتنزيل`)}</button></footer>
  </dialog>;
}
