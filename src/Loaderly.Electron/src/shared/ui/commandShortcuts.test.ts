import { expect, it } from 'vitest';
import { commandBindings, defaultCommandShortcuts, normalizeCommandOverrides } from './commandShortcuts';
import { keyboardChord } from './keyboardShortcut';
import { captureBindings, defaultQuickCapture, normalizeQuickCapture } from '../quickCapture';
it('assigns every command a distinct default on all keyboard layouts',()=>{
 const bindings=commandBindings({});expect(Object.keys(bindings)).toHaveLength(16);expect(new Set(Object.values(bindings)).size).toBe(16);
 for(const platform of ['win32','linux','darwin'])for(const key of ['a','ش','ж','é'])for(const chord of Object.values(bindings)) {
  const parts=chord.split('+');expect(keyboardChord({key,code:parts.at(-1)!,ctrlKey:platform!=='darwin'&&parts.includes('Mod'),metaKey:platform==='darwin'&&parts.includes('Mod'),shiftKey:parts.includes('Shift')},platform)).toBe(chord);
 }
});
it('preserves previous customization without disabling conflicting new defaults',()=>{
 const bindings=commandBindings(normalizeCommandOverrides({library:'Mod+KeyO',downloads:'Mod+Shift+KeyE',bad:'KeyA'}));
 expect(bindings.library).toBe('Mod+KeyO');expect(bindings.downloads).toBe('Mod+Shift+KeyE');expect(bindings.import).not.toBe('Mod+KeyO');
 expect(new Set(Object.values(bindings)).size).toBe(Object.keys(defaultCommandShortcuts).length);
 expect(normalizeCommandOverrides({library:42,downloads:'Control+X'})).toEqual({});
});
it('migrates old disabled defaults once, preserving later opt-out and custom global keys',()=>{
 expect(normalizeQuickCapture({shortcuts:false}).shortcuts).toBe(true);
 const optedOut=normalizeQuickCapture({...defaultQuickCapture,shortcuts:false});expect(normalizeQuickCapture(optedOut).shortcuts).toBe(false);
 expect(normalizeQuickCapture().watch).toBe(false);
 expect(captureBindings({...defaultQuickCapture,shortcutBindings:{floating:'CommandOrControl+Shift+F9'}}).floating).toBe('CommandOrControl+Shift+F9');
});
it('rejects malformed global keys and avoids duplicate imported bindings',()=>{
 expect(captureBindings({...defaultQuickCapture,shortcutBindings:{floating:'Ctrl+Q'}}).floating).toBe('CommandOrControl+Shift+F8');
 const keys=captureBindings({...defaultQuickCapture,shortcutBindings:{video:'CommandOrControl+Shift+F7',audio:'CommandOrControl+Shift+F7'}});
 expect(new Set(Object.values(keys)).size).toBe(3);
});
