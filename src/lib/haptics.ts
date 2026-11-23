/**
 * A short haptic tap.
 *
 * Android Chrome (and most browsers) have navigator.vibrate. iPhone Safari doesn't, but since
 * Safari 18, toggling a native <input type="checkbox" switch> plays the system haptic, so we
 * click a hidden one. That's a known workaround, not a documented API; it does nothing where
 * neither works.
 */
let label: HTMLLabelElement | null = null;

export function haptic(ms = 10): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
    return;
  }
  if (typeof document === 'undefined') return;
  if (!label || !label.isConnected) {
    label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
  }
  label.click();
}
