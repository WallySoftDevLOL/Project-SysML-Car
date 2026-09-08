// Tiny hyperscript-style helper so src/ui/* never needs a framework.
// h('div', { class: 'x', on: { click: fn } }, 'text', childEl)
export type Child = Node | string | number | null | undefined | false;

export interface Props {
  class?: string;
  style?: Partial<CSSStyleDeclaration>;
  on?: Record<string, EventListenerOrEventListenerObject>;
  [attr: string]: unknown;
}

// Attributes that must always be set via setAttribute with their literal
// string value (never dropped when falsy) because ARIA/data semantics rely
// on the string "false" being present, not the attribute's mere absence.
function isAlwaysAttr(key: string): boolean {
  return key.startsWith('aria-') || key.startsWith('data-') || key === 'role' || key === 'for';
}

// DOM properties that behave better set as IDL properties than as attributes
// (checkbox state, form control state, etc).
const PROP_KEYS = new Set([
  'value',
  'checked',
  'disabled',
  'selected',
  'placeholder',
  'tabIndex',
  'htmlFor',
]);

export function h(tag: string, props?: Props | null, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'on' && value) {
        for (const [event, handler] of Object.entries(value as Record<string, EventListenerOrEventListenerObject>)) {
          el.addEventListener(event, handler);
        }
      } else if (key === 'class') {
        if (value) el.className = String(value);
      } else if (key === 'style' && value && typeof value === 'object') {
        Object.assign(el.style, value as Partial<CSSStyleDeclaration>);
      } else if (isAlwaysAttr(key)) {
        if (value !== undefined) el.setAttribute(key === 'for' ? 'for' : key, String(value));
      } else if (PROP_KEYS.has(key)) {
        if (value !== undefined) (el as unknown as Record<string, unknown>)[key] = value;
      } else if (value == null || value === false) {
        // omit
      } else if (value === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
