import { describe, expect, it } from 'vitest';
import { keyboardChord, isDownloadShortcut } from './keyboardShortcut';
import { resolveEditorShortcut } from '../editor-project/editorShortcuts';
import { shortcutLabel } from './shortcutLabel';
import { captureShortcuts } from '../quickCapture';

describe('layout-independent shortcuts', () => {
  for (const platform of ['win32', 'linux', 'darwin']) {
    const modifier = platform === 'darwin' ? {metaKey:true} : {ctrlKey:true};
    it(`keeps commands on the physical key across typed scripts on ${platform}`, () => {
      for (const key of ['k', 'ن', 'л', 'κ', 'ش', 'Dead', 'Process']) {
        expect(keyboardChord({key,code:'KeyK',...modifier},platform)).toBe('Mod+KeyK');
        expect(keyboardChord({key,code:'KeyE',shiftKey:true,...modifier},platform)).toBe('Mod+Shift+KeyE');
      }
      for (const key of ['z','ئ','я','w']) {
        expect(resolveEditorShortcut({key,code:'KeyZ',platform,...modifier})).toEqual({type:'undo'});
        expect(resolveEditorShortcut({key,code:'KeyZ',platform,shiftKey:true,...modifier})).toEqual({type:'redo'});
      }
      for (const [code,tool] of Object.entries({KeyC:'cut',KeyB:'blur',KeyZ:'zoom',KeyS:'speed',KeyT:'text',KeyU:'subtitles'})) {
        for (const key of ['ش','ц','a']) expect(resolveEditorShortcut({key,code,platform})).toEqual({type:'activate-tool',tool});
      }
    });
    it(`starts one download using either Enter, respecting input composition on ${platform}`, () => {
      for (const code of ['Enter','NumpadEnter']) {
        expect(isDownloadShortcut({code,...modifier},platform)).toBe(true);
        for (const extra of [{repeat:true},{isComposing:true},{altKey:true},{shiftKey:true},{getModifierState:()=>true}]) expect(isDownloadShortcut({code,...modifier,...extra},platform)).toBe(false);
      }
      expect(isDownloadShortcut({code:'Enter'},platform)).toBe(false);
      expect(isDownloadShortcut({code:'Enter',ctrlKey:true,metaKey:true},platform)).toBe(false);
      for(const chord of Object.values(captureShortcuts)) {
        const label=shortcutLabel(chord,platform);
        expect(label).toContain(platform==='darwin'?'⌘':'Ctrl');
        expect(label).not.toMatch(/Alt|Option|Key/);
      }
    });
  }
  it('does not let shifted clipboard commands swallow unrelated shortcuts',()=>{
    for(const code of ['KeyC','KeyV','KeyD','KeyY'])expect(resolveEditorShortcut({key:'ش',code,ctrlKey:true,shiftKey:true})).toBeUndefined();
  });
});
