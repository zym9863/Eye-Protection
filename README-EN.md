**English** | [中文](./README.md)

# Eye Protection — Eye-care browser extension

A full-featured eye-care browser extension built with WXT + React + TypeScript. It provides three core features: color temperature filter, smart dark mode, and break reminders.

## ✨ Features

### 🌅 Color Temperature Filter
- Full-screen warm overlay to reduce blue light
- Adjustable intensity (0–100)
- Helps protect eyes and improve sleep quality

### 🌙 Smart Dark Mode
- Element-level intelligent color inversion
- Automatically handles background, text, and border colors
- Protects images, videos, Canvas and other media elements
- Uses MutationObserver to watch DOM changes and process new elements
- Adjustable brightness (50–150%)

### ⏰ Break Reminders
- Periodic reminders to take breaks and protect vision
- Configurable interval (default: 20 minutes)
- Full-screen reminder overlay with a 20-second countdown
- Option to skip reminders

### 📅 Scheduled Plan
- Automatically enable/disable color temperature filter at specified times
- Supports ranges that cross midnight (e.g. 22:00 → 07:00)
- Checks current time every minute

## 🛠️ Tech Stack

- **Framework**: [WXT](https://wxt.dev/) — modern browser extension framework
- **UI**: React 19 + TypeScript
- **Styling**: Plain CSS (CSS variables + custom components)
- **Package manager**: pnpm

## 📦 Installation & Development

### Requirements

- Node.js 18+
- pnpm 8+

### Development

```bash
# install dependencies
pnpm install

# start dev server (Chrome)
pnpm dev

# start dev server (Firefox)
pnpm dev:firefox
```

### Build for production

```bash
# build Chrome extension
pnpm build

# build Firefox extension
pnpm build:firefox

# create .zip package
pnpm zip
pnpm zip:firefox
```

## 🏗️ Project Structure

```
eye-protection/
├── entrypoints/
│   ├── background.ts      # background script: state, timers, message hub
│   ├── content.ts         # content script entry
│   ├── content/
│   │   ├── break-reminder.ts  # break reminder feature
│   │   ├── color-temp.ts      # color temperature filter
│   │   └── dark-mode.ts       # dark mode feature
│   ├── popup/             # popup UI
│   │   ├── App.tsx        # main component
│   │   ├── components/    # UI components
│   │   └── style.css      # styles
│   └── shared/
│       ├── storage.ts     # storage wrapper
│       └── types.ts       # type definitions
├── public/icon/           # extension icons
├── docs/plans/            # design docs
└── wxt.config.ts          # WXT config
```

## 🔧 Architecture

```
Background Script (state, timers, message hub)
        ↕ chrome.runtime.sendMessage
Popup (React UI — settings)
        ↕ storage.local
Content Script (visual effects injection)
```

### Data flow

1. User updates settings in the popup → write to `storage.local` → background is notified
2. Background forwards to content scripts in all tabs
3. Content scripts apply/remove visual effects
4. Scheduled tasks: background registers `chrome.alarms`, updates storage and notifies content scripts

## 📝 Storage schema

```typescript
interface Settings {
  colorTemp: { enabled: boolean; intensity: number }       // intensity: 0-100
  darkMode: { enabled: boolean; brightness: number }       // brightness: 50-150
  breakReminder: { enabled: boolean; intervalMin: number } // default: 20
  schedule: { enabled: boolean; startTime: string; endTime: string } // "22:00" "07:00"
}
```

## 📄 License

MIT License
