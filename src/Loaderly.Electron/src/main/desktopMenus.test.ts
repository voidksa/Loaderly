import {describe,it,expect,vi} from 'vitest';
import type {MenuItemConstructorOptions} from 'electron';
import {macApplicationMenu,textContextMenu} from './desktopMenus';
const flags={canUndo:false,canRedo:false,canCut:false,canCopy:false,canPaste:true,canDelete:false,canSelectAll:true,canEditRichly:false};
describe('native desktop editing',()=>{
 it('registers Settings in the application menu alongside the native Edit menu',()=>{
  const settings=vi.fn();const template=macApplicationMenu(settings,vi.fn());
  const submenu=template[0].submenu as MenuItemConstructorOptions[];
  const item=submenu.find(i=>i.id==='loaderly-settings')!;
  expect(item.accelerator).toBe('Command+,');
  (item.click as ()=>void)();expect(settings).toHaveBeenCalledOnce();
  expect(template.some(i=>i.role==='editMenu')).toBe(true);
  expect(submenu.some(i=>i.role==='quit')).toBe(true);
 });
 it('offers paste and selection in an empty editable field and disables impossible edits',()=>{
  const menu=textContextMenu({isEditable:true,selectionText:'',editFlags:flags});
  expect(menu.find(i=>i.role==='paste')?.enabled).toBe(true);
  expect(menu.find(i=>i.role==='copy')?.enabled).toBe(false);
  expect(menu.find(i=>i.role==='cut')?.enabled).toBe(false);
  expect(menu.find(i=>i.role==='selectAll')?.enabled).toBe(true);
 });
 it('honors readonly and password edit flags without creating extra clipboard access',()=>{
  expect(textContextMenu({isEditable:false,selectionText:'read only',editFlags:{...flags,canCopy:true}})).toEqual([{role:'copy'}]);
  expect(textContextMenu({isEditable:false,selectionText:'',editFlags:flags})).toEqual([]);
  const menu=textContextMenu({isEditable:true,selectionText:'',editFlags:{...flags,canCopy:false,canCut:false}});
  expect(menu.find(i=>i.role==='copy')?.enabled).toBe(false);
  expect(menu.find(i=>i.role==='cut')?.enabled).toBe(false);
 });
});

