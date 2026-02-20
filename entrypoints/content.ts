import { settingsItem } from './shared/storage';
import { applyColorTemp } from './content/color-temp';
import { applyDarkMode } from './content/dark-mode';
import { showBreakReminder, dismissBreakReminder } from './content/break-reminder';
import type { EyeProtectSettings, MessageAction } from './shared/types';

function applyAllSettings(settings: EyeProtectSettings) {
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
      if (message.type === 'SHOW_BREAK_REMINDER') {
        showBreakReminder();
      }
      if (message.type === 'DISMISS_BREAK_REMINDER') {
        dismissBreakReminder();
      }
    });
  },
});
