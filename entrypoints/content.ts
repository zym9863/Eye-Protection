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
