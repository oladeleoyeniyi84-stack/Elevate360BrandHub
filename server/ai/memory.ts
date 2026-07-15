import type { ChatMessage } from "@shared/schema";
import { storage } from "../storage";

interface MemoryEntry {
  messages: ChatMessage[];
  lastAccessed: number;
  intent?: string;
  score?: number;
}

const _store = new Map<string, MemoryEntry>();
const TTL_MS = 30 * 60 * 1000;
const EVICT_INTERVAL_MS = 5 * 60 * 1000;
// Phase 69 — hard cap. TTL eviction alone lets a traffic burst hold thousands
// of transcripts in memory for up to 30 minutes; cap the cache and evict the
// least-recently-accessed sessions beyond it (DB remains source of truth).
const MAX_SESSIONS = 500;

function enforceSessionCap(): void {
  if (_store.size <= MAX_SESSIONS) return;
  const byAge = Array.from(_store.entries())
    .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
  const excess = _store.size - MAX_SESSIONS;
  for (let i = 0; i < excess; i++) _store.delete(byAge[i][0]);
}

const _evictTimer = setInterval(evictExpired, EVICT_INTERVAL_MS);
if (typeof _evictTimer.unref === "function") _evictTimer.unref();

export function evictExpired(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  _store.forEach((entry, key) => {
    if (now - entry.lastAccessed > TTL_MS) toDelete.push(key);
  });
  for (const key of toDelete) _store.delete(key);
}

export async function getMemory(sessionId: string): Promise<ChatMessage[]> {
  const cached = _store.get(sessionId);
  if (cached) {
    cached.lastAccessed = Date.now();
    return cached.messages;
  }
  try {
    const session = await storage.getChatSession(sessionId);
    const messages = (session?.messages as ChatMessage[]) ?? [];
    _store.set(sessionId, { messages, lastAccessed: Date.now() });
    enforceSessionCap();
    return messages;
  } catch {
    return [];
  }
}

export function setMemory(
  sessionId: string,
  messages: ChatMessage[],
  meta?: { intent?: string; score?: number }
): void {
  const existing = _store.get(sessionId);
  _store.set(sessionId, {
    messages,
    lastAccessed: Date.now(),
    intent: meta?.intent ?? existing?.intent,
    score: meta?.score ?? existing?.score,
  });
  enforceSessionCap();
}

export function invalidateMemory(sessionId: string): void {
  _store.delete(sessionId);
}

export function getMemoryStats(): {
  activeSessions: number;
  oldestEntryAgeMs: number | null;
  maxSessions: number;
} {
  if (_store.size === 0) return { activeSessions: 0, oldestEntryAgeMs: null, maxSessions: MAX_SESSIONS };
  const now = Date.now();
  let oldest = now;
  _store.forEach((entry) => {
    if (entry.lastAccessed < oldest) oldest = entry.lastAccessed;
  });
  return { activeSessions: _store.size, oldestEntryAgeMs: now - oldest, maxSessions: MAX_SESSIONS };
}
