import { describe, expect, it } from 'vitest';

import { editorOutputActions, resolveEditorOutputActions } from './editorOutput';

describe('editor output actions', () => {
  it('offers copy and save actions for video, gif, frames, and audio', () => {
    expect(editorOutputActions.map((action) => action.kind)).toEqual([
      'copy-video',
      'copy-gif',
      'save-video',
      'save-gif',
      'save-frame',
      'copy-frame',
      'copy-audio',
      'save-audio'
    ]);
  });

  it('uses audio-only output actions for audio media', () => {
    expect(
      resolveEditorOutputActions({
        hasMedia: true,
        hasSelection: true,
        mediaKind: 'audio',
        supportsClipboardFiles: true,
        supportsClipboardImages: true
      }).map((action) => action.kind)
    ).toEqual(['copy-audio', 'save-audio']);
  });

  it('disables clipboard-only video actions when the platform cannot copy files', () => {
    expect(
      resolveEditorOutputActions({
        hasMedia: true,
        hasSelection: true,
        supportsClipboardFiles: false,
        supportsClipboardImages: true
      }).map((action) => ({ kind: action.kind, disabled: action.disabled, reason: action.disabledReason }))
    ).toEqual([
      { kind: 'copy-video', disabled: true, reason: 'Clipboard video copy is not available on this platform. Save to device instead.' },
      { kind: 'copy-gif', disabled: true, reason: 'Clipboard GIF copy is not available on this platform. Save to device instead.' },
      { kind: 'save-video', disabled: false, reason: undefined },
      { kind: 'save-gif', disabled: false, reason: undefined },
      { kind: 'save-frame', disabled: false, reason: undefined },
      { kind: 'copy-frame', disabled: false, reason: undefined }
    ]);
  });

  it('disables clipboard-only audio actions when the platform cannot copy files', () => {
    expect(
      resolveEditorOutputActions({
        hasMedia: true,
        hasSelection: true,
        mediaKind: 'audio',
        supportsClipboardFiles: false,
        supportsClipboardImages: true
      }).map((action) => ({ kind: action.kind, disabled: action.disabled, reason: action.disabledReason }))
    ).toEqual([
      { kind: 'copy-audio', disabled: true, reason: 'Clipboard audio copy is not available on this platform. Save to device instead.' },
      { kind: 'save-audio', disabled: false, reason: undefined }
    ]);
  });

  it('disables every action when no real media is loaded', () => {
    expect(
      resolveEditorOutputActions({
        hasMedia: false,
        hasSelection: false,
        supportsClipboardFiles: true,
        supportsClipboardImages: true
      }).every((action) => action.disabled)
    ).toBe(true);
  });

  it('disables output when the selected edit state contains unsupported effects', () => {
    const actions = resolveEditorOutputActions({
      hasMedia: true,
      hasSelection: true,
      supportsClipboardFiles: true,
      supportsClipboardImages: true,
      unsupportedEffects: ['multiple zoom effects', 'multiple speed effects']
    });

    expect(actions.every((action) => action.disabled)).toBe(true);
    expect(actions[0].disabledReason).toBe('This range contains unsupported effects: multiple zoom effects, multiple speed effects.');
  });

  it('can disable range outputs without disabling frame outputs', () => {
    const actions = resolveEditorOutputActions({
      hasMedia: true,
      hasSelection: true,
      supportsClipboardFiles: true,
      supportsClipboardImages: true,
      unsupportedRangeEffects: ['custom effect'],
      unsupportedFrameEffects: []
    });

    expect(actions.find((action) => action.kind === 'save-video')).toMatchObject({
      disabled: true,
      disabledReason: 'This range contains unsupported effects: custom effect.'
    });
    expect(actions.find((action) => action.kind === 'save-frame')).toMatchObject({
      disabled: false,
      disabledReason: undefined
    });
  });

  it('uses actionable unsupported effect messages', () => {
    const actions = resolveEditorOutputActions({
      hasMedia: true,
      hasSelection: true,
      supportsClipboardFiles: true,
      supportsClipboardImages: true,
      unsupportedRangeEffects: ['custom effect', 'overlapping zoom effects']
    });

    expect(actions.find((action) => action.kind === 'save-video')?.disabledReason).toBe(
      'This range contains Overlapping Zoom effects cannot be exported yet. Move or shorten one zoom item. Sequential zooms are supported. Unsupported effects: custom effect.'
    );
  });
});
