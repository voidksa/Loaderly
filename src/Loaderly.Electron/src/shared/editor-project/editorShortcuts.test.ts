import { describe, expect, it } from 'vitest';

import { resolveEditorShortcut } from './editorShortcuts';

describe('editor shortcuts', () => {
  it('respects composition, menus, AltGr and held command keys', () => {
    const base = {key:'z',code:'KeyZ',targetTagName:'DIV'};
    for (const extra of [{isComposing:true},{inMenu:true},{altKey:true,ctrlKey:true},{repeat:true}]) {
      expect(resolveEditorShortcut({...base,...extra})).toBeUndefined();
    }
    expect(resolveEditorShortcut({key:'ArrowRight',code:'ArrowRight',repeat:true})).toEqual({type:'seek',deltaSeconds:.25});
    expect(resolveEditorShortcut({...base,targetTagName:'BUTTON'})).toEqual({type:'activate-tool',tool:'zoom'});
  });
  it('maps playback, seeking, history, and clipboard shortcuts', () => {
    expect(resolveEditorShortcut({ key: ' ', code: 'Space', targetTagName: 'DIV' })).toEqual({ type: 'toggle-playback' });
    expect(resolveEditorShortcut({ key: 'ArrowRight', code: 'ArrowRight', targetTagName: 'DIV' })).toEqual({
      type: 'seek',
      deltaSeconds: 0.25
    });
    expect(resolveEditorShortcut({ key: 'ArrowLeft', code: 'ArrowLeft', shiftKey: true, targetTagName: 'DIV' })).toEqual({
      type: 'seek',
      deltaSeconds: -1
    });
    expect(resolveEditorShortcut({ key: 'z', code: 'KeyZ', ctrlKey: true, targetTagName: 'DIV' })).toEqual({ type: 'undo' });
    expect(resolveEditorShortcut({ key: 'z', code: 'KeyZ', metaKey: true, shiftKey: true, targetTagName: 'DIV' })).toEqual({
      type: 'redo'
    });
    expect(resolveEditorShortcut({ key: 'd', code: 'KeyD', ctrlKey: true, targetTagName: 'DIV' })).toEqual({
      type: 'duplicate-selected'
    });
  });

  it('maps tool shortcuts without relying on keyboard language', () => {
    expect(resolveEditorShortcut({ key: 'ب', code: 'KeyB', targetTagName: 'DIV' })).toEqual({ type: 'activate-tool', tool: 'blur' });
    expect(resolveEditorShortcut({ key: 'ن', code: 'KeyZ', targetTagName: 'DIV' })).toEqual({ type: 'activate-tool', tool: 'zoom' });
    expect(resolveEditorShortcut({ key: 'ف', code: 'KeyT', targetTagName: 'DIV' })).toEqual({ type: 'activate-tool', tool: 'text' });
  });

  it('ignores editor shortcuts while editing text fields', () => {
    expect(resolveEditorShortcut({ key: ' ', code: 'Space', targetTagName: 'TEXTAREA' })).toBeUndefined();
    expect(resolveEditorShortcut({ key: 'z', code: 'KeyZ', ctrlKey: true, targetTagName: 'INPUT' })).toBeUndefined();
    expect(resolveEditorShortcut({ key: 'Delete', code: 'Delete', isContentEditable: true, targetTagName: 'DIV' })).toBeUndefined();
  });
  it('leaves native activation keys to focused buttons, links and disclosures', () => {
    for (const targetTagName of ['BUTTON', 'A', 'SUMMARY']) {
      expect(resolveEditorShortcut({ key: 'Enter', code: 'Enter', targetTagName })).toBeUndefined();
      expect(resolveEditorShortcut({ key: ' ', code: 'Space', targetTagName })).toBeUndefined();
    }
  });
});
