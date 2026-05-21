"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export type TripStreamEvent = {
  type: string;
  tripId: string;
  payload?: Record<string, unknown>;
};

type Options = {
  enabled?: boolean;
  onEvent?: (event: TripStreamEvent) => void;
  onReload?: () => void;
};

/**
 * SSE trip updates via fetch (supports Authorization header).
 * Falls back to caller polling if stream fails after max reconnects.
 */
export function useTripStream(tripId: string, options: Options = {}) {
  const { enabled = true, onEvent, onReload } = options;
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);
  const reconnectAttempt = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const connect = useCallback(async () => {
    if (!enabled || !tripId) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setFailed(true);
      return;
    }

    const url = `${apiBaseUrl()}/api/trips/${tripId}/stream`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: ac.signal,
      });

      if (!res.ok) throw new Error(`SSE HTTP ${res.status}`);

      setConnected(true);
      setFailed(false);
      reconnectAttempt.current = 0;

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No SSE body");

      const decoder = new TextDecoder();
      let buffer = "";

      const dispatch = (eventType: string, data: string) => {
        if (!data) return;
        try {
          const parsed = JSON.parse(data) as TripStreamEvent;
          onEvent?.(parsed);
          if (
            parsed.type === "prices_ready" ||
            parsed.type === "images_ready" ||
            parsed.type === "hotel_images_ready" ||
            parsed.type === "coords_ready" ||
            parsed.type === "complete" ||
            parsed.type === "trip_update"
          ) {
            onReload?.();
          }
        } catch {
          /* ignore */
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          if (!block.trim() || block.startsWith(":")) continue;
          let eventType = "message";
          let data = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) eventType = line.slice(6).trim();
            else if (line.startsWith("data:")) data = line.slice(5).trim();
          }
          dispatch(eventType, data);
        }
      }
    } catch (e) {
      if (ac.signal.aborted) return;
      setConnected(false);
      reconnectAttempt.current += 1;
      if (reconnectAttempt.current >= 3) {
        setFailed(true);
        return;
      }
      const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt.current);
      setTimeout(() => void connect(), delay);
    }
  }, [enabled, tripId, onEvent, onReload]);

  useEffect(() => {
    void connect();
    return () => abortRef.current?.abort();
  }, [connect]);

  return { connected, failed };
}
