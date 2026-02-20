# Eye Protection Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete eye protection browser extension with color temperature filter, smart dark mode, break reminder, and scheduled automation.

**Architecture:** Content script injection approach — all visual effects are managed by a content script injected into every page. Background script manages timers, scheduling, and messaging. Popup provides React UI for settings. State flows through `wxt/storage` with `storage.watch` for reactivity.

**Tech Stack:** WXT, React 19, TypeScript, pnpm, `wxt/storage` API, `chrome.alarms` API

---

### Task 1: Foundation — Types, Storage, and Permissions

**Files:**
- Create: `entrypoints/shared/types.ts`
- Create: `entrypoints/shared/storage.ts`
- Modify: `wxt.config.ts`

**Step 1: Create shared types**

Create `entrypoints/shared/types.ts`:

```ts
export interface ColorTempSettings {
  enabled: boolean;
  intensity: number; // 0-100
}

export interface DarkModeSettings {
  enabled: boolean;
  brightness: number; // 50-150, default 100
}

export interface BreakReminderSettings {
  enabled: boolean;
  intervalMin: number; // default 20
}

export interface ScheduleSettings {
  enabled: boolean;
  startTime: string; // "HH:MM" e.g. "22:00"
  endTime: string;   // "HH:MM" e.g. "07:00"
}

export interface EyeProtectSettings {
  masterEnabled: boolean;
  colorTemp: ColorTempSettings;
  darkMode: DarkModeSettings;
  breakReminder: BreakReminderSettings;
  schedule: ScheduleSettings;
}

export type MessageAction =
  | { type: 'APPLY_SETTINGS'; settings: EyeProtectSettings }
  | { type: 'SHOW_BREAK_REMINDER' }
  | { type: 'DISMISS_BREAK_REMINDER' };
```

**Step 2: Create storage definitions**

Create `entrypoints/shared/storage.ts`:

```ts
import { storage } from 'wxt/storage';
import type { EyeProtectSettings } from './types';

export const DEFAULT_SETTINGS: EyeProtectSettings = {
  masterEnabled: true,
  colorTemp: { enabled: false, intensity: 50 },
  darkMode: { enabled: false, brightness: 100 },
  breakReminder: { enabled: false, intervalMin: 20 },
  schedule: { enabled: false, startTime: '22:00', endTime: '07:00' },
};

export const settingsItem = storage.defineItem<EyeProtectSettings>(
  'local:eyeProtectSettings',
  { fallback: DEFAULT_SETTINGS },
);
```

**Step 3: Update wxt.config.ts with permissions**

Modify `wxt.config.ts`:

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '护眼助手',
    description: '色温滤镜、暗色模式、休息提醒，全方位保护你的眼睛',
    permissions: ['storage', 'alarms', 'activeTab'],
  },
});
```

**Step 4: Verify build**

Run: `pnpm dev`
Expected: Extension builds and loads without errors.

**Step 5: Commit**

```bash
git add entrypoints/shared/ wxt.config.ts
git commit -m "feat: add foundation types, storage schema, and permissions"
```

---

### Task 2: Content Script — Color Temperature Filter

**Files:**
- Create: `entrypoints/content/color-temp.ts`
- Modify: `entrypoints/content.ts`

**Step 1: Create color temperature module**

Create `entrypoints/content/color-temp.ts`:

```ts
const OVERLAY_ID = 'eye-protect-color-temp-overlay';

export function applyColorTemp(enabled: boolean, intensity: number, masterEnabled: boolean) {
  removeColorTemp();
  if (!enabled || !masterEnabled) return;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  // intensity 0-100 maps to opacity 0-0.4
  const opacity = (intensity / 100) * 0.4;
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: `rgba(255, 170, 50, ${opacity})`,
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
    zIndex: '2147483647',
    transition: 'background-color 0.3s ease',
  });
  document.documentElement.appendChild(overlay);
}

