import type { ContextMenuParams, MenuItemConstructorOptions } from 'electron';

export function macApplicationMenu(openSettings: () => void, openHelp: () => void): MenuItemConstructorOptions[] {
  return [
    { label: 'Loaderly', submenu: [
      { role: 'about' },
      { type: 'separator' },
      { id: 'loaderly-settings', label: 'Settings…', accelerator: 'Command+,', click: openSettings },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ] },
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'Loaderly Documentation', click: openHelp }] }
  ];
}

export function textContextMenu(params: Pick<ContextMenuParams, 'isEditable' | 'selectionText' | 'editFlags'>): MenuItemConstructorOptions[] {
  const flags = params.editFlags;
  if (!params.isEditable) {
    return params.selectionText && flags.canCopy ? [{ role: 'copy' }] : [];
  }
  return [
    { role: 'undo', enabled: flags.canUndo },
    { role: 'redo', enabled: flags.canRedo },
    { type: 'separator' },
    { role: 'cut', enabled: flags.canCut },
    { role: 'copy', enabled: flags.canCopy },
    { role: 'paste', enabled: flags.canPaste },
    { type: 'separator' },
    { role: 'selectAll', enabled: flags.canSelectAll }
  ];
}
