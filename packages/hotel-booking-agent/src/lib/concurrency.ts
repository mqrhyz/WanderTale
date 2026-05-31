import { getHotelAgentEnv } from "../config/env.js";

type QueueItem<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  cancelled: boolean;
};

let active = 0;
const queue: QueueItem<unknown>[] = [];

function drain() {
  const max = getHotelAgentEnv().HOTEL_AGENT_MAX_CONCURRENT_JOBS;
  while (active < max && queue.length > 0) {
    const item = queue.shift()!;
    if (item.cancelled) continue;
    active += 1;
    void item
      .run()
      .then(item.resolve, item.reject)
      .finally(() => {
        active -= 1;
        drain();
      });
  }
}

export function runExclusiveJob<T>(
  label: string,
  run: () => Promise<T>,
  timeoutMs?: number
): Promise<T> {
  const limit = timeoutMs ?? getHotelAgentEnv().HOTEL_AGENT_JOB_TIMEOUT_MS;
  let item: QueueItem<T> | null = null;
  let timer: NodeJS.Timeout | undefined;

  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      if (item) item.cancelled = true;
      reject(new Error(`${label} timed out after ${Math.round(limit / 1000)}s`));
    }, limit);

    item = {
      run,
      resolve: (value) => {
        if (timer) clearTimeout(timer);
        resolve(value);
      },
      reject: (reason) => {
        if (timer) clearTimeout(timer);
        reject(reason);
      },
      cancelled: false,
    };

    queue.push(item as QueueItem<unknown>);
    drain();
  });
}
