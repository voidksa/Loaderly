import { Share2, Users, Library } from 'lucide-react';

export function CommunityLookCard({ar, kind}:{ar:boolean;kind:'theme'|'visualizer'}) {
  const theme=kind==='theme';
  const t=(en:string,arabic:string)=>ar?arabic:en;
  return <section className="community-look-card" aria-label={t('Community looks','مظاهر المجتمع')}>
    <strong><Users size={16} aria-hidden="true"/>{t('Made a look you love?','صمّمت مظهرًا يعجبك؟')}</strong>
    <p>{t('Create and save a private draft in the app, then share it when ready.','صمّم واحفظ مسودة خاصة داخل البرنامج، ثم شاركها عندما تصبح جاهزة.')}</p>
    <div className="inspector-actions">
      <button type="button" className="button secondary" onClick={()=>window.dispatchEvent(new CustomEvent('loaderly:community',{detail:{create:true}}))}><Share2 size={14}/>{theme?t('Design & share a theme','تصميم ثيم ومشاركته'):t('Design & share a visualizer','تصميم طيف ومشاركته')}</button>
      <button type="button" className="button secondary" onClick={()=>window.dispatchEvent(new Event('loaderly:community'))}><Library size={14}/>{t('Browse designs','تصفّح التصاميم')}</button>
    </div>
    <small>{t('GitHub sign-in is required to publish. Browsing and applying designs are available without an account.','النشر يتطلب تسجيل الدخول عبر GitHub. يمكنك التصفح وتطبيق التصاميم دون حساب.')}</small>
  </section>;
}
