import { ArrowUpRight, Users } from 'lucide-react';

export function CommunityLookCard({ar, kind}:{ar:boolean;kind:'theme'|'visualizer'}) {
  const theme=kind==='theme';
  const category=theme?'app-themes':'audio-visualizers';
  const t=(en:string,arabic:string)=>ar?arabic:en;
  return <section className="community-look-card" aria-label={t('Community looks','مظاهر المجتمع')}>
    <strong><Users size={16} aria-hidden="true"/>{t('Made a look you love?','صمّمت مظهرًا يعجبك؟')}</strong>
    <p>{t('Share a screenshot and your look code with the community, or try a design made by someone else.','شارك صورة وكود مظهرك مع المجتمع، أو جرّب تصميمًا أعجبك من مشاركات الآخرين.')}</p>
    <div className="inspector-actions">
      <a className="button secondary" href={`https://github.com/voidksa/Loaderly/discussions/new?category=${category}`} target="_blank" rel="noreferrer"><ArrowUpRight size={14} aria-hidden="true"/>{theme?t('Share your theme','شارك ثيمك'):t('Share your visualizer','شارك شكل الطيف')}</a>
      <a className="text-link" href={`https://github.com/voidksa/Loaderly/discussions/categories/${category}`} target="_blank" rel="noreferrer">{t('Browse designs','تصفّح التصاميم')}</a>
    </div>
    <small>{t('Use the copy option above to get your code. A GitHub account is needed to post.','انسخ الكود من خيار المشاركة أعلاه. تحتاج إلى حساب GitHub لنشر تصميمك.')}</small>
  </section>;
}
