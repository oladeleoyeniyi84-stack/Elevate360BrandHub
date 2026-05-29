// Phase 63 — Cognitive Memory Layer: shared semantic memory engine
//
// A single, scope-agnostic memory system used across the Concierge, Founder
// Intelligence, Orchestrator, Neural Command Grid, and Execution Mesh. Stores
// embedded memories in pgvector and recalls them by semantic similarity,
// recency, and importance.
//
// Security:
// - scrubSensitive() strips API keys, bearer tokens, emails, long hex, card-like
//   numbers, and phone numbers from any text BEFORE it is embedded or stored.
// - No secrets, payment data, or raw PII are ever persisted.
// - All management routes are founder-PIN gated (see routes.ts).

import { sql } from "drizzle-orm";
import { db } from "../db";
import { cognitiveMemories } from "@shared/schema";
import type { CognitiveMemory } from "@shared/schema";
import { embedText, toVectorLiteral } from "./embeddings";

export type MemoryScope =
  | "conversation"
  | "lead"
  | "founder"
  | "agent"
  | "brand_knowledge";

export type MemoryType = "short_term" | "long_term" | "episodic" | "strategic";

export interface WriteMemoryInput {
  scope: MemoryScope;
  type?: MemoryType;
  subjectKey: string;
  title?: string;
  content: string;
  importance?: number;
  source?: string;
  metadata?: Record<string, unknown>;
  ttlMinutes?: number; // short-term expiry
  dedupe?: boolean; // skip if near-identical content already exists for subject
}

export interface SearchMemoryInput {
  query: string;
  scope?: MemoryScope;
  subjectKey?: string;
  type?: MemoryType;
  limit?: number;
  minImportance?: number;
}

export interface MemoryHit extends CognitiveMemory {
  similarity?: number;
}

// ---- Security: scrub sensitive data before persisting ----
const SCRUB_PATTERNS: { re: RegExp; tag: string }[] = [
  { re: /sk-[A-Za-z0-9_-]{12,}/g, tag: "[redacted-key]" },
  { re: /\bBearer\s+[A-Za-z0-9._-]{12,}/gi, tag: "[redacted-token]" },
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, tag: "[redacted-email]" },
  { re: /\b[0-9a-fA-F]{32,}\b/g, tag: "[redacted-hex]" },
  { re: /\b(?:\d[ -]*?){13,19}\b/g, tag: "[redacted-number]" },
  { re: /\+?\d[\d\s().-]{8,}\d/g, tag: "[redacted-phone]" },
];

export function scrubSensitive(text: string): string {
  let out = text ?? "";
  for (const { re, tag } of SCRUB_PATTERNS) out = out.replace(re, tag);
  return out;
}

// subjectKey is often client-controlled (e.g. chat sessionId). Strip any PII /
// secrets so raw emails/phones/tokens can never be persisted as an identifier.
function safeSubjectKey(key: string): string {
  return scrubSensitive((key ?? "").trim()).slice(0, 120) || "unknown";
}

// Recursively scrub string leaves in arbitrary metadata before persisting.
function scrubMetadata(value: unknown): unknown {
  if (typeof value === "string") return scrubSensitive(value);
  if (Array.isArray(value)) return value.map(scrubMetadata);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubMetadata(v);
    return out;
  }
  return value;
}

function clampImportance(v?: number): number {
  return Math.max(0, Math.min(100, Math.round(v ?? 50)));
}

