import {formatTimecode} from '../../shared/editor-timeline/timecode';
import {useEffect,useRef,useState} from 'react';
import {Upload,Play,Pause,RotateCcw,Headphones} from 'lucide-react';
import {useAudioPreview} from './AudioPreview';
import {defaultAudioSettings} from '../../shared/editor-project/audioProcessing';
import type {SoundPreset} from '../../shared/audioPreset';
import {RangeInput} from './RangeInput';

export function SoundStudioPreview({preset,ar,browsing=false}:{preset:SoundPreset;ar:boolean;browsing?:boolean}){
 const audio=useRef<HTMLAudioElement>(null),file=useRef<HTMLInputElement>(null),url=useRef('');
 const [name,setName]=useState(''),[duration,setDuration]=useState(0),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[original,setOriginal]=useState(false),[error,setError]=useState('');
 const t=(en:string,a:string)=>ar?a:en;
 useAudioPreview(audio,original?defaultAudioSettings:preset.audio,{ranges:[{startSeconds:0,endSeconds:duration}],speeds:!original&&preset.speed?[{startTime:0,endTime:duration,rate:preset.speed.rate,mode:preset.speed.mode}]:[]});
 useEffect(()=>()=>{if(url.current)URL.revokeObjectURL(url.current);},[]);
 const stamp=(value:number)=>formatTimecode(value,false);
 return <section className="sound-studio-preview" aria-label={t('Sound preview','معاينة الصوت')}><div className="sound-studio-preview-title"><Headphones size={20}/><div><strong>{name||(browsing?t('Choose audio to try this preset','اختر صوتًا لتجربة الإعداد'):t('Hear your sound as you edit','اسمع الصوت أثناء التعديل'))}</strong><small>{t('Audio stays on this device. Only settings are shared.','الصوت يبقى على جهازك. تُشارك الإعدادات فقط.')}</small></div><button className="button secondary" onClick={()=>file.current?.click()}><Upload size={15}/>{name?t('Change audio','تغيير الصوت'):t('Try your audio','جرّب صوتك')}</button></div>
 <input ref={file} type="file" accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.opus" hidden onChange={e=>{const value=e.target.files?.[0];e.target.value='';if(!value)return;audio.current?.pause();if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(value);if(audio.current)audio.current.src=url.current;setName(value.name);setTime(0);setDuration(0);setError('');}}/>
 <audio ref={audio} preload="metadata" onLoadedMetadata={()=>{const value=audio.current?.duration??0;setDuration(Number.isFinite(value)?value:0);}} onTimeUpdate={()=>setTime(audio.current?.currentTime??0)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>setError(t('This audio could not be played. Try an MP3 or WAV file.','تعذّر تشغيل هذا الملف. جرّب MP3 أو WAV.'))}/>
 {name&&<div className="sound-studio-transport"><button className="button secondary" disabled={!duration} aria-label={playing?t('Pause preview','إيقاف المعاينة'):t('Play preview','تشغيل المعاينة')} onClick={()=>{if(!audio.current)return;if(playing)audio.current.pause();else void audio.current.play().catch(()=>setError(t('Could not play this audio.','تعذّر تشغيل الصوت.')));}}>{playing?<Pause size={16}/>:<Play size={16}/>}</button><button className="button secondary" disabled={!duration} aria-label={t('Restart preview','إعادة المعاينة')} onClick={()=>{if(audio.current)audio.current.currentTime=0;}}><RotateCcw size={15}/></button><span dir="ltr">{stamp(time)}</span><RangeInput aria-label={t('Preview position','موضع المعاينة')} min={0} max={duration||1} step={.01} value={time} onChange={e=>{if(audio.current)audio.current.currentTime=Number(e.target.value);}}/><span dir="ltr">{stamp(duration)}</span><button className="button secondary" aria-pressed={original} onClick={()=>setOriginal(value=>!value)}>{original?t('Original sound','الصوت الأصلي'):t('Edited sound','الصوت المعدّل')}</button></div>}
 {(preset.processing?.normalize||preset.processing?.denoise)&&<p>{t('To hear loudness normalization and noise reduction, apply this preset and render a preview in Editing workspace.','لسماع تسوية الجهارة وتقليل الضوضاء، طبّق الإعداد وأنشئ معاينة في مساحة أدوات التحرير.')}</p>}
 {error&&<p role="alert">{error}</p>}</section>;
}
