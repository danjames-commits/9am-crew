export type ThemeChoice = 'system' | 'light' | 'dark';

/**
 * Runs in <head> before the page draws, so there's no white flash.
 * Sets html[data-theme] for a manual pick (none = follow the phone) and
 * html[data-dark] whenever dark is actually showing. Re-runs if the phone switches.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');function a(){var s=null;try{s=localStorage.getItem('theme')}catch(e){}if(s==='light'||s==='dark')d.dataset.theme=s;else delete d.dataset.theme;if(s==='dark'||(s!=='light'&&m.matches))d.dataset.dark='';else delete d.dataset.dark;var c=getComputedStyle(d).getPropertyValue('--ground').trim();document.querySelectorAll('meta[name="theme-color"]').forEach(function(t){t.setAttribute('content',c)})}a();m.addEventListener('change',a);window.__applyTheme=a}catch(e){}})()`;

export function readTheme(): ThemeChoice {
  try {
    const s = localStorage.getItem('theme');
    return s === 'light' || s === 'dark' ? s : 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(t: ThemeChoice) {
  try {
    if (t === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', t);
  } catch {}
  (window as unknown as { __applyTheme?: () => void }).__applyTheme?.();
}
