"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { BedDouble, Loader2, Search, Sparkles, Star } from "lucide-react";
import { useDashboardShell } from "@/components/dashboard/premium/DashboardShellProvider";
import { describeApiLoadError } from "@/lib/api";
import {
  type HotelAgentRunResult,
  formatVietnamDateTime,
  formatVnd,
  lastAgentText,
  resumeHotelAgentApi,
  runHotelAgentApi,
  type HotelAgentUserProfile,
  type HotelAgentInterrupt,
  type HotelAgentOffer,
  type ActivityLogEntry,
  type SiteScanLog,
} from "@/lib/hotel-agent";
import { createClient } from "@/lib/supabase/client";
import { ROOM_TYPES } from "@/lib/room-types";
import {
  buildHotelSearchMessage,
  defaultUnifiedPlan,
  hotelSearchFormFromPlan,
  type HotelSearchForm,
} from "@/lib/trip-plan";

const THREAD_KEY = "wander-tale-hotel-agent-thread";

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_FORM: HotelSearchForm = hotelSearchFormFromPlan(defaultUnifiedPlan());

export type HotelPlanSync = {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  budgetNote?: string;
};

export type HotelBookingAgentRef = {
  search: () => void;
  isLoading: boolean;
};

type HotelBookingAgentProps = {
  syncPlan?: HotelPlanSync;
  embedded?: boolean;
  /** Ẩn form nhập — dùng form chung từ TripPlannerHub */
  hideForm?: boolean;
  form?: HotelSearchForm;
  phone?: string;
  onPhoneChange?: (phone: string) => void;
};

