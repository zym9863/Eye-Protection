import type { ReactNode } from 'react';
import { Toggle } from './Toggle';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
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
  icon, title, description, enabled, onToggle,
  sliderLabel, sliderValue, sliderMin, sliderMax, sliderUnit,
  onSliderChange, masterEnabled,
}: FeatureCardProps) {
  const disabled = !masterEnabled;
  const canEditSlider = enabled && masterEnabled;

  return (
    <article className={`feature-card ${disabled ? 'is-disabled' : ''}`}>
      <div className="feature-card-header">
        <div className="feature-card-copy">
          <div className="feature-title-row">
            <span className="feature-icon">{icon}</span>
            <h2 className="feature-title">{title}</h2>
          </div>
          <p className="feature-description">{description}</p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} disabled={disabled} />
      </div>

      {canEditSlider && (
        <div className="slider-container">
          <span className="slider-label">{sliderLabel}</span>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            value={sliderValue}
            onChange={(e) => onSliderChange(Number(e.target.value))}
          />
          <span className="slider-value">
            {sliderValue}
            {sliderUnit}
          </span>
        </div>
      )}
    </article>
  );
}
