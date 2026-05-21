"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, CloudRain, CloudSun, Loader2, MapPin, Search, Sparkles, Sun } from "lucide-react";
import {
  HotelBookingAgent,
  type HotelBookingAgentRef,
} from "@/components/dashboard/premium/HotelBookingAgent";
import { useDashboardShell } from "@/components/dashboard/premium/DashboardShellProvider";
import { apiFetch, describeApiLoadError } from "@/lib/api";
import {
  defaultUnifiedPlan,
  hotelSearchFormFromPlan,
  hotelSyncFromPlan,
  ROOM_TYPES,
  type UnifiedPlannerForm,
} from "@/lib/trip-plan";
import {
  buildTripWeatherOverview,
  forecastWindowLabel,
  openWeatherIconUrl,
  OPENWEATHER_FORECAST_HORIZON_DAYS,
  summarizeWeatherForecast,
  weatherForTripRange,
  type WeatherDaySummary,
} from "@/lib/weather-summary";
import { wizardSchema, type WizardValues } from "@/schemas/wizard";
import { PREFERENCE_OPTIONS } from "@wander-tale/shared/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

const CONDITION_STYLE: Record<string, string> = {
  sunny: "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30",
  hot: "border-orange-200/80 bg-orange-50/80 dark:border-orange-900/40 dark:bg-orange-950/30",
  rainy: "border-sky-200/80 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/30",
  stormy: "border-indigo-200/80 bg-indigo-50/80 dark:border-indigo-900/40 dark:bg-indigo-950/30",
  cloudy: "border-premium-border bg-premium-bg/80",
  cool: "border-teal-200/80 bg-teal-50/80 dark:border-teal-900/40 dark:bg-teal-950/30",
};

const EMPTY_PLAN: UnifiedPlannerForm = {
  destination: "",
  start_date: "",
  end_date: "",
  budget: 2000,
  travelers: 2,
  pace: "balanced",
  preferences: [],
  roomType: "",
  children: 0,
  rooms: 1,
  hotelNotes: "",
  phone: "",
};

