import 'server-only';
import { combineHours, decide, type ClassHourWeather, type WeatherCall } from './weather-rules';
import { TIME_ZONE } from './dates';

// Where the crew trains. Defaults to Charlottetown, PEI.
const LAT = Number(process.env.GYM_LATITUDE ?? 46.2382);
const LON = Number(process.env.GYM_LONGITUDE ?? -63.1311);

export interface ClassWeather extends WeatherCall {
  date: string;
}

/** Forecast for 9–10 AM on a class day, or null if it isn't available
 *  (too far ahead, or the weather service didn't answer). Cached for 30 min. */
export async function classWeather(date: string): Promise<ClassWeather | null> {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,weather_code',
    timezone: TIME_ZONE,
    start_date: date,
    end_date: date,
  });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const h = data?.hourly;
    if (!h?.time) return null;
    const at = (hour: string): ClassHourWeather | null => {
      const i = (h.time as string[]).indexOf(`${date}T${hour}:00`);
      if (i < 0 || h.temperature_2m[i] == null) return null;
      return {
        tempC: h.temperature_2m[i],
        feelsC: h.apparent_temperature[i],
        windKmh: h.wind_speed_10m[i],
        gustKmh: h.wind_gusts_10m[i],
        precipProb: h.precipitation_probability[i] ?? 0,
        precipMm: h.precipitation[i] ?? 0,
        code: h.weather_code[i] ?? 0,
      };
    };
    const nine = at('09');
    const ten = at('10');
    if (!nine || !ten) return null;
    return { date, ...decide(combineHours(nine, ten)) };
  } catch {
    return null;
  }
}