export function removeColorTemp() {
  document.getElementById(OVERLAY_ID)?.remove();
}
```

**Step 2: Update content script entry**

Replace `entrypoints/content.ts`:

```ts
import { settingsItem } from './shared/storage';
import { applyColorTemp } from './content/color-temp';
import type { MessageAction } from './shared/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  async main() {
    // Load initial settings
    const settings = await settingsItem.getValue();
    applyColorTemp(settings.colorTemp.enabled, settings.colorTemp.intensity, settings.masterEnabled);

    // Watch for storage changes
    settingsItem.watch((newSettings) => {
      applyColorTemp(newSettings.colorTemp.enabled, newSettings.colorTemp.intensity, newSettings.masterEnabled);
    });

    // Listen for messages from background
    browser.runtime.onMessage.addListener((message: MessageAction) => {
      if (message.type === 'APPLY_SETTINGS') {
        const s = message.settings;
        applyColorTemp(s.colorTemp.enabled, s.colorTemp.intensity, s.masterEnabled);
      }
    });
  },
});
```

**Step 3: Test manually**

Run: `pnpm dev`
Open any website. Open extension popup (or use devtools storage editor) to set `colorTemp.enabled = true`. Verify warm overlay appears.

**Step 4: Commit**

```bash
git add entrypoints/content/ entrypoints/content.ts
git commit -m "feat: implement color temperature filter overlay"
```

---

### Task 3: Content Script — Smart Dark Mode

**Files:**
- Create: `entrypoints/content/dark-mode.ts`
- Modify: `entrypoints/content.ts`

**Step 1: Create dark mode module**

Create `entrypoints/content/dark-mode.ts`:

```ts
const STYLE_ID = 'eye-protect-dark-mode-style';
let observer: MutationObserver | null = null;

// Protected tags that should not be color-inverted
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
  const rules: string[] = [];
  // Generate a unique attribute-based selector
  const attrName = 'data-ep-dark';
  el.setAttribute(attrName, '');

  if (bgColor && bgColor[3] > 0.1) {
    const [r, g, b] = invertLightness(bgColor[0], bgColor[1], bgColor[2]);
    rules.push(`background-color: rgba(${r},${g},${b},${bgColor[3]}) !important`);
  }
  if (textColor && textColor[3] > 0.1) {
    const [r, g, b] = invertLightness(textColor[0], textColor[1], textColor[2]);
    rules.push(`color: rgba(${r},${g},${b},${textColor[3]}) !important`);
  }

  if (rules.length > 0) {
    const htmlEl = el as HTMLElement;
    htmlEl.style.cssText += rules.map(r => `;${r}`).join('');
  }
}

