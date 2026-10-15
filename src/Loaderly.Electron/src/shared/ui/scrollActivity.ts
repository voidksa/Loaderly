/** Reveal scroll thumbs only during use, without changing the scroll area's width. */
export function installScrollActivity(document: Document): () => void {
  const timers = new Map<Element, ReturnType<typeof setTimeout>>();
  const scroll = (event: Event) => {
    const element = event.target instanceof Element ? event.target : document.scrollingElement;
    if (!element) return;
    clearTimeout(timers.get(element));
    element.setAttribute('data-scrolling', 'true');
    timers.set(element, setTimeout(() => { element.removeAttribute('data-scrolling'); timers.delete(element); }, 900));
  };
  document.addEventListener('scroll', scroll, true);
  return () => { document.removeEventListener('scroll', scroll, true); for (const [element,timer] of timers) { clearTimeout(timer); element.removeAttribute('data-scrolling'); } timers.clear(); };
}
