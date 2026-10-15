type ShortcutInput = {
  key?: string;
  code: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  getModifierState?: (key: string) => boolean;
};

/** Physical keys keep app commands independent of the typed character and UI language. */
export function keyboardChord(input: ShortcutInput, platform: string): string | undefined {
  if (input.repeat || input.isComposing || input.getModifierState?.('AltGraph')) return;
  const mac = platform === 'darwin';
  // Do not consume Windows/Super shortcuts or macOS Control shortcuts as Command.
  if (mac ? input.ctrlKey : input.metaKey) return;
  return `${(mac ? input.metaKey : input.ctrlKey) ? 'Mod+' : ''}${input.shiftKey ? 'Shift+' : ''}${input.altKey ? 'Alt+' : ''}${input.code}`;
}

export function isDownloadShortcut(input: ShortcutInput, platform: string): boolean {
  const chord = keyboardChord(input, platform);
  return chord === 'Mod+Enter' || chord === 'Mod+NumpadEnter';
}