export function applyDarkMode(enabled: boolean, brightness: number, masterEnabled: boolean) {
  removeDarkMode();
  if (!enabled || !masterEnabled) return;

  const processed = new WeakSet<Element>();

  // Apply brightness filter to html
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html { filter: brightness(${brightness / 100}) !important; }
    img, video, canvas, svg, picture, iframe { filter: brightness(${100 / brightness}) !important; }
  `;
  document.head.appendChild(style);

  // Process all existing visible elements
  const elements = document.body.querySelectorAll('*');
  elements.forEach(el => processElement(el, processed));

  // Watch for new elements
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
  // Remove inline styles added by dark mode
  document.querySelectorAll('[data-ep-dark]').forEach(el => {
    el.removeAttribute('data-ep-dark');
    // Reset styles we changed (simplified — full reset would track original values)
    (el as HTMLElement).style.backgroundColor = '';
    (el as HTMLElement).style.color = '';
  });
}
```

**Step 2: Integrate into content script**

Add to `entrypoints/content.ts` (add imports and calls alongside color-temp):

```ts
import { settingsItem } from './shared/storage';
import { applyColorTemp } from './content/color-temp';
import { applyDarkMode } from './content/dark-mode';
import type { MessageAction } from './shared/types';

function applyAllSettings(settings: typeof import('./shared/types').EyeProtectSettings extends infer T ? T : never) {
  applyColorTemp(settings.colorTemp.enabled, settings.colorTemp.intensity, settings.masterEnabled);
  applyDarkMode(settings.darkMode.enabled, settings.darkMode.brightness, settings.masterEnabled);
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  async main() {
    const settings = await settingsItem.getValue();
    applyAllSettings(settings);

    settingsItem.watch((newSettings) => {
      applyAllSettings(newSettings);
    });

    browser.runtime.onMessage.addListener((message: MessageAction) => {
      if (message.type === 'APPLY_SETTINGS') {
        applyAllSettings(message.settings);
      }
    });
  },
});
```

**Step 3: Test manually**

Run: `pnpm dev`
Enable dark mode in storage. Verify pages get dark backgrounds with light text. Verify images stay normal.

**Step 4: Commit**

```bash
git add entrypoints/content/dark-mode.ts entrypoints/content.ts
git commit -m "feat: implement smart dark mode with element-level color inversion"
```

---

### Task 4: Content Script — Break Reminder Overlay

**Files:**
- Create: `entrypoints/content/break-reminder.ts`
- Modify: `entrypoints/content.ts`

**Step 1: Create break reminder module**

Create `entrypoints/content/break-reminder.ts`:

```ts
const REMINDER_ID = 'eye-protect-break-reminder';
let countdownTimer: ReturnType<typeof setInterval> | null = null;

export function showBreakReminder() {
  dismissBreakReminder();

  const overlay = document.createElement('div');
  overlay.id = REMINDER_ID;
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    zIndex: '2147483647',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#fff',
    transition: 'opacity 0.3s ease',
  });

  const icon = document.createElement('div');
  icon.textContent = '👁️';
  icon.style.fontSize = '64px';
  icon.style.marginBottom = '24px';

  const title = document.createElement('div');
  title.textContent = '该休息一下了';
  Object.assign(title.style, { fontSize: '28px', fontWeight: '600', marginBottom: '12px' });

  const subtitle = document.createElement('div');
  subtitle.textContent = '看看 6 米外的物体，让眼睛放松 20 秒';
  Object.assign(subtitle.style, { fontSize: '16px', color: '#aaa', marginBottom: '32px' });

  const countdown = document.createElement('div');
  let seconds = 20;
  countdown.textContent = `${seconds}s`;
  Object.assign(countdown.style, { fontSize: '48px', fontWeight: '700', marginBottom: '24px', color: '#4a6cf7' });

  const skipBtn = document.createElement('button');
  skipBtn.textContent = '跳过';
  Object.assign(skipBtn.style, {
    padding: '10px 32px', fontSize: '14px', fontWeight: '500',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
    backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer',
    transition: 'all 0.2s ease',
  });
  skipBtn.addEventListener('mouseenter', () => { skipBtn.style.backgroundColor = 'rgba(255,255,255,0.1)'; });
  skipBtn.addEventListener('mouseleave', () => { skipBtn.style.backgroundColor = 'transparent'; });
  skipBtn.addEventListener('click', dismissBreakReminder);

  overlay.append(icon, title, subtitle, countdown, skipBtn);
  document.documentElement.appendChild(overlay);

  countdownTimer = setInterval(() => {
    seconds--;
    countdown.textContent = `${seconds}s`;
    if (seconds <= 0) dismissBreakReminder();
  }, 1000);
}

export function dismissBreakReminder() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  document.getElementById(REMINDER_ID)?.remove();
}
```

**Step 2: Integrate into content script**

Add to `entrypoints/content.ts` message handler:

```ts
import { showBreakReminder, dismissBreakReminder } from './content/break-reminder';

// Inside onMessage listener, add cases:
if (message.type === 'SHOW_BREAK_REMINDER') {
  showBreakReminder();
}
if (message.type === 'DISMISS_BREAK_REMINDER') {
  dismissBreakReminder();
}
```

**Step 3: Test manually**

From background script console, send message: `browser.tabs.sendMessage(tabId, { type: 'SHOW_BREAK_REMINDER' })`. Verify overlay appears with countdown.

**Step 4: Commit**

```bash
git add entrypoints/content/break-reminder.ts entrypoints/content.ts
git commit -m "feat: implement break reminder overlay with countdown"
```

---

### Task 5: Background Script — Alarms and Scheduling

**Files:**
- Modify: `entrypoints/background.ts`

**Step 1: Implement background script**

Replace `entrypoints/background.ts`:

```ts
import { settingsItem } from './shared/storage';
import type { EyeProtectSettings } from './shared/types';

const BREAK_ALARM = 'eye-protect-break-reminder';
const SCHEDULE_ALARM = 'eye-protect-schedule-check';

function isInScheduleRange(startTime: string, endTime: string): boolean {
  const now = new Date();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  if (startMin <= endMin) {
    // Same day range: e.g. 08:00 - 18:00
    return currentMin >= startMin && currentMin < endMin;
  } else {
    // Cross midnight: e.g. 22:00 - 07:00
    return currentMin >= startMin || currentMin < endMin;
  }
}

async function setupBreakAlarm(settings: EyeProtectSettings) {
  await browser.alarms.clear(BREAK_ALARM);
  if (settings.masterEnabled && settings.breakReminder.enabled) {
    browser.alarms.create(BREAK_ALARM, {
      periodInMinutes: settings.breakReminder.intervalMin,
    });
  }
}

async function setupScheduleAlarm(settings: EyeProtectSettings) {
  await browser.alarms.clear(SCHEDULE_ALARM);
  if (settings.schedule.enabled) {
    browser.alarms.create(SCHEDULE_ALARM, {
      periodInMinutes: 1,
    });
    // Also check immediately
    await checkSchedule(settings);
  }
}

async function checkSchedule(settings: EyeProtectSettings) {
  if (!settings.schedule.enabled) return;
  const inRange = isInScheduleRange(settings.schedule.startTime, settings.schedule.endTime);
  if (inRange !== settings.colorTemp.enabled) {
    const updated = {
      ...settings,
      colorTemp: { ...settings.colorTemp, enabled: inRange },
    };
    await settingsItem.setValue(updated);
  }
}

async function sendToActiveTab(message: unknown) {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, message);
    }
  } catch {
    // Tab might not have content script loaded
  }
}

export default defineBackground(() => {
  // Initial setup
  settingsItem.getValue().then(async (settings) => {
    await setupBreakAlarm(settings);
    await setupScheduleAlarm(settings);
  });

  // Watch for settings changes
  settingsItem.watch(async (settings) => {
    await setupBreakAlarm(settings);
    await setupScheduleAlarm(settings);
  });

  // Handle alarms
  browser.alarms.onAlarm.addListener(async (alarm) => {
    const settings = await settingsItem.getValue();

    if (alarm.name === BREAK_ALARM) {
      if (settings.masterEnabled && settings.breakReminder.enabled) {
        await sendToActiveTab({ type: 'SHOW_BREAK_REMINDER' });
      }
    }

    if (alarm.name === SCHEDULE_ALARM) {
      await checkSchedule(settings);
    }
  });
});
```

**Step 2: Test manually**

Run: `pnpm dev`
Set break reminder interval to 1 minute in storage. Verify alarm fires and reminder overlay appears.

**Step 3: Commit**

```bash
git add entrypoints/background.ts
git commit -m "feat: implement background alarms for break reminder and schedule"
```

---

### Task 6: Popup UI — CSS Foundation and Layout

**Files:**
- Modify: `entrypoints/popup/style.css`
- Modify: `entrypoints/popup/App.css` (delete or clear)
- Modify: `entrypoints/popup/index.html`

**Step 1: Replace popup styles**

Replace `entrypoints/popup/style.css` with the full design system:

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-card: #16213e;
  --bg-hover: #1a2744;
  --text-primary: #e0e0e0;
  --text-secondary: #8892a4;
  --accent: #4a6cf7;
  --accent-hover: #5b7bf9;
  --success: #4ade80;
  --border: rgba(255, 255, 255, 0.06);
  --radius: 12px;
  --transition: 0.2s ease;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  width: 320px;
  min-height: 400px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* Toggle switch */
.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition);
}
.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: var(--transition);
}
.toggle input:checked + .toggle-slider {
  background: var(--accent);
}
.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* Range slider */
.slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.slider-container input[type="range"] {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  outline: none;
}
.slider-container input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  transition: var(--transition);
}
.slider-container input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}
.slider-value {
  width: 42px;
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}
.header-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-icon {
  font-size: 18px;
}

