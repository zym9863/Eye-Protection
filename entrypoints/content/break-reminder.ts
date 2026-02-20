const REMINDER_ID = 'eye-protect-break-reminder';
let countdownTimer: ReturnType<typeof setInterval> | null = null;

export function showBreakReminder() {
  dismissBreakReminder();

  const overlay = document.createElement('div');
  overlay.id = REMINDER_ID;
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    zIndex: '2147483647',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#fff',
    transition: 'opacity 0.3s ease',
  });

  const icon = document.createElement('div');
  icon.textContent = '👁️';
  icon.style.fontSize = '64px';
  icon.style.marginBottom = '24px';

  const title = document.createElement('div');
  title.textContent = '该休息一下了';
  Object.assign(title.style, { fontSize: '28px', fontWeight: '600', marginBottom: '12px' });

  const subtitle = document.createElement('div');
  subtitle.textContent = '看看 6 米外的物体，让眼睛放松 20 秒';
  Object.assign(subtitle.style, { fontSize: '16px', color: '#aaa', marginBottom: '32px' });

  const countdown = document.createElement('div');
  let seconds = 20;
  countdown.textContent = `${seconds}s`;
  Object.assign(countdown.style, { fontSize: '48px', fontWeight: '700', marginBottom: '24px', color: '#4a6cf7' });

  const skipBtn = document.createElement('button');
  skipBtn.textContent = '跳过';
  Object.assign(skipBtn.style, {
    padding: '10px 32px', fontSize: '14px', fontWeight: '500',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
    backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer',
    transition: 'all 0.2s ease',
  });
  skipBtn.addEventListener('mouseenter', () => { skipBtn.style.backgroundColor = 'rgba(255,255,255,0.1)'; });
  skipBtn.addEventListener('mouseleave', () => { skipBtn.style.backgroundColor = 'transparent'; });
  skipBtn.addEventListener('click', dismissBreakReminder);

  overlay.append(icon, title, subtitle, countdown, skipBtn);
  document.documentElement.appendChild(overlay);

  countdownTimer = setInterval(() => {
    seconds--;
    countdown.textContent = `${seconds}s`;
    if (seconds <= 0) dismissBreakReminder();
  }, 1000);
}

export function dismissBreakReminder() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  document.getElementById(REMINDER_ID)?.remove();
}
