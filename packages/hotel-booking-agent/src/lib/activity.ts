import { randomUUID } from "node:crypto";
import type { ActivityLogEntry, ActivityPhase } from "../state.js";
import { formatVietnamDateTime, nowIso } from "./datetime.js";

export function logActivity(
  phase: ActivityPhase,
  label: string,
  detail?: string,
  at?: string
): ActivityLogEntry[] {
  return [
    {
      id: randomUUID(),
      phase,
      label,
      at: at ?? nowIso(),
      detail,
    },
  ];
}

export function formatActivityLine(entry: ActivityLogEntry): string {
  return `[${formatVietnamDateTime(entry.at)}] ${entry.label}${entry.detail ? ` — ${entry.detail}` : ""}`;
}