/* Feature card */
.card {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  transition: background var(--transition);
}
.card:hover {
  background: var(--bg-hover);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}
.card-icon {
  font-size: 16px;
}
.card.disabled .card-title,
.card.disabled .slider-container {
  opacity: 0.4;
  pointer-events: none;
}

/* Schedule section */
.schedule-section {
  padding: 14px 18px;
}
.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.schedule-title {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.schedule-time {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.schedule-time input[type="time"] {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  padding: 6px 10px;
  font-size: 13px;
  outline: none;
  transition: border var(--transition);
}
.schedule-time input[type="time"]:focus {
  border-color: var(--accent);
}
.schedule-time-sep {
  color: var(--text-secondary);
  font-size: 13px;
}
```

**Step 2: Clear App.css**

Empty `entrypoints/popup/App.css` (remove all content).

**Step 3: Update popup title**

In `entrypoints/popup/index.html`, change title to `护眼助手`.

**Step 4: Commit**

```bash
git add entrypoints/popup/
git commit -m "feat: add popup CSS design system with dark theme"
```

---

### Task 7: Popup UI — React Components

**Files:**
- Create: `entrypoints/popup/components/Toggle.tsx`
- Create: `entrypoints/popup/components/FeatureCard.tsx`
- Modify: `entrypoints/popup/App.tsx`

**Step 1: Create Toggle component**

Create `entrypoints/popup/components/Toggle.tsx`:

```tsx
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-slider" />
    </label>
  );
}
```

**Step 2: Create FeatureCard component**

Create `entrypoints/popup/components/FeatureCard.tsx`:

```tsx
import { Toggle } from './Toggle';

