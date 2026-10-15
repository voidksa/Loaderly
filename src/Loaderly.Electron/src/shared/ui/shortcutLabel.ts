/** Display only the keys belonging to the running desktop platform. */
export function shortcutLabel(chord: string, platform: string): string {
  const mac = platform === 'darwin';
  return chord.replace(/CommandOrControl|Ctrl\/Command|Ctrl\/⌘|Mod/g, mac ? '⌘' : 'Ctrl')
    .replace(/Key([A-Z])|Digit([0-9])/g, '$1$2').split('+').map(key => {
      const value = key.trim();
      return mac ? ({ Shift: '⇧', Alt: '⌥', Enter: '↩', Control: '⌃' }[value] ?? value) : value;
    }).join(' + ');
}
