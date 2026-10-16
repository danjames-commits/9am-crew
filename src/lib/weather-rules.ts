// Decides whether class (9–10 AM) should go outside. Pure, so it's easy to test.

export interface ClassHourWeather {
  tempC: number;
  feelsC: number;
  windKmh: number;
  gustKmh: number;
  precipProb: number; // %
  precipMm: number;
  code: number; // WMO weather code
}

export interface WeatherCall {
  outside: boolean;
  headline: string; // "Good for running outside"
  detail: string; // "9°, feels 6° · light wind · 10% rain"
}

const THUNDER = [95, 96, 99];
const SNOW = [71, 73, 75, 77, 85, 86];
const FREEZING = [56, 57, 66, 67];
const WET = [51, 53, 55, 61, 63, 65, 80, 81, 82];

function windWord(kmh: number) {
  if (kmh < 15) return 'light wind';
  if (kmh < 30) return 'breezy';
  return 'windy';
}

export function decide(w: ClassHourWeather): WeatherCall {
  const detail = `${Math.round(w.tempC)}°, feels ${Math.round(w.feelsC)}° · ${windWord(w.windKmh)} · ${Math.round(w.precipProb)}% chance of rain`;
  const inside = (why: string): WeatherCall => ({ outside: false, headline: `Inside today: ${why}`, detail });

  if (THUNDER.includes(w.code)) return inside('thunderstorms possible');
  if (FREEZING.includes(w.code)) return inside('freezing rain');
  if (SNOW.includes(w.code)) return inside('snow');
  if (w.precipProb >= 50 && (w.precipMm >= 0.3 || WET.includes(w.code))) return inside('rain likely');
  if (w.feelsC < -12) return inside('too cold');
  if (w.feelsC > 28) return inside('too hot');
  if (w.gustKmh >= 55) return inside('very windy');

  const layers = w.feelsC < 0 ? ' (dress warm)' : '';
  return { outside: true, headline: `Good for running outside${layers}`, detail };
}

/** Worst-case of the two class hours. */
export function combineHours(a: ClassHourWeather, b: ClassHourWeather): ClassHourWeather {
  return {
    tempC: Math.min(a.tempC, b.tempC),
    feelsC: Math.min(a.feelsC, b.feelsC),
    windKmh: Math.max(a.windKmh, b.windKmh),
    gustKmh: Math.max(a.gustKmh, b.gustKmh),
    precipProb: Math.max(a.precipProb, b.precipProb),
    precipMm: Math.max(a.precipMm, b.precipMm),
    code: Math.max(a.code, b.code),
  };
}
