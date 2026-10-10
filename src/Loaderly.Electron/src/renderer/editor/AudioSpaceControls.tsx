import {Timer} from 'lucide-react';
import { useState } from 'react';
import { normalizeAudioSpace, spacePreset, spaceTypes, isDelay, type AudioSpace, type SpaceType } from '../../shared/editor-project/audioSpace';
import { RangeInput } from './RangeInput';
import { DesktopMenu } from './DesktopMenu';
const labels: Record<SpaceType, [string, string]> = { echo: ['Echo', 'صدى متكرر'], slapback: ['Slapback', 'صدى سريع'], 'ping-pong': ['Ping-pong', 'صدى بين اليمين واليسار'], tape: ['Tape delay', 'صدى شريطي دافئ'], room: ['Room', 'غرفة'], hall: ['Hall', 'قاعة'], plate: ['Plate', 'صدى معدني ناعم'], cathedral: ['Cathedral', 'مساحة واسعة'] };
export function AudioSpaceControls({value, onChange, ar}: {value: unknown; onChange: (value: AudioSpace) => void; ar: boolean}) {
  const s = normalizeAudioSpace(value), [bpm, setBpm] = useState(120), [division, setDivision] = useState('1');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const range = (key: 'mix'|'delayMs'|'feedback'|'decay'|'preDelay'|'width'|'tone', en: string, arabic: string, min: number, max: number, step: number, unit: string) => <label className="audio-control"><span>{t(en, arabic)}<output dir="ltr">{s[key]} {unit}</output></span><RangeInput aria-label={t(en, arabic)} value={s[key]} min={min} max={max} step={step} onChange={e => onChange({...s, [key]: Number(e.target.value)})}/></label>;
  return <section className="inspector-section audio-space-controls"><strong>{t('Echo & reverb', 'الصدى والرنين')}</strong>
    <label className="audio-toggle"><input type="checkbox" checked={s.enabled} onChange={e => onChange({...s, enabled: e.target.checked})}/>{t('Enable effect', 'تفعيل التأثير')}</label>
    <DesktopMenu ariaLabel={t('Echo or reverb preset', 'نوع الصدى')} value={s.type} valueLabel={labels[s.type][ar ? 1 : 0]} options={spaceTypes.map(type => ({value: type, label: labels[type][ar ? 1 : 0]}))} onChange={type => onChange(spacePreset(type as SpaceType))}/>
    <small>{t('Choose a starting sound, then make it yours. Turn the effect off to compare with the original.', 'اختر نوعًا كبداية ثم عدّله على ذوقك. أوقف التأثير لمقارنته بالصوت الأصلي.')}</small>
    <fieldset disabled={!s.enabled} style={{border: 0, padding: 0, margin: 0, display: 'grid', gap: 14}}>
      {range('mix', 'Effect mix', 'مزج التأثير', 0, 100, 1, '%')}
      {isDelay(s.type) ? <>
        {range('delayMs', 'Delay time', 'وقت التأخير', 20, 1500, 5, 'ms')}
        {range('feedback', 'Repeats', 'التكرار', 0, 85, 1, '%')}
        <label className="audio-control"><span>{t('Song tempo', 'إيقاع الأغنية')}<output>BPM</output></span><input type="number" min={40} max={240} step={1} value={bpm} onChange={e => setBpm(Math.max(40, Math.min(240, Number(e.target.value) || 120)))}/></label>
        <DesktopMenu ariaLabel={t('Note length', 'طول النغمة')} value={division} valueLabel={division === '1' ? '1/4' : division === '.5' ? '1/8' : division === '.75' ? '1/8 dotted' : '1/8 triplet'} options={[{value:'1',label:'1/4'},{value:'.5',label:'1/8'},{value:'.75',label:t('1/8 dotted','ثُمن منقوط')},{value:'.333333',label:t('1/8 triplet','ثُمن ثلاثي')}]} onChange={setDivision}/>
        <button className="button secondary" type="button" onClick={() => onChange({...s, delayMs: Math.round(60000 / bpm * Number(division))})}><Timer size={14}/>{t('Match delay to tempo', 'ضبط التأخير على الإيقاع')}</button>
      </> : <>{range('decay', 'Reverb decay', 'مدة تلاشي الرنين', .2, 8, .1, 's')}{range('preDelay', 'Pre-delay', 'تأخير بدء الرنين', 0, 200, 1, 'ms')}</>}
      {range('width', 'Stereo width', 'اتساع الصوت', 0, 100, 1, '%')}
      {range('tone', 'Brightness', 'سطوع الصدى', 500, 16000, 100, 'Hz')}
    </fieldset>
    <small>{t('Preview and exports use the same effect. The effect ends at the selected clip boundary; leave silence at the end if you want to hear its full decay.', 'المعاينة والتصدير يستخدمان التأثير نفسه. ينتهي الصدى عند نهاية المقطع المحدد؛ اترك صمتًا في آخر التسجيل لسماع التلاشي كاملًا.')}</small>
    <a href={`https://loaderly-docs.voidksa.workers.dev/${ar?'ar/':''}docs/audio-echo/`} target="_blank" rel="noreferrer">{t('Echo & reverb guide', 'دليل الصدى والرنين')}</a>
  </section>;
}
