// Phase 69 — process memory instrumentation.
// Samples process.memoryUsage() every minute into a fixed-size ring buffer
// (360 samples = 6 hours) and tracks the peak RSS since boot. Read via the
// PIN-gated /api/dashboard/system/memory endpoint. The sampler timer is
// unref()'d so it never keeps the process alive during shutdown.

export type MemorySample = {
  at: string;
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
};

const SAMPLE_INTERVAL_MS = 60_000;
const RING_SIZE = 360; // 6 hours at 1 sample/min

const ring: MemorySample[] = [];
let ringNext = 0;
let totalSamples = 0;
let peakRssMb = 0;
let peakRssAt: string | null = null;
const bootedAt = new Date().toISOString();
let timer: NodeJS.Timeout | null = null;

const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

function takeSample(): MemorySample {
  const m = process.memoryUsage();
  const sample: MemorySample = {
    at: new Date().toISOString(),
    rssMb: toMb(m.rss),
    heapUsedMb: toMb(m.heapUsed),
    heapTotalMb: toMb(m.heapTotal),
    externalMb: toMb(m.external),
  };
  if (sample.rssMb > peakRssMb) {
    peakRssMb = sample.rssMb;
    peakRssAt = sample.at;
  }
  return sample;
}

function recordSample(): void {
  const sample = takeSample();
  if (ring.length < RING_SIZE) {
    ring.push(sample);
  } else {
    ring[ringNext] = sample;
  }
  ringNext = (ringNext + 1) % RING_SIZE;
  totalSamples++;
}

export function startMemoryMonitor(): void {
  if (timer) return; // idempotent
  recordSample(); // baseline sample at boot
  timer = setInterval(recordSample, SAMPLE_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
  console.log(`[memoryMonitor] started (1 sample/min, ${RING_SIZE}-sample ring)`);
}

export function stopMemoryMonitor(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function getMemoryReport(): {
  current: MemorySample;
  peak: { rssMb: number; at: string | null };
  bootedAt: string;
  uptimeSec: number;
  sampleIntervalMs: number;
  sampleCount: number;
  samples: MemorySample[];
} {
  // Return samples in chronological order (oldest → newest).
  const ordered =
    ring.length < RING_SIZE
      ? [...ring]
      : [...ring.slice(ringNext), ...ring.slice(0, ringNext)];
  return {
    current: takeSample(),
    peak: { rssMb: peakRssMb, at: peakRssAt },
    bootedAt,
    uptimeSec: Math.round(process.uptime()),
    sampleIntervalMs: SAMPLE_INTERVAL_MS,
    sampleCount: totalSamples,
    samples: ordered,
  };
}
