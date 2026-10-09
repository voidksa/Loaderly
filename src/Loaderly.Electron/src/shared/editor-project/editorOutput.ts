export type EditorOutputActionKind =
  | 'copy-video'
  | 'copy-gif'
  | 'save-video'
  | 'save-gif'
  | 'save-frame'
  | 'copy-frame'
  | 'copy-audio'
  | 'save-audio';

export type EditorOutputAction = {
  readonly kind: EditorOutputActionKind;
  readonly label: string;
  readonly description: string;
  readonly requiresRange: boolean;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
};

export type ResolveEditorOutputActionsInput = {
  readonly hasMedia: boolean;
  readonly hasSelection: boolean;
  readonly mediaKind?: 'video' | 'audio';
  readonly supportsClipboardFiles: boolean;
  readonly supportsClipboardImages: boolean;
  readonly unsupportedEffects?: readonly string[];
  readonly unsupportedRangeEffects?: readonly string[];
  readonly unsupportedFrameEffects?: readonly string[];
};

export const editorOutputActions: readonly EditorOutputAction[] = [
  {
    kind: 'copy-video',
    label: 'Copy as video',
    description: 'Copies the selected edited range to the clipboard.',
    requiresRange: true
  },
  {
    kind: 'copy-gif',
    label: 'Copy as GIF',
    description: 'Renders the selected range as a GIF and copies it.',
    requiresRange: true
  },
  {
    kind: 'save-video',
    label: 'Save video to device',
    description: 'Exports the selected edited range as a video file.',
    requiresRange: true
  },
  {
    kind: 'save-gif',
    label: 'Save GIF to device',
    description: 'Exports the selected edited range as a GIF file.',
    requiresRange: true
  },
  {
    kind: 'save-frame',
    label: 'Save selected frame as image',
    description: 'Saves the current preview frame as an image.',
    requiresRange: false
  },
  {
    kind: 'copy-frame',
    label: 'Copy selected frame as image',
    description: 'Copies the current preview frame as an image.',
    requiresRange: false
  },
  {
    kind: 'copy-audio',
    label: 'Copy as audio',
    description: 'Copies the selected edited range as an MP3 file.',
    requiresRange: true
  },
  {
    kind: 'save-audio',
    label: 'Save audio to device',
    description: 'Exports the selected edited range as an MP3 file.',
    requiresRange: true
  }
];

export function resolveEditorOutputActions(input: ResolveEditorOutputActionsInput): readonly EditorOutputAction[] {
  const unsupportedEffects = input.unsupportedEffects ?? [];
  const unsupportedRangeEffects = input.unsupportedRangeEffects ?? unsupportedEffects;
  const unsupportedFrameEffects = input.unsupportedFrameEffects ?? unsupportedEffects;
  const actions = input.mediaKind === 'audio'
    ? editorOutputActions.filter((action) => action.kind === 'copy-audio' || action.kind === 'save-audio')
    : editorOutputActions.filter((action) => action.kind !== 'copy-audio' && action.kind !== 'save-audio');

  return actions.map((action) => {
    if (!input.hasMedia) {
      return {
        ...action,
        disabled: true,
        disabledReason: 'Import or download a real media file first.'
      };
    }

    const actionUnsupportedEffects = action.requiresRange ? unsupportedRangeEffects : unsupportedFrameEffects;

    if (actionUnsupportedEffects.length > 0) {
      return {
        ...action,
        disabled: true,
        disabledReason: unsupportedEffectsReason(actionUnsupportedEffects, action.requiresRange ? 'range' : 'frame')
      };
    }

    if (action.requiresRange && !input.hasSelection) {
      return {
        ...action,
        disabled: true,
        disabledReason: 'Select a timeline range before exporting this output.'
      };
    }

    if ((action.kind === 'copy-video' || action.kind === 'copy-gif' || action.kind === 'copy-audio') && !input.supportsClipboardFiles) {
      return {
        ...action,
        disabled: true,
        disabledReason:
          action.kind === 'copy-video'
            ? 'Clipboard video copy is not available on this platform. Save to device instead.'
            : action.kind === 'copy-audio'
              ? 'Clipboard audio copy is not available on this platform. Save to device instead.'
              : 'Clipboard GIF copy is not available on this platform. Save to device instead.'
      };
    }

    if (action.kind === 'copy-frame' && !input.supportsClipboardImages) {
      return {
        ...action,
        disabled: true,
        disabledReason: 'Clipboard image copy is not available on this platform. Save to device instead.'
      };
    }

    return {
      ...action,
      disabled: false,
      disabledReason: undefined
    };
  });
}

function unsupportedEffectsReason(effects: readonly string[], scope: 'range' | 'frame'): string {
  const actionableMessages = effects.flatMap((effect) => {
    if (effect === 'overlapping zoom effects') {
      return ['Overlapping Zoom effects cannot be exported yet. Move or shorten one zoom item; sequential zooms are supported.'];
    }

    if (effect === 'overlapping speed effects') return ['Overlapping speed effects cannot be exported. Move or shorten one interval; sequential rates are supported.'];
    if (effect === 'multiple canvas sizes') return ['Use one canvas size per export. Hide or remove additional canvas items.'];
    return [];
  });
  const genericEffects = effects.filter((effect) => !['overlapping zoom effects','overlapping speed effects','multiple canvas sizes'].includes(effect));
  const scopeLabel = scope === 'range' ? 'This range' : 'This frame';

  if (actionableMessages.length > 0 && genericEffects.length === 0) {
    return actionableMessages.join(' ');
  }

  if (actionableMessages.length > 0) {
    return `${scopeLabel} contains ${actionableMessages.join(' ')} Unsupported effects: ${genericEffects.join(', ')}.`;
  }

  return `${scopeLabel} contains unsupported effects: ${genericEffects.join(', ')}.`;
}
