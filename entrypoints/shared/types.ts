export interface ColorTempSettings {
  enabled: boolean;
  intensity: number; // 0-100
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
  breakReminder: BreakReminderSettings;
  schedule: ScheduleSettings;
}

export type MessageAction =
  | { type: 'APPLY_SETTINGS'; settings: EyeProtectSettings }
  | { type: 'SHOW_BREAK_REMINDER' }
  | { type: 'DISMISS_BREAK_REMINDER' };
