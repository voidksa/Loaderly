import {Children, Fragment, isValidElement, type ReactNode} from 'react';
import {SlidersHorizontal} from 'lucide-react';
import {ControlDeck, type ControlPage} from './ControlDeck';

function flattenSections(children:ReactNode):ReactNode[] {
  return Children.toArray(children).flatMap(child=>isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment?flattenSections(child.props.children):[child]);
}

// The existing inspector sections define the navigation labels. Unlabelled alerts
// and actions stay visible; simple inspectors keep their compact original layout.
function InspectorSections({children,label}:{children:ReactNode;label:string}) {
  const pages:ControlPage[]=[], common:ReactNode[]=[];
  for(const child of flattenSections(children)) {
    if(isValidElement<{className?:string;children?:ReactNode}>(child)&&child.props.className?.split(' ').includes('inspector-section')) {
      const nodes=Children.toArray(child.props.children);
      const heading=nodes.find(node=>isValidElement(node)&&(node.type==='strong'||node.type==='summary'));
      if(isValidElement<{children?:ReactNode}>(heading)) {
        const contents=nodes.filter(node=>node!==heading);
        // Render the section content directly: the tab supplies its heading.
        pages.push({id:`section-${pages.length}`,label:heading.props.children,icon:<SlidersHorizontal size={14}/>,content:<div className="inspector-section">{contents}</div>});
        continue;
      }
    }
    common.push(child);
  }
  return pages.length>=3?<><ControlDeck label={label} pages={pages}/>{common}</>:<>{children}</>;
}

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
      <div className="editor-inspector__body"><InspectorSections label={resolvedEyebrow}>{children}</InspectorSections></div>
      {footer ? <div className="editor-inspector__footer">{footer}</div> : null}
    </aside>
  );
}
