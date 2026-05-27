// Phase 62 — Task Router
//
// Maps queued tasks → best available agent (capability-matched, lowest load).
// Tasks with no available agent stay in `queued` so they're picked up on a
// later mesh tick. No business mutations occur here.

import { storage } from "../storage";
import { selectBestAgent } from "./agentRegistry";
import type { MeshTask } from "@shared/schema";

export async function assignTasksToAgents(missionId: number): Promise<{ assigned: number; pending: number }> {
  const tasks = await storage.listMeshTasks(missionId);
  let assigned = 0, pending = 0;
  for (const t of tasks) {
    if (t.status !== "queued") continue;
    const agent = await selectBestAgent(t.capability);
    if (!agent) { pending += 1; continue; }
    await storage.updateMeshTask(t.id, { status: "assigned", assignedAgentId: agent.id });
    assigned += 1;
  }
  return { assigned, pending };
}

export async function nextRunnableTask(missionId: number): Promise<MeshTask | null> {
  const tasks = await storage.listMeshTasks(missionId);
  return tasks.find(t => t.status === "assigned") ?? tasks.find(t => t.status === "queued") ?? null;
}
