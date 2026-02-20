const OVERLAY_ID = 'eye-protect-color-temp-overlay';

export function applyColorTemp(enabled: boolean, intensity: number, masterEnabled: boolean) {
  removeColorTemp();
  if (!enabled || !masterEnabled) return;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  // intensity 0-100 maps to opacity 0-0.4
  const opacity = (intensity / 100) * 0.4;
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: `rgba(255, 170, 50, ${opacity})`,
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
    zIndex: '2147483647',
    transition: 'background-color 0.3s ease',
  });
  document.documentElement.appendChild(overlay);
}

export function removeColorTemp() {
  document.getElementById(OVERLAY_ID)?.remove();
}
