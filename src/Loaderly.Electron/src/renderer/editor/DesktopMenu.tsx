import { useState, useRef, useEffect, useLayoutEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
export type MenuOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  readonly description?: string;
  readonly icon?: LucideIcon;
};
export function DesktopMenu<Value extends string>({
  ariaLabel,
  icon,
  options,
  placement = 'bottom',
  value,
  valueLabel,
  onChange
}: {
  readonly ariaLabel: string;
  readonly icon?: ReactNode;
  readonly options: readonly MenuOption<Value>[];
  readonly placement?: 'bottom' | 'top';
  readonly value: Value;
  readonly valueLabel: string;
  readonly onChange: (value: Value) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasIcons = options.some(option => option.icon);
  const menuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open) return;
    function positionMenu() {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      if (!trigger || !content) return;
      const rect = trigger.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const height = Math.min(content.scrollHeight + 2, 320);
      const useAbove = placement === 'top' ? above >= height || above > below : below < height && above > below;
      const maxHeight = Math.max(48, Math.min(320, useAbove ? above : below));
      const actualHeight = Math.min(height, maxHeight);
      const rtl = getComputedStyle(trigger).direction === 'rtl';
      setMenuPosition({ position: 'fixed', top: useAbove ? rect.top - actualHeight - 5 : rect.bottom + 5, left: Math.max(8, Math.min(rtl ? rect.left : rect.right - content.offsetWidth, window.innerWidth - content.offsetWidth - 8)), right: 'auto', bottom: 'auto', minWidth: rect.width, maxHeight, zIndex: 1000, visibility: 'visible' });
    }
    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => { window.removeEventListener('resize', positionMenu); window.removeEventListener('scroll', positionMenu, true); };
  }, [open, placement]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        if (restoreFocusRef.current) triggerRef.current?.focus();
      }
      return;
    }

    wasOpenRef.current = true;
    const focusFrame = window.requestAnimationFrame(() => {
      (contentRef.current?.querySelector<HTMLButtonElement>('.desktop-menu__item.selected') ?? contentRef.current?.querySelector<HTMLButtonElement>('.desktop-menu__item:not(:disabled)'))?.focus();
    });

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node) && !contentRef.current?.contains(event.target as Node)) {
        restoreFocusRef.current = false;
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        restoreFocusRef.current = true;
        setOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="desktop-menu" data-open={open ? 'true' : 'false'} data-placement={placement} ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="desktop-menu__trigger"
        onClick={(event) => { restoreFocusRef.current = event.detail === 0; setOpen((value) => !value); }}
        ref={triggerRef}
        type="button"
      >
        {icon}
        <span>{valueLabel}</span>
        <ChevronDown aria-hidden="true" className="desktop-menu__chevron" size={15} />
      </button>
      {open ? createPortal(
        <div
          className="desktop-menu__content"
          ref={contentRef}
          style={{ position: 'fixed', right: 'auto', bottom: 'auto', ...menuPosition, minWidth: Math.max(160, triggerRef.current?.offsetWidth ?? 0) }}
          onKeyDown={(event) => {
            const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.desktop-menu__item:not(:disabled)'));
            const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
            let nextIndex: number | undefined;

            if (event.key === 'ArrowDown') {
              nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
            } else if (event.key === 'ArrowUp') {
              nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
            } else if (event.key === 'Home') {
              nextIndex = 0;
            } else if (event.key === 'End') {
              nextIndex = items.length - 1;
            }

            if (nextIndex !== undefined && items[nextIndex]) {
              event.preventDefault();
              event.stopPropagation();
              items[nextIndex].focus();
            }
          }}
          role="menu"
        >
          {options.map((option) => {
            const Icon = option.icon;
            const selected = option.value === value;

            return (
              <button
                aria-checked={selected}
                className={`desktop-menu__item${hasIcons ? '' : ' desktop-menu__item--plain'}${selected ? ' selected' : ''}`}
                key={option.value}
                onClick={(event) => {
                  restoreFocusRef.current = event.detail === 0;
                  onChange(option.value);
                  setOpen(false);
                }}
                role="menuitemradio"
                type="button"
              >
                {hasIcons ? <span className="desktop-menu__item-icon">
                  {Icon ? <Icon aria-hidden="true" size={15} /> : null}
                </span> : null}
                <span>
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
                {selected ? <Check aria-hidden="true" className="desktop-menu__check" size={14} /> : null}
              </button>
            );
          })}
        </div>,
        menuRef.current?.closest('.app-shell') ?? document.body
      ) : null}
    </div>
  );
}
