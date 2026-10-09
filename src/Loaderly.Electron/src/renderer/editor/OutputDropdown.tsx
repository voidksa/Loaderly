import { useEffect, useRef, type RefObject } from 'react';
import { ChevronDown, Film, LoaderCircle, type LucideIcon } from 'lucide-react';

import type { EditorOutputAction, EditorOutputActionKind } from '../../shared/editor-project/editorOutput';

type OutputDropdownProps = {
  readonly actions: readonly EditorOutputAction[];
  readonly busy?: EditorOutputActionKind;
  readonly iconForAction: (kind: EditorOutputActionKind) => LucideIcon;
  readonly locale: 'en' | 'ar';
  readonly menuRef: RefObject<HTMLDivElement | null>;
  readonly onRun: (kind: EditorOutputActionKind) => void;
  readonly onToggle: () => void;
  readonly open: boolean;
};

const arabicActionText: Record<EditorOutputActionKind, { label: string; description: string }> = {
  'copy-video': {
    label: 'نسخ كفيديو',
    description: 'ينسخ النطاق المحدد بعد تطبيق التعديلات.'
  },
  'copy-gif': {
    label: 'نسخ كـ GIF',
    description: 'ينشئ ملف GIF من النطاق المحدد ثم ينسخه.'
  },
  'save-video': {
    label: 'حفظ الفيديو على الجهاز',
    description: 'يحفظ النطاق المحدد كملف فيديو.'
  },
  'save-gif': {
    label: 'حفظ GIF على الجهاز',
    description: 'يحفظ النطاق المحدد كملف GIF.'
  },
  'save-frame': {
    label: 'حفظ الإطار كصورة',
    description: 'يحفظ الإطار الحالي من المعاينة كصورة.'
  },
  'copy-frame': {
    label: 'نسخ الإطار كصورة',
    description: 'ينسخ الإطار الحالي من المعاينة كصورة.'
  },
  'copy-audio': {
    label: 'نسخ كملف صوتي',
    description: 'ينسخ النطاق المحدد كملف MP3.'
  },
  'save-audio': {
    label: 'حفظ الصوت على الجهاز',
    description: 'يحفظ النطاق المحدد كملف MP3.'
  }
};

const arabicDisabledReasons: Record<string, string> = {
  'Import or download a real media file first.': 'استورد أو نزّل ملف وسائط حقيقي أولًا.',
  'Select a timeline range before exporting this output.': 'حدد نطاقًا من الخط الزمني قبل التصدير.',
  'Clipboard video copy is not available on this platform. Save to device instead.': 'نسخ الفيديو للحافظة غير متاح هنا. احفظه على الجهاز بدلًا من ذلك.',
  'Clipboard GIF copy is not available on this platform. Save to device instead.': 'نسخ GIF للحافظة غير متاح هنا. احفظه على الجهاز بدلًا من ذلك.',
  'Clipboard image copy is not available on this platform. Save to device instead.': 'نسخ الصورة للحافظة غير متاح هنا. احفظها على الجهاز بدلًا من ذلك.',
  'Clipboard audio copy is not available on this platform. Save to device instead.': 'نسخ الصوت للحافظة غير متاح هنا. احفظه على الجهاز بدلًا من ذلك.'
};

function localizeArabicDisabledReason(reason: string): string {
  const exact = arabicDisabledReasons[reason];

  if (exact) {
    return exact;
  }

  if (/overlapping zoom effects/i.test(reason)) {
    return 'توجد تأثيرات تكبير متداخلة. حرّك أحدها أو قصّر مدته قبل التصدير.';
  }

  if (/overlapping speed effects/i.test(reason)) return 'توجد تأثيرات سرعة متداخلة. حرّك أحدها أو قصّر مدته قبل التصدير.';
  if (/multiple canvas sizes/i.test(reason)) return 'اختر مقاس لوحة واحدًا للتصدير، واحذف المقاسات الإضافية أو أخفها.';

  if (/unsupported effects/i.test(reason)) {
    return 'هذا النطاق يحتوي تأثيرات غير مدعومة في التصدير حاليًا.';
  }

  return 'هذا الإخراج غير متاح بالإعدادات الحالية.';
}

export function localizedOutputActionText(action: EditorOutputAction, locale: 'en' | 'ar') {
  if (locale !== 'ar') {
    return {
      label: action.label,
      description: action.disabledReason ?? action.description
    };
  }

  return {
    label: arabicActionText[action.kind].label,
    description: action.disabledReason
      ? localizeArabicDisabledReason(action.disabledReason)
      : arabicActionText[action.kind].description
  };
}

export function OutputDropdown({ actions, busy, iconForAction, locale, menuRef, onRun, onToggle, open }: OutputDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const labels = locale === 'ar'
    ? {
        output: 'تصدير التحديد',
        rendering: 'جارٍ التصدير…',
        working: 'جارٍ التنفيذ…',
        renderingDescription: 'يتم تجهيز التصدير التحديد الآن.'
      }
    : {
        output: 'Output selected',
        rendering: 'Rendering...',
        working: 'Working...',
        renderingDescription: 'Rendering the selected output now.'
      };

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const frame = window.requestAnimationFrame(() => {
        menuRef.current?.querySelector<HTMLButtonElement>('.output-menu__item:not(:disabled)')?.focus();
      });

      return () => window.cancelAnimationFrame(frame);
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [menuRef, open]);

  return (
    <div className="output-menu" data-open={open ? 'true' : 'false'} ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="button primary output-menu__trigger"
        disabled={Boolean(busy)}
        onClick={onToggle}
        ref={triggerRef}
        type="button"
      >
        <Film aria-hidden="true" size={15} />
        {busy ? labels.rendering : labels.output}
        <ChevronDown aria-hidden="true" className="output-menu__chevron" size={14} />
      </button>
      {open ? (
        <div
          className="output-menu__content"
          onKeyDown={(event) => {
            const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.output-menu__item:not(:disabled)'));
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
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onToggle();
              return;
            }

            if (nextIndex !== undefined && items[nextIndex]) {
              event.preventDefault();
              items[nextIndex].focus();
            }
          }}
          role="menu"
        >
          {actions.map((action) => {
            const Icon = iconForAction(action.kind);
            const running = busy === action.kind;
            const disabled = Boolean(busy) || action.disabled;
            const actionText = localizedOutputActionText(action, locale);

            return (
              <button
                aria-busy={running}
                className={`output-menu__item${running ? ' running' : ''}`}
                disabled={disabled}
                key={action.kind}
                onClick={() => onRun(action.kind)}
                role="menuitem"
                type="button"
              >
                <span className="output-menu__icon">
                  {running ? <LoaderCircle aria-hidden="true" className="output-menu__spinner" size={15} /> : <Icon aria-hidden="true" size={15} />}
                </span>
                <span>
                  <strong>{running ? labels.working : actionText.label}</strong>
                  <small>{running ? labels.renderingDescription : actionText.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
