import {decorateDesigner} from './designer-icons.js';
import {copyText} from './copy-feedback.js';
import {textShape} from '/visualizer-type-tools.js';
import {geometryEditor} from '/visualizer-geometry-editor.js';
import {letterShape,straightShape,rotateShape,constrainedPoint,historyCommand} from '/visualizer-shape-tools.js';
import {defaultVisualizer,normalizeVisualizer,encodeVisualizer,decodeVisualizer,visualizerPresets,visualizerShapePresets,drawVisualizer,shapeCurve} from '/visualizer-engine.js';
const lab=document.querySelector('.visualizer-lab');
if(lab) init();
function init(){
  const ar=document.documentElement.lang==='ar',t=(en,arabic)=>ar?arabic:en,$=selector=>lab.querySelector(selector),all=selector=>[...lab.querySelectorAll(selector)];
  const intro=$('.v-intro'), expand=document.createElement('button');expand.type='button';expand.className='secondary-button v-expand';expand.textContent=t('Expand designer','توسيع المصمّم');intro.append(expand);
  const workspace=document.createElement('div');workspace.className='v-workbench';const previewPane=document.createElement('div');previewPane.className='v-preview-pane';const controlPane=document.createElement('div');controlPane.className='v-control-pane';controlPane.tabIndex=0;controlPane.setAttribute('aria-label',t('Designer settings','إعدادات المصمّم'));
  const audioNote=$('.v-note');
  for(const selector of ['.v-preview','.v-playbar','#v-media','#v-audio-controls'])previewPane.append($(selector));previewPane.append(audioNote);
  for(const selector of ['.v-presets','.v-history','.v-tabs','#v-panel-shape','#v-panel-colors','#v-panel-layout','#v-panel-text','#v-status','.v-share'])controlPane.append($(selector));workspace.append(previewPane,controlPane);intro.after(workspace);
  // Separate shape selection, lettering and point editing instead of one long form.
  const shapePanel=$('#v-panel-shape'),shapeTabs=document.createElement('div');shapeTabs.className='v-shape-tabs';shapeTabs.setAttribute('role','tablist');shapeTabs.setAttribute('aria-label',t('Shape tools','أدوات الشكل'));
  const shapeGroups=[['looks',t('Starting shapes','أشكال جاهزة'),[...shapePanel.children].filter(node=>!node.matches('.v-drawing-starters,#v-shape-editor'))],['letters',t('Lines & letters','خطوط وحروف'),[$('.v-drawing-starters')]],['points',t('Edit points','تعديل النقاط'),[$('#v-shape-editor')]]];
  shapePanel.prepend(shapeTabs);
  for(const [id,label,nodes] of shapeGroups){const button=document.createElement('button');button.type='button';button.id='v-shape-tab-'+id;button.textContent=label;button.setAttribute('role','tab');button.dataset.shapePage=id;button.setAttribute('aria-controls','v-shape-page-'+id);shapeTabs.append(button);const panel=document.createElement('div');panel.id='v-shape-page-'+id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);nodes.forEach(node=>panel.append(node));if(id==='points'){const hint=document.createElement('p');hint.className='v-point-empty v-note';hint.textContent=t('Choose a custom shape or create letters first, then edit their points here.','اختر شكلًا مخصصًا أو أنشئ حروفًا أولًا، ثم عدّل نقاطها هنا.');panel.prepend(hint);}shapePanel.append(panel);button.addEventListener('click',()=>selectShapePage(id));}
  function selectShapePage(id){for(const button of shapeTabs.children){const on=button.dataset.shapePage===id;button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;$('#v-shape-page-'+button.dataset.shapePage).hidden=!on;}requestAnimationFrame(()=>geometry?.refresh());}
  shapeTabs.addEventListener('keydown',event=>{const buttons=[...shapeTabs.children],index=buttons.indexOf(document.activeElement);if(index<0)return;let next=index;if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else if(event.key==='ArrowRight')next=(index+(ar?-1:1)+buttons.length)%buttons.length;else if(event.key==='ArrowLeft')next=(index+(ar?1:-1)+buttons.length)%buttons.length;else return;event.preventDefault();buttons[next].click();buttons[next].focus();});
  selectShapePage('looks');
  const placeholder=document.createComment('visualizer designer'),dialog=document.createElement('dialog');dialog.className='v-designer-dialog';dialog.setAttribute('aria-label',t('Visualizer designer','مصمّم طيف الصوت'));document.body.append(dialog);let pagePosition=0;
  function collapse(){if(!dialog.open)return;dialog.close();placeholder.replaceWith(lab);document.documentElement.classList.remove('v-designer-open');expand.textContent=t('Expand designer','توسيع المصمّم');window.scrollTo({top:pagePosition,behavior:'instant'});expand.focus({preventScroll:true});}
  expand.addEventListener('click',()=>{if(dialog.open){collapse();return;}pagePosition=scrollY;lab.before(placeholder);dialog.append(lab);dialog.showModal();document.documentElement.classList.add('v-designer-open');expand.textContent=t('Back to guide','العودة للدليل');expand.focus({preventScroll:true});});dialog.addEventListener('cancel',e=>{e.preventDefault();collapse();});
  const status=$('#v-status'),canvas=$('#v-canvas'),preview=$('.v-preview'),display=$('.v-display'),media=$('#v-media'),pathCanvas=$('#v-path-canvas'),code=$('#v-code');
  let settings=normalizeVisualizer(defaultVisualizer),selected=-1,history=[],future=[],grouping=false,groupSaved=false,dragging=false,activePoint=-1,blobUrl,audioUrl,audioContext,analyser,sourceNode,frame=0,visible=false;
  let pathVisible=false,geometry,codeTimer,typeSignature;
  document.body.append(media); // Keep the playing element connected when the designer moves into its dialog.
  let typeFont="modern",customFont;
  let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spectrum=new Uint8Array(1024),waveform=new Uint8Array(2048),clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  try{const saved=decodeVisualizer(localStorage.getItem('loaderly-visualizer-designer')||'');if(saved)settings=saved;}catch{}
  function announce(message){status.textContent=message;}
  function refresh(except){
    settings=normalizeVisualizer(settings);
    code.textContent=encodeVisualizer(settings);clearTimeout(codeTimer);codeTimer=setTimeout(()=>code.dispatchEvent(new Event('code-update')),180);
    try{localStorage.setItem('loaderly-visualizer-designer',code.textContent);}catch{}
    all('[data-v]').forEach(input=>{const value=settings[input.dataset.v];if(input===except)return;if(input.type==='checkbox')input.checked=value;else input.value=value;});
    all('[data-output]').forEach(el=>el.textContent=settings[el.dataset.output]);
    all('[data-v-color]').forEach(input=>{const key=input.dataset.vColor;if(input!==except){input.value=settings[key].toUpperCase();input.removeAttribute('aria-invalid');input.closest('.theme-color-field').querySelector('.v-color-error').hidden=true;} $('[data-v-picker="'+key+'"]').style.setProperty('--swatch',settings[key]);});
    all('[data-v-path]').forEach(input=>input.checked=settings.shape[input.dataset.vPath]);
    $('#v-shape-editor').hidden=settings.style!=='path';
    $('#v-style-value').textContent=$('[data-v-style="'+settings.style+'"] span').textContent;all('[data-v-style]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.vStyle===settings.style)));
    $('#v-amplitude').value=settings.shape.amplitude;$('#v-amplitude-value').textContent=Math.round(settings.shape.amplitude*100)+'%';
    const top=clamp(settings.positionY,settings.height/2,100-settings.height/2);
    display.style.left=clamp(settings.positionX,settings.width/2,100-settings.width/2)+'%';display.style.width=settings.width+'%';display.style.height=settings.height+'%';display.style.top=top+'%';display.style.color=settings.textColor;
    preview.style.background=settings.backgroundGradient?'linear-gradient(135deg,'+settings.background+','+settings.backgroundEnd+')':settings.background;
    $('#v-title').hidden=!settings.showTitle;$('#v-title').textContent=settings.title||t('Your track title','عنوان مقطعك');$('#v-title').style.fontSize=settings.textSize+'px';
    $('#v-subtitle').hidden=!settings.showSubtitle;$('#v-subtitle').textContent=settings.subtitle;
    $('#v-badge').hidden=!settings.showBadges;$('#v-badge').textContent=t('Visualizer','طيف الصوت');
    $('#v-undo').disabled=!history.length;$('#v-redo').disabled=!future.length;
    all('[data-v-stroke]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vStroke===(settings.shape.stroke||'bars'))));$('#v-thickness').value=settings.shape.thickness??2;$('#v-thickness-value').textContent=settings.shape.thickness??2;
    $('[data-v=count]').max=settings.shape.paths?1200:160;
    const signature=JSON.stringify(settings.shape.typography);if(signature!==typeSignature){typeSignature=signature;const type=settings.shape.typography;if(type){$('#v-word').value=type.text;typeFont=type.font;all('[data-type]').forEach(el=>{el.value=type[el.dataset.type];$('[data-type-output='+el.dataset.type+']').textContent=el.value;});updateTypeButtons();}}
    if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(new Blob([code.textContent],{type:'application/json'}));$('#v-download').href=blobUrl;
    geometry?.refresh();draw();
  }
  function patch(change,input){const next=normalizeVisualizer({...settings,...change});if(JSON.stringify(next)!==JSON.stringify(settings)){if(!grouping||!groupSaved){saveHistory();groupSaved=true;}settings=next;}refresh(input);}
  function beginEdit(){grouping=true;groupSaved=false;}
  function endEdit(){grouping=false;groupSaved=false;}
  lab.addEventListener('pointerdown',e=>{if(e.target.matches('input[type=range],.color-plane,.color-plane *'))beginEdit();},true);
  window.addEventListener('pointerup',endEdit);window.addEventListener('pointercancel',endEdit);
  lab.addEventListener('focusin',e=>{if(e.target.matches('input[type=text],input[type=number],textarea'))beginEdit();});
  lab.addEventListener('focusout',endEdit);
  lab.addEventListener('keydown',e=>{if(e.defaultPrevented)return;const editing=e.target.closest('textarea,[contenteditable=true],input:not([type=range]):not([type=checkbox])');if(editing)return;const command=historyCommand(e);if(command){e.preventDefault();e.stopPropagation();command==='undo'?undo():redo();}else if(e.key.startsWith('Arrow')&&!e.repeat)beginEdit();},true);
  lab.addEventListener('keyup',e=>{if(e.key.startsWith('Arrow'))endEdit();});
  all('[data-v]').forEach(input=>input.addEventListener('input',()=>patch({[input.dataset.v]:input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value},input)));
  setupStyleMenu();
  $('#v-amplitude').addEventListener('input',e=>patch({shape:{...settings.shape,amplitude:Number(e.target.value)}}));
  all('[data-v-preset]').forEach(button=>button.addEventListener('click',()=>{selected=-1;geometry?.reset();patch(visualizerPresets.find(p=>p.id===button.dataset.vPreset).settings);announce(t('Look applied.','طُبّق المظهر.'));}));
  all('[data-v-shape]').forEach(button=>button.addEventListener('click',()=>{geometry?.reset();patch({style:'path',shape:visualizerShapePresets.find(p=>p.id===button.dataset.vShape).shape,height:72,showTitle:false});selected=-1;refresh();}));

  const tabs=all('[data-v-tab]');function setTab(button){tabs.forEach(tab=>{const on=tab===button;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;$('#v-panel-'+tab.dataset.vTab).hidden=!on;});geometry?.refresh();}
  tabs.forEach((button,index)=>{button.addEventListener('click',()=>setTab(button));button.addEventListener('keydown',e=>{let next;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(['ArrowLeft','ArrowRight'].includes(e.key))next=(index+((e.key==='ArrowRight')!==ar?1:-1)+tabs.length)%tabs.length;if(next!==undefined){e.preventDefault();setTab(tabs[next]);tabs[next].focus();}});});
  function saveHistory(){history.push(structuredClone(settings));if(history.length>80)history.shift();future=[];}
  function undo(){if(!history.length)return;endEdit();future.push(structuredClone(settings));settings=history.pop();selected=-1;geometry?.reset();refresh();announce(t('Change undone.','تم التراجع عن التعديل.'));}
  function redo(){if(!future.length)return;endEdit();history.push(structuredClone(settings));settings=future.pop();selected=-1;geometry?.reset();refresh();announce(t('Change restored.','أُعيد التعديل.'));}
  $('#v-undo').addEventListener('click',undo);$('#v-redo').addEventListener('click',redo);
  function startShape(shape,finish={}){selected=-1;geometry?.reset();patch({style:'path',shape,height:72,showTitle:false,...finish});}
  $('#v-new-path').addEventListener('click',()=>startShape(straightShape(false,settings.shape)));
  $('#v-vertical-path').addEventListener('click',()=>startShape(straightShape(true,settings.shape)));
  $('#v-rotate-left').addEventListener('click',()=>patch({shape:rotateShape(settings.shape,false)}));
  $('#v-rotate-right').addEventListener('click',()=>patch({shape:rotateShape(settings.shape,true)}));
  // These forms only generate local geometry; never navigate or send a form.
  // Handle clicks directly so the desktop sandbox can keep form submission disabled.
  function localForm(selector,handler){const form=$(selector),button=form.querySelector('button[type=submit]');const run=event=>{event.preventDefault();if(!button.disabled&&form.reportValidity())void handler({preventDefault(){},submitter:button});};button.addEventListener('click',run);form.addEventListener('submit',run);}
  localForm('#v-letter-form',e=>{e.preventDefault();endEdit();const shape=letterShape($('#v-letter').value,settings.shape);if(!shape)return;$('#v-letter').value=$('#v-letter').value.toUpperCase();startShape(shape,{count:112,gap:2,roundness:2,glow:Math.min(settings.glow,6)});announce(t('Letter created. Drag its points to make it yours.','أُنشئ الحرف. اسحب نقاطه لتخصيصه.'));});
  function updateTypeButtons(){all('[data-v-font]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vFont===typeFont)));$('#v-font-name').textContent=typeFont==='custom'?(customFont?t('Your font','خطك'):t('Upload your font again to recreate text.','أعد اختيار خطك لإعادة إنشاء النص.')):'';}
  all('[data-v-font]').forEach(b=>b.addEventListener('click',()=>{typeFont=b.dataset.vFont;updateTypeButtons();}));
  all('[data-type]').forEach(el=>el.addEventListener('input',()=>{$('[data-type-output='+el.dataset.type+']').textContent=el.value;}));
  $('#v-font-upload').addEventListener('click',()=>$('#v-font-file').click());
  $('#v-font-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>5*1024*1024)throw Error();const face=await new FontFace('LoaderlyUserFont',await file.arrayBuffer()).load();if(customFont)document.fonts.delete(customFont);customFont=face;document.fonts.add(face);typeFont='custom';updateTypeButtons();$('#v-type-status').textContent=t('Font ready. Create the text shape to use it. The font file stays on this device.','الخط جاهز. أنشئ الشكل لاستخدامه. يبقى ملف الخط على جهازك.');}catch{$('#v-type-status').textContent=t('Choose a valid font file under 5 MB.','اختر ملف خط صالحًا بحجم أقل من 5 ميغابايت.');}});
  localForm('#v-word-form',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;$('#v-type-status').textContent=t('Creating shape…','جارٍ إنشاء الشكل…');try{if(typeFont==='custom'&&!customFont)throw Error('font');const options={text:$('#v-word').value,font:typeFont};all('[data-type]').forEach(el=>options[el.dataset.type]=Number(el.value));const shape=await textShape(options,settings.shape);if(!shape)throw Error();endEdit();startShape(shape,{count:Math.min(1200,Math.max(280,shape.paths.reduce((n,p)=>n+p.points.length,0)*2)),width:88,height:72,gap:1,roundness:2,glow:Math.min(settings.glow,6)});$('#v-type-status').textContent=t('Ready. Change its finish, move it in the preview, or edit its points.','جاهز. غيّر طريقة الرسم، أو حرّكه في المعاينة، أو عدّل نقاطه.');}catch(error){$('#v-type-status').textContent=error.message==='font'?t('Upload your font again before recreating the text.','أعد اختيار خطك قبل إعادة إنشاء النص.'):t('Try a shorter phrase or a simpler font. Your current shape was kept.','جرّب عبارة أقصر أو خطًا أبسط. بقي شكلك الحالي كما هو.');}finally{button.disabled=false;}});
  all('[data-v-stroke]').forEach(b=>b.addEventListener('click',()=>patch({shape:{...settings.shape,stroke:b.dataset.vStroke}})));
  $('#v-thickness').addEventListener('input',e=>patch({shape:{...settings.shape,thickness:Number(e.target.value)}}));
  geometry=geometryEditor({lab,get:()=>settings,patch,begin:beginEdit,end:endEdit,draw,announce,t});
  decorateDesigner(lab);
  function draw(time=performance.now()){
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;const dpr=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    if(audioUrl&&analyser&&!media.paused){analyser.smoothingTimeConstant=settings.smoothing;analyser.getByteFrequencyData(spectrum);analyser.getByteTimeDomainData(waveform);}else if(!audioUrl&&playing){for(let i=0;i<spectrum.length;i++)spectrum[i]=clamp((.35+.22*Math.sin(i*.071+time*.002)+.18*Math.cos(i*.03-time*.0013))*Math.exp(-i/900)*255,0,255);for(let i=0;i<waveform.length;i++)waveform[i]=128+Math.sin(i*.02+time*.003)*Math.sin(i*.002+time*.001)*60;}else{spectrum.fill(0);waveform.fill(128);}drawVisualizer(ctx,width,height,settings,spectrum,waveform,geometry?.fit());geometry?.draw();
    const mini=$('#v-mini-canvas'),mw=mini.clientWidth,mh=mini.clientHeight;if(mw&&mh){if(mini.width!==Math.round(mw*dpr)||mini.height!==Math.round(mh*dpr)){mini.width=Math.round(mw*dpr);mini.height=Math.round(mh*dpr);}const mc=mini.getContext('2d');mc.setTransform(dpr,0,0,dpr,0,0);mc.clearRect(0,0,mw,mh);mini.style.background=preview.style.background;drawVisualizer(mc,mw,mh,settings,spectrum,waveform);}

  }
  function playLabel(){const on=audioUrl?!media.paused:playing;$('#v-play').textContent=on?t('Pause preview','إيقاف المعاينة'):t('Play preview','تشغيل المعاينة');$('#v-play').setAttribute('aria-pressed',String(on));}
  $('#v-play').addEventListener('click',async()=>{try{if(audioUrl){if(media.paused){await audioContext.resume();await media.play();}else media.pause();}else playing=!playing;playLabel();draw();}catch{announce(t('This audio could not be played. Try another file.','تعذّر تشغيل هذا الصوت. جرّب ملفًا آخر.'));}});
  media.addEventListener('play',()=>{audioContext?.resume();playLabel();announce(t('Playing your audio.','جارٍ تشغيل صوتك.'));});media.addEventListener('pause',()=>{playLabel();draw();});media.addEventListener('ended',()=>{playLabel();draw();announce(t('Audio finished. Press Play to replay.','انتهى الصوت. اضغط تشغيل لإعادته.'));});media.addEventListener('error',()=>announce(t('This audio format could not be played. Try MP3 or WAV.','تعذّر تشغيل هذه الصيغة. جرّب MP3 أو WAV.')));
  try{media.loop=localStorage.getItem('loaderly-visualizer-loop')==='true';}catch{}
  $('#v-loop').setAttribute('aria-pressed',String(media.loop));$('#v-loop').addEventListener('click',()=>{media.loop=!media.loop;$('#v-loop').setAttribute('aria-pressed',String(media.loop));try{localStorage.setItem('loaderly-visualizer-loop',String(media.loop));}catch{}announce(media.loop?t('Audio repeat on.','تكرار الصوت مفعّل.'):t('Audio repeat off.','تكرار الصوت متوقف.'));});
  $('#v-audio').addEventListener('click',()=>$('#v-audio-file').click());
  $('#v-audio-file').addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';if(!file)return;media.pause();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(file);media.src=audioUrl;$('#v-audio-controls').hidden=false;$('#v-demo').hidden=false;$('#v-loop').hidden=false;$('#v-source').textContent=t('Your audio · local preview','صوتك · معاينة محلية');if(!audioContext){audioContext=new AudioContext();sourceNode=audioContext.createMediaElementSource(media);analyser=audioContext.createAnalyser();analyser.fftSize=2048;sourceNode.connect(analyser).connect(audioContext.destination);}playLabel();announce(t('Audio loaded. Press Play to preview it.','أُضيف الصوت. اضغط تشغيل لمعاينته.'));});
  $('#v-demo').addEventListener('click',()=>{media.pause();media.removeAttribute('src');media.load();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=undefined;$('#v-audio-controls').hidden=true;$('#v-demo').hidden=true;$('#v-loop').hidden=true;$('#v-source').textContent=t('Demo motion · silent','حركة تجريبية · دون صوت');playLabel();draw();});
  function animate(time){frame=requestAnimationFrame(animate);if((visible||pathVisible||dialog.open)&&!document.hidden&&(playing||(audioUrl&&!media.paused)))draw(time);}
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)draw();}).observe(preview);
  new IntersectionObserver(entries=>{pathVisible=entries[0].isIntersecting;if(pathVisible)draw();}).observe(pathCanvas);
  new ResizeObserver(()=>{geometry?.refresh();draw();}).observe(preview);new ResizeObserver(()=>geometry?.refresh()).observe(pathCanvas);
  new MutationObserver(()=>geometry?.refresh()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  async function copy(){const copied=await copyText($('#v-copy'),encodeVisualizer(settings));if(copied){announce(t('Look copied. Paste it into Loaderly or share it with someone.','نُسخ المظهر. الصقه في Loaderly أو شاركه مع الآخرين.'));}else if(copied===false){$('.v-code-details').open=true;const r=document.createRange();r.selectNodeContents(code);const selection=getSelection();selection.removeAllRanges();selection.addRange(r);announce(t('Code selected. Press Ctrl+C to copy.','حُدد الكود. استخدم Ctrl+C لنسخه.'));}}
  $('#v-copy').addEventListener('click',copy);
  function apply(text){const value=decodeVisualizer(text);if(!value){announce(t('This is not a valid Loaderly visualizer code. Your current look was kept.','هذا الكود غير صالح لطيف Loaderly. بقي مظهرك الحالي كما هو.'));return;}endEdit();selected=-1;geometry?.reset();patch(value);announce(t('Look imported. You can now edit it.','استُورد المظهر. يمكنك تعديله الآن.'));}
  $('#v-apply').addEventListener('click',()=>apply($('#v-import-code').value));$('#v-import').addEventListener('click',()=>$('#v-import-file').click());$('#v-import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>320000){announce(t('Choose a visualizer JSON file under 320 KB.','اختر ملف JSON للطيف بحجم أقل من 320 كيلوبايت.'));return;}apply(await file.text());});
  setupColors();refresh();playLabel();frame=requestAnimationFrame(animate);
  window.addEventListener('pagehide',e=>{cancelAnimationFrame(frame);media.pause();if(e.persisted){audioContext?.suspend();return;}if(blobUrl)URL.revokeObjectURL(blobUrl);if(audioUrl)URL.revokeObjectURL(audioUrl);audioContext?.close();});
  window.addEventListener('pageshow',e=>{if(e.persisted){cancelAnimationFrame(frame);frame=requestAnimationFrame(animate);playLabel();draw();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(audioUrl&&!media.paused)audioContext?.resume().catch(()=>{});draw();}});
  function setupStyleMenu(){
    const button=$('#v-style'),menu=$('#v-style-list'),options=all('[data-v-style]');
    function position(){if(!menu.matches(':popover-open'))return;const r=button.getBoundingClientRect();menu.style.width=Math.min(r.width,innerWidth-24)+'px';const h=menu.offsetHeight;menu.style.left=clamp(r.left,12,innerWidth-menu.offsetWidth-12)+'px';menu.style.top=clamp(innerHeight-r.bottom>h+12?r.bottom+6:r.top-h-6,12,innerHeight-h-12)+'px';}
    function close(){if(menu.matches(':popover-open'))menu.hidePopover();button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});}
    function open(){if(menu.matches(':popover-open')){close();return;}menu.showPopover();button.setAttribute('aria-expanded','true');position();options.find(o=>o.dataset.vStyle===settings.style)?.focus({preventScroll:true});}
    button.addEventListener('click',open);button.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();}});
    options.forEach(option=>option.addEventListener('click',()=>{patch({style:option.dataset.vStyle});close();}));
    menu.addEventListener('keydown',e=>{const index=options.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Tab'){menu.hidePopover();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?options.length-1:(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus({preventScroll:true});}});
    menu.addEventListener('toggle',e=>button.setAttribute('aria-expanded',String(e.newState==='open')));addEventListener('resize',position);addEventListener('scroll',position,true);
  }
  const time=value=>{if(!Number.isFinite(value))return '00:00';return String(Math.floor(value/60)).padStart(2,'0')+':'+String(Math.floor(value%60)).padStart(2,'0');};
  media.addEventListener('loadedmetadata',()=>{$('#v-seek').max=Number.isFinite(media.duration)?media.duration:0;$('#v-audio-duration').textContent=time(media.duration);});
  media.addEventListener('timeupdate',()=>{$('#v-seek').value=media.currentTime;$('#v-audio-time').textContent=time(media.currentTime);});$('#v-seek').addEventListener('input',e=>{media.currentTime=Number(e.target.value);draw();});
  function setupColors(){
    const picker=$('#v-picker'),plane=picker.querySelector('.color-plane'),hue=$('#v-hue'),rgbs=all('[data-v-rgb]');let key,trigger,hsv={h:0,s:0,v:0};
    const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const hex=values=>'#'+values.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
    const parse=value=>{let text=value.trim().replace(/^#/,'');if(/^[a-f\d]{3}$/i.test(text))text=[...text].map(c=>c+c).join('');return /^[a-f\d]{6}$/i.test(text)?'#'+text.toLowerCase():null;};
    function toHsv(color){const [r,g,b]=rgb(color).map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;return {h:d?(((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360):hsv.h,s:max?d/max:0,v:max};}
    function fromHsv(){const {h,s,v}=hsv,c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;return hex((h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x]).map(n=>(n+m)*255));}
    function paint(){plane.style.setProperty('--picker-hue',hsv.h);const cursor=plane.querySelector('.color-plane-cursor');cursor.style.left=hsv.s*100+'%';cursor.style.top=(1-hsv.v)*100+'%';hue.value=Math.round(hsv.h);rgb(settings[key]).forEach((v,i)=>rgbs[i].value=v);}
    function position(){if(!picker.matches(':popover-open')||!trigger)return;const r=trigger.getBoundingClientRect(),w=picker.offsetWidth,h=picker.offsetHeight;picker.style.left=clamp(ar?r.right-w:r.left,12,innerWidth-w-12)+'px';picker.style.top=clamp(innerHeight-r.bottom-12>=h?r.bottom+8:r.top-h-8,12,Math.max(12,innerHeight-h-12))+'px';}
    function close(focus=false){if(picker.matches(':popover-open'))picker.hidePopover();trigger?.setAttribute('aria-expanded','false');if(focus)trigger?.focus();}
    all('[data-v-picker]').forEach(button=>button.addEventListener('click',()=>{if(trigger===button&&picker.matches(':popover-open')){close();return;}trigger?.setAttribute('aria-expanded','false');trigger=button;key=button.dataset.vPicker;$('#v-picker-title').textContent=button.closest('.theme-color-field').querySelector('label').textContent;hsv=toHsv(settings[key]);paint();if(!picker.matches(':popover-open'))picker.showPopover();button.setAttribute('aria-expanded','true');position();hue.focus({preventScroll:true});}));
    $('#v-picker-close').addEventListener('click',()=>close(true));picker.addEventListener('toggle',e=>{if(e.newState==='closed')trigger?.setAttribute('aria-expanded','false');});picker.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(true);}});addEventListener('resize',position);addEventListener('scroll',position,true);
    const move=e=>{const r=plane.getBoundingClientRect();hsv.s=clamp((e.clientX-r.left)/r.width,0,1);hsv.v=1-clamp((e.clientY-r.top)/r.height,0,1);patch({[key]:fromHsv()});paint();};plane.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();plane.setPointerCapture(e.pointerId);move(e);});plane.addEventListener('pointermove',e=>{if(plane.hasPointerCapture(e.pointerId))move(e);});plane.addEventListener('pointerup',e=>{if(plane.hasPointerCapture(e.pointerId))plane.releasePointerCapture(e.pointerId);});hue.addEventListener('input',()=>{hsv.h=Number(hue.value);patch({[key]:fromHsv()});paint();});
    rgbs.forEach(input=>{input.addEventListener('input',()=>{if(input.value===''||!input.validity.valid)return;const values=rgb(settings[key]);values[Number(input.dataset.vRgb)]=Number(input.value);patch({[key]:hex(values)});hsv=toHsv(settings[key]);paint();});input.addEventListener('blur',paint);});
    all('[data-v-color]').forEach(input=>{const update=()=>{const value=parse(input.value);if(value){patch({[input.dataset.vColor]:value},input);input.removeAttribute('aria-invalid');input.closest('.theme-color-field').querySelector('.v-color-error').hidden=true;}return value;};input.addEventListener('input',update);const commit=()=>{if(update())input.value=settings[input.dataset.vColor].toUpperCase();else{input.setAttribute('aria-invalid','true');input.closest('.theme-color-field').querySelector('.v-color-error').hidden=false;}};input.addEventListener('blur',commit);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();}if(e.key==='Escape'){refresh();}});});
    all('[data-v-copy]').forEach(button=>button.addEventListener('click',async()=>{const input=$('[data-v-color="'+button.dataset.vCopy+'"]'),copied=await copyText(button,settings[button.dataset.vCopy].toUpperCase());if(copied){announce(t('Color copied.','نُسخ اللون.'));}else if(copied===false){input.focus();input.select();announce(t('Color selected. Press Ctrl+C.','حُدد اللون. اضغط Ctrl+C.'));}}));
  }
}
