const STYLE_ID = 'eye-protect-dark-mode-style';
let observer: MutationObserver | null = null;

const PROTECTED_TAGS = new Set(['IMG', 'VIDEO', 'CANVAS', 'SVG', 'PICTURE', 'SOURCE', 'IFRAME']);

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

function parseColor(color: string): [number, number, number, number] | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return [+match[1], +match[2], +match[3], match[4] !== undefined ? +match[4] : 1];
}

function invertLightness(r: number, g: number, b: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToRgb(h, s, 1 - l);
}

function isProtected(el: Element): boolean {
  if (PROTECTED_TAGS.has(el.tagName)) return true;
  const style = getComputedStyle(el);
  if (style.backgroundImage && style.backgroundImage !== 'none') return true;
  return false;
}

function processElement(el: Element, processed: WeakSet<Element>) {
  if (processed.has(el) || isProtected(el)) return;
  processed.add(el);

  const style = getComputedStyle(el);
  const bgColor = parseColor(style.backgroundColor);
  const textColor = parseColor(style.color);

  const attrName = 'data-ep-dark';
  el.setAttribute(attrName, '');

  const htmlEl = el as HTMLElement;
  if (bgColor && bgColor[3] > 0.1) {
    const [r, g, b] = invertLightness(bgColor[0], bgColor[1], bgColor[2]);
    htmlEl.style.setProperty('background-color', `rgba(${r},${g},${b},${bgColor[3]})`, 'important');
  }
  if (textColor && textColor[3] > 0.1) {
    const [r, g, b] = invertLightness(textColor[0], textColor[1], textColor[2]);
    htmlEl.style.setProperty('color', `rgba(${r},${g},${b},${textColor[3]})`, 'important');
  }
}

export function applyDarkMode(enabled: boolean, brightness: number, masterEnabled: boolean) {
  removeDarkMode();
  if (!enabled || !masterEnabled) return;

  const processed = new WeakSet<Element>();

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html { filter: brightness(${brightness / 100}) !important; }
    img, video, canvas, svg, picture, iframe { filter: brightness(${100 / brightness}) !important; }
  `;
  document.head.appendChild(style);

  const elements = document.body.querySelectorAll('*');
  elements.forEach(el => processElement(el, processed));

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          processElement(node, processed);
          node.querySelectorAll('*').forEach(child => processElement(child, processed));
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function removeDarkMode() {
  document.getElementById(STYLE_ID)?.remove();
  if (observer) { observer.disconnect(); observer = null; }
  document.querySelectorAll('[data-ep-dark]').forEach(el => {
    el.removeAttribute('data-ep-dark');
    (el as HTMLElement).style.removeProperty('background-color');
    (el as HTMLElement).style.removeProperty('color');
  });
}
