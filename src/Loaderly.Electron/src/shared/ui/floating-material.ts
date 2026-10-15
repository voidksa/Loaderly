// Native material sits behind the web scene. Top-layer surfaces reveal it
// through their rounded footprint, without copying or capturing the screen.
const documents = new WeakMap<Document, ReturnType<typeof createMaterialLayer>>();

function createMaterialLayer(doc: Document) {
  const win = doc.defaultView!;
  const popups = new Set<HTMLElement>();
  const masked = new Map<HTMLElement, string>();
  const backdrops = new Set<HTMLElement>();
  const positions = new Map<HTMLElement, MutationObserver>();
  const reduced = win.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
  const positionOptions = {attributes:true, attributeFilter:['style'], childList:true, subtree:true};
  let frame = 0;
  function restore() {
    for (const [element, previous] of masked) element.style.maskImage = previous;
    masked.clear();
    for (const element of backdrops) element.style.removeProperty('--native-backdrop-mask');
    backdrops.clear();
  }
  function update() {
    frame = 0;
    // Our own masks are styles too; do not observe the writes we make here.
    for (const observer of positions.values()) observer.disconnect();
    restore();
    const native = doc.documentElement.dataset.desktopGlass === 'true'
      && doc.documentElement.dataset.interfaceGlass === 'true' && !reduced.matches;
    const active = [...popups].filter(popup => popup.isConnected && popup.matches(':popover-open, dialog[open]'));
    for (const popup of popups) popup.toggleAttribute('data-native-material', native);
    if (native && active.length) {
      const boxes = active.map(popup => ({rect:popup.getBoundingClientRect(),radius:parseFloat(win.getComputedStyle(popup).borderTopLeftRadius)||0}));
      function cutout(bounds: {left:number;top:number;width:number;height:number;right:number;bottom:number}, surfaces: typeof boxes) {
        const holes = surfaces.filter(({rect}) => rect.right>bounds.left && rect.left<bounds.right && rect.bottom>bounds.top && rect.top<bounds.bottom)
          .map(({rect,radius}) => `<rect x="${rect.left-bounds.left}" y="${rect.top-bounds.top}" width="${rect.width}" height="${rect.height}" rx="${radius}" fill="black"/>`).join('');
        if(!holes)return;
        // A luminance mask subtracts the union, including overlapping menus,
        // dialogs and tooltips. Even-odd paths would reveal intersections.
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}"><defs><mask id="cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="${bounds.width}" height="${bounds.height}" style="mask-type:luminance"><rect width="100%" height="100%" fill="white"/>${holes}</mask></defs><rect width="100%" height="100%" fill="white" mask="url(#cutout)"/></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      }
      for (const element of doc.querySelectorAll<HTMLElement>('.app-shell, dialog[open], .editor-stage:popover-open')) {
        const ownIndex = active.indexOf(element);
        const mask = cutout(element.getBoundingClientRect(), ownIndex<0 ? boxes : boxes.slice(ownIndex+1));
        if(mask){masked.set(element,element.style.maskImage);element.style.maskImage=mask;}
        if(ownIndex>=0 && element.matches('dialog:modal')) {
          const backdrop = cutout({left:0,top:0,width:win.innerWidth,height:win.innerHeight,right:win.innerWidth,bottom:win.innerHeight},boxes.slice(ownIndex));
          if(backdrop){element.style.setProperty('--native-backdrop-mask',backdrop);backdrops.add(element);}
        }
      }
    }
    for (const [element,observer] of positions) observer.observe(element,positionOptions);
  }
  function schedule() { if(!frame)frame=win.requestAnimationFrame(update); }
  const appearance = new MutationObserver(schedule);
  appearance.observe(doc.documentElement,{attributes:true,attributeFilter:['data-desktop-glass','data-interface-glass']});
  win.addEventListener('resize',schedule);
  doc.addEventListener('scroll',schedule,true);
  reduced.addEventListener('change',schedule);
  return {
    register(popup: HTMLElement) {
      popups.add(popup);
      const resize = new ResizeObserver(schedule);resize.observe(popup);
      const position = new MutationObserver(schedule);positions.set(popup,position);
      update();
      return () => {
        resize.disconnect();position.disconnect();positions.delete(popup);popups.delete(popup);popup.removeAttribute('data-native-material');
        if(frame)win.cancelAnimationFrame(frame);
        update();
        if(!popups.size){
          appearance.disconnect();win.removeEventListener('resize',schedule);doc.removeEventListener('scroll',schedule,true);reduced.removeEventListener('change',schedule);
          documents.delete(doc);
        }
      };
    }
  };
}

export function registerFloatingMaterial(popup: HTMLElement) {
  const doc=popup.ownerDocument;
  let layer=documents.get(doc);
  if(!layer){layer=createMaterialLayer(doc);documents.set(doc,layer);}
  return layer.register(popup);
}
