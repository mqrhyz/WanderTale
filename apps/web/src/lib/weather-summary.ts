export type WeatherDaySummary = {
  date: string;
  label: string;
  tempMin: number;
  tempMax: number;
  icon: string;
  condition: WeatherCondition;
  activityHint: string;
};

export type WeatherCondition = "sunny" | "rainy" | "cloudy" | "stormy" | "hot" | "cool";

type OwForecast = {
  list?: Array<{
    dt_txt?: string;
    main?: { temp_min?: number; temp_max?: number; temp?: number };
    weather?: Array<{ description?: string; icon?: string }>;
  }>;
};

const ACTIVITY_HINTS: Record<WeatherCondition, string> = {
  sunny: "Nắng đẹp — ưu tiên bãi biển, đi bộ, viewpoint, công viên",
  rainy: "Có mưa — ưu tiên bảo tàng, cafe, TT thương mại, ẩm thực trong nhà",
  cloudy: "Nhiều mây — phố cổ, chợ địa phương, tour nhẹ, chụp ảnh",
  stormy: "Mưa to/giông — hạn chế di chuyển xa; spa, lẩu, hoạt động gần khách sạn",
  hot: "Nắng nóng — sáng sớm/chiều mát cho ngoài trời; trưa nghỉ trong nhà",
  cool: "Thời tiết mát — trekking nhẹ, cà phê view, ẩm thực địa phương",
};

/** Gom dự báo OpenWeather theo ngày. */
export function summarizeWeatherForecast(raw: unknown, maxDays = 8): WeatherDaySummary[] {
  const data = raw as OwForecast;
  const list = data.list ?? [];
  const byDay = new Map<string, { mins: number[]; maxs: number[]; desc: string; icon: string }>();

  for (const item of list) {
    const day = item.dt_txt?.slice(0, 10);
    if (!day) continue;
    const min = item.main?.temp_min ?? item.main?.temp;
    const max = item.main?.temp_max ?? item.main?.temp;
    if (min == null || max == null) continue;
    const w = item.weather?.[0];
    const bucket = byDay.get(day) ?? { mins: [], maxs: [], desc: w?.description ?? "", icon: w?.icon ?? "01d" };
    bucket.mins.push(min);
    bucket.maxs.push(max);
    if (w?.description) bucket.desc = w.description;
    if (w?.icon) bucket.icon = w.icon;
    byDay.set(day, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, maxDays)
    .map(([date, b]) => {
      const tempMin = Math.round(Math.min(...b.mins));
      const tempMax = Math.round(Math.max(...b.maxs));
      const icon = b.icon;
      const condition = classifyWeather(icon, tempMin, tempMax);
      return {
        date,
        label: capitalize(b.desc),
        tempMin,
        tempMax,
        icon,
        condition,
        activityHint: ACTIVITY_HINTS[condition],
      };
    });
}

export function weatherForTripRange(
  days: WeatherDaySummary[],
  startDate: string,
  endDate: string
): WeatherDaySummary[] {
  return days.filter((d) => d.date >= startDate && d.date <= endDate);
}

/** Số ngày dự báo tối đa từ OpenWeather (gói free /forecast). */
export const OPENWEATHER_FORECAST_HORIZON_DAYS = 5;

export function forecastWindowLabel(days: WeatherDaySummary[]): string | null {
  if (!days.length) return null;
  return `${formatViDate(days[0].date)} – ${formatViDate(days[days.length - 1].date)}`;
}

function formatViDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
  });
}

/** Tóm tắt gợi ý chung trước khi tạo lịch trình. */
export function buildTripWeatherOverview(days: WeatherDaySummary[]): string | null {
  if (days.length === 0) return null;
  const rainy = days.filter((d) => d.condition === "rainy" || d.condition === "stormy").length;
  const sunny = days.filter((d) => d.condition === "sunny" || d.condition === "hot").length;
  const parts: string[] = [];
  if (sunny > 0) parts.push(`${sunny} ngày thuận lợi cho hoạt động ngoài trời`);
  if (rainy > 0) parts.push(`${rainy} ngày nên ưu tiên địa điểm trong nhà`);
  if (parts.length === 0) return "Thời tiết trung bình — AI cân bằng giữa trong nhà và ngoài trời.";
  return `${parts.join(" · ")}. AI sẽ gợi ý chỗ chơi phù hợp từng ngày.`;
}

export function openWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function classifyWeather(icon: string, tempMin: number, tempMax: number): WeatherCondition {
  if (icon.includes("11") || icon.startsWith("09")) return "stormy";
  if (icon.includes("10") || icon.includes("50") || icon.includes("13")) return "rainy";
  if (tempMax >= 35) return "hot";
  if (tempMax <= 20 && tempMin <= 16) return "cool";
  if (icon.includes("01") || icon.includes("02")) return "sunny";
  return "cloudy";
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
