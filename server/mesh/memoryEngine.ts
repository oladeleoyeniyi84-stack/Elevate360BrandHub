// Phase 62 — Worker Memory
//
// Scoped per-agent memory. Upsert by (agent_key, scope, key). Recommendation
// signals only — never consulted for business mutations.

import { storage } from "../storage";
import type { InsertMeshWorkerMemory, MeshWorkerMemory } from "@shared/schema";

export async function writeWorkerMemory(input: InsertMeshWorkerMemory): Promise<MeshWorkerMemory> {
  return storage.writeMeshWorkerMemory({
    agentKey: input.agentKey.slice(0, 60),
    memoryScope: input.memoryScope.slice(0, 60),
    memoryKey: input.memoryKey.slice(0, 120),
    memoryValue: (input.memoryValue ?? {}) as any,
    confidence: Math.max(0, Math.min(100, Math.round(input.confidence ?? 50))),
  });
}

export async function readWorkerMemory(agentKey: string, memoryScope?: string): Promise<MeshWorkerMemory[]> {
  return storage.readMeshWorkerMemory(agentKey, memoryScope);
}
