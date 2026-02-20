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
