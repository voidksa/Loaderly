import type { ReactNode } from 'react';

type InspectorPanelProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly eyebrow?: string;
  readonly footer?: ReactNode;
};

export function InspectorPanel({ title, subtitle, children, eyebrow, footer }: InspectorPanelProps) {
  const resolvedEyebrow =
    eyebrow ?? (typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'الخصائص' : 'Inspector');

  return (
    <aside className="editor-inspector" aria-label={resolvedEyebrow}>
      <div className="editor-inspector__header">
        <span>{resolvedEyebrow}</span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      <div className="editor-inspector__body">{children}</div>
      {footer ? <div className="editor-inspector__footer">{footer}</div> : null}
    </aside>
  );
}
