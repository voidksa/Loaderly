import {useEffect,useId,useState} from 'react';
import {formatTimecode,parseTimecode} from '../../shared/editor-timeline/timecode';

export function TimeField({label,value,min=0,max,ar,onChange}:{label:string;value:number;min?:number;max:number;ar:boolean;onChange:(seconds:number)=>void|boolean}) {
  const [draft,setDraft]=useState(formatTimecode(value)),[error,setError]=useState(''),errorId=useId();
  useEffect(()=>{setDraft(formatTimecode(value));setError('');},[value]);
  const commit=()=>{
    // Focusing a rounded display must not alter the source's finer timing.
    if(draft===formatTimecode(value)){setError('');return;}
    const seconds=parseTimecode(draft);
    if(seconds===undefined||seconds<min-.001||seconds>max+.001){setError(ar?`أدخل وقتًا بين ${formatTimecode(min)} و${formatTimecode(max)}.`:`Enter a time from ${formatTimecode(min)} to ${formatTimecode(max)}.`);return;}
    setError('');setDraft(formatTimecode(seconds));if(Math.abs(seconds-value)>.0001&&onChange(seconds)===false)setDraft(formatTimecode(value));
  };
  return <label className="inspector-field time-field"><span>{label}</span><input type="text" dir="ltr" aria-label={label} aria-invalid={!!error} aria-describedby={error?errorId:undefined} data-tooltip={ar?'دقائق:ثوانٍ.أجزاء الثانية، مثل 02:46.04. استخدم السهمين أعلى وأسفل للضبط الدقيق.':'Minutes:seconds.hundredths, e.g. 02:46.04. Use Up and Down for precise adjustment.'} value={draft} onChange={e=>{setDraft(e.target.value);setError('');}} onBlur={commit} onKeyDown={e=>{
    if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setDraft(formatTimecode(value));setError('');}
    else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const next=Math.max(min,Math.min(max,(parseTimecode(draft)??value)+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?1:.01)));setDraft(formatTimecode(next));setError('');if(next!==value&&onChange(next)===false)setDraft(formatTimecode(value));}
  }}/>{error&&<small id={errorId} role="alert">{error}</small>}</label>;
}
