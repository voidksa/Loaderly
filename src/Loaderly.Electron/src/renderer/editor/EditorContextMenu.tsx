import type { CSSProperties } from 'react';
import { Captions, Clipboard, Eye, Layers3, RefreshCcw, Square, X } from 'lucide-react';

export type EditorContextMenuAction =
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'delete'
  | 'reset'
  | 'edit-text'
  | 'lock'
  | 'hide'
  | 'bring-forward'
  | 'send-backward';

type EditorContextMenuProps = {
  readonly canEditText: boolean;
  readonly canLayerOrder: boolean;
  readonly canPaste: boolean;
  readonly canToggleState: boolean;
  readonly locale: 'en' | 'ar';
  readonly onAction: (action: EditorContextMenuAction) => void;
  readonly x: number;
  readonly y: number;
};

export function EditorContextMenu({
  canEditText,
  canLayerOrder,
  canPaste,
  canToggleState,
  locale,
  onAction,
  x,
  y
}: EditorContextMenuProps) {
  const text = locale === 'ar'
    ? {
        editText: 'تعديل النص',
        copy: 'نسخ',
        paste: 'لصق',
        duplicate: 'تكرار',
        reset: 'إعادة ضبط التحويل',
        bringForward: 'تقديم للأمام',
        sendBackward: 'إرسال للخلف',
        hideShow: 'إخفاء / إظهار',
        lockUnlock: 'قفل / فتح القفل',
        delete: 'حذف'
      }
    : {
        editText: 'Edit text',
        copy: 'Copy',
        paste: 'Paste',
        duplicate: 'Duplicate',
        reset: 'Reset transform',
        bringForward: 'Bring forward',
        sendBackward: 'Send backward',
        hideShow: 'Hide / show',
        lockUnlock: 'Lock / unlock',
        delete: 'Delete'
      };
  const menuWidth = 196;
  const menuHeight = 380;
  const safeX = typeof window === 'undefined' ? x : Math.min(x, Math.max(8, window.innerWidth - menuWidth - 8));
  const safeY = typeof window === 'undefined' ? y : Math.min(y, Math.max(8, window.innerHeight - menuHeight - 8));

  return (
    <div className="editor-context-menu" role="menu" style={{ left: safeX, top: safeY } as CSSProperties}>
      <button disabled={!canEditText} onClick={() => onAction('edit-text')} role="menuitem" type="button">
        <Captions aria-hidden="true" size={14} />
        {text.editText}
      </button>
      <button onClick={() => onAction('copy')} role="menuitem" type="button">
        <Clipboard aria-hidden="true" size={14} />
        {text.copy}
      </button>
      <button disabled={!canPaste} onClick={() => onAction('paste')} role="menuitem" type="button">
        <Clipboard aria-hidden="true" size={14} />
        {text.paste}
      </button>
      <button onClick={() => onAction('duplicate')} role="menuitem" type="button">
        <Layers3 aria-hidden="true" size={14} />
        {text.duplicate}
      </button>
      <button onClick={() => onAction('reset')} role="menuitem" type="button">
        <RefreshCcw aria-hidden="true" size={14} />
        {text.reset}
      </button>
      <button disabled={!canLayerOrder} onClick={() => onAction('bring-forward')} role="menuitem" type="button">
        <Layers3 aria-hidden="true" size={14} />
        {text.bringForward}
      </button>
      <button disabled={!canLayerOrder} onClick={() => onAction('send-backward')} role="menuitem" type="button">
        <Layers3 aria-hidden="true" size={14} />
        {text.sendBackward}
      </button>
      <button disabled={!canToggleState} onClick={() => onAction('hide')} role="menuitem" type="button">
        <Eye aria-hidden="true" size={14} />
        {text.hideShow}
      </button>
      <button disabled={!canToggleState} onClick={() => onAction('lock')} role="menuitem" type="button">
        <Square aria-hidden="true" size={14} />
        {text.lockUnlock}
      </button>
      <button className="danger" onClick={() => onAction('delete')} role="menuitem" type="button">
        <X aria-hidden="true" size={14} />
        {text.delete}
      </button>
    </div>
  );
}
