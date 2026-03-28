import { storage } from "../storage";
import type { InsertAutomationJob } from "@shared/schema";

type JobConfig = {
  jobKey: string;
  jobGroup: string;
  cadenceMinutes: number;
  run: () => Promise<{ summary?: string; meta?: Record<string, unknown> } | void>;
};

const timers = new Map<string, NodeJS.Timeout>();

export async function registerRecurringJob(config: JobConfig, bootDelayMs = 60_000) {
  await storage.upsertAutomationJob(config.jobKey, {
    jobGroup: config.jobGroup,
    cadenceMinutes: config.cadenceMinutes,
    status: "idle",
    isEnabled: true,
    nextRunAt: new Date(Date.now() + bootDelayMs),
  });

  const invoke = async () => {
    const startedAt = new Date();
    try {
      await storage.upsertAutomationJob(config.jobKey, {
        status: "running",
        lastStartedAt: startedAt,
      });

      const result = await config.run();

      const now = new Date();
      const job = await storage.upsertAutomationJob(config.jobKey, {
        status: "succeeded",
        lastFinishedAt: now,
        lastSucceededAt: now,
        nextRunAt: new Date(Date.now() + config.cadenceMinutes * 60_000),
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
      await storage.upsertAutomationJob(config.jobKey, {
        status: "failed",
        lastFinishedAt: now,
        lastFailedAt: now,
        lastError: error?.message ?? "unknown error",
        nextRunAt: new Date(Date.now() + config.cadenceMinutes * 60_000),
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

  const start = () => {
    const timeout = setTimeout(async function tick() {
      await invoke();
      timers.set(config.jobKey, setTimeout(tick, config.cadenceMinutes * 60_000));
    }, bootDelayMs);
    timers.set(config.jobKey, timeout);
  };

  start();
  console.log(`[jobRunner] registered ${config.jobKey} (every ${config.cadenceMinutes}m, first run in ${Math.round(bootDelayMs / 1000)}s)`);
}

export function stopAllAutomationJobs() {
  for (const timer of Array.from(timers.values())) clearTimeout(timer);
  timers.clear();
}