export const HotelBookingAgent = forwardRef<HotelBookingAgentRef, HotelBookingAgentProps>(
  function HotelBookingAgent(
    {
      syncPlan,
      embedded = false,
      hideForm = false,
      form: controlledForm,
      phone: controlledPhone,
      onPhoneChange,
    },
    ref
  ) {
  const { displayName } = useDashboardShell();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [internalPhone, setInternalPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HotelAgentRunResult | null>(null);
  const [email, setEmail] = useState("");
  const [internalForm, setInternalForm] = useState<HotelSearchForm>(DEFAULT_FORM);

  const form = controlledForm ?? internalForm;
  const phone = controlledPhone ?? internalPhone;
  const setPhone = onPhoneChange ?? setInternalPhone;

  useEffect(() => {
    if (controlledForm) return;
    if (!syncPlan?.city || !syncPlan.checkIn || !syncPlan.checkOut) return;
    setInternalForm((f) => ({
      ...f,
      city: syncPlan.city,
      checkIn: syncPlan.checkIn,
      checkOut: syncPlan.checkOut,
      adults: syncPlan.adults,
    }));
  }, [controlledForm, syncPlan?.city, syncPlan?.checkIn, syncPlan?.checkOut, syncPlan?.adults]);

  useEffect(() => {
    const saved = sessionStorage.getItem(THREAD_KEY);
    if (saved) setThreadId(saved);
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setEmail(data.user.email);
    })();
  }, []);

  const persistThread = useCallback((id: string) => {
    setThreadId(id);
    sessionStorage.setItem(THREAD_KEY, id);
  }, []);

  const profile = (): HotelAgentUserProfile | undefined => {
    if (!displayName || !email || phone.length < 8) return undefined;
    return { fullName: displayName, email, phone };
  };

  async function getToken(): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  function applyResponse(res: HotelAgentRunResult) {
    persistThread(res.threadId);
    setResult(res);
  }

  const handleSearch = useCallback(async () => {
    if (loading) return;
    if (!form.city.trim() || !form.checkIn || !form.checkOut) {
      setError("Vui lòng điền điểm đến và ngày đi ở form kế hoạch phía trên.");
      return;
    }
    if (form.checkIn >= form.checkOut) {
      setError("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Vui lòng đăng nhập lại.");
      const msg = buildHotelSearchMessage(form, syncPlan?.budgetNote);
      const res = await runHotelAgentApi(token, {
        message: msg,
        threadId: threadId ?? undefined,
        userProfile: profile(),
      });
      applyResponse(res);
    } catch (e) {
      const { summary, hint } = describeApiLoadError(e);
      setError(hint ? `${summary} ${hint}` : summary);
    } finally {
      setLoading(false);
    }
  }, [loading, form, syncPlan?.budgetNote, threadId, displayName, email, phone, persistThread]);

  useImperativeHandle(
    ref,
    () => ({
      search: () => {
        void handleSearch();
      },
      isLoading: loading,
    }),
    [handleSearch, loading]
  );

  async function handleResume(payload: unknown) {
    if (!threadId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Vui lòng đăng nhập lại.");
      const res = await resumeHotelAgentApi(token, {
        threadId,
        resume: payload,
        userProfile: profile(),
      });
      applyResponse(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Khi server reload (tsx watch) → MemorySaver mất checkpoint → resume trả 409
      if (msg.includes("thread_checkpoint_unavailable") || msg.includes("thread_not_found")) {
        sessionStorage.removeItem(THREAD_KEY);
        setThreadId(null);
        setResult(null);
        setError("Phiên agent đã hết hạn do server reload. Vui lòng bấm 'Quét giá ngay' để chạy lại từ đầu.");
      } else {
        const { summary, hint } = describeApiLoadError(e);
        setError(hint ? `${summary} ${hint}` : summary);
      }
    } finally {
      setLoading(false);
    }
  }

  function ensureProfileReady(): boolean {
    if (!displayName) {
      setError("Hồ sơ chưa có Họ tên. Vào trang Hồ sơ để cập nhật.");
      return false;
    }
    if (!email) {
      setError("Hồ sơ chưa có email.");
      return false;
    }
    if (phone.trim().length < 8) {
      setError("Vui lòng nhập số điện thoại (≥ 8 ký tự) trước khi chọn phòng.");
      return false;
    }
    return true;
  }

  function resetSession() {
    sessionStorage.removeItem(THREAD_KEY);
    setThreadId(null);
    setResult(null);
    setError(null);
  }

  const agentText = lastAgentText(result?.state.messages);
  const interrupt = result?.interrupt;
  const formFill = result?.state.formFill;
  const waiting = result?.interrupted ?? false;
  const step = result?.state.step;
  const interruptKind = interrupt?.kind;
  const planSynced = Boolean(syncPlan?.city && syncPlan.checkIn && syncPlan.checkOut);

  const inner = (
      <div className={embedded ? "space-y-4" : "space-y-4 p-5 md:p-6"}>
        {!embedded && !threadId && (
          <p className="text-sm text-premium-muted">
            Quét giá <strong className="text-premium-ink">thật</strong> trên Booking, Agoda, Vntrip — 3 tab Playwright
            song song, có nhật ký ngày giờ. Link thanh toán là trang OTA thật.
          </p>
        )}

        {!hideForm && (
          <>
            <ProfileFields
              phone={phone}
              email={email}
              onPhoneChange={setPhone}
              displayName={displayName}
              highlight={interruptKind === "confirm_selection" && phone.trim().length < 8}
            />
            {(!result || step === "init" || step === "parse_failed" || step === "need_dates" || step === "invalid_dates") && (
              <SearchFormFields form={form} onChange={setInternalForm} disabled={loading} planSynced={planSynced} />
            )}
          </>
        )}

        {loading && (
          <p className="flex items-center gap-2 text-sm text-premium-accent">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang quét 3 OTA song song qua Playwright (25–40 giây)…
          </p>
        )}

        {result?.state.activityLog?.length ? <ActivityTimeline entries={result.state.activityLog} /> : null}

        {result?.state.siteScans?.length ? <SiteScansPanel scans={result.state.siteScans} /> : null}

        {agentText && (
          <div className="rounded-2xl bg-premium-bg px-4 py-3 text-sm leading-relaxed text-premium-ink whitespace-pre-wrap">
            {agentText}
          </div>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Chọn phòng — danh sách radio */}
        {waiting && interruptKind === "confirm_selection" && (
          <OfferPicker
            interrupt={interrupt!}
            loading={loading}
            onConfirm={(idx) => {
              if (!ensureProfileReady()) return;
              handleResume({ approved: true, offerIndex: idx });
            }}
            onCancel={() => handleResume({ approved: false })}
          />
        )}

        {/* Confirm điền form / payment handoff — giữ panel xác nhận đơn giản */}
        {waiting && interruptKind && interruptKind !== "confirm_selection" && (
          <ConfirmPanel
            interrupt={interrupt!}
            step={step}
            loading={loading}
            onApprove={() => handleResume({ approved: true })}
            onReject={() => handleResume({ approved: false })}
          />
        )}

        {formFill?.paymentUrl && (
          <div className="rounded-2xl border border-premium-accent/30 bg-premium-accent/5 p-4">
            <p className="text-sm font-medium text-premium-ink">{formFill.message}</p>
            {formFill.checkoutReached === true && (
              <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Đã vào trang đặt phòng / checkout OTA
              </p>
            )}
            {formFill.checkoutReached === false && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Link dưới có thể là trang khách sạn — chọn phòng và bấm &quot;Tôi sẽ đặt&quot; nếu chưa thấy form thanh toán.
              </p>
            )}
            {formFill.searchPriceVnd != null && formFill.checkoutTotalVnd != null && (
              <p className="mt-1 text-xs text-premium-muted">
                Giá quét: {formatVnd(formFill.searchPriceVnd)} → checkout:{" "}
                <span className="font-semibold text-premium-ink">{formatVnd(formFill.checkoutTotalVnd)}</span>
              </p>
            )}
            {formFill.fieldsFilled != null && (
              <p className="mt-1 text-xs text-premium-muted">
                Đã điền {formFill.fieldsFilled}/4 trường (Họ, Tên, email, SĐT)
              </p>
            )}
            {formFill.startedAt && formFill.finishedAt && (
              <p className="mt-1 text-xs text-premium-muted">
                Điền form: {formatVietnamDateTime(formFill.startedAt)} → {formatVietnamDateTime(formFill.finishedAt)}
              </p>
            )}
            {formFill.qrHint && <p className="mt-2 text-xs text-premium-muted">{formFill.qrHint}</p>}
            <a
              href={formFill.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex break-all text-sm font-semibold text-premium-accent underline-offset-2 hover:underline"
            >
              {formFill.paymentUrl}
            </a>
          </div>
        )}

        {step === "done" && !waiting && (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Luồng đặt phòng hoàn tất. Kiểm tra email xác nhận sau khi bạn thanh toán.
          </p>
        )}

        {/* Nút quét giá — ẩn khi nhúng (nút ở TripPlannerHub); vẫn hiện "Quét lại" */}
        {(!embedded || result) && (!result || !waiting) && step !== "done" && (
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-premium-accent px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            {result ? "Quét lại với tiêu chí mới" : "Quét giá ngay"}
          </button>
        )}

        {threadId && (
          <button
            type="button"
            onClick={resetSession}
            className="ml-2 text-xs text-premium-muted underline-offset-2 hover:text-premium-ink hover:underline"
          >
            Bắt đầu phiên mới
          </button>
        )}
      </div>
  );

  if (embedded) return inner;

  return (
    <section className="rounded-3xl border border-premium-border bg-premium-surface shadow-[0_8px_30px_-12px_rgba(30,26,22,0.1)]">
      <div className="flex items-center gap-3 border-b border-premium-border px-5 py-4 md:px-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-premium-accent/15">
          <BedDouble className="h-5 w-5 text-premium-accent" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-lg text-premium-ink md:text-xl">Đặt phòng với AI</h2>
          <p className="text-xs text-premium-muted md:text-sm">Quét giá thật · Playwright realtime</p>
        </div>
      </div>
      {inner}
    </section>
  );
});

HotelBookingAgent.displayName = "HotelBookingAgent";

function SearchFormFields({
  form,
  onChange,
  disabled,
  planSynced = false,
}: {
  form: HotelSearchForm;
  onChange: (f: HotelSearchForm) => void;
  disabled: boolean;
  planSynced?: boolean;
}) {
  const update = <K extends keyof HotelSearchForm>(key: K, value: HotelSearchForm[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="rounded-2xl border border-premium-border bg-premium-bg/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-premium-muted">
        {planSynced ? "Tùy chọn đặt phòng" : "Tiêu chí tìm phòng"}
      </h3>
      {planSynced && (
        <p className="mb-3 rounded-xl bg-premium-surface px-3 py-2 text-xs text-premium-muted">
          <span className="font-medium text-premium-ink">{form.city}</span>
          {" · "}
          {form.checkIn} → {form.checkOut}
          {" · "}
          {form.adults} người lớn
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {!planSynced && (
          <label className="block text-xs font-medium text-premium-muted">
            Thành phố / Địa điểm
            <input
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              disabled={disabled}
              placeholder="Đà Lạt, Hà Nội, Đà Nẵng…"
              className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg px-3 text-sm text-premium-ink"
            />
          </label>
        )}
        <label className="block text-xs font-medium text-premium-muted">
          Loại phòng (tùy chọn)
          <select
            value={form.roomType}
            onChange={(e) => update("roomType", e.target.value)}
            disabled={disabled}
            className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg px-3 text-sm text-premium-ink"
          >
            {ROOM_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {!planSynced && (
          <>
            <label className="block text-xs font-medium text-premium-muted">
              Ngày nhận phòng
              <input
                type="date"
                value={form.checkIn}
                onChange={(e) => update("checkIn", e.target.value)}
                disabled={disabled}
                min={todayPlus(0)}
                className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg px-3 text-sm text-premium-ink"
              />
            </label>
            <label className="block text-xs font-medium text-premium-muted">
              Ngày trả phòng
              <input
                type="date"
                value={form.checkOut}
                onChange={(e) => update("checkOut", e.target.value)}
                disabled={disabled}
                min={form.checkIn || todayPlus(1)}
                className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg px-3 text-sm text-premium-ink"
              />
            </label>
            <label className="block text-xs font-medium text-premium-muted">
              Người lớn
              <input
                type="number"
                min={1}
                max={20}
                value={form.adults}
                onChange={(e) => update("adults", Math.max(1, Number(e.target.value) || 1))}
                disabled={disabled}
                className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg px-3 text-sm text-premium-ink"
              />
            </label>
          </>
        )}
        <label className="block text-xs font-medium text-premium-muted">
          Trẻ em
          <input
            type="number"
            min={0}
            max={10}
            value={form.children}
            onChange={(e) => update("children", Math.max(0, Number(e.target.value) || 0))}
            disabled={disabled}
            className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg px-3 text-sm text-premium-ink"
          />
        </label>
        <label className="block text-xs font-medium text-premium-muted">
          Số phòng
          <input
            type="number"
            min={1}
            max={10}
            value={form.rooms}
            onChange={(e) => update("rooms", Math.max(1, Number(e.target.value) || 1))}
            disabled={disabled}
            className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg px-3 text-sm text-premium-ink"
          />
        </label>
        <label className="col-span-full block text-xs font-medium text-premium-muted">
          Ghi chú thêm (tùy chọn)
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            disabled={disabled}
            placeholder="VD: gần trung tâm, có ban công, view hồ Xuân Hương…"
            rows={2}
            className="mt-1 w-full rounded-xl border border-premium-border bg-premium-bg px-3 py-2 text-sm text-premium-ink"
          />
        </label>
      </div>
    </div>
  );
}

function ProfileFields({
  phone,
  email,
  onPhoneChange,
  displayName,
  highlight = false,
}: {
  phone: string;
  email: string;
  onPhoneChange: (v: string) => void;
  displayName: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium text-premium-muted">
        Họ tên (từ hồ sơ)
        <input
          readOnly
          value={displayName ?? "—"}
          className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg/60 px-3 text-sm text-premium-ink"
        />
      </label>
      <label className="block text-xs font-medium text-premium-muted">
        Email
        <input
          readOnly
          value={email || "—"}
          className="mt-1 h-10 w-full rounded-xl border border-premium-border bg-premium-bg/60 px-3 text-sm text-premium-ink"
        />
      </label>
      <label className="col-span-full block text-xs font-medium text-premium-muted">
        Số điện thoại (bắt buộc trước bước điền form)
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+84901234567"
          className={`mt-1 h-10 w-full rounded-xl border bg-premium-bg px-3 text-sm text-premium-ink ${
            highlight ? "border-amber-500 ring-2 ring-amber-400/40" : "border-premium-border"
          }`}
        />
        {highlight && (
          <span className="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
            Nhập SĐT để agent có thể tự điền form đặt phòng cho bạn.
          </span>
        )}
      </label>
    </div>
  );
}

const PHASE_LABEL: Record<string, string> = {
  parse: "Phân tích",
  search: "Quét giá",
  compare: "So sánh",
  select: "Chọn phòng",
  fill: "Điền form",
  payment: "Thanh toán",
  error: "Lỗi",
};

function ActivityTimeline({ entries }: { entries: ActivityLogEntry[] }) {
  return (
    <div className="rounded-2xl border border-premium-border bg-premium-bg/80 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-premium-muted">Nhật ký thời gian thực</h3>
      <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
        {entries.map((e) => (
          <li key={e.id} className="border-l-2 border-premium-accent/40 pl-3 text-sm">
            <span className="font-mono text-[11px] text-premium-muted">{formatVietnamDateTime(e.at)}</span>
            <span className="ml-2 rounded bg-premium-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase text-premium-accent">
              {PHASE_LABEL[e.phase] ?? e.phase}
            </span>
            <p className="mt-0.5 font-medium text-premium-ink">{e.label}</p>
            {e.detail && <p className="text-xs text-premium-muted">{e.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SiteScansPanel({ scans }: { scans: SiteScanLog[] }) {
  return (
    <div className="rounded-2xl border border-premium-border p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-premium-muted">Chi tiết quét từng trang</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {scans.map((s) => (
          <li key={s.site} className="rounded-xl bg-premium-bg px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium capitalize text-premium-ink">{s.site}</span>
              <span
                className={
                  s.status === "ok"
                    ? "text-emerald-600"
                    : s.status === "empty"
                      ? "text-amber-600"
                      : "text-red-600"
                }
              >
                {s.status === "ok" ? `${s.offerCount} phòng` : s.status}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-premium-muted">
              {formatVietnamDateTime(s.startedAt)} → {formatVietnamDateTime(s.finishedAt)}
            </p>
            <a
              href={s.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-xs text-premium-accent hover:underline"
            >
              {s.searchUrl}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OfferPicker({
  interrupt,
  loading,
  onConfirm,
  onCancel,
}: {
  interrupt: HotelAgentInterrupt;
  loading: boolean;
  onConfirm: (offerIndex: number) => void;
  onCancel: () => void;
}) {
  const offers: HotelAgentOffer[] = useMemo(() => {
    const data = interrupt.data ?? {};
    if (Array.isArray(data.offers) && data.offers.length > 0) {
      return data.offers as HotelAgentOffer[];
    }
    const list: HotelAgentOffer[] = [];
    if (data.recommended) list.push(data.recommended);
    if (Array.isArray(data.alternatives)) list.push(...(data.alternatives as HotelAgentOffer[]));
    if (data.comparison) {
      if (data.comparison.recommended) list.push(data.comparison.recommended);
      if (Array.isArray(data.comparison.alternatives)) list.push(...data.comparison.alternatives);
    }
    return list;
  }, [interrupt]);

  const [selected, setSelected] = useState<number>(0);

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
        <p className="text-sm font-semibold text-premium-ink">Không có phòng nào để chọn.</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 h-10 rounded-xl border border-premium-border px-4 text-sm font-medium text-premium-ink"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-premium-accent/30 bg-premium-accent/5 p-4">
      <p className="text-sm font-semibold text-premium-ink">Chọn phòng phù hợp</p>
      {interrupt.summary && (
        <p className="mt-1 text-xs text-premium-muted">{interrupt.summary}</p>
      )}
      <ul className="mt-3 space-y-2" role="radiogroup" aria-label="Danh sách phòng">
        {offers.map((o, idx) => {
          const checked = selected === idx;
          return (
            <li key={`${o.site}-${o.bookingUrl}-${idx}`}>
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  checked
                    ? "border-premium-accent bg-premium-surface shadow-sm"
                    : "border-premium-border bg-premium-surface/60 hover:border-premium-accent/50"
                }`}
              >
                <input
                  type="radio"
                  name="offer"
                  checked={checked}
                  onChange={() => setSelected(idx)}
                  className="mt-1 h-4 w-4 accent-premium-accent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-premium-ink">
                      {idx === 0 && <span className="mr-1 text-[10px] uppercase text-premium-accent">Đề xuất</span>}
                      {o.hotelName}
                    </span>
                    <span className="font-semibold text-premium-ink">{formatVnd(o.priceVnd)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-premium-muted">
                    <span className="rounded bg-premium-bg px-1.5 py-0.5 capitalize text-premium-ink">{o.site}</span>
                    {o.roomName && <span>{o.roomName}</span>}
                    {typeof o.rating === "number" && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {o.rating.toFixed(1)}
                      </span>
                    )}
                    {o.nights && <span>{o.nights} đêm</span>}
                  </div>
                  {o.priceNote && (
                    <p className="mt-1 text-[11px] text-premium-muted italic">{o.priceNote}</p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm(selected)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-premium-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Chọn phòng này
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-xl border border-premium-border px-4 text-sm font-medium text-premium-ink disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

function ConfirmPanel({
  interrupt,
  step,
  loading,
  onApprove,
  onReject,
}: {
  interrupt: HotelAgentInterrupt;
  step?: string;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
      <p className="text-sm font-semibold text-premium-ink">{interrupt.title ?? "Xác nhận"}</p>
      {interrupt.summary && <p className="mt-2 text-sm text-premium-muted">{interrupt.summary}</p>}
      {step && (
        <p className="mt-1 text-[11px] uppercase tracking-wide text-premium-muted">Bước: {step}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onApprove}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-premium-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Xác nhận
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onReject}
          className="inline-flex h-10 items-center rounded-xl border border-premium-border px-4 text-sm font-medium text-premium-ink disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
