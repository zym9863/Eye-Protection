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