// ---- Write ----
export async function writeMemory(input: WriteMemoryInput): Promise<CognitiveMemory | null> {
  try {
    const content = scrubSensitive((input.content ?? "").trim()).slice(0, 4000);
    if (!content) return null;
    const title = input.title ? scrubSensitive(input.title).slice(0, 200) : null;
    const subjectKey = safeSubjectKey(input.subjectKey);

    if (input.dedupe) {
      const existing = await db.execute(sql`
        SELECT id FROM cognitive_memories
        WHERE memory_scope = ${input.scope}
          AND subject_key = ${subjectKey}
          AND content = ${content}
        LIMIT 1
      `);
      if (existing.rows.length > 0) return null;
    }

    const embedding = await embedText(`${title ? title + ". " : ""}${content}`);
    const expiresAt = input.ttlMinutes
      ? new Date(Date.now() + input.ttlMinutes * 60_000)
      : null;
    const metadata = JSON.stringify(scrubMetadata(input.metadata ?? {}));

    const embeddingSql = embedding
      ? sql`${toVectorLiteral(embedding)}::vector`
      : sql`NULL`;

    const result = await db.execute(sql`
      INSERT INTO cognitive_memories
        (memory_scope, memory_type, subject_key, title, content, embedding, importance, source, metadata, expires_at)
      VALUES (
        ${input.scope},
        ${input.type ?? "long_term"},
        ${subjectKey},
        ${title},
        ${content},
        ${embeddingSql},
        ${clampImportance(input.importance)},
        ${(input.source ?? "system").slice(0, 60)},
        ${metadata}::jsonb,
        ${expiresAt}
      )
      RETURNING *
    `);
    return rowToMemory(result.rows[0]);
  } catch (err: any) {
    console.error("[memory] writeMemory failed:", err?.message ?? err);
    return null;
  }
}

// ---- Semantic search ----
export async function searchMemory(input: SearchMemoryInput): Promise<MemoryHit[]> {
  const limit = Math.max(1, Math.min(50, input.limit ?? 8));
  const minImportance = clampImportance(input.minImportance ?? 0);
  const conds: any[] = [sql`(expires_at IS NULL OR expires_at > now())`];
  if (input.scope) conds.push(sql`memory_scope = ${input.scope}`);
  if (input.subjectKey) conds.push(sql`subject_key = ${safeSubjectKey(input.subjectKey)}`);
  if (input.type) conds.push(sql`memory_type = ${input.type}`);
  conds.push(sql`importance >= ${minImportance}`);
  const where = sql.join(conds, sql` AND `);

  const embedding = await embedText(input.query);

  try {
    if (embedding) {
      const vec = sql`${toVectorLiteral(embedding)}::vector`;
      const rows = await db.execute(sql`
        SELECT *, 1 - (embedding <=> ${vec}) AS similarity
        FROM cognitive_memories
        WHERE (${where}) AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vec}
        LIMIT ${limit}
      `);
      const hits = rows.rows.map((r) => ({ ...rowToMemory(r), similarity: Number((r as any).similarity) }));
      await touchAccess(hits.map((h) => h.id));
      return hits;
    }
    // No embeddings configured — fall back to recency + importance
    const rows = await db.execute(sql`
      SELECT * FROM cognitive_memories
      WHERE ${where}
      ORDER BY importance DESC, created_at DESC
      LIMIT ${limit}
    `);
    const hits = rows.rows.map((r) => rowToMemory(r));
    await touchAccess(hits.map((h) => h.id));
    return hits;
  } catch (err: any) {
    console.error("[memory] searchMemory failed:", err?.message ?? err);
    return [];
  }
}

// ---- Recall (no query: recency + importance for a subject) ----
export async function recallForSubject(
  scope: MemoryScope,
  subjectKey: string,
  limit = 6,
): Promise<CognitiveMemory[]> {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM cognitive_memories
      WHERE memory_scope = ${scope}
        AND subject_key = ${safeSubjectKey(subjectKey)}
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY importance DESC, COALESCE(last_accessed_at, created_at) DESC
      LIMIT ${Math.max(1, Math.min(50, limit))}
    `);
    const mems = rows.rows.map((r) => rowToMemory(r));
    await touchAccess(mems.map((m) => m.id));
    return mems;
  } catch (err: any) {
    console.error("[memory] recallForSubject failed:", err?.message ?? err);
    return [];
  }
}

async function touchAccess(ids: number[]): Promise<void> {
  if (!ids.length) return;
  try {
    await db.execute(sql`
      UPDATE cognitive_memories
      SET access_count = access_count + 1, last_accessed_at = now()
      WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
    `);
  } catch {
    /* best-effort */
  }
}

// ---- Founder management ----
export async function listMemories(opts: {
  scope?: MemoryScope;
  subjectKey?: string;
  type?: MemoryType;
  limit?: number;
}): Promise<CognitiveMemory[]> {
  const limit = Math.max(1, Math.min(200, opts.limit ?? 50));
  const conds: any[] = [sql`1 = 1`];
  if (opts.scope) conds.push(sql`memory_scope = ${opts.scope}`);
  if (opts.subjectKey) conds.push(sql`subject_key = ${safeSubjectKey(opts.subjectKey)}`);
  if (opts.type) conds.push(sql`memory_type = ${opts.type}`);
  const where = sql.join(conds, sql` AND `);
  const rows = await db.execute(sql`
    SELECT * FROM cognitive_memories
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  return rows.rows.map((r) => rowToMemory(r));
}

