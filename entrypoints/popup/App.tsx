import { useState, useEffect, useCallback } from 'react';
import { settingsItem, DEFAULT_SETTINGS } from '../shared/storage';
import type { EyeProtectSettings } from '../shared/types';
import { Toggle } from './components/Toggle';
import { FeatureCard } from './components/FeatureCard';

function App() {
  const [settings, setSettings] = useState<EyeProtectSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsItem.getValue().then(setSettings);
    const unwatch = settingsItem.watch(setSettings);
    return () => unwatch();
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<EyeProtectSettings>) => {
      const updated = { ...settings, ...patch };
      setSettings(updated);
      await settingsItem.setValue(updated);
    },
    [settings],
  );

  const scheduleLocked = !settings.masterEnabled;
  const statusLabel = settings.masterEnabled ? '护眼已开启' : '护眼已暂停';

  return (
    <div className={`popup-shell ${settings.masterEnabled ? 'is-active' : 'is-idle'}`}>
      <div className="ambient-layer" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      <header className="hero">
        <p className="hero-eyebrow">视觉控制台</p>
        <div className="hero-title-row">
          <h1 className="hero-title">护眼助手</h1>
          <span className="status-chip">{statusLabel}</span>
        </div>
        <p className="hero-description">
          调整色温、安排休息节奏，让长时间用眼更舒适。
        </p>
        <div className="hero-toggle-row">
          <span>总开关</span>
          <Toggle
            checked={settings.masterEnabled}
            onChange={(value) => updateSettings({ masterEnabled: value })}
          />
        </div>
      </header>

      <section className="feature-stack">
        <FeatureCard
          icon="色温"
          title="色温滤镜"
          description="叠加暖色层，降低屏幕蓝光带来的刺眼感。"
          enabled={settings.colorTemp.enabled}
          onToggle={(value) => updateSettings({ colorTemp: { ...settings.colorTemp, enabled: value } })}
          sliderLabel="强度"
          sliderValue={settings.colorTemp.intensity}
          sliderMin={0}
          sliderMax={100}
          sliderUnit="%"
          onSliderChange={(value) =>
            updateSettings({ colorTemp: { ...settings.colorTemp, intensity: value } })
          }
          masterEnabled={settings.masterEnabled}
        />

        <FeatureCard
          icon="休息"
          title="休息提醒"
          description="定时提醒短暂放松，缓解连续用眼压力。"
          enabled={settings.breakReminder.enabled}
          onToggle={(value) =>
            updateSettings({ breakReminder: { ...settings.breakReminder, enabled: value } })
          }
          sliderLabel="间隔"
          sliderValue={settings.breakReminder.intervalMin}
          sliderMin={5}
          sliderMax={60}
          sliderUnit="分"
          onSliderChange={(value) =>
            updateSettings({ breakReminder: { ...settings.breakReminder, intervalMin: value } })
          }
          masterEnabled={settings.masterEnabled}
        />
      </section>

      <section className={`schedule-card ${scheduleLocked ? 'is-locked' : ''}`}>
        <div className="schedule-top">
          <div>
            <p className="schedule-eyebrow">自动化</p>
            <h2 className="schedule-title">定时色温</h2>
          </div>
          <Toggle
            checked={settings.schedule.enabled}
            disabled={scheduleLocked}
            onChange={(value) => updateSettings({ schedule: { ...settings.schedule, enabled: value } })}
          />
        </div>

        <div className="schedule-times">
          <label className="time-field">
            <span>开始</span>
            <input
              type="time"
              value={settings.schedule.startTime}
              disabled={!settings.schedule.enabled || scheduleLocked}
              onChange={(event) =>
                updateSettings({ schedule: { ...settings.schedule, startTime: event.target.value } })
              }
            />
          </label>
          <label className="time-field">
            <span>结束</span>
            <input
              type="time"
              value={settings.schedule.endTime}
              disabled={!settings.schedule.enabled || scheduleLocked}
              onChange={(event) =>
                updateSettings({ schedule: { ...settings.schedule, endTime: event.target.value } })
              }
            />
          </label>
        </div>

        {scheduleLocked && (
          <p className="schedule-note">请先开启总开关，再编辑自动化时段。</p>
        )}
      </section>
    </div>
  );
}

export default App;