export function TripPlannerHub() {
  const router = useRouter();
  const { displayName } = useDashboardShell();
  const [planReady, setPlanReady] = useState(false);
  const [plan, setPlan] = useState<UnifiedPlannerForm>(EMPTY_PLAN);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState<string | null>(null);
  const [generateElapsed, setGenerateElapsed] = useState(0);
  const generateAbort = useRef<AbortController | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [allForecastDays, setAllForecastDays] = useState<WeatherDaySummary[] | null>(null);
  const [weatherPlace, setWeatherPlace] = useState<string | null>(null);
  const weatherAbort = useRef<AbortController | null>(null);
  const hotelRef = useRef<HotelBookingAgentRef>(null);
  const [hotelLoading, setHotelLoading] = useState(false);

  const hotelSync = useMemo(() => hotelSyncFromPlan(plan), [plan]);
  const hotelForm = useMemo(() => hotelSearchFormFromPlan(plan), [plan]);

  useEffect(() => {
    setPlan(defaultUnifiedPlan());
    setPlanReady(true);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setEmail(data.user.email);
    })();
  }, []);

  useEffect(() => {
    setHotelLoading(hotelRef.current?.isLoading ?? false);
    const id = setInterval(() => {
      setHotelLoading(hotelRef.current?.isLoading ?? false);
    }, 200);
    return () => clearInterval(id);
  }, [plan, generating]);

  const tripWeatherDays = useMemo(() => {
    if (!allForecastDays?.length || !plan.start_date || !plan.end_date) return [];
    return weatherForTripRange(allForecastDays, plan.start_date, plan.end_date);
  }, [allForecastDays, plan.start_date, plan.end_date]);

  const weatherOverview = useMemo(() => buildTripWeatherOverview(tripWeatherDays), [tripWeatherDays]);

  const canPreviewWeather =
    plan.destination.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(plan.start_date) &&
    /^\d{4}-\d{2}-\d{2}$/.test(plan.end_date) &&
    plan.end_date >= plan.start_date;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#plan") {
      document.getElementById("trip-planner")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  function togglePref(tag: (typeof PREFERENCE_OPTIONS)[number]) {
    setPlan((f) => ({
      ...f,
      preferences: f.preferences.includes(tag)
        ? f.preferences.filter((p) => p !== tag)
        : [...f.preferences, tag],
    }));
  }

  const validatePlan = useCallback((): WizardValues | null => {
    const parsed = wizardSchema.safeParse(plan);
    if (!parsed.success) {
      setError(parsed.error.issues.map((x) => x.message).join(", "));
      return null;
    }
    setError(null);
    return parsed.data;
  }, [plan]);

  async function getToken(): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  const fetchWeather = useCallback(async (): Promise<WeatherDaySummary[]> => {
    const data = validatePlan();
    if (!data) return [];

    weatherAbort.current?.abort();
    const ac = new AbortController();
    weatherAbort.current = ac;

    setWeatherLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Chưa đăng nhập");
      const q = new URLSearchParams({ destination: data.destination });
      const res = (await apiFetch(`/api/trips/preview?${q}`, token, {
        signal: ac.signal,
      })) as { destination: string; weather: unknown };
      if (ac.signal.aborted) return [];
      setWeatherPlace(res.destination);
      const days = summarizeWeatherForecast(res.weather, 8);
      setAllForecastDays(days);
      return weatherForTripRange(days, data.start_date, data.end_date);
    } catch (e) {
      if (ac.signal.aborted) return [];
      const { summary, hint } = describeApiLoadError(e);
      setError(hint ? `${summary} ${hint}` : summary);
      setAllForecastDays(null);
      return [];
    } finally {
      if (!ac.signal.aborted) setWeatherLoading(false);
    }
  }, [validatePlan]);

  useEffect(() => {
    if (!canPreviewWeather) {
      setAllForecastDays(null);
      setWeatherPlace(null);
      return;
    }
    const t = setTimeout(() => {
      void fetchWeather();
    }, 700);
    return () => clearTimeout(t);
  }, [canPreviewWeather, plan.destination, plan.start_date, plan.end_date, fetchWeather]);

  useEffect(() => {
    if (!generating) {
      setGenerateElapsed(0);
      return;
    }
    const id = setInterval(() => setGenerateElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [generating]);

  async function createItinerary() {
    const data = validatePlan();
    if (!data) return;
    generateAbort.current?.abort();
    const ac = new AbortController();
    generateAbort.current = ac;
    setGenerating(true);
    setGenerateStep("Đang sinh lịch (giá OTA load sau)…");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Chưa đăng nhập");
      const body = {
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        budget: data.budget,
        travelers: data.travelers,
        pace: data.pace,
        preferences: { tags: data.preferences },
        enrich_pricing: true,
        children: plan.children,
        rooms: plan.rooms,
      };

      const res = (await apiFetch("/api/trips/generate", token, {
        method: "POST",
        body: JSON.stringify(body),
        signal: ac.signal,
      })) as { trip: { id: string }; status?: string };

      if (ac.signal.aborted) return;
      if (!res?.trip?.id) throw new Error("Không nhận được lịch từ server.");
      router.push(`/trips/${res.trip.id}${res.status === "pricing_pending" ? "?ota=pending" : ""}`);
      router.refresh();
    } catch (e) {
      if (ac.signal.aborted) return;
      const { summary, hint } = describeApiLoadError(e);
      setError(hint ? `${summary} ${hint}` : summary);
    } finally {
      if (!ac.signal.aborted) {
        setGenerating(false);
        setGenerateStep(null);
      }
    }
  }

  return (
    <section id="trip-planner" className="scroll-mt-24 space-y-8">
      <div className="rounded-3xl border border-premium-border bg-premium-surface shadow-[0_8px_30px_-12px_rgba(30,26,22,0.1)]">
        <div className="flex flex-col gap-3 border-b border-premium-border px-5 py-5 md:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-premium-accent/15">
              <Sparkles className="h-5 w-5 text-premium-accent" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-xl text-premium-ink md:text-2xl">Kế hoạch &amp; đặt phòng với AI</h2>
              <p className="mt-0.5 text-sm text-premium-muted">
                Một nút — AI gợi ý địa điểm, quét giá phòng OTA (Booking / Agoda / Vntrip), rồi lịch từng ngày kèm
                giá ước tính.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          {!planReady ? (
            <div className="h-56 animate-pulse rounded-2xl bg-premium-border/40" aria-hidden />
          ) : (
            <>
          <UnifiedPlannerFormFields
            plan={plan}
            displayName={displayName}
            email={email}
            onChange={setPlan}
            onTogglePref={togglePref}
            disabled={generating || hotelLoading}
            phoneHighlight={false}
          />

          <WeatherPlanningPanel
            loading={weatherLoading}
            place={weatherPlace}
            tripDays={tripWeatherDays}
            forecastDays={allForecastDays ?? []}
            tripStart={plan.start_date}
            tripEnd={plan.end_date}
            overview={weatherOverview}
            canPreview={canPreviewWeather}
            hasDestination={plan.destination.trim().length >= 2}
          />

          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          {generating && (
            <div className="rounded-2xl border border-premium-border bg-premium-bg/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-premium-ink">
                <Loader2 className="h-4 w-4 animate-spin text-premium-accent" aria-hidden />
                <span className="flex-1">{generateStep ?? "Đang tạo lịch…"}</span>
                <span className="text-xs tabular-nums text-premium-muted">{generateElapsed}s</span>
              </div>
              <p className="mt-2 text-xs text-premium-muted">
                Lịch hiện trước (~10–15s), giá OTA cập nhật trên trang chi tiết.
              </p>
            </div>
          )}

          <div className="space-y-4 border-t border-premium-border pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-premium-muted">Hành động AI</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={generating || weatherLoading}
                onClick={createItinerary}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-premium-accent text-sm font-medium text-white disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {generateStep ?? "Đang tạo lịch…"}
                  </>
                ) : weatherLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang lấy thời tiết…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Tạo lịch trình (gợi ý + giá + agenda)
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={hotelLoading || generating || !canPreviewWeather}
                onClick={() => {
                  if (plan.phone.trim().length < 8) {
                    setError("Nhập số điện thoại (≥ 8 ký tự) trước khi quét giá phòng riêng.");
                    return;
                  }
                  setError(null);
                  hotelRef.current?.search();
                }}
                title="Quét OTA riêng (không tạo lịch) — hữu ích khi chỉ cần so sánh phòng"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-premium-border bg-premium-surface text-sm font-medium text-premium-ink disabled:opacity-50"
              >
                {hotelLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang quét OTA…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Chỉ quét phòng
                  </>
                )}
              </button>
            </div>
            <HotelBookingAgent
              ref={hotelRef}
              embedded
              hideForm
              form={hotelForm}
              phone={plan.phone}
              onPhoneChange={(phone) => setPlan((p) => ({ ...p, phone }))}
              syncPlan={hotelSync}
            />
          </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function WeatherPlanningPanel({
  loading,
  place,
  tripDays,
  forecastDays,
  tripStart,
  tripEnd,
  overview,
  canPreview,
  hasDestination,
}: {
  loading: boolean;
  place: string | null;
  tripDays: WeatherDaySummary[];
  forecastDays: WeatherDaySummary[];
  tripStart: string;
  tripEnd: string;
  overview: string | null;
  canPreview: boolean;
  hasDestination: boolean;
}) {
  const displayDays = tripDays.length > 0 ? tripDays : forecastDays;
  const tripOutsideForecast =
    !loading && canPreview && forecastDays.length > 0 && tripDays.length === 0;

  if (!hasDestination) {
    return (
      <div className="rounded-2xl border border-dashed border-premium-border bg-premium-bg/40 px-4 py-6 text-center text-sm text-premium-muted">
        Nhập điểm đến và ngày đi để xem thời tiết — AI sẽ gợi ý chỗ chơi phù hợp.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-premium-border bg-premium-bg/40 p-4 md:p-5">
      <div className="flex items-center gap-2">
        <CloudSun className="h-5 w-5 text-premium-accent" aria-hidden />
        <h3 className="text-sm font-semibold text-premium-ink">Thời tiết &amp; gợi ý chỗ chơi</h3>
        {loading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-premium-muted" />}
      </div>

      {place && (
        <p className="mt-2 flex items-center gap-1 text-xs text-premium-muted">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {place}
        </p>
      )}

      {overview && tripDays.length > 0 && (
        <p className="mt-3 rounded-xl bg-premium-surface px-3 py-2 text-xs leading-relaxed text-premium-ink">
          {overview}
        </p>
      )}

      {loading && displayDays.length === 0 ? (
        <p className="mt-4 text-xs text-premium-muted">Đang tải dự báo OpenWeather…</p>
      ) : null}

      {tripOutsideForecast ? (
        <p className="mt-4 text-xs text-amber-700 dark:text-amber-400">
          Ngày chuyến ({formatTripDayLabel(tripStart)} → {formatTripDayLabel(tripEnd)}) nằm ngoài dự báo{" "}
          {OPENWEATHER_FORECAST_HORIZON_DAYS} ngày tới
          {forecastWindowLabel(forecastDays) ? ` (${forecastWindowLabel(forecastDays)})` : ""}. Dưới đây là thời
          tiết tham khảo — đổi ngày gần hơn để khớp dự báo, hoặc vẫn tạo lịch (AI dùng mùa &amp; địa điểm).
        </p>
      ) : null}

      {!loading && canPreview && forecastDays.length === 0 && tripDays.length === 0 ? (
        <p className="mt-4 text-xs text-amber-700 dark:text-amber-400">
          Chưa tải được dự báo. Kiểm tra OPENWEATHER_API_KEY và khởi động lại backend, hoặc thử &quot;Đà Nẵng,
          VN&quot;.
        </p>
      ) : null}

      {displayDays.length > 0 ? (
        <WeatherDayList days={displayDays} referenceOnly={tripOutsideForecast} />
      ) : null}
    </div>
  );
}

function WeatherDayList({
  days,
  referenceOnly = false,
}: {
  days: WeatherDaySummary[];
  referenceOnly?: boolean;
}) {
  return (
    <ul
      className={cn(
        "grid auto-cols-[minmax(10.5rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1 snap-x snap-mandatory",
        referenceOnly ? "mt-3" : "mt-4"
      )}
    >
      {days.map((d) => (
        <li
          key={d.date}
          className={cn(
            "flex min-w-[10.5rem] snap-start flex-col rounded-xl border p-3",
            CONDITION_STYLE[d.condition] ?? CONDITION_STYLE.cloudy,
            referenceOnly && "opacity-90"
          )}
        >
          <div className="flex flex-col items-center text-center">
            <Image
              src={openWeatherIconUrl(d.icon)}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12"
              unoptimized
            />
            <p className="mt-1 text-xs font-semibold text-premium-ink">{formatTripDayLabel(d.date)}</p>
            <p className="text-[11px] text-premium-muted">
              {d.tempMin}° – {d.tempMax}°
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-premium-muted">{d.label}</p>
            <div className="mt-2">
              <ConditionBadge condition={d.condition} />
            </div>
          </div>
          <p className="mt-3 flex-1 text-[11px] leading-snug text-premium-ink">
            <span className="font-medium">Gợi ý: </span>
            {d.activityHint}
          </p>
        </li>
      ))}
    </ul>
  );
}


function ConditionBadge({ condition }: { condition: string }) {
  const Icon = condition === "rainy" || condition === "stormy" ? CloudRain : Sun;
  const label =
    condition === "rainy"
      ? "Mưa"
      : condition === "stormy"
        ? "Giông"
        : condition === "hot"
          ? "Nóng"
          : condition === "cool"
            ? "Mát"
            : condition === "sunny"
              ? "Nắng"
              : "Nhiều mây";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-premium-surface/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-premium-muted">
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

function formatTripDayLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function UnifiedPlannerFormFields({
  plan,
  displayName,
  email,
  onChange,
  onTogglePref,
  disabled,
  phoneHighlight,
}: {
  plan: UnifiedPlannerForm;
  displayName: string | null;
  email: string;
  onChange: (v: UnifiedPlannerForm) => void;
  onTogglePref: (tag: (typeof PREFERENCE_OPTIONS)[number]) => void;
  disabled?: boolean;
  phoneHighlight?: boolean;
}) {
  const fieldClass =
    "mt-1 h-11 w-full rounded-xl border border-premium-border bg-premium-surface px-3 text-sm text-premium-ink";
  const labelClass = "block text-xs font-medium text-premium-muted";

  return (
    <div className="grid gap-5 rounded-2xl border border-premium-border bg-premium-bg/50 p-4 md:p-5">
      <label className={labelClass}>
        Điểm đến
        <input
          required
          value={plan.destination}
          onChange={(e) => onChange({ ...plan, destination: e.target.value })}
          disabled={disabled}
          placeholder="Ví dụ: Đà Nẵng, Việt Nam"
          className={fieldClass}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          Bắt đầu
          <input
            type="date"
            required
            value={plan.start_date}
            onChange={(e) => onChange({ ...plan, start_date: e.target.value })}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Kết thúc
          <input
            type="date"
            required
            value={plan.end_date}
            onChange={(e) => onChange({ ...plan, end_date: e.target.value })}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Ngân sách (gồm phòng)
          <input
            type="number"
            required
            min={1}
            value={plan.budget}
            onChange={(e) => onChange({ ...plan, budget: Number(e.target.value) })}
            disabled={disabled}
            title="Ước tính tổng chi phí chuyến, bao gồm đặt phòng"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Người lớn
          <input
            type="number"
            required
            min={1}
            max={20}
            value={plan.travelers}
            onChange={(e) => onChange({ ...plan, travelers: Number(e.target.value) })}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          Nhịp độ
          <select
            value={plan.pace}
            onChange={(e) => onChange({ ...plan, pace: e.target.value as WizardValues["pace"] })}
            disabled={disabled}
            className={fieldClass}
          >
            <option value="relaxed">Thư giãn</option>
            <option value="balanced">Cân bằng</option>
            <option value="packed">Dày đặc</option>
          </select>
        </label>
        <label className={labelClass}>
          Loại phòng
          <select
            value={plan.roomType}
            onChange={(e) => onChange({ ...plan, roomType: e.target.value })}
            disabled={disabled}
            className={fieldClass}
          >
            {ROOM_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Số phòng
          <input
            type="number"
            min={1}
            max={10}
            value={plan.rooms}
            onChange={(e) => onChange({ ...plan, rooms: Math.max(1, Number(e.target.value) || 1) })}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Trẻ em
          <input
            type="number"
            min={0}
            max={10}
            value={plan.children}
            onChange={(e) => onChange({ ...plan, children: Math.max(0, Number(e.target.value) || 0) })}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Ghi chú phòng (tùy chọn)
        <input
          value={plan.hotelNotes}
          onChange={(e) => onChange({ ...plan, hotelNotes: e.target.value })}
          disabled={disabled}
          placeholder="Gần trung tâm, view biển…"
          className={fieldClass}
        />
      </label>

      <div>
        <p className={labelClass}>Sở thích</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PREFERENCE_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => onTogglePref(tag)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                plan.preferences.includes(tag)
                  ? "bg-premium-accent text-white"
                  : "border border-premium-border bg-premium-surface text-premium-muted"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 border-t border-premium-border/80 pt-4 sm:grid-cols-3">
        <label className={labelClass}>
          Họ tên
          <input readOnly value={displayName ?? "—"} className={`${fieldClass} bg-premium-bg/60`} />
        </label>
        <label className={labelClass}>
          Email
          <input readOnly value={email || "—"} className={`${fieldClass} bg-premium-bg/60`} />
        </label>
        <label className={labelClass}>
          Điện thoại
          <input
            type="tel"
            value={plan.phone}
            onChange={(e) => onChange({ ...plan, phone: e.target.value })}
            disabled={disabled}
            placeholder="+84901234567"
            className={`${fieldClass} ${
              phoneHighlight ? "border-amber-500 ring-2 ring-amber-400/40" : ""
            }`}
          />
        </label>
      </div>
    </div>
  );
}
