import { IntentResolver, WeatherOneboxResult } from "../types";

const WEATHER_FIXTURES: Record<
  string,
  {
    condition: string;
    temperatureC: number;
    feelsLikeC: number;
    forecast: string[];
  }
> = {
  seattle: {
    condition: "Light rain",
    temperatureC: 9,
    feelsLikeC: 7,
    forecast: ["Showers through afternoon", "Overcast evening"]
  },
  toronto: {
    condition: "Partly cloudy",
    temperatureC: 4,
    feelsLikeC: 1,
    forecast: ["Dry through midday", "Colder overnight"]
  },
  austin: {
    condition: "Sunny",
    temperatureC: 24,
    feelsLikeC: 25,
    forecast: ["Warm afternoon", "Clear night"]
  }
};

function normalizeLocation(rawLocation: string): string {
  return rawLocation
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\b(today|tomorrow|tonight|this|weekend|next|week)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractLocation(query: string): string | null {
  const lowered = query.toLowerCase();
  const patternMatch = lowered.match(/(?:in|for|at)\s+([a-z\s-]{2,40})/);

  if (patternMatch?.[1]) {
    const candidate = normalizeLocation(patternMatch[1]);
    if (candidate.length > 1) {
      return candidate;
    }
  }

  for (const knownLocation of Object.keys(WEATHER_FIXTURES)) {
    if (lowered.includes(knownLocation)) {
      return knownLocation;
    }
  }

  return null;
}

export class InMemoryWeatherResolver implements IntentResolver<"weather", WeatherOneboxResult> {
  readonly id = "weather:in-memory";
  readonly intent = "weather" as const;
  readonly priority: number;

  constructor(priority = 90) {
    this.priority = priority;
  }

  async resolve(query: string): Promise<WeatherOneboxResult | null> {
    if (!/(weather|forecast|rain|snow|temperature|humidity|wind)/i.test(query)) {
      return null;
    }

    const location = extractLocation(query);
    if (!location) {
      return null;
    }

    const weather = WEATHER_FIXTURES[location];
    if (!weather) {
      return null;
    }

    return {
      intent: "weather",
      confidence: 0.78,
      source: "weather-fixture",
      summary: `${titleCase(location)}: ${weather.condition}, ${weather.temperatureC}C`,
      data: {
        location: titleCase(location),
        condition: weather.condition,
        temperatureC: weather.temperatureC,
        feelsLikeC: weather.feelsLikeC,
        forecast: weather.forecast
      }
    };
  }
}

// Refinement.
