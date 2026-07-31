// Phase 72.4R — Google Search Console client + founder-triggered sync.
//
// Daily query/page/dimension snapshots are imported into Postgres by an
// explicit founder sync; every dashboard read is cached SQL — Google is never
// queried during a dashboard request. Credentials are environment-based:
//
//   GOOGLE_SEARCH_CONSOLE_CREDENTIALS — service-account JSON (client_email +
//     private_key). Add the service-account email as a (restricted) user on
//     the Search Console property.
//   GSC_SITE_URL — the property identifier, e.g. "sc-domain:example.com" or
//     "https://www.example.com/".
//
// When configuration is absent, every entry point returns a typed
// not-configured status — it never throws and never calls Google.

import crypto from "node:crypto";
import { storage } from "../storage";
import {
  GSC_SYNC_DEFAULT_DAYS,
  type GscFixture,
  type GscDimension,
} from "@shared/schema";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ROW_LIMIT = 5000; // rows per API request
const MAX_PAGES_PER_SET = 5; // hard bound per dimension set (≤ 25k rows)
const DATA_LAG_DAYS = 2; // GSC data trails ~2 days behind real time

export const GSC_NOT_CONFIGURED_REASON =
  "Google Search Console is not connected. Set GOOGLE_SEARCH_CONSOLE_CREDENTIALS " +
  "(service-account JSON containing client_email and private_key) and GSC_SITE_URL " +
  "(property, e.g. sc-domain:yourdomain.com or https://www.yourdomain.com/), then add " +
  "the service-account email as a user on the property in Search Console.";

export interface GscConfig {
  siteUrl: string;
  clientEmail: string;
  privateKey: string;
}

export type GscConfigStatus =
  | { configured: true; config: GscConfig }
  | { configured: false; reason: string };

export function getGscConfig(): GscConfigStatus {
  const rawCreds = process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS?.trim();
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!rawCreds || !siteUrl) {
    return { configured: false, reason: GSC_NOT_CONFIGURED_REASON };
  }
  try {
    const parsed = JSON.parse(rawCreds) as { client_email?: string; private_key?: string };
    if (!parsed.client_email || !parsed.private_key) {
      return {
        configured: false,
        reason:
          "GOOGLE_SEARCH_CONSOLE_CREDENTIALS is set but missing client_email/private_key — " +
          "paste the full service-account JSON key file contents.",
      };
    }
    return {
      configured: true,
      config: {
        siteUrl,
        clientEmail: parsed.client_email,
        // Support keys pasted with literal \n escapes.
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      },
    };
  } catch {
    return {
      configured: false,
      reason: "GOOGLE_SEARCH_CONSOLE_CREDENTIALS is set but is not valid JSON — paste the full service-account key file.",
    };
  }
}

// ── OAuth2 service-account JWT flow (no SDK dependency) ─────────────────────

let tokenCache: { token: string; expiresAt: number } | null = null;

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

// ── Error taxonomy + redaction (Phase 72.4.1) ───────────────────────────────
// Stored errorText starts with a stable kind prefix so auth, permission,
// rate-limit, availability and network failures are distinguishable from
// not_configured / partial / no-data. Google response snippets are redacted
// so tokens, JWT assertions or key material can never reach logs or the DB.