export async function deleteMemory(id: number): Promise<boolean> {
  const r = await db.execute(sql`DELETE FROM cognitive_memories WHERE id = ${id} RETURNING id`);
  return r.rows.length > 0;
}

export async function pruneExpired(): Promise<number> {
  const r = await db.execute(sql`DELETE FROM cognitive_memories WHERE expires_at IS NOT NULL AND expires_at <= now() RETURNING id`);
  return r.rows.length;
}

// ---- Health + analytics ----
export async function getMemoryHealth() {
  const [total, byScope, byType, embedded, stale] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS c FROM cognitive_memories`),
    db.execute(sql`SELECT memory_scope AS k, COUNT(*)::int AS c FROM cognitive_memories GROUP BY memory_scope`),
    db.execute(sql`SELECT memory_type AS k, COUNT(*)::int AS c FROM cognitive_memories GROUP BY memory_type`),
    db.execute(sql`SELECT COUNT(*)::int AS c FROM cognitive_memories WHERE embedding IS NOT NULL`),
    db.execute(sql`SELECT COUNT(*)::int AS c FROM cognitive_memories WHERE expires_at IS NOT NULL AND expires_at <= now()`),
  ]);
  const totalCount = Number((total.rows[0] as any)?.c ?? 0);
  const embeddedCount = Number((embedded.rows[0] as any)?.c ?? 0);
  return {
    total: totalCount,
    embedded: embeddedCount,
    embeddingCoverage: totalCount ? Math.round((embeddedCount / totalCount) * 100) : 0,
    staleExpired: Number((stale.rows[0] as any)?.c ?? 0),
    byScope: byScope.rows.map((r: any) => ({ scope: r.k, count: Number(r.c) })),
    byType: byType.rows.map((r: any) => ({ type: r.k, count: Number(r.c) })),
  };
}

export async function getMemoryAnalytics() {
  const [topAccessed, recent, importance, sources] = await Promise.all([
    db.execute(sql`SELECT id, memory_scope, subject_key, title, access_count FROM cognitive_memories ORDER BY access_count DESC, created_at DESC LIMIT 10`),
    db.execute(sql`SELECT id, memory_scope, memory_type, subject_key, title, created_at FROM cognitive_memories ORDER BY created_at DESC LIMIT 10`),
    db.execute(sql`SELECT AVG(importance)::int AS avg, MAX(importance)::int AS max, MIN(importance)::int AS min FROM cognitive_memories`),
    db.execute(sql`SELECT source AS k, COUNT(*)::int AS c FROM cognitive_memories GROUP BY source ORDER BY c DESC LIMIT 10`),
  ]);
  return {
    topAccessed: topAccessed.rows.map((r: any) => ({ id: r.id, scope: r.memory_scope, subjectKey: r.subject_key, title: r.title, accessCount: Number(r.access_count) })),
    recent: recent.rows.map((r: any) => ({ id: r.id, scope: r.memory_scope, type: r.memory_type, subjectKey: r.subject_key, title: r.title, createdAt: r.created_at })),
    importance: importance.rows[0] ?? { avg: 0, max: 0, min: 0 },
    bySource: sources.rows.map((r: any) => ({ source: r.k, count: Number(r.c) })),
  };
}

// ---- Row mapping (embedding never returned to callers) ----
function rowToMemory(row: any): CognitiveMemory {
  return {
    id: row.id,
    memoryScope: row.memory_scope,
    memoryType: row.memory_type,
    subjectKey: row.subject_key,
    title: row.title,
    content: row.content,
    embedding: null,
    importance: row.importance,
    source: row.source,
    metadata: row.metadata ?? {},
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as CognitiveMemory;
}
