export type EditorShortcutInput = {
  readonly key: string;
  readonly code: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
  readonly targetTagName?: string;
  readonly isContentEditable?: boolean;
  readonly isComposing?: boolean;
  readonly repeat?: boolean;
  readonly inMenu?: boolean;
};

export type EditorShortcutAction =
  | { readonly type: 'toggle-playback' }
  | { readonly type: 'seek'; readonly deltaSeconds: number }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'delete-selected' }
  | { readonly type: 'copy-selected' }
  | { readonly type: 'paste-clipboard' }
  | { readonly type: 'duplicate-selected' }
  | { readonly type: 'deselect' }
  | { readonly type: 'set-start-at-playhead' }
  | { readonly type: 'set-end-at-playhead' }
  | { readonly type: 'activate-tool'; readonly tool: 'cut' | 'blur' | 'zoom' | 'speed' | 'text' | 'subtitles' };

const inputTags = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function resolveEditorShortcut(input: EditorShortcutInput): EditorShortcutAction | undefined {
  if (shouldIgnoreEditorShortcut(input)) {
    return undefined;
  }

  const command = Boolean(input.ctrlKey || input.metaKey);
  const code = input.code;

  if (input.altKey || (input.repeat && !['ArrowLeft', 'ArrowRight'].includes(code))) return undefined;

  if (command) {
    if (code === 'KeyZ' && input.shiftKey) {
      return { type: 'redo' };
    }

    if (code === 'KeyZ') {
      return { type: 'undo' };
    }

    if (code === 'KeyY') {
      return { type: 'redo' };
    }

    if (code === 'KeyC') {
      return { type: 'copy-selected' };
    }

    if (code === 'KeyV') {
      return { type: 'paste-clipboard' };
    }

    if (code === 'KeyD') {
      return { type: 'duplicate-selected' };
    }

    return undefined;
  }

  if (input.altKey) {
    return undefined;
  }

  switch (code) {
    case 'Space':
    case 'Enter':
      return { type: 'toggle-playback' };
    case 'ArrowRight':
      return { type: 'seek', deltaSeconds: input.shiftKey ? 1 : 0.25 };
    case 'ArrowLeft':
      return { type: 'seek', deltaSeconds: input.shiftKey ? -1 : -0.25 };
    case 'Delete':
    case 'Backspace':
      return { type: 'delete-selected' };
    case 'Escape':
      return { type: 'deselect' };
    case 'KeyI':
    case 'BracketLeft':
      return { type: 'set-start-at-playhead' };
    case 'KeyO':
    case 'BracketRight':
      return { type: 'set-end-at-playhead' };
    case 'KeyC':
      return { type: 'activate-tool', tool: 'cut' };
    case 'KeyB':
      return { type: 'activate-tool', tool: 'blur' };
    case 'KeyZ':
      return { type: 'activate-tool', tool: 'zoom' };
    case 'KeyS':
      return { type: 'activate-tool', tool: 'speed' };
    case 'KeyT':
      return { type: 'activate-tool', tool: 'text' };
    case 'KeyU':
      return { type: 'activate-tool', tool: 'subtitles' };
    default:
      return undefined;
  }
}

export function shouldIgnoreEditorShortcut(input: EditorShortcutInput): boolean {
  const tagName = input.targetTagName?.toUpperCase();
  const nativeActivation = tagName && ['BUTTON','A','SUMMARY'].includes(tagName) && ['Space','Enter'].includes(input.code);
  return Boolean(input.isComposing || input.inMenu || input.isContentEditable || nativeActivation || (tagName && inputTags.has(tagName)));
}