function redactSensitive(text: string): string {
  return text
    .replace(/-----BEGIN[\s\S]*?KEY-----/g, "[redacted-key]")
    .replace(/[A-Za-z0-9_\-.=]{40,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 300);
}

function classifyGoogleFailure(status: number, phase: "token" | "query"): string {
  if (status === 401) return phase === "token" ? "auth_failed" : "auth_expired";
  if (status === 403) return phase === "token" ? "auth_failed" : "permission_denied";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "google_unavailable";
  return phase === "token" ? "auth_failed" : "gsc_error";
}

async function getAccessToken(config: GscConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: config.clientEmail, scope: GSC_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(config.privateKey).toString("base64url");
  const assertion = `${header}.${claims}.${signature}`;

  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    });
  } catch (err) {
    throw new Error(`network_failure: could not reach Google's token endpoint — ${redactSensitive(err instanceof Error ? err.message : String(err))}`);
  }
  if (!res.ok) {
    const kind = classifyGoogleFailure(res.status, "token");
    const snippet = redactSensitive(await res.text().catch(() => ""));
    throw new Error(`${kind}: Google token exchange failed (${res.status}) — check the service-account key. ${snippet}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Google token exchange returned no access_token");
  tokenCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return tokenCache.token;
}

// ── Search Analytics fetch (bounded pagination) ─────────────────────────────

interface GscApiRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function fetchAnalyticsRows(
  config: GscConfig,
  token: string,
  body: Record<string, unknown>,
): Promise<GscApiRow[]> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.siteUrl)}/searchAnalytics/query`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`network_failure: could not reach the Search Console API — ${redactSensitive(err instanceof Error ? err.message : String(err))}`);
  }
  if (!res.ok) {
    const kind = classifyGoogleFailure(res.status, "query");
    const snippet = redactSensitive(await res.text().catch(() => ""));
    const hint = res.status === 403
      ? ` Add the service account (${config.clientEmail}) as a user on the verified property ${config.siteUrl}.`
      : "";
    throw new Error(`${kind}: GSC query failed (${res.status}).${hint} ${snippet}`);
  }
  const json = (await res.json()) as { rows?: GscApiRow[] };
  return json.rows ?? [];
}