interface FeatureCardProps {
  icon: string;
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  sliderLabel: string;
  sliderValue: number;
  sliderMin: number;
  sliderMax: number;
  sliderUnit: string;
  onSliderChange: (value: number) => void;
  masterEnabled: boolean;
}

export function FeatureCard({
  icon, title, enabled, onToggle,
  sliderLabel, sliderValue, sliderMin, sliderMax, sliderUnit,
  onSliderChange, masterEnabled,
}: FeatureCardProps) {
  const disabled = !masterEnabled;
  return (
    <div className={`card ${disabled ? 'disabled' : ''}`}>
      <div className="card-header">
        <div className="card-title">
          <span className="card-icon">{icon}</span>
          {title}
        </div>
        <Toggle checked={enabled && masterEnabled} onChange={onToggle} />
      </div>
      {enabled && masterEnabled && (
        <div className="slider-container">
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sliderLabel}</span>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            value={sliderValue}
            onChange={(e) => onSliderChange(Number(e.target.value))}
          />
          <span className="slider-value">{sliderValue}{sliderUnit}</span>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Implement App.tsx**

Replace `entrypoints/popup/App.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { settingsItem, DEFAULT_SETTINGS } from '../shared/storage';
import type { EyeProtectSettings } from '../shared/types';
import { Toggle } from './components/Toggle';
import { FeatureCard } from './components/FeatureCard';
import './App.css';

function App() {
  const [settings, setSettings] = useState<EyeProtectSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsItem.getValue().then(setSettings);
    const unwatch = settingsItem.watch(setSettings);
    return () => unwatch();
  }, []);

  const updateSettings = useCallback(async (patch: Partial<EyeProtectSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await settingsItem.setValue(updated);
  }, [settings]);

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="header-title">
          <span className="header-icon">🛡️</span>
          护眼助手
        </div>
        <Toggle
          checked={settings.masterEnabled}
          onChange={(v) => updateSettings({ masterEnabled: v })}
        />
      </div>

      {/* Color Temperature */}
      <FeatureCard
        icon="☀️"
        title="色温滤镜"
        enabled={settings.colorTemp.enabled}
        onToggle={(v) => updateSettings({ colorTemp: { ...settings.colorTemp, enabled: v } })}
        sliderLabel="强度"
        sliderValue={settings.colorTemp.intensity}
        sliderMin={0}
        sliderMax={100}
        sliderUnit="%"
        onSliderChange={(v) => updateSettings({ colorTemp: { ...settings.colorTemp, intensity: v } })}
        masterEnabled={settings.masterEnabled}
      />

      {/* Dark Mode */}
      <FeatureCard
        icon="🌙"
        title="暗色模式"
        enabled={settings.darkMode.enabled}
        onToggle={(v) => updateSettings({ darkMode: { ...settings.darkMode, enabled: v } })}
        sliderLabel="亮度"
        sliderValue={settings.darkMode.brightness}
        sliderMin={50}
        sliderMax={150}
        sliderUnit="%"
        onSliderChange={(v) => updateSettings({ darkMode: { ...settings.darkMode, brightness: v } })}
        masterEnabled={settings.masterEnabled}
      />

      {/* Break Reminder */}
      <FeatureCard
        icon="⏰"
        title="休息提醒"
        enabled={settings.breakReminder.enabled}
        onToggle={(v) => updateSettings({ breakReminder: { ...settings.breakReminder, enabled: v } })}
        sliderLabel="间隔"
        sliderValue={settings.breakReminder.intervalMin}
        sliderMin={5}
        sliderMax={60}
        sliderUnit="min"
        onSliderChange={(v) => updateSettings({ breakReminder: { ...settings.breakReminder, intervalMin: v } })}
        masterEnabled={settings.masterEnabled}
      />

      {/* Schedule */}
      <div className="schedule-section">
        <div className="schedule-header">
          <div className="schedule-title">
            <span>🕐</span>
            定时开启色温
          </div>
          <Toggle
            checked={settings.schedule.enabled}
            onChange={(v) => updateSettings({ schedule: { ...settings.schedule, enabled: v } })}
          />
        </div>
        {settings.schedule.enabled && (
          <div className="schedule-time">
            <input
              type="time"
              value={settings.schedule.startTime}
              onChange={(e) => updateSettings({ schedule: { ...settings.schedule, startTime: e.target.value } })}
            />
            <span className="schedule-time-sep">—</span>
            <input
              type="time"
              value={settings.schedule.endTime}
              onChange={(e) => updateSettings({ schedule: { ...settings.schedule, endTime: e.target.value } })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

**Step 4: Test manually**

Run: `pnpm dev`
Click extension icon. Verify popup shows all controls. Toggle switches, drag sliders, set schedule times. Verify settings persist across popup close/reopen.

**Step 5: Commit**

```bash
git add entrypoints/popup/
git commit -m "feat: implement popup UI with all feature controls"
```

---

### Task 8: Integration Testing and Polish

**Files:**
- Modify: various files for bug fixes found during testing

**Step 1: Full integration test**

Run: `pnpm dev`

Test checklist:
- [ ] Color temp: toggle on → warm overlay appears; drag slider → opacity changes; toggle off → overlay gone
- [ ] Dark mode: toggle on → page colors invert; images stay normal; brightness slider works
- [ ] Break reminder: set to 1 min → wait → overlay appears → countdown works → skip button works
- [ ] Schedule: set range that includes current time → color temp auto-enables
- [ ] Master toggle: off → all effects disabled; on → previously enabled features restore
- [ ] Persistence: close/reopen popup → all settings preserved
- [ ] Multiple tabs: open 2 tabs → both receive effects

**Step 2: Fix any bugs found**

Address issues discovered during testing.

**Step 3: Build for production**

Run: `pnpm build`
Expected: Clean build with no errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: integration testing and polish"
```

---

### Task 9: Final Cleanup

**Files:**
- Delete: `assets/react.svg`
- Modify: `package.json` (update name/description)
- Modify: `README.md`

**Step 1: Update package metadata**

In `package.json`, change:
- `"name"` → `"eye-protection"`
- `"description"` → `"护眼浏览器扩展 - 色温滤镜、暗色模式、休息提醒"`

**Step 2: Remove starter assets**

Delete `assets/react.svg` and `public/wxt.svg`.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: cleanup starter template files and update metadata"
```
