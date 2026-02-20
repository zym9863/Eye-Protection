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
