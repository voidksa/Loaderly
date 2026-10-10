import {GitHubAvatar} from './GitHubAvatar';
import {useEffect,useState} from 'react';
import {Check,Copy,UserRound,LogOut,Star,X} from 'lucide-react';
import type {CommunityAccount,CommunityRatingsResult} from '../../shared/communityRatings';

export function useCommunityRatings(ar:boolean) {
  const [data,setData]=useState<CommunityRatingsResult>({available:false,ratings:[]});
  const [account,setAccount]=useState<CommunityAccount>({});
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');
  const t=(en:string,a:string)=>ar?a:en;
  const refresh=async()=>{try{const next=await window.loaderly?.communityRatings();if(next){setData(next);setAccount(next.account??{});}}catch{setData({available:false,ratings:[]});}};
  useEffect(()=>{void refresh();},[]);
  useEffect(()=>{
    if(!account.pending)return;
    const timer=setTimeout(()=>{void window.loaderly?.communityAccount('poll').then(next=>{setAccount(next);if(next.login){setMessage(t('Signed in. Your community account is ready.','تم تسجيل الدخول. حساب المجتمع جاهز.'));void refresh();}else if(next.error)setMessage(t('Sign-in could not finish. Please try again.','تعذّر إكمال تسجيل الدخول. حاول مجددًا.'));}).catch(()=>{setAccount({});setMessage(t('Sign-in unavailable. Try again later.','تعذّر تسجيل الدخول. حاول لاحقًا.'));});},(account.interval??5)*1000);
    return()=>clearTimeout(timer);
  },[account]);
  const signIn=async()=>{setBusy('login');setMessage('');try{const next=await window.loaderly?.communityAccount('sign-in');if(next){setAccount(next);if(next.error)setMessage(next.error==='not-configured'?t('Community sign-in is not enabled for this preview yet. You can still browse, apply and copy designs.','لم يُفعّل تسجيل دخول المجتمع لهذه النسخة التجريبية بعد. يمكنك تصفح التصاميم وتطبيقها ونسخها.'):t('Could not start sign-in. Try again later.','تعذّر بدء تسجيل الدخول. حاول لاحقًا.'));}}catch{setMessage(t('Could not start sign-in.','تعذّر بدء تسجيل الدخول.'));}finally{setBusy('');}};
  const rate=async(id:string,stars:number)=>{
    if(!account.login){setMessage(t('Sign in with GitHub first to rate this design.','سجّل الدخول بحساب GitHub أولًا لتقييم التصميم.'));return;}
    setBusy(id);try{const next=await window.loaderly?.communityRatings(id,stars);if(!next?.available)throw Error();setData(next);setAccount(next.account??{});setMessage(t('Your rating was saved. You can change it anytime.','حُفظ تقييمك. يمكنك تغييره في أي وقت.'));}catch{setMessage(t('Rating was not saved. Check your connection and sign in again if needed.','لم يُحفظ التقييم. تحقق من اتصالك وسجّل الدخول مجددًا عند الحاجة.'));}finally{setBusy('');}
  };
  const signOut=async()=>{try{await window.loaderly?.communityAccount(account.pending?'cancel':'sign-out');setAccount({});await refresh();}catch{setMessage(t('Could not sign out. Try again.','تعذّر تسجيل الخروج. حاول مجددًا.'));}};
  return {data,account,busy,message,signIn,rate,signOut,refresh};
}
type Ratings=ReturnType<typeof useCommunityRatings>;
export function CommunityAccountPanel({ratings:r,ar}:{ratings:Ratings;ar:boolean}){
  const [copied,setCopied]=useState(false);const t=(en:string,a:string)=>ar?a:en;
  return <div className="community-account"><div className="community-account-row"><span>{r.account.login?<GitHubAvatar login={r.account.login}/>:<UserRound size={16}/>} {r.account.login?<bdi>@{r.account.login}</bdi>:t('Create, share and rate with GitHub','صمّم وشارك وقيّم بحسابك في GitHub')}</span>{r.account.login||r.account.pending?<button className="button secondary" onClick={()=>void r.signOut()}>{r.account.pending?<X size={14}/>:<LogOut size={14}/>} {r.account.pending?t('Cancel','إلغاء'):t('Sign out','تسجيل الخروج')}</button>:<button className="button secondary" disabled={!!r.busy} onClick={()=>void r.signIn()}><UserRound size={14}/>{t('Sign in','تسجيل الدخول')}</button>}</div>
    {r.account.pending&&<div className="community-device"><p>{t('Copy this code, open GitHub and approve Loaderly. Keep this page open.','انسخ الرمز، وافتح GitHub ووافق على دخول Loaderly. أبقِ هذه الصفحة مفتوحة.')}</p><code dir="ltr">{r.account.userCode}</code><button className="button secondary" onClick={async()=>{const result=await window.loaderly?.copyText(r.account.userCode??'');setCopied(result?.ok===true);}}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?t('Copied!','تم النسخ!'):t('Copy code','نسخ الرمز')}</button><button className="button primary" onClick={()=>void window.loaderly?.communityAccount('open')}><UserRound size={14}/>{t('Open GitHub','فتح GitHub')}</button></div>}
    {r.message&&<p role="status">{r.message}</p>}
  </div>;
}
export function CommunityStars({id,ratings:r,ar}:{id:string;ratings:Ratings;ar:boolean}){
  const [prompt,setPrompt]=useState(false);
  const [hover,setHover]=useState(0);
  const [focused,setFocused]=useState(0);
  const rating=r.data.ratings.find(item=>item.id===id);const t=(en:string,a:string)=>ar?a:en;
  const preview=hover||focused||rating?.mine||0;
  return <div className="community-rating"><div className="community-rating-summary"><Star size={13} fill={rating?'currentColor':'none'}/><span>{!r.data.available?t('Ratings unavailable','التقييمات غير متاحة'):rating?`${rating.average.toFixed(1)} · ${rating.count} ${t('ratings','تقييمات')}`:t('No ratings yet','لا توجد تقييمات بعد')}</span></div><div className="community-rating-picker"><span>{hover||focused?t('Choose rating','اختر التقييم'):rating?.mine?t('Your rating','تقييمك'):t('Rate this design','قيّم التصميم')}<output className="community-rating-value" aria-live="polite" dir="ltr">{preview?`${preview} / 5`:'— / 5'}</output></span><div role="group" aria-label={t('Rate this design','قيّم التصميم')} dir="ltr">{[1,2,3,4,5].map(star=><button key={star} onMouseEnter={()=>setHover(star)} onMouseLeave={()=>setHover(0)} onFocus={()=>setFocused(star)} onBlur={()=>setFocused(0)} aria-label={t(`${star} out of 5 stars`,`${star} من ٥ نجوم`)} aria-pressed={rating?.mine===star} disabled={!!r.busy} data-tooltip={t(`${star} stars`,`${star} نجوم`)} onClick={()=>{if(!r.account.login){setPrompt(true);return;}void r.rate(id,star);}}><Star size={18} fill={preview>=star?'currentColor':'none'}/></button>)}</div></div>{prompt&&!r.account.login&&<div className="community-rating-signin" role="status"><span>{t('Sign in with GitHub first to rate this design.','سجّل الدخول بحساب GitHub أولًا لتقييم التصميم.')}</span>{r.account.pending?<span>{t('Complete sign-in using the code above.','أكمل تسجيل الدخول باستخدام الرمز أعلاه.')}</span>:<button className="button secondary" disabled={!!r.busy} onClick={()=>void r.signIn()}><UserRound size={14}/>{t('Sign in','تسجيل الدخول')}</button>}{r.message&&<span>{r.message}</span>}</div>}</div>;
}
