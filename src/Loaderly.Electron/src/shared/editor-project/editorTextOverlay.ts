export type EditorTextDirection = 'ltr' | 'rtl';

export type EditorTextFontFamily =
  | 'segoe-ui'
  | 'tahoma'
  | 'arial'
  | 'traditional-arabic'
  | 'calibri'
  | 'times-new-roman'
  | 'courier-new';

export type EditorTextFontOption = {
  readonly value: EditorTextFontFamily;
  readonly label: string;
  readonly cssFontFamily: string;
  readonly windowsFontPaths: readonly string[];
};

const rtlStrongCharacter = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/u;
const ltrStrongCharacter = /[A-Za-z\u00c0-\u024f]/u;
const leadingDirectionMark = /^[\u200e\u200f]/u;

export const defaultEditorTextFontFamily: EditorTextFontFamily = 'segoe-ui';

export const editorTextFontOptions: readonly EditorTextFontOption[] = [
  {
    value: 'segoe-ui',
    label: 'Segoe UI',
    cssFontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
    windowsFontPaths: ['C:\\Windows\\Fonts\\segoeuib.ttf', 'C:\\Windows\\Fonts\\seguisb.ttf', 'C:\\Windows\\Fonts\\segoeui.ttf']
  },
  {
    value: 'tahoma',
    label: 'Tahoma',
    cssFontFamily: 'Tahoma, "Segoe UI", Arial, sans-serif',
    windowsFontPaths: ['C:\\Windows\\Fonts\\tahomabd.ttf', 'C:\\Windows\\Fonts\\tahoma.ttf']
  },
  {
    value: 'arial',
    label: 'Arial',
    cssFontFamily: 'Arial, "Segoe UI", Tahoma, sans-serif',
    windowsFontPaths: ['C:\\Windows\\Fonts\\arialbd.ttf', 'C:\\Windows\\Fonts\\arial.ttf']
  },
  {
    value: 'traditional-arabic',
    label: 'Traditional Arabic',
    cssFontFamily: '"Traditional Arabic", "Times New Roman", serif',
    windowsFontPaths: ['C:\\Windows\\Fonts\\trado.ttf', 'C:\\Windows\\Fonts\\timesbd.ttf', 'C:\\Windows\\Fonts\\times.ttf']
  },
  {
    value: 'calibri',
    label: 'Calibri',
    cssFontFamily: 'Calibri, "Segoe UI", Tahoma, sans-serif',
    windowsFontPaths: ['C:\\Windows\\Fonts\\calibrib.ttf', 'C:\\Windows\\Fonts\\calibri.ttf']
  },
  {
    value: 'times-new-roman',
    label: 'Times New Roman',
    cssFontFamily: '"Times New Roman", "Traditional Arabic", serif',
    windowsFontPaths: ['C:\\Windows\\Fonts\\timesbd.ttf', 'C:\\Windows\\Fonts\\times.ttf']
  },
  {
    value: 'courier-new',
    label: 'Courier New',
    cssFontFamily: '"Courier New", Consolas, monospace',
    windowsFontPaths: ['C:\\Windows\\Fonts\\courbd.ttf', 'C:\\Windows\\Fonts\\cour.ttf']
  }
];

export function editorTextFontOptionFor(value: unknown): EditorTextFontOption {
  return editorTextFontOptions.find((option) => option.value === value) ?? editorTextFontOptions[0];
}

export function editorTextCssFontFamily(value: unknown): string {
  return editorTextFontOptionFor(value).cssFontFamily;
}

export function detectEditorTextDirection(value: string): EditorTextDirection {
  for (const character of value.replace(leadingDirectionMark, '')) {
    if (rtlStrongCharacter.test(character)) {
      return 'rtl';
    }

    if (ltrStrongCharacter.test(character)) {
      return 'ltr';
    }
  }

  return 'ltr';
}

export function prepareEditorTextForExport(value: string): string {
  const text = value.replace(leadingDirectionMark, '');
  const mark = detectEditorTextDirection(text) === 'rtl' ? '\u200F' : '\u200E';

  return `${mark}${text}`;
}
