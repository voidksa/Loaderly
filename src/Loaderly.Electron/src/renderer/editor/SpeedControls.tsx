import { useEffect, useState } from 'react';
import { RangeInput } from './RangeInput';
import { DesktopMenu } from './DesktopMenu';
import { normalizeSpeedMode, type SpeedSoundMode } from '../../shared/editor-project/speedSound';

export function SpeedControls({ rate, mode, ar, onRate, onMode }: {
  rate:number; mode:unknown; ar:boolean; onRate:(rate:number)=>void; onMode:(mode:SpeedSoundMode)=>void;
}) {
  const [draft, setDraft] = useState(String(rate));
  useEffect(() => setDraft(String(rate)), [rate]);
  const commit = () => {
    const value = Number(draft);
    if (!draft.trim() || !Number.isFinite(value)) { setDraft(String(rate)); return; }
    const next = Math.round(Math.max(.25, Math.min(8, value)) * 100) / 100;
    setDraft(String(next));
    if (next !== rate) onRate(next);
  };
  const options = [
    {value:'normal',label:ar?'الطبقة تتبع السرعة':'Follow speed',description:ar?'التبطيء يخفض طبقة الصوت والتسريع يرفعها.':'Slower playback lowers pitch. Faster playback raises it.'},
    {value:'preserve-pitch',label:ar?'الحفاظ على الطبقة':'Keep pitch',description:ar?'تتغير السرعة مع الحفاظ على طبقة الصوت الأصلية.':'Change speed while keeping the original pitch.'},
    {value:'warm',label:ar?'نبرة دافئة':'Warm',description:ar?'ترددات منخفضة أوضح وترددات عالية أهدأ، مع الحفاظ على الطبقة.':'Fuller bass and softer highs, with the original pitch.'},
    {value:'bright',label:ar?'نبرة مشرقة':'Bright',description:ar?'إبراز الترددات العالية مع الحفاظ على الطبقة.':'More prominent high frequencies, with the original pitch.'},
    {value:'radio',label:ar?'راديو':'Radio',description:ar?'صوت بنطاق ترددات ضيق يشبه الراديو، مع الحفاظ على الطبقة.':'A narrow frequency range for a radio sound, keeping pitch.'},
  ] as const;
  const selected = options.find(option=>option.value===normalizeSpeedMode(mode))!;
  return <div className="inspector-section speed-controls">
    <strong>{ar?'السرعة':'Speed'}</strong>
    <div className="speed-rate-controls">
      <RangeInput aria-label={ar?'شريط السرعة':'Speed slider'} min={.25} max={8} step={.01} value={rate} onChange={e=>onRate(Number(e.target.value))}/>
      <label className="speed-rate-number"><input aria-label={ar?'معدل السرعة':'Speed rate'} type="number" dir="ltr" min={.25} max={8} step={.01} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setDraft(String(rate));}}}/><span aria-hidden="true">×</span></label>
    </div>
    <div className="speed-presets" dir="ltr" aria-label={ar?'سرعات جاهزة':'Speed presets'}>{[.5,.75,1,1.25,1.5,2].map(value=><button type="button" key={value} aria-pressed={rate===value} onClick={()=>onRate(value)}>{value}×</button>)}</div>
    <strong>{ar?'وضع الصوت':'Audio mode'}</strong>
    <DesktopMenu ariaLabel={ar?'وضع الصوت':'Audio mode'} options={options} value={selected.value} valueLabel={selected.label} onChange={onMode}/>
    <small className="speed-mode-description">{selected.description}</small>
  </div>;
}
