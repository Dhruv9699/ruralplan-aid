/**
 * Mock weather provider.
 *
 * The whole app talks to `getWeather()` only, so a real weather API can be
 * connected later by replacing the body of this function (or by calling a
 * server function from here). No paid API is required for the prototype.
 */

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
  source: "mock";
  today: WeatherDay;
  forecast: WeatherDay[];
  productionNote: string;
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
  const condition = CONDITIONS[(seed + offset * 3) % CONDITIONS.length];
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

export function getWeather(district: string, location = ""): WeatherReport {
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

  return { district, location, source: "mock", today, forecast, productionNote };
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
