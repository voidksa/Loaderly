import { validDraft, type DesignDraft } from '../../shared/communityDrafts';
export const localDesignsKey = 'loaderly:local-designs:v1';
type LocalRecord = DesignDraft & { owner?:string };
function readRecords():LocalRecord[] {
 try { const value=JSON.parse(localStorage.getItem(localDesignsKey)??'[]');return Array.isArray(value)?value.flatMap(item=>{const valid=validDraft(item);return valid?[{...valid,owner:typeof item.owner==='string'?item.owner:undefined}]:[];}):[]; } catch {return [];}
}
// Account revisions are only actionable in the account that created them.
// The editor can still reuse settings from any locally stored design.
export function readLocalDesigns(owner?:string):DesignDraft[] {
 return readRecords().filter(item=>!owner||!item.owner||item.owner===owner).map(item=>({ ...item,revision:item.owner===owner&&owner?item.revision:0,published:item.owner===owner&&!!owner&&item.published }));
}
export function storeLocalDesign(draft:DesignDraft,owner?:string) {
 const valid=validDraft(draft);if(!valid)throw new Error('Give your design a name before saving.');
 const all=readRecords();
 const previous=all.find(item=>item.id===valid.id);
 if(all.length>=200&&!all.some(item=>item.id===valid.id))throw new Error('Your local library is full. Export or remove an older design first.');
 // Opening a design and saving account metadata must not count as editing it.
 // Otherwise a selection moves in the recent list underneath the pointer.
 const changed=!previous||previous.kind!==valid.kind||previous.name!==valid.name||previous.code!==valid.code;
 const importedDate=!previous&&valid.updatedAt&&!Number.isNaN(Date.parse(valid.updatedAt))?valid.updatedAt:undefined;
 const next={...valid,owner:valid.revision>0?owner:undefined,updatedAt:changed?(importedDate??new Date().toISOString()):previous.updatedAt};
 if(previous&&JSON.stringify(previous)===JSON.stringify(next))return;
 const records=changed?[next,...all.filter(item=>item.id!==valid.id)]:all.map(item=>item.id===valid.id?next:item);
 localStorage.setItem(localDesignsKey,JSON.stringify(records));
 window.dispatchEvent(new Event('loaderly:local-designs'));
}
export function removeLocalDesign(id:string) {
 localStorage.setItem(localDesignsKey,JSON.stringify(readRecords().filter(item=>item.id!==id)));
 window.dispatchEvent(new Event('loaderly:local-designs'));
}
export function exportDesignFile(name: string, kind: DesignDraft['kind'], code: string) {
  const url = URL.createObjectURL(new Blob([code], {type:'application/json'})), a = document.createElement('a'); a.href = url;
  a.download = `${name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').slice(0,80)||'Loaderly'}.${kind}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
