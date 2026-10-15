import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, type LucideIcon } from 'lucide-react';

/** A task has one entry point and keeps its controls together. */
export function StudioTask({ id, active, onSelect, title, description, icon: Icon, ar, children }: {
  id: string; active: string; onSelect: (id: string) => void; title: string;
  description: string; icon: LucideIcon; ar: boolean; children: ReactNode;
}) {
  if (!active) return <button type="button" className="studio-task-card" data-task={id} onClick={() => onSelect(id)}>
    <Icon size={22} aria-hidden="true"/><span><strong>{title}</strong><small>{description}</small></span>
    <ChevronRight className="studio-task-card__arrow" size={17} aria-hidden="true"/>
  </button>;
  if (active !== id) return null;
  const Back = ar ? ArrowRight : ArrowLeft;
  return <section className="studio-task-detail" data-task-detail={id}>
    <button type="button" className="button secondary studio-task-back" onClick={() => onSelect('')}><Back size={16}/>{ar ? 'كل أدوات القسم' : 'All tools in this section'}</button>
    <header className="studio-task-heading"><Icon size={23}/><div><h3 tabIndex={-1}>{title}</h3><p>{description}</p></div></header>
    <div className="studio-task-controls">{children}</div>
  </section>;
}
