import { useEffect, useRef, useState } from 'react';
import { Mic, RefreshCw, X, WandSparkles } from 'lucide-react';
import type { StudioRequest, StudioResponse } from '../../shared/studioApi';
import type { SpeechMode, SpeechPlan } from '../../shared/speechPlan';
import { StudioSelect } from './StudioSelect';

export function TranscriptionTool({ ar, source, name, outputDirectory, local, onLocal, request, onQueued, initial }: {
  ar:boolean; source:string; name:string; outputDirectory:string; local:StudioResponse['local'];
  onLocal:(value:StudioResponse['local'])=>void; request:(value:StudioRequest)=>Promise<StudioResponse>;
  onQueued:(value:StudioResponse)=>void; initial:{model:'auto'|'base'|'small';language:'auto'|'ar'|'en';speechMode:SpeechMode};
}) {
  const t=(en:string,a:string)=>ar?a:en;
  const [model,setModel]=useState(initial.model),[language,setLanguage]=useState(initial.language),[mode,setMode]=useState(initial.speechMode);
  const [plan,setPlan]=useState<SpeechPlan>(),[analyzing,setAnalyzing]=useState(true),[attempt,setAttempt]=useState(0);
  const [busy,setBusy]=useState(false),[canceling,setCanceling]=useState(false),[error,setError]=useState(''),[analysisFailed,setAnalysisFailed]=useState(false);
  const setupId=useRef(''),mounted=useRef(true),cancelRequested=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(setupId.current)void window.loaderly?.studio({action:'cancel',id:setupId.current});};},[]);
  useEffect(()=>{
    let active=true;const id=`speech-plan-${crypto.randomUUID()}`;setAnalyzing(true);setAnalysisFailed(false);setPlan(undefined);
    void window.loaderly?.studio({action:'speech-plan',source,id}).then(result=>{
      if(!active)return;
      if(result?.ok&&result.speechPlan)setPlan(result.speechPlan);else setAnalysisFailed(true);
    }).catch(()=>{if(active)setAnalysisFailed(true);}).finally(()=>{if(active)setAnalyzing(false);});
    return()=>{active=false;void window.loaderly?.studio({action:'cancel',id});};
  },[source,attempt]);
  const effectiveModel=model==='auto'?(plan?.model??'base'):model;
  const ready=local?.speechModels.includes(effectiveModel);
  async function start(){
    if(busy)return;setBusy(true);setError('');setCanceling(false);cancelRequested.current=false;
    try{
      if(!ready){
        setupId.current=`prepare-speech-${crypto.randomUUID()}`;
        const prepared=await request({action:'prepare-local',id:setupId.current,engine:'speech',model:effectiveModel});
        setupId.current='';if(!mounted.current)return;onLocal(prepared.local);
      }
      if(cancelRequested.current)throw new Error('TASK_CANCELED');
      const result=await request({action:'enqueue',kind:'transcribe',source,name,outputDirectory,language,model:effectiveModel,speechMode:mode});
      if(mounted.current)onQueued(result);
    }catch(err){if(mounted.current)setError(err instanceof Error&&err.message==='TASK_CANCELED'?t('Canceled. You can start again when ready.','أُلغيت العملية. يمكنك البدء مجددًا متى أردت.'):t('Could not start transcription. Check the output folder, connection and free space, then retry.','تعذر بدء التفريغ. تحقق من مجلد النتائج والاتصال والمساحة المتاحة ثم أعد المحاولة.'));}
    finally{setupId.current='';if(mounted.current){setBusy(false);setCanceling(false);}}
  }
  return <>
    <section className="studio-apply-panel" aria-live="polite">
      <strong><WandSparkles size={17}/> {analyzing?t('Checking the audio…','جارٍ فحص الصوت…'):t('Automatic settings','إعدادات تلقائية')}</strong>
      {analyzing?<><p>{t('Checking short samples on your device to choose how to recognize the words.','نفحص عينات قصيرة على جهازك لاختيار طريقة التعرف على الكلمات.')}</p><progress/></>:plan?<>
        <p>{plan.reason==='quiet'?t('The samples are very quiet. Check that voices are audible before starting.','العينات هادئة جدًا. تأكد من إمكانية سماع الأصوات قبل البدء.'):plan.mode==='speech'?t('Spoken voices detected. Pauses will be skipped to focus on speech.','رُصد كلام في العينات. سنتجاوز الوقفات للتركيز على الكلام.'):t('The samples may contain music or processed voices. The full audio will be analyzed so vocals are not skipped.','قد تحتوي العينات على موسيقى أو أصوات معدّلة. سنحلل الصوت كاملًا حتى لا نتجاوز الغناء.')}</p>
        <p>{t('Language is detected when transcription starts. You can override any setting below.','تُكتشف اللغة عند بدء التفريغ. يمكنك تغيير أي إعداد أدناه.')}</p>
      </>:analysisFailed?<><p>{t('Automatic analysis could not finish. Retry, or choose an audio type in Manual settings.','تعذر إكمال الفحص التلقائي. أعد المحاولة، أو حدد نوع الصوت من الإعدادات اليدوية.')}</p><button className="button secondary" onClick={()=>setAttempt(n=>n+1)}><RefreshCw size={15}/>{t('Retry analysis','إعادة الفحص')}</button></>:null}
      {!analyzing&&plan&&<small>{t('Recommended quality: ','الدقة المقترحة: ')}{plan.model==='small'?t('More accurate','أدق'):t('Fast','سريع')}</small>}
    </section>


    {busy?<div role="status"><p>{setupId.current?t('Preparing speech recognition, then starting transcription…','جارٍ تجهيز التعرف على الكلام ثم بدء التفريغ…'):t('Starting transcription…','جارٍ بدء التفريغ…')}</p><progress/><button className="button secondary" disabled={canceling||!setupId.current} onClick={()=>{cancelRequested.current=true;setCanceling(true);void request({action:'cancel',id:setupId.current}).catch(()=>setCanceling(false));}}><X size={15}/>{t('Cancel','إلغاء')}</button></div>:<button className="button primary" disabled={!outputDirectory||!local?.runtime||(mode==='auto'&&!plan)} onClick={()=>void start()}><Mic size={15}/>{ready?t('Transcribe audio','تحويل الصوت إلى نص'):t('Set up & transcribe','تجهيز وتحويل الصوت إلى نص')}</button>}
    <p>{ready?t('Ready on this device. No model download is needed.','جاهز على هذا الجهاز. لا حاجة لتنزيل نموذج.'):t(`First use downloads ${effectiveModel==='small'?486:148} MB. Your audio is processed on your device.`,`يتطلب الاستخدام الأول تنزيل ${effectiveModel==='small'?486:148} ميجابايت. يُعالج الصوت على جهازك.`)}</p>
    <details className="studio-advanced"><summary>{t('Manual settings (optional)','إعدادات يدوية (اختياري)')}</summary><div className="studio-grid">
      <StudioSelect label={t('Recognition quality','دقة التعرف على الكلام')} disabled={busy} value={model} onChange={setModel} options={[{value:'auto',label:t('Automatic (recommended)','تلقائي (مقترح)')},{value:'base',label:t('Fast · 148 MB download','سريع · تنزيل 148 ميجابايت')},{value:'small',label:t('More accurate · 486 MB download','أدق · تنزيل 486 ميجابايت')}]}/>
      <StudioSelect label={t('Spoken language','لغة الكلام')} disabled={busy} value={language} onChange={setLanguage} options={[{value:'auto',label:t('Detect automatically','اكتشاف تلقائي')},{value:'ar',label:'العربية'},{value:'en',label:'English'}]}/>
      <StudioSelect label={t('Audio content','محتوى الصوت')} disabled={busy} value={mode} onChange={setMode} options={[{value:'auto',label:t('Analyze automatically','تحليل تلقائي')},{value:'speech',label:t('Speech','كلام')},{value:'music',label:t('Singing & music','غناء وموسيقى')}]}/>
    </div><p>{t('Automatic analysis is a recommendation, not a guarantee. Review the text and timing, especially for singing.','التحليل التلقائي اقتراح وقد يخطئ. راجع النص والتوقيت، خصوصًا في الغناء.')}</p></details>
    {error&&<p role="alert">{error}</p>}
  </>;
}
