// Phase 62 — Mission Engine
//
// Orchestrates mission lifecycle: queue → assigned → running → completed/
// failed/blocked. Powered by an atomic queue lock (DB SKIP LOCKED) so two
// workers cannot dispatch the same mission. Single mesh tick:
//   1) heartbeat all agents
//   2) drain up to N queue entries (each is an atomic lock)
//   3) assign + execute the mission
//   4) build a topology snapshot
// Recommendation-only — Phase 60 governance gates every task.

import { storage } from "../storage";
import { seedDefaultAgents, WORKER_DEFINITIONS } from "./agentRegistry";
import { createMission as plannerCreate, type PlanInput } from "./missionPlanner";
import { assignTasksToAgents } from "./taskRouter";
import { executeMission } from "./workerRuntime";
import { buildTopologySnapshot } from "./topologyEngine";
import type { MeshMission } from "@shared/schema";

const QUEUE_LOCK_TTL_MS = 5 * 60_000;
const MAX_PER_TICK = 5;

export async function orchestrateMissionLifecycle(planInput: PlanInput): Promise<{ mission: MeshMission; queued: boolean }> {
  const { mission } = await plannerCreate(planInput);
  await assignTasksToAgents(mission.id);
  const queued = await storage.enqueueMeshMission({
    queueName: "default", missionId: mission.id,
    priority: mission.priority, scheduledFor: new Date(),
    status: "queued",
  });
  return { mission, queued: queued !== null };
}

export async function cancelMission(id: number): Promise<MeshMission> {
  const m = await storage.getMeshMission(id);
  if (!m) throw new Error("Mission not found");
  if (m.status === "completed" || m.status === "failed" || m.status === "cancelled") return m;
  const updated = await storage.updateMeshMission(id, { status: "cancelled", completedAt: new Date(), resultSummary: "Cancelled by founder." });
  await storage.createMeshAuditLog({ missionId: id, eventType: "mission.cancelled", summary: "Cancelled by founder.", metadata: {} as any });
  return updated;
}

export async function runMeshTick(): Promise<{ processed: number; topologyHealth: number; agents: number; pending: number }> {
  // 1) Ensure agents exist
  await seedDefaultAgents();

  // 2) Heartbeat all agents (idle by default)
  for (const def of WORKER_DEFINITIONS) {
    await storage.heartbeatMeshAgent(def.agentKey).catch(() => undefined);
  }

  // 3) Drain queue with atomic locks. Queue terminal status mirrors mission
  //    outcome; on `retrying` we re-enqueue the mission so a later tick will
  //    pick it up (lock-free, idempotent — partial unique index prevents dupes).
  const workerId = `tick_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let processed = 0;
  for (let i = 0; i < MAX_PER_TICK; i++) {
    const claimed = await storage.lockMeshQueueItem(workerId, QUEUE_LOCK_TTL_MS);
    if (!claimed) break;
    try {
      await assignTasksToAgents(claimed.missionId);
      const outcome = await executeMission(claimed.missionId);
      // Map the runtime outcome to a queue terminal state. `retrying` releases
      // the lock with status='retrying' and re-enqueues the mission for a
      // future tick to pick up.
      await storage.releaseMeshQueueItem(claimed.id, outcome.queueStatus);
      if (outcome.queueStatus === "retrying") {
        await storage.enqueueMeshMission({
          queueName: claimed.queueName, missionId: claimed.missionId,
          priority: outcome.mission.priority,
          scheduledFor: new Date(Date.now() + 60_000), // back off 1min
          status: "queued",
        }).catch(() => undefined); // unique index blocks dupes — that's fine
      }
      processed += 1;
    } catch (e: any) {
      console.warn("[mesh] tick mission failed:", claimed.missionId, e?.message);
      await storage.releaseMeshQueueItem(claimed.id, "failed");
    }
  }

  // 4) Topology snapshot
  const snap = await buildTopologySnapshot();
  console.log(`[meshTick] processed=${processed} health=${snap.meshHealthScore} active=${snap.activeAgents} pending=${snap.queuedMissions}`);
  return { processed, topologyHealth: snap.meshHealthScore, agents: snap.activeAgents, pending: snap.queuedMissions };
}
