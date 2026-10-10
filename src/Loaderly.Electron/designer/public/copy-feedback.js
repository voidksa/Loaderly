const states = new WeakMap();
const icons = {
  copying: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  copied: '<path d="m5 12 4 4L19 6"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v.1"/>'
};

// Keep feedback on the clicked control, even when a designer's status is offscreen.
export async function copyText(button, text) {
  let state = states.get(button);
  if (!state) {
    state = { nodes: [...button.childNodes], label: button.getAttribute('aria-label'), title: button.getAttribute('title'), minWidth: button.style.minInlineSize };
    states.set(button, state);
  }
  if (state.pending) return;
  state.pending = true;
  clearTimeout(state.timer);
  const ar = document.documentElement.lang === 'ar';
  const labels = ar ? { copying: 'جارٍ النسخ…', copied: 'تم النسخ', error: 'تعذّر النسخ' }
    : { copying: 'Copying…', copied: 'Copied', error: 'Copy failed' };
  if (!button.classList.contains('color-copy')) button.style.minInlineSize = `${Math.ceil(button.getBoundingClientRect().width)}px`;
  function show(kind) {
    button.dataset.copyState = kind;
    button.classList.toggle('copied', kind === 'copied');
    button.setAttribute('aria-label', labels[kind]);
    button.title = labels[kind];
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.8');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('copy-feedback-icon');
    icon.innerHTML = icons[kind];
    const label = document.createElement('span');
    label.className = 'copy-feedback-label';
    label.textContent = labels[kind];
    button.replaceChildren(icon, label);
  }
  function reset() {
    button.replaceChildren(...state.nodes);
    button.classList.remove('copied');
    delete button.dataset.copyState;
    button.style.minInlineSize = state.minWidth;
    for (const [attribute, value] of [['aria-label', state.label], ['title', state.title]]) {
      if (value === null) button.removeAttribute(attribute); else button.setAttribute(attribute, value);
    }
  }
  button.setAttribute('aria-busy', 'true');
  show('copying');
  let copied;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    copied = false;
  }
  state.pending = false;
  button.removeAttribute('aria-busy');
  show(copied ? 'copied' : 'error');
  state.timer = setTimeout(reset, copied ? 3000 : 5000);
  return copied;
}
