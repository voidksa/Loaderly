import type { LucideIcon } from 'lucide-react';

export type EditorToolRailItem = {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly icon: LucideIcon;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
};

type ToolRailProps = {
  readonly items: readonly EditorToolRailItem[];
  readonly label: string;
};

export function ToolRail({ items, label }: ToolRailProps) {
  return (
    <aside className="editor-tool-rail" aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <button
            aria-label={`${item.label}. ${item.detail}`}
            aria-pressed={item.active}
            className={`editor-tool-rail__button${item.active ? ' active' : ''}`}
            disabled={item.disabled}
            key={item.id}
            onClick={item.onSelect}
            type="button"
          >
            <Icon aria-hidden="true" size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
