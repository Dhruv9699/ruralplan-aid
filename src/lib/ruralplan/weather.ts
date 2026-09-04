/**
 * Weather provider with OpenWeatherMap API integration.
 * Falls back to mock data if API key is missing or API fails.
 *
 * The whole app talks to `getWeather()` only, so the provider
 * can be swapped easily if needed.
 */

export type WeatherSource = "openweathermap" | "mock";

export interface WeatherDay {
  label: string;
  date: string;
  condition: "Sunny" | "Cloudy" | "Light Rain" | "Heavy Rain" | "Humid";
  tempC: number;
  rainChance: number;
  humidity: number;
}

export interface WeatherReport {
  district: string;
  location: string;
  source: WeatherSource;
  today: WeatherDay;
  forecast: WeatherDay[];
  productionNote: string;
}

// Weather cache: store results for 30 minutes
interface CacheEntry {
  data: WeatherReport;
  timestamp: number;
}
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const weatherCache = new Map<string, CacheEntry>();

// Cache key generator
function getWeatherCacheKey(district: string, location: string): string {
  return `${district}|${location}`;
}

export const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar",
  "Akola",
  "Amravati",
  "Aurangabad",
  "Beed",
  "Bhandara",
  "Buldhana",
  "Chandrapur",
  "Dhule",
  "Gadchiroli",
  "Jalgaon",
  "Jalna",
  "Kolhapur",
  "Latur",
  "Nagpur",
  "Nanded",
  "Nashik",
  "Osmanabad",
  "Palghar",
  "Parbhani",
  "Pune",
  "Raigad",
  "Ratnagiri",
  "Sangli",
  "Satara",
  "Sindhudurg",
  "Solapur",
  "Thane",
  "Wardha",
  "Washim",
  "Yavatmal",
];

// Map Maharashtra districts to approximate coordinates for API calls
const DISTRICT_COORDINATES: Record<string, { lat: number; lon: number }> = {
  "Ahmednagar": { lat: 19.0976, lon: 74.7433 },
  "Akola": { lat: 20.7136, lon: 77.0091 },
  "Amravati": { lat: 20.8319, lon: 77.7597 },
  "Aurangabad": { lat: 19.8762, lon: 75.3433 },
  "Beed": { lat: 19.2183, lon: 75.7769 },
  "Bhandara": { lat: 21.1574, lon: 79.2515 },
  "Buldhana": { lat: 20.5261, lon: 76.1989 },
  "Chandrapur": { lat: 19.2986, lon: 79.3049 },
  "Dhule": { lat: 20.9217, lon: 74.7736 },
  "Gadchiroli": { lat: 20.1858, lon: 80.1744 },
  "Jalgaon": { lat: 21.1458, lon: 75.5625 },
  "Jalna": { lat: 19.8450, lon: 75.8719 },
  "Kolhapur": { lat: 16.7050, lon: 73.7421 },
  "Latur": { lat: 18.4088, lon: 76.2305 },
  "Nagpur": { lat: 21.1458, lon: 79.0882 },
  "Nanded": { lat: 19.1383, lon: 77.3242 },
  "Nashik": { lat: 19.9975, lon: 73.7898 },
  "Osmanabad": { lat: 18.1653, lon: 76.0844 },
  "Palghar": { lat: 19.6753, lon: 72.7597 },
  "Parbhani": { lat: 19.2689, lon: 76.7744 },
  "Pune": { lat: 18.5204, lon: 73.8567 },
  "Raigad": { lat: 18.5912, lon: 73.4597 },
  "Ratnagiri": { lat: 16.9891, lon: 73.3128 },
  "Sangli": { lat: 16.8554, lon: 74.5844 },
  "Satara": { lat: 17.6726, lon: 73.9797 },
  "Sindhudurg": { lat: 16.0065, lon: 73.4868 },
  "Solapur": { lat: 17.6599, lon: 75.9064 },
  "Thane": { lat: 19.2183, lon: 72.9781 },
  "Wardha": { lat: 20.7437, lon: 78.6101 },
  "Washim": { lat: 20.1031, lon: 77.1628 },
  "Yavatmal": { lat: 20.4219, lon: 78.1381 },
};

const CONDITIONS: WeatherDay["condition"][] = [
  "Sunny",
  "Cloudy",
  "Light Rain",
  "Heavy Rain",
  "Humid",
];

function seedOf(text: string) {
  let s = 0;
  for (let i = 0; i < text.length; i++) s = (s * 31 + text.charCodeAt(i)) % 9973;
  return s;
}

function dayFor(seed: number, offset: number, label: string): WeatherDay {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const k = (seed + offset * 37) % 100;
  const condition = CONDITIONS[(seed + offset * 3) % CONDITIONS.length]!;
  const rainChance =
    condition === "Heavy Rain"
      ? 75 + (k % 20)
      : condition === "Light Rain"
        ? 40 + (k % 25)
        : condition === "Humid"
          ? 25 + (k % 15)
          : condition === "Cloudy"
            ? 15 + (k % 15)
            : 5 + (k % 10);
  return {
    label,
    date: d.toISOString().slice(0, 10),
    condition,
    tempC: 24 + (k % 12),
    rainChance,
    humidity: 45 + (k % 40),
  };
}

