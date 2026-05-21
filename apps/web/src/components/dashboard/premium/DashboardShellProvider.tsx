"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { DashboardAppShell } from "@/components/dashboard/premium/DashboardAppShell";
import { apiFetch, describeApiLoadError } from "@/lib/api";
import type { TripRow } from "@/lib/dashboard";
import { getTripPhase } from "@/lib/dashboard";
import { readTripsCache, writeTripsCache } from "@/lib/dashboard-trips-cache";
import { createClient } from "@/lib/supabase/client";

type DashboardShellContextValue = {
  displayName: string | null;
  search: string;
  setSearch: (q: string) => void;
  trips: TripRow[];
  tripsLoading: boolean;
  refreshTrips: () => Promise<void>;
  filterTrips: (predicate?: (t: TripRow) => boolean) => TripRow[];
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

export function useDashboardShell() {
  const ctx = useContext(DashboardShellContext);
  if (!ctx) throw new Error("useDashboardShell must be used within DashboardShellProvider");
  return ctx;
}

export function DashboardShellProvider({ children }: { children: React.ReactNode }) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  /** Luôn [] lúc SSR + hydration — cache chỉ áp sau mount để tránh lệch HTML server/client. */
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [bootErr, setBootErr] = useState<string | null>(null);
  const [bootHint, setBootHint] = useState<string | null>(null);

  const loadTrips = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setTripsLoading(true);
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setBootErr("Chưa đăng nhập");
      setBootHint(null);
      setTrips([]);
      setTripsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const metaName = userData.user?.user_metadata?.display_name as string | undefined;
    const email = userData.user?.email;
    if (metaName) setDisplayName(metaName);
    else if (email) setDisplayName(email.split("@")[0]);

    const list = (await apiFetch("/api/trips", token)) as TripRow[];
    setTrips(list);
    writeTripsCache(list);
    setBootErr(null);
    setBootHint(null);
    setTripsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = readTripsCache();
    if (cached?.length) {
      setTrips(cached);
      setTripsLoading(false);
    }
    (async () => {
      try {
        await loadTrips({ silent: Boolean(cached?.length) });
      } catch (e) {
        if (!cancelled) {
          const { summary, hint } = describeApiLoadError(e);
          setBootErr(summary);
          setBootHint(hint);
          setTripsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
  }, []);

  const sortedTrips = useMemo(() => {
    const order = { ongoing: 0, upcoming: 1, completed: 2 } as const;
    const q = search.trim().toLowerCase();
    return [...trips]
      .filter((t) => !q || t.destination.toLowerCase().includes(q))
      .sort((a, b) => {
        const pa = getTripPhase(a.start_date, a.end_date);
        const pb = getTripPhase(b.start_date, b.end_date);
        if (order[pa] !== order[pb]) return order[pa] - order[pb];
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });
  }, [trips, search]);

  const filterTrips = useCallback(
    (predicate?: (t: TripRow) => boolean) =>
      predicate ? sortedTrips.filter(predicate) : sortedTrips,
    [sortedTrips]
  );

  const value = useMemo(
    () => ({
      displayName,
      search,
      setSearch,
      trips,
      tripsLoading,
      refreshTrips: () => loadTrips(),
      filterTrips,
    }),
    [displayName, search, trips, tripsLoading, loadTrips, filterTrips]
  );

  if (bootErr && !trips.length) {
    return (
      <DashboardAppShell displayName={displayName} search={search} onSearchChange={setSearch}>
        <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-premium-surface p-8 text-center">
          <p className="text-base text-premium-ink">{bootErr}</p>
          {bootHint ? <p className="mt-4 text-left text-sm text-premium-muted">{bootHint}</p> : null}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {bootHint ? (
              <button
                type="button"
                onClick={() => void loadTrips()}
                className="rounded-2xl bg-premium-accent px-4 py-2.5 text-sm font-medium text-white"
              >
                Tải lại
              </button>
            ) : null}
            <Link href="/login" className="rounded-2xl border border-premium-border px-4 py-2.5 text-sm font-medium text-premium-ink">
              Đăng nhập
            </Link>
          </div>
        </div>
      </DashboardAppShell>
    );
  }

  return createElement(
    DashboardShellContext.Provider,
    { value },
    createElement(DashboardAppShell, { displayName, search, onSearchChange: setSearch }, children)
  );
}
