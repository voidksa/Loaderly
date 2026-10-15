import { FolderOpen, Check } from 'lucide-react';

export function StudioOutputFolder({ ar, value, busy, onChoose }: { ar:boolean; value:string; busy:boolean; onChoose:()=>void }) {
  return <section className="studio-output-folder">
    <div><strong>{ar?'مكان حفظ النتائج':'Save results to'}</strong><p>{value?<bdi dir="auto">{value}</bdi>:ar?'اختر مجلدًا لحفظ الملفات الناتجة. الملف المفتوح في المحرر هو مصدر المعالجة.':'Choose a folder for the new files. The media open in the editor is the source.'}</p></div>
    <button type="button" className="button secondary" disabled={busy} onClick={onChoose}>{value?<Check size={16}/>:<FolderOpen size={16}/>} {value?(ar?'تغيير المجلد':'Change folder'):(ar?'اختيار مجلد الحفظ':'Choose output folder')}</button>
  </section>;
}
