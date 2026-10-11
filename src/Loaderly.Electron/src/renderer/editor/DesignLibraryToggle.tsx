import {useId, useState, type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';

export function DesignLibraryToggle({label, icon, children}: {label: string; icon: ReactNode; children: ReactNode}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <section className="design-library-disclosure">
    <button type="button" className="button secondary preset-library-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      {icon}<span>{label}</span><ChevronDown className="disclosure-chevron" size={16}/>
    </button>
    <div id={id} hidden={!expanded}>{children}</div>
  </section>;
}
