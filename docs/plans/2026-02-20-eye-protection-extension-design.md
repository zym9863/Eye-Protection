# Eye Protection Browser Extension Design

## Overview

A comprehensive eye protection browser extension built with WXT + React + pnpm. Provides three core features: color temperature filter, smart dark mode, and break reminder with scheduled automation.

## Architecture

```
Background Script (state management, timers, messaging hub)
        ↕ chrome.runtime.sendMessage
Popup (React UI — settings panel)
        ↕ storage.local
Content Script (visual effects injection)
```

### Data Flow

1. User adjusts settings in Popup → writes to `storage.local` → sends message to background
2. Background forwards to all tabs' content scripts
3. Content scripts apply/remove visual effects
4. Scheduled tasks: background registers `chrome.alarms`, auto-updates storage and notifies content scripts

### Storage Schema

```ts
interface Settings {
  colorTemp: { enabled: boolean; intensity: number }       // intensity: 0-100
  darkMode: { enabled: boolean; brightness: number }       // brightness: 50-150
  breakReminder: { enabled: boolean; intervalMin: number } // default 20
  schedule: { enabled: boolean; startTime: string; endTime: string } // "22:00" "07:00"
}
```

## Feature 1: Color Temperature Filter

- Inject a fixed-position fullscreen overlay `<div>` at end of `<body>`
- `background: rgba(255, 170, 50, opacity)` + `mix-blend-mode: multiply`
- `pointer-events: none` to not block interactions
- `z-index: 2147483647` to cover all content
- `intensity` maps to overlay opacity range 0–0.4

## Feature 2: Smart Dark Mode (Element-Level)

1. Traverse all visible elements under `document.body`
2. Read `getComputedStyle` for `background-color`, `color`, `border-color`
3. Smart inversion: light backgrounds → dark, dark text → light
4. Protected elements: `<img>`, `<video>`, `<canvas>`, `<svg>`, elements with `background-image`
5. Apply via injected `<style>` tag with high-specificity selectors
6. `MutationObserver` watches DOM changes, auto-processes new elements
7. Color inversion: RGB → HSL, invert L channel, preserve hue/saturation
8. `brightness` parameter: fine-tune via `html { filter: brightness(x) }`

## Feature 3: Break Reminder

- Background uses `chrome.alarms.create("breakReminder", { periodInMinutes: 20 })`
- On alarm: inject fullscreen reminder overlay into active tab
- Semi-transparent black background + centered message
- 20-second countdown + "Skip" button
- Auto-dismiss after countdown

## Feature 4: Scheduled Color Temperature

- Store `startTime` / `endTime` (e.g. "22:00" / "07:00")
- Background checks current time every minute via `chrome.alarms`
- In range → auto-enable color temp filter; out of range → auto-disable
- Supports cross-midnight ranges (22:00 → 07:00)
- Schedule only controls color temp; dark mode and break reminder stay independent

## Popup UI

- Width: 320px, dark theme (#1a1a2e) with blue-purple accent (#4a6cf7)
- Layout: master toggle at top, three feature cards with toggle + slider, schedule section at bottom
- Pure CSS implementation (CSS variables, custom toggle/slider, 0.2s transitions)
- Real-time preview: slider changes apply immediately

## Technical Approach (Approach A: Content Script Injection)

All visual effects managed through content script injection for consistent architecture and fine-grained control. No external UI libraries — pure CSS for the popup.
