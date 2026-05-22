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
}

export function invalidateMemory(sessionId: string): void {
  _store.delete(sessionId);
}

export function getMemoryStats(): {
  activeSessions: number;
  oldestEntryAgeMs: number | null;
} {
  if (_store.size === 0) return { activeSessions: 0, oldestEntryAgeMs: null };
  const now = Date.now();
  let oldest = now;
  _store.forEach((entry) => {
    if (entry.lastAccessed < oldest) oldest = entry.lastAccessed;
  });
  return { activeSessions: _store.size, oldestEntryAgeMs: now - oldest };
}
