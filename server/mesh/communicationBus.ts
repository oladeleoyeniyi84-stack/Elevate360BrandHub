// Phase 62 — Communication Bus
//
// Persistent inter-agent message log. Recommendation-only — messages are
// records, not callbacks; consumers must explicitly poll.

import { storage } from "../storage";
import type { InsertMeshCommunication, MeshCommunication } from "@shared/schema";

const ALLOWED_TYPES = new Set([
  "mission.completed", "mission.failed", "mission.requires_approval",
  "agent.heartbeat", "agent.broadcast", "task.handoff", "task.result",
  "topology.update", "diagnostic", "advice",
]);

export type SendArgs = {
  fromAgentKey?: string | null;
  toAgentKey?: string | null;
  communicationType: string;
  payload?: Record<string, any>;
};

function safePayload(p: Record<string, any> | undefined): Record<string, any> {
  if (!p || typeof p !== "object") return {};
  try {
    const s = JSON.stringify(p);
    return s.length > 4000 ? { truncated: true, preview: s.slice(0, 4000) } : p;
  } catch { return { error: "invalid_payload" }; }
}

export async function sendAgentMessage(args: SendArgs): Promise<MeshCommunication | null> {
  const type = String(args.communicationType || "").slice(0, 40);
  if (!ALLOWED_TYPES.has(type)) {
    console.warn(`[mesh] rejected unknown communication type: ${type}`);
    return null;
  }
  const fromId = args.fromAgentKey ? (await storage.getMeshAgentByKey(args.fromAgentKey))?.id ?? null : null;
  const toId = args.toAgentKey ? (await storage.getMeshAgentByKey(args.toAgentKey))?.id ?? null : null;
  const row: InsertMeshCommunication = {
    fromAgentId: fromId as any, toAgentId: toId as any,
    communicationType: type, payload: safePayload(args.payload) as any, status: "sent",
  };
  return storage.createMeshCommunication(row);
}

export async function broadcastSignal(communicationType: string, payload: Record<string, any> = {}): Promise<void> {
  await sendAgentMessage({ fromAgentKey: null, toAgentKey: null, communicationType, payload });
}

export async function listCommunications(limit = 50): Promise<MeshCommunication[]> {
  return storage.listMeshCommunications(limit);
}
