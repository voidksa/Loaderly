/** Application commands and editor tools share one default shortcut catalogue. */
export const defaultCommandShortcuts: Readonly<Record<string, string>> = {
  library: 'Mod+Digit1', downloads: 'Mod+Digit2', settings: 'Mod+Digit3',
  community: 'Mod+Digit4', tools: 'Mod+Digit5', import: 'Mod+KeyO',
  editor: 'Mod+KeyE', 'start-downloads': 'Mod+Shift+Enter',
  undo: 'Mod+KeyZ', redo: 'Mod+Shift+KeyZ',
  'tool-cut': 'KeyC', 'tool-blur': 'KeyB', 'tool-zoom': 'KeyZ',
  'tool-speed': 'KeyS', 'tool-text': 'KeyT', 'tool-subtitles': 'KeyU'
};
export const commandShortcutStorageKey = 'loaderly:command-shortcuts:v1';
export function normalizeCommandOverrides(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, chord]) =>
    Object.hasOwn(defaultCommandShortcuts, id) && typeof chord === 'string' &&
    (/^Mod\+(?:Shift\+)?(?:Key[A-Z]|Digit[0-9]|Enter)$/.test(chord) || chord === defaultCommandShortcuts[id])));
}
export function readCommandOverrides(): Record<string, string> {
  try { return normalizeCommandOverrides(JSON.parse(localStorage.getItem(commandShortcutStorageKey) ?? '{}')); }
  catch { return {}; }
}
export function commandBindings(overrides: Record<string, string>): Record<string, string> {
  const result = { ...overrides }, used = new Set(Object.values(overrides));
  for (const [id, preferred] of Object.entries(defaultCommandShortcuts)) {
    if (Object.hasOwn(result, id)) continue;
    // Keep saved choices. Give any newly conflicting default a free numbered key.
    const chord = [preferred, ...Array.from({ length: 10 }, (_, i) => `Mod+Shift+Digit${i}`)].find(key => !used.has(key));
    if (chord) { result[id] = chord; used.add(chord); }
  }
  return result;
}
export function editorCommandId(action: {type:string;tool?:string}): string | undefined {
  if (action.type === 'activate-tool') return `tool-${action.tool}`;
  if (action.type === 'undo' || action.type === 'redo') return action.type;
}