async function pullDimensionSet(
  config: GscConfig,
  token: string,
  dimensions: string[],
  startDate: string,
  endDate: string,
): Promise<{ rows: GscApiRow[]; truncated: boolean }> {
  const all: GscApiRow[] = [];
  for (let page = 0; page < MAX_PAGES_PER_SET; page++) {
    const rows = await fetchAnalyticsRows(config, token, {
      startDate,
      endDate,
      dimensions,
      rowLimit: ROW_LIMIT,
      startRow: page * ROW_LIMIT,
      type: "web",
      dataState: "all", // include fresh (not-yet-final) data — labeled in the UI
    });
    all.push(...rows);
    if (rows.length < ROW_LIMIT) return { rows: all, truncated: false };
  }
  // Every allowed page came back full — the dataset may extend past the cap.
  // Callers surface this so a capped import is reported as partial, not success.
  return { rows: all, truncated: true };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── Sync (API or fixture) ────────────────────────────────────────────────────

export interface GscSyncResult {
  runId: number;
  status: "success" | "partial" | "error" | "not_configured";
  source: "api" | "fixture";
  reason?: string;
  rows: { queries: number; pages: number; dimensions: number; queryPages: number };
  setErrors?: Record<string, string>;
  /** Informational notes (optional capabilities etc.) — never counted as errors. */
  notes?: string[];
}

// ── Phase 72.4.3 — optional-capability classification ───────────────────────
// searchAppearance cannot be grouped with another dimension on this
// property/API combination (production-confirmed Google 400:
// "Cannot group by search appearance dimension together with another
// dimension"). It is an OPTIONAL capability: its absence must never downgrade
// an otherwise successful core import. The daily storage model
// (gsc_dimension_daily) has no truthful home for non-date rows, so we do not
// request ["date","searchAppearance"] at all and record an informational note
// instead — no fabricated dates, no migration.

export const SEARCH_APPEARANCE_UNAVAILABLE_NOTE =
  "Search appearance is unavailable as a daily grouped dimension for this property/API combination.";

/**
 * True only for the production-confirmed unsupported-combination response for
 * the searchAppearance set. Every other failure (unknown 400s, auth, network,
 * quota) on any set — including searchAppearance — remains a genuine error.
 * Exported for tests; also the gate should a future phase re-attempt the
 * optional request.
 */
export function isOptionalUnsupportedSearchAppearance(setKey: string, message: string): boolean {
  if (!/searchAppearance/i.test(setKey)) return false;
  return /cannot group by search appearance dimension together with another dimension/i.test(message);
}

/**
 * Pure status policy (Phase 72.4.3), used by runGscSync and unit-tested
 * directly. Only blocking errors on required datasets drive
 * success/partial/error; optional-unsupported searchAppearance responses are
 * demoted to informational notes.
 */
export function resolveGscRunOutcome(
  setErrors: Record<string, string>,
  importedAny: boolean,
): { status: "success" | "partial" | "error"; blockingErrors: Record<string, string>; optionalNotes: string[] } {
  const blockingErrors: Record<string, string> = {};
  const optionalNotes: string[] = [];
  for (const [setKey, message] of Object.entries(setErrors)) {
    if (isOptionalUnsupportedSearchAppearance(setKey, message)) {
      optionalNotes.push(`${setKey}: ${message}`);
    } else {
      blockingErrors[setKey] = message;
    }
  }
  const errorCount = Object.keys(blockingErrors).length;
  const status = errorCount === 0 ? "success" : importedAny ? "partial" : "error";
  return { status, blockingErrors, optionalNotes };
}

/**
 * Import Search Console snapshots. `fixture` (hermetic test data) bypasses the
 * network entirely; the route only allows it outside production. Idempotent:
 * every import is an upsert keyed on the snapshot dimensions.
 */
/** Thrown when another sync holds the DB-enforced single-running-run slot. */
export class GscSyncConflictError extends Error {
  constructor() {
    super("A Search Console sync is already running");
    this.name = "GscSyncConflictError";
  }
}

export async function runGscSync(opts: { days?: number; fixture?: GscFixture }): Promise<GscSyncResult> {
  const days = opts.days ?? GSC_SYNC_DEFAULT_DAYS;
  const source = opts.fixture ? "fixture" : "api";
  // Atomic claim: a partial unique index allows at most one 'running' row, so
  // two concurrent syncs can never both pass a check-then-create window.
  const runId = await storage.createGscSyncRun({ source, daysRequested: days });
  if (runId === null) throw new GscSyncConflictError();
  const rows = { queries: 0, pages: 0, dimensions: 0, queryPages: 0 };

  try {
    if (opts.fixture) {
      const f = opts.fixture;
      rows.queries = f.queries?.length ? await storage.upsertGscQueryRows(f.queries) : 0;
      rows.pages = f.pages?.length ? await storage.upsertGscPageRows(f.pages) : 0;
      rows.dimensions = f.dimensions?.length ? await storage.upsertGscDimensionRows(f.dimensions) : 0;
      const dates = [
        ...(f.queries ?? []).map((r) => r.date),
        ...(f.pages ?? []).map((r) => r.date),
      ].sort();
      const windowStart = dates[0] ?? null;
      const windowEnd = dates[dates.length - 1] ?? null;
      rows.queryPages = f.queryPages?.length
        ? await storage.upsertGscQueryPages(f.queryPages, windowStart, windowEnd)
        : 0;
      await storage.finishGscSyncRun(runId, {
        status: "success",
        startDate: windowStart,
        endDate: windowEnd,
        queryRows: rows.queries,
        pageRows: rows.pages,
        dimensionRows: rows.dimensions,
        queryPageRows: rows.queryPages,
        detail: { note: "fixture import (non-production contract tests)" },
      });
      return { runId, status: "success", source, rows };
    }

    const cfg = getGscConfig();
    if (!cfg.configured) {
      await storage.finishGscSyncRun(runId, { status: "not_configured", errorText: cfg.reason });
      return { runId, status: "not_configured", source, reason: cfg.reason, rows };
    }

    const endDate = isoDaysAgo(DATA_LAG_DAYS);
    const startDate = isoDaysAgo(DATA_LAG_DAYS + days - 1);
    const token = await getAccessToken(cfg.config);
    const setErrors: Record<string, string> = {};
    const TRUNCATION_NOTE = `pagination cap hit (${MAX_PAGES_PER_SET * ROW_LIMIT} rows) — imported snapshot for this set is incomplete`;

    // date+query → gsc_query_daily
    try {
      const { rows: r, truncated } = await pullDimensionSet(cfg.config, token, ["date", "query"], startDate, endDate);
      rows.queries = await storage.upsertGscQueryRows(
        r.map((x) => ({ date: x.keys[0], query: x.keys[1], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position })),
      );
      if (truncated) setErrors["date+query"] = TRUNCATION_NOTE;
    } catch (err) {
      setErrors["date+query"] = err instanceof Error ? err.message : String(err);
    }

    // date+page → gsc_page_daily
    try {
      const { rows: r, truncated } = await pullDimensionSet(cfg.config, token, ["date", "page"], startDate, endDate);
      rows.pages = await storage.upsertGscPageRows(
        r.map((x) => ({ date: x.keys[0], page: x.keys[1], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position })),
      );
      if (truncated) setErrors["date+page"] = TRUNCATION_NOTE;
    } catch (err) {
      setErrors["date+page"] = err instanceof Error ? err.message : String(err);
    }

    // date+country / date+device → gsc_dimension_daily (REQUIRED sets).
    // date+searchAppearance is intentionally NOT requested — see
    // isOptionalUnsupportedSearchAppearance above (Phase 72.4.3).
    const dimSets: Array<{ api: string; stored: GscDimension }> = [
      { api: "country", stored: "country" },
      { api: "device", stored: "device" },
    ];
    for (const dim of dimSets) {
      try {
        const { rows: r, truncated } = await pullDimensionSet(cfg.config, token, ["date", dim.api], startDate, endDate);
        rows.dimensions += await storage.upsertGscDimensionRows(
          r.map((x) => ({ date: x.keys[0], dimension: dim.stored, key: x.keys[1], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position })),
        );
        if (truncated) setErrors[`date+${dim.api}`] = TRUNCATION_NOTE;
      } catch (err) {
        setErrors[`date+${dim.api}`] = err instanceof Error ? err.message : String(err);
      }
    }
    const notes: string[] = [SEARCH_APPEARANCE_UNAVAILABLE_NOTE];

    // query+page window snapshot → gsc_query_pages (associated landing pages)
    try {
      const { rows: r, truncated } = await pullDimensionSet(cfg.config, token, ["query", "page"], startDate, endDate);
      rows.queryPages = await storage.upsertGscQueryPages(
        r.map((x) => ({ query: x.keys[0], page: x.keys[1], clicks: x.clicks, impressions: x.impressions })),
        startDate,
        endDate,
      );
      if (truncated) setErrors["query+page"] = TRUNCATION_NOTE;
    } catch (err) {
      setErrors["query+page"] = err instanceof Error ? err.message : String(err);
    }

    // Phase 72.4.3 — partition failures: only BLOCKING errors on required
    // datasets drive success/partial/error. A confirmed optional-unsupported
    // searchAppearance response (should any code path ever record one) is
    // demoted to an informational note, never to errorText.
    const importedAny = rows.queries + rows.pages + rows.dimensions + rows.queryPages > 0;
    const { status, blockingErrors, optionalNotes } = resolveGscRunOutcome(setErrors, importedAny);
    notes.push(...optionalNotes);
    const errorCount = Object.keys(blockingErrors).length;
    await storage.finishGscSyncRun(runId, {
      status,
      startDate,
      endDate,
      queryRows: rows.queries,
      pageRows: rows.pages,
      dimensionRows: rows.dimensions,
      queryPageRows: rows.queryPages,
      errorText: errorCount > 0 ? Object.entries(blockingErrors).map(([k, v]) => `${k}: ${v}`).join(" | ").slice(0, 2000) : null,
      detail: {
        ...(errorCount > 0 ? { setErrors: blockingErrors } : {}),
        notes,
      },
    });
    return { runId, status, source, rows, setErrors: errorCount > 0 ? blockingErrors : undefined, notes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await storage.finishGscSyncRun(runId, { status: "error", errorText: message.slice(0, 2000) }).catch(() => {});
    return { runId, status: "error", source, reason: message, rows };
  }
}
