import {formatTimecode} from '../../shared/editor-timeline/timecode';
import {useEffect,useRef,useState} from 'react';
import {CheckCheck,Download,ListMusic,LoaderCircle,RefreshCw,Search,X,Info,Film} from 'lucide-react';
import {selectedPlaylistEntries,playlistErrorMessage,type PlaylistErrorCode,type PlaylistEntry,type PlaylistPreview} from '../../shared/download-url/playlist';

function PlaylistArtwork({id}:{id:string}) {
  const [failed,setFailed]=useState(false);
  return <span className="playlist-artwork">{failed?<Film size={19} aria-hidden="true"/>:<img src={`https://i.ytimg.com/vi/${id}/default.jpg`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}</span>;
}

export function PlaylistPicker({url,ar,initialSelection,onRemember,onDone}:{url:string;ar:boolean;initialSelection?:string[];onRemember:(ids:string[])=>void;onDone:(entries:PlaylistEntry[]|null)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [playlist,setPlaylist]=useState<PlaylistPreview>();
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [loading,setLoading]=useState(true),[error,setError]=useState<PlaylistErrorCode>(),[retry,setRetry]=useState(0);
  const [search,setSearch]=useState(''),[quantity,setQuantity]=useState('10');
  const t=(en:string,a:string)=>ar?a:en;
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>{
    let disposed=false;let started=false;setLoading(true);setError(undefined);setPlaylist(undefined);
    const timer=setTimeout(()=>{started=true;
    void window.loaderly?.playlistPreview(url).then(result=>{
      if(disposed)return;
      if(!result.ok){setError(result.code??'unavailable');return;}
      setPlaylist(result.playlist);
      const allowed=result.playlist.entries.filter(e=>e.available).map(e=>e.id);
      setSelected(new Set(initialSelection?initialSelection.filter(id=>allowed.includes(id)):[]));
    }).catch(()=>{if(!disposed)setError('unavailable');}).finally(()=>{if(!disposed)setLoading(false);});
    },0);
    return()=>{disposed=true;clearTimeout(timer);if(started)void window.loaderly?.cancelPlaylist();};
  },[url,retry]);
  const choose=(ids:string[])=>{setSelected(new Set(ids));onRemember(ids);};
  const entries=playlist?.entries??[],available=entries.filter(e=>e.available),chosen=selectedPlaylistEntries(entries,[...selected]);
  const visible=entries.filter(e=>`${e.title} ${e.author??''}`.toLowerCase().includes(search.toLowerCase()));
  return <dialog ref={dialog} className="app-dialog playlist-dialog" dir={ar?'rtl':'ltr'} aria-labelledby="playlist-title" onCancel={e=>{e.preventDefault();onDone(null);}}>
    <header><span className="playlist-heading-icon"><ListMusic size={21}/></span><div><h2 id="playlist-title">{t('Choose from playlist','اختر من قائمة التشغيل')}</h2><p dir="auto">{playlist?.title??(new URL(url).searchParams.get('list')?.startsWith('RD')?t('YouTube Mix','مزيج يوتيوب'):t('YouTube playlist','قائمة يوتيوب'))}</p></div><button className="button secondary playlist-close" aria-label={t('Cancel playlist','إلغاء القائمة')} onClick={()=>onDone(null)}><X size={17}/></button></header>
    {loading?<div className="playlist-state" role="status"><span className="playlist-state-icon"><LoaderCircle size={22} className="playlist-spinner"/></span><div><h3>{t('Reading the playlist','جارٍ قراءة القائمة')}</h3><p>{t('Choose the videos you want once they appear. Nothing downloads until you confirm.','اختر المقاطع بعد ظهورها. لن يبدأ التنزيل حتى تؤكد اختيارك.')}</p></div></div>:error?<div className="playlist-state" role="alert"><span className="playlist-state-icon"><Info size={22}/></span><div><h3>{t('The playlist could not be opened','تعذّر فتح القائمة')}</h3><p>{playlistErrorMessage(error,ar)}</p><button className="button secondary" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={15}/>{t('Try again','حاول مجددًا')}</button></div></div>:<>
      <div className="playlist-controls">
        <label className="playlist-search"><Search size={16}/><input aria-label={t('Search playlist','بحث في القائمة')} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Search titles or channels','ابحث بالعنوان أو القناة')}/></label>
        <div className="playlist-selection-tools"><button className="button secondary" onClick={()=>choose(available.map(e=>e.id))}><CheckCheck size={15}/>{t('Select all','تحديد الكل')}</button><button className="button secondary" onClick={()=>choose([])}><X size={15}/>{t('Clear selection','إلغاء التحديد')}</button><label>{t('First','أول')} <input aria-label={t('Number of videos','عدد المقاطع')} type="number" min="1" max={available.length} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><button className="button secondary" disabled={!Number.isInteger(Number(quantity))||Number(quantity)<1||!available.length} onClick={()=>choose(available.slice(0,Math.min(available.length,Number(quantity))).map(e=>e.id))}><CheckCheck size={15}/>{t('Select count','تحديد العدد')}</button></div>
        <p className="playlist-count" role="status"><bdi>{chosen.length} / {available.length}</bdi> {t('selected','محدد')}{playlist?.truncated&&` · ${t('Showing the first 1,000 playlist positions.','نعرض أول 1,000 موضع في القائمة.')}`}{entries.length>available.length&&` · ${entries.length-available.length} ${t('unavailable','غير متاح')}`}</p>
      </div>
      <div className="playlist-entries">{visible.map(entry=><label className={`playlist-entry${selected.has(entry.id)?' is-selected':''}`} key={entry.id}><input type="checkbox" disabled={!entry.available} checked={selected.has(entry.id)} onChange={e=>choose(e.target.checked?[...selected,entry.id]:[...selected].filter(id=>id!==entry.id))}/><PlaylistArtwork id={entry.id}/><span className="playlist-entry-title"><strong dir="auto">{entry.title}</strong><small><bdi>{entry.available?entry.author:t('Unavailable on YouTube','غير متاح في يوتيوب')}</bdi>{entry.duration!==undefined&&<span className="playlist-duration"><bdi>{formatTimecode(entry.duration,false)}</bdi></span>}</small></span><span className="playlist-index">{entry.index}</span></label>)}{!visible.length&&<p>{t('No matching videos.','لا توجد مقاطع مطابقة.')}</p>}</div>
    </>}
    <footer><small>{t('Only selected videos will be added, using your chosen download format.','تُضاف المقاطع المحددة فقط، وبصيغة التنزيل التي اخترتها.')}</small><div className="playlist-actions"><button className="button secondary" onClick={()=>onDone(null)}>{t('Cancel','إلغاء')}</button>{!error&&<button className="button primary" disabled={loading||!chosen.length} onClick={()=>{onRemember([...selected]);onDone(chosen);}}><Download size={15}/>{!loading&&chosen.length?t(`Add ${chosen.length} to downloads`,`إضافة ${chosen.length} للتنزيل`):t('Add to downloads','إضافة للتنزيل')}</button>}</div></footer>
  </dialog>;
}
