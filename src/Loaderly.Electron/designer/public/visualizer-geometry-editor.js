import {shapeContours,shapeCurve,fitShape} from '/visualizer-engine.js';
import {constrainedPoint} from '/visualizer-shape-tools.js';
import {canvasSpace,reframeShape,boundedGroupDelta} from './visualizer-canvas-space.js';

export function geometryEditor({lab,get,patch,begin,end,draw,announce,t}){
 const $=q=>lab.querySelector(q),small=$('#v-path-canvas'),preview=$('.v-preview'),live=$('#v-canvas');
 const overlay=document.createElement('canvas');overlay.className='v-edit-overlay';overlay.tabIndex=0;overlay.setAttribute('aria-label',t('Edit shape in large preview','تعديل الشكل في المعاينة الكبيرة'));preview.append(overlay);
 const toolbar=document.createElement('div');toolbar.className='v-preview-tools';toolbar.innerHTML=[['view','Preview','معاينة'],['move','Move & resize','تحريك وحجم'],['points','Edit points','تعديل النقاط']].map(([id,en,ar])=>`<button type="button" class="secondary-button" data-edit-mode="${id}" aria-pressed="${id==='view'}">${t(en,ar)}</button>`).join('');preview.before(toolbar);
 const canvasHint=document.createElement('p');canvasHint.className='v-note v-edit-hint';canvasHint.hidden=true;canvasHint.textContent=t('Use the canvas to reshape your drawing. Set its final size and position with Move & resize.','استخدم مساحة الرسم لتعديل الشكل. اضبط حجمه وموضعه النهائيين من تحريك وحجم.');toolbar.after(canvasHint);
 const controls=document.createElement('div');controls.className='v-geometry-tools';controls.innerHTML=`<div class="v-tool-row"><button id="v-add-point" type="button" class="secondary-button" aria-pressed="false">${t('Add points','إضافة نقاط')}</button><button id="v-add-part" type="button" class="secondary-button">${t('Add a separate line','إضافة خط منفصل')}</button></div><label class="v-range"><span>${t('Drawing zoom','تكبير الرسم')}<output id="v-zoom-value">1×</output></span><input id="v-edit-zoom" type="range" min="1" max="6" step=".25" value="1" dir="ltr"></label><div class="v-tool-row"><button id="v-prev-point" type="button" class="secondary-button">${t('Previous point','النقطة السابقة')}</button><button id="v-next-point" type="button" class="secondary-button">${t('Next point','النقطة التالية')}</button></div><small>${t('Ctrl / ⌘ + click selects more points. Drag any selected point to move the group. Alt + click cycles overlapping points.','Ctrl / ⌘ مع الضغط لتحديد عدة نقاط. اسحب نقطة محددة لتحريك المجموعة. Alt مع الضغط للتنقّل بين النقاط المتداخلة.')}</small>`;small.parentElement.before(controls);
 let mode='view',part=0,selected=new Set(),last=-1,zoom=1,adding=false,drag,freeze,cycle=0;
 const key=(p,i)=>p+':'+i,entries=()=>shapeContours(get().shape).flatMap((p,j)=>p.points.map((point,i)=>({point,p:j,i,key:key(j,i)})));
 function reset(){selected.clear();last=-1;part=0;freeze=undefined;setMode('view');}
 function pointSpace(){const r=overlay.getBoundingClientRect();return canvasSpace(r.width,r.height,get().shape.aspect??1);}
 function setMode(next){
  if(next===mode)return;
  if(next==='points'&&get().style==='path'){
   const r=preview.getBoundingClientRect(),cr=live.getBoundingClientRect(),s=get(),fit=fitShape(s.shape,cr.width,cr.height);
   const aspect=Math.max(s.shape.paths?.length ? .05 : .25,Math.min(s.shape.paths?.length?24:4,(r.width-24)/(r.height-24)));
   const to=canvasSpace(r.width,r.height,aspect),from={x:cr.left-r.left+fit.x,y:cr.top-r.top+fit.y,sx:fit.scale*(s.shape.aspect??1),sy:fit.scale};
   mode=next;preview.classList.add('v-editing-points');patch({shape:reframeShape(s.shape,from,to)});
  }else{mode=next;preview.classList.remove('v-editing-points');}
  toolbar.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.editMode===mode)));
  canvasHint.hidden=mode!=='points';
  refresh();draw();
 }
 function transform(surface){
  if(drag?.kind==='points'&&drag.surface===surface&&surface===small)return drag.b;
  const s=get(),aspect=s.shape.aspect??1,r=surface.getBoundingClientRect();
  if(surface===overlay){if(mode==='points')return pointSpace();const cr=live.getBoundingClientRect(),f=freeze||fitShape(s.shape,cr.width,cr.height);return {x:cr.left-r.left+f.x,y:cr.top-r.top+f.y,sx:f.scale*aspect,sy:f.scale};}
  const contour=shapeContours(s.shape)[part]||s.shape,focus=$('#v-part-focus').checked&&s.shape.paths;
  let minX=0,maxX=1,minY=0,maxY=1;if(focus){minX=Math.min(...contour.points.map(p=>p[0]));maxX=Math.max(...contour.points.map(p=>p[0]));minY=Math.min(...contour.points.map(p=>p[1]));maxY=Math.max(...contour.points.map(p=>p[1]));}
  const base=Math.min((r.width-36)/(Math.max(.05,maxX-minX)*aspect),(r.height-36)/Math.max(.05,maxY-minY)),scale=base*zoom;
  const focusPoint=last>=0?contour.points[last]:null,cx=zoom>1&&focusPoint?focusPoint[0]:(minX+maxX)/2,cy=zoom>1&&focusPoint?focusPoint[1]:(minY+maxY)/2;
  return {x:r.width/2-cx*scale*aspect,y:r.height/2-cy*scale,sx:scale*aspect,sy:scale};
 }
 const xy=(point,b)=>[b.x+point[0]*b.sx,b.y+point[1]*b.sy];
 function drawSurface(surface){const r=surface.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(devicePixelRatio,2);surface.width=Math.round(r.width*dpr);surface.height=Math.round(r.height*dpr);const c=surface.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);
  if(surface===overlay&&mode==='view')return;
  const styles=getComputedStyle(lab),s=get(),b=transform(surface);
  if(surface===overlay&&mode==='move'){const cr=live.getBoundingClientRect(),x=cr.left-r.left,y=cr.top-r.top;c.strokeStyle=styles.getPropertyValue('--green');c.lineWidth=1.5;c.setLineDash([6,4]);c.strokeRect(x,y,cr.width,cr.height);c.setLineDash([]);c.fillStyle=c.strokeStyle;for(const xx of [x,x+cr.width])for(const yy of [y,y+cr.height])c.fillRect(xx-5,yy-5,10,10);return;}
  if(s.style!=='path')return;
  if(surface===small){c.strokeStyle=styles.getPropertyValue('--line');c.lineWidth=1;for(let i=0;i<=10;i++){const x=b.x+i/10*b.sx,y=b.y+i/10*b.sy;c.beginPath();c.moveTo(x,b.y);c.lineTo(x,b.y+b.sy);c.moveTo(b.x,y);c.lineTo(b.x+b.sx,y);c.stroke();}}
  shapeContours(s.shape).forEach((p,j)=>{if(surface===small&&$('#v-part-focus').checked&&s.shape.paths&&j!==part)return;c.beginPath();shapeCurve(p).forEach((pt,i)=>{const [x,y]=xy(pt,b);if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.lineWidth=1.2;c.strokeStyle=j===part?styles.getPropertyValue('--text'):styles.getPropertyValue('--muted');c.globalAlpha=surface===overlay?.45:.75;c.stroke();c.globalAlpha=1;
   p.points.forEach((pt,i)=>{const [x,y]=xy(pt,b),on=selected.has(key(j,i));c.beginPath();c.arc(x,y,on?5.5:3.5,0,Math.PI*2);c.fillStyle=on?'#77bfa9':styles.getPropertyValue('--surface');c.fill();c.strokeStyle=styles.getPropertyValue('--text');c.stroke();if(on&&selected.size===1){c.fillStyle=styles.getPropertyValue('--text');c.font='11px sans-serif';c.fillText(String(i+1),x+9,y-9);}});
  });
 }
 function refresh(){const s=get(),paths=shapeContours(s.shape);if(s.style!=='path'&&mode==='points'){setMode('view');return;}part=Math.min(part,paths.length-1);overlay.hidden=mode==='view';overlay.style.cursor=mode==='move'?'move':'crosshair';$('#v-parts').hidden=!s.shape.paths;$('#v-part-label').textContent=t('Part ','الجزء ')+(part+1)+' / '+paths.length;$('#v-point-count').textContent=selected.size?t('Selected: ','المحدد: ')+selected.size:paths[part].points.length+' '+t('points','نقطة');$('#v-remove').disabled=!selected.size;$('#v-part-delete').disabled=paths.length<2;lab.querySelectorAll('[data-v-path]').forEach(el=>el.checked=el.dataset.vPath==='mirror'?s.shape.mirror:paths[part][el.dataset.vPath]);drawSurface(small);drawSurface(overlay);}
 function replace(paths){const s=get().shape;if(s.paths||paths.length>1)return {...s,paths,points:paths[0].points.slice(0,64)};return {...s,...paths[0]};}
 function remove(){if(!selected.size)return;const paths=shapeContours(get().shape).map((p,j)=>{const points=p.points.filter((_,i)=>!selected.has(key(j,i)));return points.length>=2?{...p,points}:p;});patch({shape:replace(paths)});selected.clear();refresh();}
 function cyclePoint(delta){const p=shapeContours(get().shape)[part];last=(last+delta+p.points.length)%p.points.length;selected=new Set([key(part,last)]);refresh();}
 function down(e,surface){if(e.button!==0)return;e.preventDefault();surface.focus({preventScroll:true});const r=surface.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
  if(surface===overlay&&mode==='move'){const cr=live.getBoundingClientRect(),corners=[[cr.left,cr.top],[cr.right,cr.top],[cr.left,cr.bottom],[cr.right,cr.bottom]],resize=corners.some(([x,y])=>Math.hypot(e.clientX-x,e.clientY-y)<18);begin();drag={kind:resize?'resize':'move',x:e.clientX,y:e.clientY,settings:structuredClone(get()),surface};surface.setPointerCapture(e.pointerId);return;}
  if(get().style!=='path')return;const b=transform(surface),candidates=entries().filter(p=>!(surface===small&&$('#v-part-focus').checked&&get().shape.paths&&p.p!==part)).map(p=>({...p,d:Math.hypot(...xy(p.point,b).map((n,i)=>n-(i?py:px)))})).filter(p=>p.d<=11).sort((a,b)=>a.d-b.d);
  if(candidates.length){const hit=candidates[e.altKey?(cycle++%candidates.length):0];part=hit.p;last=hit.i;if(e.ctrlKey||e.metaKey){if(selected.has(hit.key))selected.delete(hit.key);else selected.add(hit.key);refresh();return;}if(!selected.has(hit.key))selected=new Set([hit.key]);
   begin();drag={kind:'points',x:e.clientX,y:e.clientY,b,shape:structuredClone(get().shape),surface};surface.setPointerCapture(e.pointerId);refresh();
  }else if(adding){const paths=structuredClone(shapeContours(get().shape)),p=paths[part];if(p.points.length>=(get().shape.paths?256:64)){announce(t('This part has reached its point limit.','وصل هذا الجزء للحد الأقصى من النقاط.'));return;}const raw=[(px-b.x)/b.sx,(py-b.y)/b.sy];let at=0,best=Infinity;for(let i=0;i<(p.closed?p.points.length:p.points.length-1);i++){const a=xy(p.points[i],b),z=xy(p.points[(i+1)%p.points.length],b),dx=z[0]-a[0],dy=z[1]-a[1],q=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(px-a[0]-q*dx,py-a[1]-q*dy);if(d<best){best=d;at=i+1;}}p.points.splice(at,0,constrainedPoint(raw,$('#v-snap').checked));selected=new Set([key(part,at)]);last=at;patch({shape:replace(paths)});}
  else{selected.clear();refresh();}
 }
 function move(e){if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(drag.kind!=='points'){const r=preview.getBoundingClientRect(),s=drag.settings;if(drag.kind==='move')patch({positionX:s.positionX+dx/r.width*100,positionY:s.positionY+dy/r.height*100});else{const cx=r.left+r.width*s.positionX/100,cy=r.top+r.height*s.positionY/100;patch({width:Math.abs(e.clientX-cx)*200/r.width,height:Math.abs(e.clientY-cy)*200/r.height});}return;}
  const paths=structuredClone(shapeContours(drag.shape)),first=[...selected][0]?.split(':').map(Number);if(!first)return;
  let delta=[dx/drag.b.sx,dy/drag.b.sy],origin=paths[first[0]].points[first[1]],anchor=paths[first[0]].points[first[1]?first[1]-1:1];const next=constrainedPoint([origin[0]+delta[0],origin[1]+delta[1]],$('#v-snap').checked,anchor,e.shiftKey,drag.shape.aspect??1);delta=[next[0]-origin[0],next[1]-origin[1]];
  const chosen=[...selected].map(k=>k.split(':').map(Number)),pts=chosen.map(([p,i])=>paths[p].points[i]);delta=boundedGroupDelta(pts,delta);chosen.forEach(([p,i])=>paths[p].points[i]=paths[p].points[i].map((n,k)=>n+delta[k]));patch({shape:replace(paths)});
 }
 function up(e){if(!drag)return;const surface=drag.surface;drag=undefined;freeze=undefined;end();if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId);draw();refresh();}
 for(const surface of [small,overlay]){surface.addEventListener('pointerdown',e=>down(e,surface));surface.addEventListener('pointermove',move);surface.addEventListener('pointerup',up);surface.addEventListener('pointercancel',up);surface.addEventListener('keydown',e=>{if(e.defaultPrevented)return;if((e.ctrlKey||e.metaKey)&&e.code==='KeyA'){e.preventDefault();selected=new Set(entries().map(p=>p.key));refresh();return;}if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}else if(e.key==='Enter'){e.preventDefault();cyclePoint(e.shiftKey?-1:1);}else if(e.key==='Escape'){selected.clear();refresh();}else if(e.key.startsWith('Arrow')){e.preventDefault();if(!selected.size)cyclePoint(1);const paths=structuredClone(shapeContours(get().shape)),axis=['ArrowLeft','ArrowRight'].includes(e.key)?0:1,delta=(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)*(e.shiftKey?.05:.005);const chosen=[...selected].map(k=>k.split(':').map(Number)),points=chosen.map(([p,i])=>paths[p].points[i]),step=boundedGroupDelta(points,axis===0?[delta,0]:[0,delta]);for(const [p,i] of chosen)paths[p].points[i][axis]+=step[axis];patch({shape:replace(paths)});}});}
 toolbar.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.editMode)));
 $('#v-remove').addEventListener('click',remove);$('#v-prev-point').addEventListener('click',()=>cyclePoint(-1));$('#v-next-point').addEventListener('click',()=>cyclePoint(1));$('#v-edit-zoom').addEventListener('input',e=>{zoom=Number(e.target.value);$('#v-zoom-value').textContent=zoom+'×';refresh();});$('#v-part-focus').addEventListener('change',refresh);
 $('#v-add-point').addEventListener('click',e=>{adding=!adding;e.currentTarget.setAttribute('aria-pressed',String(adding));});
 $('#v-add-part').addEventListener('click',()=>{const paths=structuredClone(shapeContours(get().shape));if(paths.length>=96)return;paths.push({points:[[.15,.15],[.85,.15]],closed:false,smooth:false});part=paths.length-1;selected.clear();patch({shape:replace(paths)});});
 for(const [id,delta] of [['v-part-prev',-1],['v-part-next',1]])$('#'+id).addEventListener('click',()=>{part=(part+delta+shapeContours(get().shape).length)%shapeContours(get().shape).length;selected.clear();last=-1;refresh();});
 $('#v-part-delete').addEventListener('click',()=>{const paths=shapeContours(get().shape).filter((_,i)=>i!==part);if(!paths.length)return;selected.clear();part=0;patch({shape:replace(paths)});});
 lab.querySelectorAll('[data-v-path]').forEach(input=>input.addEventListener('change',()=>{const field=input.dataset.vPath;if(field==='mirror')patch({shape:{...get().shape,mirror:input.checked}});else{const paths=structuredClone(shapeContours(get().shape));paths[part][field]=input.checked;patch({shape:replace(paths)});}}));
 new ResizeObserver(refresh).observe(preview);
 return {refresh,reset,draw:()=>drawSurface(overlay),fit:()=>{if(mode!=='points')return freeze;const b=pointSpace();return {x:b.x,y:b.y,scale:b.sy,reach:Math.min(live.clientWidth,live.clientHeight)*.22*(get().shape.amplitude??.5)};}};
}