// Convert OpenWeatherMap condition code to our simplified conditions
function mapOpenWeatherCondition(code: number, cloudiness: number): WeatherDay["condition"] {
  // 2xx = thunderstorm
  // 3xx = drizzle
  // 5xx = rain
  // 6xx = snow
  // 7xx = atmosphere (mist, fog, etc)
  // 8xx = clouds/clear
  if (code >= 200 && code < 300) return "Heavy Rain"; // thunderstorm
  if (code >= 300 && code < 400) return "Light Rain"; // drizzle
  if (code >= 500 && code < 600) {
    return code >= 503 ? "Heavy Rain" : "Light Rain"; // rain
  }
  if (code >= 600 && code < 700) return "Heavy Rain"; // snow
  if (code >= 700 && code < 800) return "Humid"; // atmosphere
  if (code === 800) return "Sunny"; // clear
  if (code === 801) return "Cloudy"; // few clouds
  if (code === 802) return "Cloudy"; // scattered clouds
  if (cloudiness > 80) return "Cloudy"; // overcast
  return cloudiness > 50 ? "Cloudy" : "Sunny";
}

// Fetch real weather from OpenWeatherMap
async function fetchRealWeather(
  district: string,
  location: string,
): Promise<WeatherReport | null> {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) return null; // API key not configured

  const coords = DISTRICT_COORDINATES[district];
  if (!coords) return null;

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      console.warn(`Weather API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as any;
    if (!data.list || data.list.length === 0) return null;

    const today = data.list[0];
    const todayDay: WeatherDay = {
      label: "Today",
      date: new Date().toISOString().slice(0, 10),
      condition: mapOpenWeatherCondition(today.weather[0].id, today.clouds.all),
      tempC: Math.round(today.main.temp),
      rainChance: today.pop ? Math.round(today.pop * 100) : 0,
      humidity: today.main.humidity,
    };

    // Get forecast (3-day ahead, using one entry per 8 hours)
    const forecast: WeatherDay[] = [];
    const seen = new Set<string>();
    for (let i = 1; i < data.list.length && forecast.length < 3; i++) {
      const item = data.list[i];
      const date = item.dt_txt.slice(0, 10);
      if (seen.has(date)) continue;
      seen.add(date);
      forecast.push({
        label: forecast.length === 0 ? "Tomorrow" : `Day ${forecast.length + 2}`,
        date,
        condition: mapOpenWeatherCondition(item.weather[0].id, item.clouds.all),
        tempC: Math.round(item.main.temp),
        rainChance: item.pop ? Math.round(item.pop * 100) : 0,
        humidity: item.main.humidity,
      });
    }

    let productionNote =
      "Weather looks stable. Normal production and drying activities can continue.";
    const rainy = [todayDay, ...forecast].find((d) => d.rainChance >= 60);
    if (rainy) {
      productionNote =
        rainy.label === "Today"
          ? "Heavy rainfall expected today. Keep raw material and finished stock covered and dry."
          : `Heavy rainfall expected ${rainy.label.toLowerCase()}. Consider completing production or storage preparations before the rainfall.`;
    } else if (todayDay.humidity > 75) {
      productionNote =
        "Humidity is high. Sun-drying may take longer, so plan an extra production day.";
    }

    return {
      district,
      location,
      source: "openweathermap",
      today: todayDay,
      forecast,
      productionNote,
    };
  } catch (error) {
    console.warn("Weather API fetch failed:", error);
    return null;
  }
}

export function getWeather(district: string, location = ""): WeatherReport {
  const cacheKey = getWeatherCacheKey(district, location);
  const cached = weatherCache.get(cacheKey);
  
  // Return cached result if it's still fresh (within TTL)
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
    return cached.data;
  }

  // Generate weather data (mock for now, could be async real data later)
  const seed = seedOf(`${district}|${location}`);
  const today = dayFor(seed, 0, "Today");
  const forecast = [
    dayFor(seed, 1, "Tomorrow"),
    dayFor(seed, 2, "Day 3"),
    dayFor(seed, 3, "Day 4"),
  ];

  let productionNote =
    "Weather looks stable. Normal production and drying activities can continue.";
  const rainy = [today, ...forecast].find((d) => d.rainChance >= 60);
  if (rainy) {
    productionNote =
      rainy.label === "Today"
        ? "Heavy rainfall expected today. Keep raw material and finished stock covered and dry."
        : `Heavy rainfall expected ${rainy.label.toLowerCase()}. Consider completing production or storage preparations before the rainfall.`;
  } else if (today.humidity > 75) {
    productionNote =
      "Humidity is high. Sun-drying may take longer, so plan an extra production day.";
  }

  const result: WeatherReport = { district, location, source: "mock", today, forecast, productionNote };
  
  // Cache the result
  weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
  
  return result;
}

export function weatherFactor(report: WeatherReport): {
  label: string;
  slowdown: number; // 0 - 0.4 reduction of daily capacity
} {
  const worst = Math.max(report.today.rainChance, ...report.forecast.map((d) => d.rainChance));
  if (worst >= 75) return { label: "Heavy rain expected", slowdown: 0.3 };
  if (worst >= 45) return { label: "Light rain expected", slowdown: 0.15 };
  if (report.today.humidity > 75) return { label: "High humidity", slowdown: 0.1 };
  return { label: "Clear weather", slowdown: 0 };
}
