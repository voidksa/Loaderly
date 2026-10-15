import { Fragment, useState, useRef, useEffect, useLayoutEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { registerFloatingMaterial } from '../../shared/ui/floating-material';
export type MenuOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  readonly description?: string;
  readonly icon?: LucideIcon;
  readonly badge?: string;
  readonly section?: string;
  readonly separator?: boolean;
};
export function DesktopMenu<Value extends string>({
  ariaLabel,
  disabled = false,
  icon,
  options,
  placement = 'bottom',
  layout = 'standard',
  value,
  valueLabel,
  onChange
}: {
  readonly ariaLabel: string;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly options: readonly MenuOption<Value>[];
  readonly placement?: 'bottom' | 'top';
  readonly layout?: 'standard' | 'detailed';
  readonly value: Value;
  readonly valueLabel: string;
  readonly onChange: (value: Value) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const hasIcons = options.some(option => option.icon);
  const menuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open) return;
    // Keep custom controls in the modal's focus scope and above its scrolling surface.
    const content = contentRef.current;
    if (content?.hasAttribute('popover')) content.showPopover();
    function positionMenu() {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      if (!trigger || !content) return;
      const rect = trigger.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const heightLimit = layout === 'detailed' ? 560 : 320;
      const height = Math.min(content.scrollHeight + 2, heightLimit);
      const useAbove = placement === 'top' ? above >= height || above > below : below < height && above > below;
      const maxHeight = Math.max(48, Math.min(heightLimit, useAbove ? above : below));
      const actualHeight = Math.min(height, maxHeight);
      const rtl = getComputedStyle(trigger).direction === 'rtl';
      const left = layout === 'detailed' ? (rtl ? rect.right - content.offsetWidth : rect.left) : (rtl ? rect.left : rect.right - content.offsetWidth);
      setMenuPosition({ position: 'fixed', top: useAbove ? rect.top - actualHeight - 5 : rect.bottom + 5, left: Math.max(8, Math.min(left, window.innerWidth - content.offsetWidth - 8)), right: 'auto', bottom: 'auto', minWidth: rect.width, maxHeight, zIndex: 1000, visibility: 'visible' });
    }
    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => { window.removeEventListener('resize', positionMenu); window.removeEventListener('scroll', positionMenu, true); };
  }, [open, placement, layout]);

  useLayoutEffect(() => {
    if (!open || menuPosition.visibility !== 'visible') return;
    // Focus before accepting keyboard input; a delayed frame could undo the
    // user's first Arrow key and send Enter to the previously selected item.
    (contentRef.current?.querySelector<HTMLButtonElement>('.desktop-menu__item.selected') ?? contentRef.current?.querySelector<HTMLButtonElement>('.desktop-menu__item:not(:disabled)'))?.focus({ preventScroll: true });
    if (contentRef.current) return registerFloatingMaterial(contentRef.current);
  }, [open, menuPosition.visibility]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        if (restoreFocusRef.current) triggerRef.current?.focus();
      }
      return;
    }

    wasOpenRef.current = true;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node) && !contentRef.current?.contains(event.target as Node)) {
        restoreFocusRef.current = false;
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        restoreFocusRef.current = false;
        triggerRef.current?.focus({ preventScroll: true });
        setOpen(false);
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        restoreFocusRef.current = true;
        setOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  return (
    <div className="desktop-menu" data-open={open ? 'true' : 'false'} data-placement={placement} ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="desktop-menu__trigger"
        disabled={disabled}
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
          className={`desktop-menu__content${layout === 'detailed' ? ' desktop-menu__content--detailed' : ''}`}
          popover="manual"
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
          aria-label={ariaLabel}
        >
          {layout === 'detailed' ? <div className="desktop-menu__heading" role="presentation">{ariaLabel}</div> : null}
          {options.map((option) => {
            const Icon = option.icon;
            const selected = option.value === value;

            return (
              <Fragment key={option.value}>
              {option.section ? <div className="desktop-menu__section" role="presentation">{option.section}</div> : option.separator ? <div className="desktop-menu__separator" role="separator"/> : null}
              <button
                aria-checked={selected}
                className={`desktop-menu__item${hasIcons ? '' : ' desktop-menu__item--plain'}${selected ? ' selected' : ''}`}
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
                  <span className="desktop-menu__label"><strong>{option.label}</strong>{option.badge ? <span className="desktop-menu__badge" dir="ltr">{option.badge}</span> : null}</span>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
                {selected ? <Check aria-hidden="true" className="desktop-menu__check" size={14} /> : null}
              </button>
              </Fragment>
            );
          })}
        </div>,
        menuRef.current?.closest('dialog[open]') ?? menuRef.current?.closest('.app-shell') ?? document.body
      ) : null}
    </div>
  );
}
