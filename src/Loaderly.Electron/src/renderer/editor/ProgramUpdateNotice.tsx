import { useState } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { useProgramUpdate } from './useProgramUpdate';

export function ProgramUpdateNotice({ ar, hidden, onReview }: { ar: boolean; hidden: boolean; onReview: () => void }) {
  const state = useProgramUpdate();
  const [dismissed, setDismissed] = useState('');
  if (hidden || state?.distribution === 'store' || state?.phase !== 'available' || !state.version || dismissed === state.version) return null;
  return <section className="program-update-notice" role="status" aria-label={ar ? 'تحديث متاح' : 'Update available'}>
    <ArrowUpCircle size={22} aria-hidden="true" />
    <div className="program-update-notice__copy">
      <strong>{ar ? 'يتوفر تحديث جديد' : 'An update is available'}</strong>
      <span><bdi>Loaderly {state.version}</bdi></span>
    </div>
    <div className="program-update-notice__actions">
      <button className="button primary" onClick={onReview}>{ar ? 'عرض التحديث' : 'View update'}</button>
      <button className="button secondary" onClick={() => setDismissed(state.version!)}>{ar ? 'لاحقًا' : 'Later'}</button>
    </div>
  </section>;
}
