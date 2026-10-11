import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {readLocalDesigns,storeLocalDesign,removeLocalDesign,localDesignsKey} from './localDesigns';
import {encodeTheme,defaultAppearance} from '../../shared/app-preferences/appearance';
import type {DesignDraft} from '../../shared/communityDrafts';
let storage:Map<string,string>;
const draft=(id:string):DesignDraft=>({id:`design-${id.padStart(36,'0')}`,kind:'theme',name:'My theme',code:encodeTheme(defaultAppearance),revision:0,updatedAt:'',published:false});
beforeEach(()=>{storage=new Map();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});vi.stubGlobal('window',{dispatchEvent:vi.fn()});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('keeps multiple drafts and updates a selected draft without removing others',()=>{
 storeLocalDesign(draft('1'));storeLocalDesign(draft('2'));storeLocalDesign({...draft('1'),name:'Renamed'});
 expect(readLocalDesigns().map(d=>d.name)).toEqual(['Renamed','My theme']);
 removeLocalDesign(draft('1').id);expect(readLocalDesigns().map(d=>d.id)).toEqual([draft('2').id]);
});
it('keeps account revisions scoped to their owner while allowing settings reuse',()=>{
 storeLocalDesign({...draft('1'),revision:4,published:true},'alice');storeLocalDesign(draft('2'));
 expect(readLocalDesigns('alice').find(d=>d.id===draft('1').id)?.revision).toBe(4);
 expect(readLocalDesigns('bob').map(d=>d.id)).toEqual([draft('2').id]);
 expect(readLocalDesigns().find(d=>d.id===draft('1').id)).toMatchObject({revision:0,published:false});
});
it('tolerates damaged local data and does not silently discard designs when full',()=>{
 storage.set(localDesignsKey,'invalid');expect(readLocalDesigns()).toEqual([]);
 for(let i=0;i<200;i++)storeLocalDesign(draft(i.toString(16)));
 expect(()=>storeLocalDesign(draft('abcd'))).toThrow('full');expect(readLocalDesigns()).toHaveLength(200);
});
it('opening or re-saving an unchanged design keeps the same recent order and edit date',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T08:00:00Z'));
 storeLocalDesign(draft('1'));
 vi.setSystemTime(new Date('2026-10-11T09:00:00Z'));storeLocalDesign(draft('2'));
 const before=storage.get(localDesignsKey),selected=readLocalDesigns().find(item=>item.id===draft('1').id)!;
 vi.mocked(window.dispatchEvent).mockClear();
 vi.setSystemTime(new Date('2026-10-11T10:00:00Z'));
 storeLocalDesign(selected);storeLocalDesign(selected);
 expect(storage.get(localDesignsKey)).toBe(before);
 expect(readLocalDesigns().map(item=>item.id)).toEqual([draft('2').id,draft('1').id]);
 expect(window.dispatchEvent).not.toHaveBeenCalled();
});
it('account sync metadata does not move a design, while a real edit updates its recent position',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T08:00:00Z'));storeLocalDesign(draft('1'));
 vi.setSystemTime(new Date('2026-10-11T09:00:00Z'));storeLocalDesign(draft('2'));
 vi.setSystemTime(new Date('2026-10-11T10:00:00Z'));
 storeLocalDesign({...draft('1'),revision:1,published:true,updatedAt:'2026-10-11T10:00:00Z'},'alice');
 expect(readLocalDesigns('alice').map(item=>item.id)).toEqual([draft('2').id,draft('1').id]);
 expect(readLocalDesigns('alice')[1]).toMatchObject({revision:1,published:true,updatedAt:'2026-10-11T08:00:00.000Z'});
 storeLocalDesign({...readLocalDesigns('alice')[1],name:'Renamed'},'alice');
 expect(readLocalDesigns('alice')[0]).toMatchObject({id:draft('1').id,name:'Renamed',updatedAt:'2026-10-11T10:00:00.000Z'});
});
it('keeps the edit date of an account draft when first caching it locally',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T10:00:00Z'));
 storeLocalDesign({...draft('1'),revision:3,updatedAt:'2026-10-01T08:00:00Z'},'alice');
 expect(readLocalDesigns('alice')[0]).toMatchObject({revision:3,updatedAt:'2026-10-01T08:00:00Z'});
});
