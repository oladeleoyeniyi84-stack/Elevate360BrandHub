import { storage } from "../storage";
import type { InsertAutomationJob } from "@shared/schema";

type JobConfig = {
  jobKey: string;
  jobGroup: string;
  cadenceMinutes: number;
  run: () => Promise<{ summary?: string; meta?: Record<string, unknown> } | void>;
};

const timers = new Map<string, NodeJS.Timeout>();

// Node.js setTimeout uses a 32-bit signed integer for the delay, so values
// above ~24.8 days (2,147,483,647 ms) wrap to 1ms and fire immediately.
// We cap each tick to 60 minutes and use in-memory nextRunAt tracking for
// long-cadence jobs to avoid the infinite-loop overflow.
const MAX_SAFE_DELAY_MS = 60 * 60 * 1000; // 1 hour
const MIN_DELAY_MS = 1_000; // never sleep less than 1s

export async function registerRecurringJob(config: JobConfig, bootDelayMs = 60_000) {
  const cadenceMs = config.cadenceMinutes * 60_000;

  // Read existing job record to preserve nextRunAt if it's still in the future.
  // This prevents all jobs from re-running on every server restart (autoscale lifecycle).
  const existing = await storage.getAutomationJob(config.jobKey).catch(() => null);
  const storedNextRun = existing?.nextRunAt ? new Date(existing.nextRunAt).getTime() : 0;
  const bootNextRun = Date.now() + bootDelayMs;
  // Use the stored nextRunAt if it's still in the future; otherwise schedule via boot delay
  const resolvedNextRun = storedNextRun > Date.now() ? storedNextRun : bootNextRun;

  await storage.upsertAutomationJob(config.jobKey, {
    jobGroup: config.jobGroup,
    cadenceMinutes: config.cadenceMinutes,
    status: existing?.status === "running" ? "idle" : (existing?.status ?? "idle"),
    isEnabled: true,
    nextRunAt: new Date(resolvedNextRun),
  });

  // Track next scheduled run time in memory
  let nextRunAt = resolvedNextRun;

  const invoke = async () => {
    const startedAt = new Date();
    try {
      await storage.upsertAutomationJob(config.jobKey, {
        status: "running",
        lastStartedAt: startedAt,
      });

      const result = await config.run();

      const now = new Date();
      nextRunAt = Date.now() + cadenceMs;
      // Read current counters to do a safe per-run increment. Used by the
      // Phase 54 recovery engine to enforce MAX_RETRY_FAILURES.
      const current = await storage.getAutomationJob(config.jobKey).catch(() => null);
      await storage.upsertAutomationJob(config.jobKey, {
        status: "succeeded",
        lastFinishedAt: now,
        lastSucceededAt: now,
        nextRunAt: new Date(nextRunAt),
        runCount: (current?.runCount ?? 0) + 1,
        successCount: (current?.successCount ?? 0) + 1,
        failureCount: 0, // reset consecutive failures on success
      });

      await storage.createAutomationJobLog({
        jobKey: config.jobKey,
        status: "succeeded",
        summary: result?.summary ?? "ok",
        meta: (result?.meta ?? null) as any,
        finishedAt: now,
      });

      console.log(`[jobRunner] ${config.jobKey} succeeded — ${result?.summary ?? "ok"}`);
    } catch (error: any) {
      const now = new Date();
      nextRunAt = Date.now() + cadenceMs;
      const current = await storage.getAutomationJob(config.jobKey).catch(() => null);
      await storage.upsertAutomationJob(config.jobKey, {
        status: "failed",
        lastFinishedAt: now,
        lastFailedAt: now,
        lastError: error?.message ?? "unknown error",
        nextRunAt: new Date(nextRunAt),
        runCount: (current?.runCount ?? 0) + 1,
        failureCount: (current?.failureCount ?? 0) + 1,
      });

      await storage.createAutomationJobLog({
        jobKey: config.jobKey,
        status: "failed",
        summary: error?.message ?? "unknown error",
        meta: { stack: error?.stack ?? null } as any,
        finishedAt: now,
      });

      console.error(`[jobRunner] ${config.jobKey} failed —`, error?.message);
    }
  };

  // Calculate actual initial delay from resolvedNextRun (respects stored schedule)
  const initialDelayMs = Math.max(resolvedNextRun - Date.now(), MIN_DELAY_MS);
  const firstRunLabel = storedNextRun > Date.now()
    ? `${Math.round((storedNextRun - Date.now()) / 60_000)}m (stored schedule)`
    : `${Math.round(bootDelayMs / 1000)}s (boot delay)`;

  if (cadenceMs > MAX_SAFE_DELAY_MS) {
    // Long-cadence job: poll every hour, run only when actually due.
    // This avoids the 32-bit integer overflow that causes immediate infinite firing.
    const poll = async () => {
      const delay = Math.min(Math.max(nextRunAt - Date.now(), MIN_DELAY_MS), MAX_SAFE_DELAY_MS);

      const timer = setTimeout(async () => {
        if (Date.now() >= nextRunAt) {
          await invoke();
        }
        // Always re-schedule the next poll regardless
        poll();
      }, delay);

      timers.set(config.jobKey, timer);
    };

    // First poll uses resolvedNextRun (NOT boot delay override)
    const firstPollDelay = Math.min(initialDelayMs, MAX_SAFE_DELAY_MS);
    const initTimer = setTimeout(() => poll(), firstPollDelay);
    timers.set(config.jobKey, initTimer);
  } else {
    // Short-cadence job: standard setTimeout tick chain (safe, no overflow risk).
    // Use resolvedNextRun for first delay so stored schedule is respected on restart.
    const firstDelay = Math.min(initialDelayMs, MAX_SAFE_DELAY_MS);
    const timer = setTimeout(async function tick() {
      await invoke();
      timers.set(config.jobKey, setTimeout(tick, cadenceMs));
    }, firstDelay);
    timers.set(config.jobKey, timer);
  }

  console.log(`[jobRunner] registered ${config.jobKey} (every ${config.cadenceMinutes}m, first run in ${firstRunLabel})`);
}

export function stopAllAutomationJobs() {
  for (const timer of Array.from(timers.values())) clearTimeout(timer);
  timers.clear();
}
