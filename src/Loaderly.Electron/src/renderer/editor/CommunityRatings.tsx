import {GitHubAvatar} from './GitHubAvatar';
import {useEffect,useState,useRef} from 'react';
import {Check,Copy,UserRound,LogOut,Star,X,ExternalLink,LoaderCircle} from 'lucide-react';
import type {CommunityAccount,CommunityRatingsResult} from '../../shared/communityRatings';
import {communityRatingCount,communityStarLabel} from './communityRatingCopy';

export function useCommunityRatings(ar:boolean) {
  const [data,setData]=useState<CommunityRatingsResult>({available:false,ratings:[]});
  const [account,setAccount]=useState<CommunityAccount>({});
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');
  const request=useRef(0);
  const t=(en:string,a:string)=>ar?a:en;
  const refresh=async()=>{const id=++request.current;try{const next=await window.loaderly?.communityRatings();if(next&&id===request.current){setData(next);setAccount(next.account??{});}}catch{if(id===request.current)setData({available:false,ratings:[]});}};
  useEffect(()=>{void refresh();},[]);
  useEffect(()=>{
    if(!account.pending)return;
    const timer=setTimeout(()=>{const id=++request.current;void window.loaderly?.communityAccount('poll').then(next=>{if(id!==request.current)return;setAccount(next);if(next.login){setMessage(t('Signed in. Your community account is ready.','تم تسجيل الدخول. حساب المجتمع جاهز.'));void refresh();}else if(next.error)setMessage(t('Sign-in could not finish. Please try again.','تعذّر إكمال تسجيل الدخول. حاول مجددًا.'));}).catch(()=>{if(id!==request.current)return;setMessage(t('Connection interrupted. Waiting to finish sign-in.','انقطع الاتصال. بانتظار إكمال تسجيل الدخول.'));setAccount(current=>({...current}));});},(account.interval??5)*1000);
    return()=>clearTimeout(timer);
  },[account]);
  const signIn=async()=>{const id=++request.current;setBusy('login');setMessage('');try{const next=await window.loaderly?.communityAccount('sign-in');if(next&&id===request.current){setAccount(next);if(next.login){setMessage(t('Signed in. Your community account is ready.','تم تسجيل الدخول. حساب المجتمع جاهز.'));void refresh();}if(next.error)setMessage(next.error==='not-configured'?t('Community sign-in is unavailable. You can still browse, apply and copy designs.','تسجيل الدخول غير متاح. يمكنك تصفّح التصاميم وتطبيقها ونسخها.'):t('Could not restore or start sign-in. Try again later.','تعذّر استعادة تسجيل الدخول أو بدؤه. حاول لاحقًا.'));}}catch{setMessage(t('Could not start sign-in.','تعذّر بدء تسجيل الدخول.'));}finally{setBusy('');}};
  const rate=async(id:string,stars:number)=>{
    if(!account.login){setMessage(t('Sign in with GitHub first to rate this design.','سجّل الدخول بحساب GitHub أولًا لتقييم التصميم.'));return;}
    const sequence=++request.current;setBusy(id);try{const next=await window.loaderly?.communityRatings(id,stars);if(sequence!==request.current)return;if(next){setData(next);setAccount(next.account??{});}if(!next?.available)throw Error();setMessage(t('Your rating was saved. You can change it anytime.','حُفظ تقييمك. يمكنك تغييره في أي وقت.'));}catch{if(sequence===request.current)setMessage(t('Rating was not saved. Check your connection and sign in again if needed.','لم يُحفظ التقييم. تحقق من اتصالك وسجّل الدخول مجددًا عند الحاجة.'));}finally{setBusy('');}
  };
  const signOut=async()=>{++request.current;try{await window.loaderly?.communityAccount(account.pending?'cancel':'sign-out');setAccount({});await refresh();}catch{setMessage(t('Could not sign out. Try again.','تعذّر تسجيل الخروج. حاول مجددًا.'));}};
  return {data,account,busy,message,signIn,rate,signOut,refresh};
}
type Ratings=ReturnType<typeof useCommunityRatings>;
export function CommunityAccountPanel({ratings:r,ar}:{ratings:Ratings;ar:boolean}){
  const [copied,setCopied]=useState(false),[copyFailed,setCopyFailed]=useState(false);const t=(en:string,a:string)=>ar?a:en;
  useEffect(()=>{setCopied(false);setCopyFailed(false);},[r.account.userCode,r.account.pending]);
  const copyCode=async()=>{try{const result=await window.loaderly?.copyText(r.account.userCode??'');setCopied(result?.ok===true);setCopyFailed(result?.ok!==true);}catch{setCopied(false);setCopyFailed(true);}};
  return <div className={`community-account${r.account.pending?' community-account--pending':''}`}><div className="community-account-row"><span>{r.account.login?<GitHubAvatar login={r.account.login}/>:<UserRound size={16}/>} {r.account.login?<bdi>@{r.account.login}</bdi>:r.account.pending?<strong>{t('Sign in with GitHub','تسجيل الدخول بحساب GitHub')}</strong>:t('Create, share and rate with GitHub','صمّم وشارك وقيّم بحسابك في GitHub')}</span>{r.account.login||r.account.pending?<button className="button secondary" onClick={()=>void r.signOut()}>{r.account.pending?<X size={14}/>:<LogOut size={14}/>} {r.account.pending?t('Cancel','إلغاء'):t('Sign out','تسجيل الخروج')}</button>:<button className="button secondary" disabled={!!r.busy} onClick={()=>void r.signIn()}><UserRound size={14}/>{r.account.savedSession?t('Restore sign-in','استعادة تسجيل الدخول'):t('Sign in','تسجيل الدخول')}</button>}</div>
    {r.account.savedSession&&!r.account.login&&!r.account.pending&&<p className="community-account-message">{t('Your saved sign-in is protected. Restore it to use your account; your system may ask you to unlock it. You can browse and apply designs without signing in.','تسجيل دخولك المحفوظ محمي. استعده لاستخدام حسابك؛ قد يطلب النظام فتح القفل. يمكنك تصفّح التصاميم وتطبيقها دون تسجيل الدخول.')}</p>}
    {r.account.pending&&<div className="community-device">
      <ol className="community-auth-steps">
        <li><div><strong>{t('Copy your one-time code','انسخ رمز الدخول المؤقت')}</strong><div className="community-device-code"><code dir="ltr">{r.account.userCode}</code><button className="button secondary" onClick={()=>void copyCode()}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?t('Code copied','نُسخ الرمز'):t('Copy code','نسخ الرمز')}</button></div>{copyFailed&&<p role="status">{t('Could not copy. Select the code and copy it manually.','تعذّر النسخ. حدّد الرمز وانسخه يدويًا.')}</p>}</div></li>
        <li><div><strong>{t('Continue on GitHub','أكمل الخطوات في GitHub')}</strong><p>{t('Paste the code and approve Loaderly in your browser.','ألصق الرمز ووافق على دخول Loaderly في المتصفح.')}</p><button className="button primary" onClick={()=>void window.loaderly?.communityAccount('open')}><ExternalLink size={14}/>{t('Open GitHub','فتح GitHub')}</button></div></li>
      </ol>
      <p className="community-auth-wait" role="status"><LoaderCircle size={14}/>{t('Waiting for approval. This page updates automatically.','بانتظار موافقتك في المتصفح. يكتمل تسجيل الدخول هنا تلقائيًا.')}</p>
    </div>}
    {r.account.error==='unavailable'&&(r.account.login||r.account.savedSession)&&<p className="community-account-message" role="status">{t('Could not verify your account right now. Your saved sign-in is kept.','تعذّر التحقق من الحساب الآن. تسجيل دخولك المحفوظ ما زال موجودًا.')} <button className="button secondary" onClick={()=>void r.refresh()}>{t('Retry connection','إعادة الاتصال')}</button></p>}
    {r.account.sessionOnly&&<p className="community-account-message" role="status">{t('Signed in for this session. Secure storage is unavailable, so you may need to sign in again after closing Loaderly.','أنت مسجل الدخول لهذه الجلسة. التخزين الآمن غير متاح، وقد تحتاج إلى تسجيل الدخول مجددًا بعد إغلاق Loaderly.')}</p>}
    {r.message&&<p className="community-account-message" role="status">{r.message}</p>}
  </div>;
}
export function CommunityStars({id,ratings:r,ar}:{id:string;ratings:Ratings;ar:boolean}){
  const [prompt,setPrompt]=useState(false);
  const [hover,setHover]=useState(0);
  const [focused,setFocused]=useState(0);
  const rating=r.data.ratings.find(item=>item.id===id);const t=(en:string,a:string)=>ar?a:en;
  const preview=hover||focused||rating?.mine||0;
  return <div className="community-rating">
    <div className="community-rating-summary"><Star size={13} aria-hidden="true" fill={rating?'currentColor':'none'}/>
      {!r.data.available?<span>{t('Ratings unavailable','التقييمات غير متاحة')}</span>:rating?<span className="community-rating-summary-copy"><bdi dir="ltr">{rating.average.toFixed(1)}</bdi><span aria-hidden="true">·</span><span>{communityRatingCount(rating.count,ar)}</span></span>:<span>{t('No ratings yet','لا توجد تقييمات بعد')}</span>}
    </div>
    <div className="community-rating-picker"><span className="community-rating-label"><span>{hover||focused?t('Choose rating','اختر التقييم'):rating?.mine?t('Your rating','تقييمك'):t('Rate this design','قيّم التصميم')}</span><output className="community-rating-value" aria-live="polite"><bdi dir="ltr">{preview?`${preview} / 5`:'— / 5'}</bdi></output></span>
      <div role="group" aria-label={t('Rate this design','قيّم التصميم')} dir="ltr">{[1,2,3,4,5].map(star=><button key={star} onMouseEnter={()=>setHover(star)} onMouseLeave={()=>setHover(0)} onFocus={()=>setFocused(star)} onBlur={()=>setFocused(0)} aria-label={t(`${star} out of 5 stars`,`${star} من 5 نجوم`)} aria-pressed={rating?.mine===star} disabled={!!r.busy} data-tooltip={communityStarLabel(star,ar)} onClick={()=>{if(!r.account.login){setPrompt(true);return;}void r.rate(id,star);}}><Star size={18} fill={preview>=star?'currentColor':'none'}/></button>)}</div>
    </div>
    {prompt&&!r.account.login&&<div className="community-rating-signin" role="status"><span>{t('Sign in with GitHub first to rate this design.','سجّل الدخول بحساب GitHub أولًا لتقييم التصميم.')}</span>{r.account.pending?<span>{t('Complete sign-in using the code above.','أكمل تسجيل الدخول باستخدام الرمز أعلاه.')}</span>:<button className="button secondary" disabled={!!r.busy} onClick={()=>void r.signIn()}><UserRound size={14}/>{t('Sign in','تسجيل الدخول')}</button>}{r.message&&<span>{r.message}</span>}</div>}
  </div>;
}

