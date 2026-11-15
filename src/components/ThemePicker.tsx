'use client';
import { useEffect, useState } from 'react';
import { readTheme, setTheme, type ThemeChoice } from '@/lib/theme';

const CHOICES: { id: ThemeChoice; label: string }[] = [
  { id: 'system', label: 'Match phone' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function ThemePicker() {
  const [theme, setChoice] = useState<ThemeChoice>('system');
  useEffect(() => setChoice(readTheme()), []);

  return (
    <div className="card stack">
      <h2>Look</h2>
      <div className="segmented" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} role="group" aria-label="Light or dark">
        {CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={theme === c.id}
            onClick={() => {
              setChoice(c.id);
              setTheme(c.id);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
