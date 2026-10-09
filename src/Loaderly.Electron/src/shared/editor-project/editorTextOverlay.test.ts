import { describe, expect, it } from 'vitest';

import {
  defaultEditorTextFontFamily,
  detectEditorTextDirection,
  editorTextCssFontFamily,
  editorTextFontOptionFor,
  prepareEditorTextForExport
} from './editorTextOverlay';

describe('editor text overlay helpers', () => {
  it('detects Arabic-led mixed text as RTL', () => {
    expect(detectEditorTextDirection('قريب... launch soon')).toBe('rtl');
    expect(detectEditorTextDirection('Launch قريب')).toBe('ltr');
  });

  it('adds a directional mark before exporting mixed text', () => {
    expect(prepareEditorTextForExport('قريب... launch soon')).toBe('\u200Fقريب... launch soon');
    expect(prepareEditorTextForExport('Launch قريب')).toBe('\u200ELaunch قريب');
  });

  it('resolves supported editor font presets for preview and export', () => {
    expect(defaultEditorTextFontFamily).toBe('segoe-ui');
    expect(editorTextCssFontFamily('tahoma')).toContain('Tahoma');
    expect(editorTextFontOptionFor('traditional-arabic').windowsFontPaths).toContain('C:\\Windows\\Fonts\\trado.ttf');
    expect(editorTextFontOptionFor('unknown')).toEqual(editorTextFontOptionFor(defaultEditorTextFontFamily));
  });
});
