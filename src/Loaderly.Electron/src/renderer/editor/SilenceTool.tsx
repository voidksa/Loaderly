import { useEffect, useRef, useState } from 'react';
import { AudioLines, Play, Square, Scissors } from 'lucide-react';
import { suggestSilenceCuts } from '../../shared/editor-project/studio';
import { formatTimecode } from '../../shared/editor-timeline/timecode';
import type { StudioResponse } from '../../shared/studioApi';

const presets = [
  { id: 'gentle', en: 'Long pauses only', ar: 'الوقفات الطويلة فقط', threshold: -40, minimum: 1, padding: .2 },
  { id: 'balanced', en: 'Natural speech', ar: 'كلام طبيعي', threshold: -35, minimum: .5, padding: .12 },
  { id: 'tight', en: 'Shorter pauses', ar: 'وقفات أقصر', threshold: -30, minimum: .3, padding: .1 },
] as const;

export function SilenceTool({ ar, sourceUrl, duration, analyze, onCuts }: {
  ar: boolean; sourceUrl: string; duration: number;
  analyze: (threshold: number, minimum: number) => Promise<StudioResponse['analysis']>;
  onCuts: (cuts: { startSeconds: number; endSeconds: number }[]) => void;
}) {
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [preset, setPreset] = useState('balanced'), [threshold, setThreshold] = useState(-35);
  const [minimum, setMinimum] = useState(.5), [padding, setPadding] = useState(.12);
  const [analysis, setAnalysis] = useState<StudioResponse['analysis']>();
  const [selected, setSelected] = useState<number[]>([]), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [listening, setListening] = useState<number | null>(null);
  const [setupOpen, setSetupOpen] = useState(true);
  const audio = useRef<HTMLAudioElement>(null), stopAt = useRef(0), frame = useRef(0), generation = useRef(0);
  const cuts = analysis ? suggestSilenceCuts(analysis.silences, duration, padding, minimum) : [];
  function stop() { generation.current++; audio.current?.pause(); cancelAnimationFrame(frame.current); setListening(null); }
  useEffect(() => { const media=audio.current; return () => { generation.current++; media?.pause(); cancelAnimationFrame(frame.current); }; }, []);
  function invalidate() { stop(); setAnalysis(undefined); setSelected([]); setMessage(''); }
  async function listen(index: number) {
    if (listening === index) { stop(); return; }
    stop(); const token = generation.current, media = audio.current, cut = cuts[index];
    if (!media || !cut) return;
    // Include surrounding speech so the user can judge the proposed cut.
    stopAt.current = Math.min(duration, cut.endSeconds + .65);
    try {
      if (!media.readyState) await new Promise<void>((resolve, reject) => {
        const loaded = () => { cleanup(); resolve(); }, failed = () => { cleanup(); reject(); };
        const cleanup = () => { media.removeEventListener('loadedmetadata', loaded); media.removeEventListener('error', failed); };
        media.addEventListener('loadedmetadata', loaded); media.addEventListener('error', failed);
        media.load();
      });
      if (generation.current !== token) return;
      media.currentTime = Math.max(0, cut.startSeconds - .65);
      await media.play();
      if (generation.current !== token) { media.pause(); return; }
      setListening(index);
      const tick = () => { if (media.currentTime >= stopAt.current || media.ended) stop(); else frame.current = requestAnimationFrame(tick); };
      frame.current = requestAnimationFrame(tick);
    } catch { setMessage(t('Could not play this section. Try again.', 'تعذر تشغيل هذا الجزء. حاول مرة أخرى.')); }
  }
  return <div className="studio-guided-tool">
    <audio ref={audio} src={sourceUrl} preload="metadata" onEnded={stop}/>
    <details className="studio-silence-setup" open={setupOpen} onToggle={e=>setSetupOpen(e.currentTarget.open)}><summary>{t('1. Choose how to find pauses','1. اختر طريقة البحث عن الوقفات')}{analysis&&<small> · {presets.find(item=>item.id===preset)?.[ar?'ar':'en']??t('Custom','مخصص')}</small>}</summary>
    <div className="studio-step"><div><p>{t('Start with Natural speech. We search the entire file. Review every suggestion before removing anything.', 'ابدأ بخيار «كلام طبيعي». نبحث في الملف كاملًا؛ راجع المقترحات قبل حذف أي جزء.')}</p></div></div>
    <div className="studio-choice-row" aria-label={t('Silence detection style', 'طريقة اكتشاف الصمت')}>{presets.map(item => <button type="button" className="button secondary" key={item.id} aria-pressed={preset === item.id} disabled={busy} onClick={() => { invalidate(); setPreset(item.id); setThreshold(item.threshold); setMinimum(item.minimum); setPadding(item.padding); }}>{ar ? item.ar : item.en}</button>)}</div>
    <details className="studio-advanced"><summary>{t('Advanced detection settings', 'إعدادات اكتشاف متقدمة')}</summary><p>{t('Adjust only if the suggestions miss pauses or include quiet speech. Changing these settings requires a new search.', 'عدّلها فقط إذا لم تُكتشف الوقفات أو ظهر كلام هادئ ضمن المقترحات. ابحث مجددًا بعد التعديل.')}</p><div className="studio-grid">
      <label>{t('Sound below this level counts as silence (dB)', 'اعتبار الصوت الأقل من هذا المستوى صمتًا (dB)')}<input type="number" dir="ltr" value={threshold} min={-80} max={-10} disabled={busy} onChange={e => { const n=e.currentTarget.valueAsNumber;if(Number.isFinite(n)){invalidate();setPreset('custom');setThreshold(Math.max(-80,Math.min(-10,n)));} }}/><small>{t('A higher value also includes quieter sounds.', 'رفع القيمة يُدخل أصواتًا هادئة أكثر ضمن الصمت.')}</small></label>
      <label>{t('Ignore pauses shorter than (seconds)', 'تجاهل الوقفات الأقصر من (ثانية)')}<input type="number" dir="ltr" value={minimum} min={.1} max={10} step={.1} disabled={busy} onChange={e=>{const n=e.currentTarget.valueAsNumber;if(Number.isFinite(n)){invalidate();setPreset('custom');setMinimum(Math.max(.1,Math.min(10,n)));}}}/></label>
      <label>{t('Keep breathing room around speech (seconds)', 'ترك مهلة حول الكلام (ثانية)')}<input type="number" dir="ltr" value={padding} min={0} max={1} step={.01} disabled={busy} onChange={e=>{const n=e.currentTarget.valueAsNumber;if(Number.isFinite(n)){invalidate();setPreset('custom');setPadding(Math.max(0,Math.min(1,n)));}}}/><small>{t('Protects the beginnings and ends of spoken words.', 'يحافظ على بدايات الكلمات ونهاياتها.')}</small></label>
    </div></details>
    <button className="button primary" disabled={busy} onClick={async()=>{stop();setBusy(true);setMessage('');try{const result=await analyze(threshold,minimum);setAnalysis(result);setSelected([]);if(result)setSetupOpen(false);}catch{setMessage(t('Could not find pauses. Please try again.', 'تعذر البحث عن الوقفات. حاول مرة أخرى.'));}finally{setBusy(false);}}}><AudioLines size={16}/>{busy?t('Finding pauses…','جارٍ البحث عن الوقفات…'):analysis?t('Find pauses again','البحث مجددًا'):t('Find pauses','البحث عن الوقفات')}</button>
    </details>
    {analysis&&<>
      <div className="studio-step"><span className="studio-step-number">2</span><div><h4>{cuts.length?t(`Suggested pauses: ${cuts.length}`,`راجع الوقفات المقترحة: ${cuts.length}`):t('No pauses found with these settings','لم نجد وقفات بهذه الإعدادات')}</h4><p>{cuts.length?t('Listen with a little context, then select “Remove this pause”. Nothing is selected automatically.', 'استمع إلى الوقفة وما حولها، ثم حدد «حذف هذه الوقفة». لا نحدد أي جزء تلقائيًا.'):t('Try Shorter pauses. Music and background sound can hide silent gaps.', 'جرّب «وقفات أقصر». قد تمنع الموسيقى وأصوات الخلفية اكتشاف الصمت.')}</p></div></div>
      {cuts.map((cut,index)=><div className="studio-silence-row" key={`${cut.startSeconds}:${cut.endSeconds}`}>
        <div><strong>{t('Pause','وقفة')} {index+1}</strong><p>{t('From','من')} <bdi dir="ltr">{formatTimecode(cut.startSeconds)}</bdi> {t('to','إلى')} <bdi dir="ltr">{formatTimecode(cut.endSeconds)}</bdi> <small>({Number((cut.endSeconds-cut.startSeconds).toFixed(2))} {t('seconds','ثانية')})</small></p></div>
        <button className="button secondary" aria-pressed={listening===index} onClick={()=>void listen(index)}>{listening===index?<Square size={15}/>:<Play size={15}/>} {listening===index?t('Stop listening','إيقاف الاستماع'):t('Listen to this pause','استماع للوقفة')}</button>
        <label><input type="checkbox" checked={selected.includes(index)} onChange={e=>setSelected(e.target.checked?[...selected,index]:selected.filter(i=>i!==index))}/>{t('Remove this pause','حذف هذه الوقفة')}</label>
      </div>)}
      {cuts.length>0&&<div className="studio-apply-panel"><p>{selected.length?t(`${selected.length} pauses selected. You can undo these cuts in the editor.`,`الوقفات المحددة للحذف: ${selected.length}. يمكنك التراجع عنها في المحرر.`):t('Select the pauses you want to remove after listening.', 'حدد الوقفات التي تريد حذفها بعد الاستماع.')}</p><button className="button primary" disabled={!selected.length} onClick={()=>{stop();onCuts(cuts.filter((_,i)=>selected.includes(i)));setSelected([]);setAnalysis(undefined);setSetupOpen(true);setMessage(t('Selected pauses removed from the edit. Your original file is unchanged. Undo is available in the editor.', 'حُذفت الوقفات المحددة من التعديل. ملفك الأصلي محفوظ، ويمكنك التراجع من المحرر.'));}}><Scissors size={16}/>{t('Remove selected pauses','حذف الوقفات المحددة')} {selected.length>0&&`(${selected.length})`}</button></div>}
      <details className="studio-advanced"><summary>{t('Show audio waveform (optional)','عرض الموجة الصوتية (اختياري)')}</summary><p>{t('Peaks show louder sound. Colored areas mark the suggested pauses.', 'القمم تعني صوتًا أعلى. المناطق الملونة توضح الوقفات المقترحة.')}</p><div className="studio-waveform" dir="ltr"><svg role="img" aria-label={t('Audio waveform','الموجة الصوتية')} viewBox={`0 0 ${Math.max(1,analysis.peaks.length)} 80`} preserveAspectRatio="none">{analysis.peaks.map((peak,i)=><rect key={i} x={i} y={40-peak*38} width={1} height={Math.max(1,peak*76)}/>)}{cuts.map((cut,i)=><rect className="studio-waveform-cut" key={i} x={cut.startSeconds/duration*analysis.peaks.length} y={0} width={(cut.endSeconds-cut.startSeconds)/duration*analysis.peaks.length} height={80}/>)}</svg></div></details>
    </>}
    {message&&<p role="status">{message}</p>}
  </div>;
}
