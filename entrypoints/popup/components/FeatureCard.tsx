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
