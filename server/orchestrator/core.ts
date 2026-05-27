// Phase 60 — Orchestrator Core
//
// Coordinated AI Operating System: agent registry, workflow queue with
// per-key locks, priority + cooldown + retry, shared operational memory,
// and execution history. All side-effects pass through `governance.ts`.
//
// Safety:
//   - In-process Map locks prevent the same workflow_key from running
//     concurrently inside one node. (Single-node Render; if scaled-out
//     later, swap for a SELECT…FOR UPDATE SKIP LOCKED claim.)
//   - Free text scrubbed before all LLM calls.
//   - No prompts, keys, or PII logged.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { evaluateActionSafety, type ActionRequest, type ActionEvaluation } from "./governance";
import type {
  OrchestratorWorkflow, InsertOrchestratorWorkflow,
  OrchestratorAgentRun, InsertOrchestratorAgentRun,
  OrchestratorMemory,
} from "@shared/schema";

const SCRUB: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];
function scrub(s: any, maxLen = 2000): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

// ─── Agent registry ─────────────────────────────────────────────────────────

export type AgentProvider = "openai" | "deepseek";
export type AgentRunContext = {
  workflowId: number;
  workflowKey: string;
  capability: string;
  input: Record<string, any>;
  memorySnapshot: Record<string, any>;
};
export type AgentRunResult = {
  output: Record<string, any>;
  confidence: number; // 0..100
  summary: string;
};
export type AgentDefinition = {
  key: string;
  description: string;
  allowedCapabilities: string[];    // mirrors governance allowlist for documentation
  restrictedCapabilities: string[]; // for transparency only — governance enforces
  providerPreference: AgentProvider;
  cooldownMinutes: number;
  executionTimeoutMs: number;
  retryLimit: number;
  run: (ctx: AgentRunContext) => Promise<AgentRunResult>;
};

const AGENTS = new Map<string, AgentDefinition>();
export function registerAgent(def: AgentDefinition) {
  AGENTS.set(def.key, def);
}
export function getAgent(key: string): AgentDefinition | undefined { return AGENTS.get(key); }
export function listAgents(): AgentDefinition[] { return Array.from(AGENTS.values()); }

// ─── Concurrency locks (in-process) ─────────────────────────────────────────

const workflowLocks = new Set<string>();
function tryAcquireLock(key: string): boolean {
  if (workflowLocks.has(key)) return false;
  workflowLocks.add(key); return true;
}
function releaseLock(key: string) { workflowLocks.delete(key); }

// ─── Memory helpers (idempotent upsert) ────────────────────────────────────

export async function rememberFact(
  memoryType: string, scope: string, key: string, value: any, confidence = 50,
): Promise<OrchestratorMemory> {
  return storage.upsertOrchestratorMemory({ memoryType, scope, key, value, confidence });
}
export async function recallScope(scope: string): Promise<OrchestratorMemory[]> {
  return storage.listOrchestratorMemory(scope);
}
export async function recallSnapshot(): Promise<Record<string, any>> {
  // Compact map: scope/key → value, capped to ~50 entries for prompt safety.
  const rows = await storage.listOrchestratorMemory();
  const out: Record<string, any> = {};
  for (const r of rows.slice(0, 50)) out[`${r.scope}/${r.key}`] = r.value;
  return out;
}

// ─── Workflow execution ────────────────────────────────────────────────────

export type WorkflowStep = {
  agentKey: string;
  capability: string;
  input?: Record<string, any>;
};
export type WorkflowDefinition = {
  workflowKey: string;
  description: string;
  defaultPriority: number;          // 0..100 (higher = sooner)
  cooldownMinutes: number;          // minimum gap between completed runs of same key
  steps: WorkflowStep[];
  // If any step is REQUIRES_APPROVAL, the workflow is parked pending approval
  // BEFORE executing that step (and downstream steps).
};

const WORKFLOWS = new Map<string, WorkflowDefinition>();
export function registerWorkflow(def: WorkflowDefinition) { WORKFLOWS.set(def.workflowKey, def); }
export function listWorkflowDefinitions(): WorkflowDefinition[] { return Array.from(WORKFLOWS.values()); }
export function getWorkflowDefinition(key: string): WorkflowDefinition | undefined { return WORKFLOWS.get(key); }

export type QueueOptions = {
  triggeredBy?: string;
  priority?: number;
  context?: Record<string, any>;
};

export async function queueWorkflow(
  workflowKey: string, opts: QueueOptions = {},
): Promise<OrchestratorWorkflow> {
  const def = WORKFLOWS.get(workflowKey);
  if (!def) throw new Error(`Unknown workflow: ${workflowKey}`);

  // Cooldown gate: if a completed run exists within cooldownMinutes, refuse.
  const recent = await storage.findRecentCompletedWorkflow(workflowKey, def.cooldownMinutes);
  if (recent) {
    throw new Error(
      `Workflow '${workflowKey}' is in cooldown until ${new Date(recent.completedAt!.getTime() + def.cooldownMinutes * 60_000).toISOString()}.`
    );
  }

  return storage.createOrchestratorWorkflow({
    workflowKey,
    status: "queued",
    priority: opts.priority ?? def.defaultPriority,
    triggeredBy: opts.triggeredBy ?? "system",
    context: (opts.context ?? {}) as any,
    result: {} as any,
    governanceDecision: {} as any,
    agentTrace: [] as any,
    executiveSummary: "",
    attemptCount: 0,
  } as InsertOrchestratorWorkflow);
}

async function runOneStep(
  wf: OrchestratorWorkflow, step: WorkflowStep, prevOutputs: Record<string, any>, memorySnapshot: Record<string, any>,
): Promise<{ ok: boolean; run: OrchestratorAgentRun; gov: ActionEvaluation; output?: Record<string, any> }> {
  const agent = AGENTS.get(step.agentKey);
  const req: ActionRequest = {
    agentKey: step.agentKey, capability: step.capability,
    payload: step.input, context: wf.context as any,
  };
  const gov = evaluateActionSafety(req);

  if (gov.decision === "blocked") {
    const run = await storage.createOrchestratorAgentRun({
      agentKey: step.agentKey, workflowId: wf.id, status: "blocked",
      input: { capability: step.capability } as any, output: {} as any,
      confidence: 0, durationMs: 0, errorMessage: gov.reason,
    } as InsertOrchestratorAgentRun);
    return { ok: false, run, gov };
  }
  if (gov.decision === "requires_founder_approval") {
    const run = await storage.createOrchestratorAgentRun({
      agentKey: step.agentKey, workflowId: wf.id, status: "awaiting_approval",
      input: { capability: step.capability } as any, output: {} as any,
      confidence: 0, durationMs: 0, errorMessage: gov.reason,
    } as InsertOrchestratorAgentRun);
    return { ok: false, run, gov };
  }
  if (!agent) {
    const run = await storage.createOrchestratorAgentRun({
      agentKey: step.agentKey, workflowId: wf.id, status: "failed",
      input: {} as any, output: {} as any,
      confidence: 0, durationMs: 0, errorMessage: `Unknown agent: ${step.agentKey}`,
    } as InsertOrchestratorAgentRun);
    return { ok: false, run, gov };
  }

  const started = Date.now();
  try {
    const timeoutMs = agent.executionTimeoutMs;
    const result = await Promise.race([
      agent.run({
        workflowId: wf.id, workflowKey: wf.workflowKey,
        capability: step.capability,
        input: { ...(step.input ?? {}), ...(prevOutputs ?? {}) },
        memorySnapshot,
      }),
      new Promise<AgentRunResult>((_, rej) => setTimeout(() => rej(new Error("Agent timeout")), timeoutMs)),
    ]);
    const durationMs = Date.now() - started;
    const run = await storage.createOrchestratorAgentRun({
      agentKey: step.agentKey, workflowId: wf.id, status: "succeeded",
      input: { capability: step.capability } as any,
      output: result.output as any,
      confidence: Math.max(0, Math.min(100, result.confidence)),
      durationMs, errorMessage: scrub(result.summary, 280),
    } as InsertOrchestratorAgentRun);
    return { ok: true, run, gov, output: result.output };
  } catch (e: any) {
    const durationMs = Date.now() - started;
    const run = await storage.createOrchestratorAgentRun({
      agentKey: step.agentKey, workflowId: wf.id, status: "failed",
      input: { capability: step.capability } as any, output: {} as any,
      confidence: 0, durationMs, errorMessage: scrub(e?.message, 280),
    } as InsertOrchestratorAgentRun);
    return { ok: false, run, gov };
  }
}

async function generateExecutiveSummary(wf: OrchestratorWorkflow, runs: OrchestratorAgentRun[]): Promise<string> {
  try {
    const payload = {
      workflowKey: wf.workflowKey, triggeredBy: wf.triggeredBy,
      trace: runs.map(r => ({
        agent: r.agentKey, status: r.status, confidence: r.confidence, durationMs: r.durationMs,
      })),
    };
    const r = await runTask("executive_copy",
      {
        messages: [
          { role: "system", content: "You are the Chief of Staff briefing the founder. In 3-5 short bullets, summarise: what the workflow did, the strongest signal, and one safe next step. No JSON, no markdown headers — bullets only." },
          { role: "user", content: scrub(JSON.stringify(payload), 3500) },
        ],
        temperature: 0.3, maxTokens: 380,
      },
      { providerOverride: "openai" },
    );
    return scrub(r.content, 1400);
  } catch (e: any) {
    console.warn(`[orchestrator] exec summary failed: ${scrub(e?.message, 200)}`);
    return "";
  }
}

export async function executeWorkflow(workflowId: number): Promise<OrchestratorWorkflow> {
  const wf = await storage.getOrchestratorWorkflow(workflowId);
  if (!wf) throw new Error(`Workflow ${workflowId} not found.`);
  if (wf.status !== "queued" && wf.status !== "approved" && wf.status !== "retrying") {
    return wf; // already terminal or running
  }
  const def = WORKFLOWS.get(wf.workflowKey);
  if (!def) {
    return storage.updateOrchestratorWorkflow(wf.id, {
      status: "failed", executiveSummary: `Unknown workflow definition: ${wf.workflowKey}`,
      completedAt: new Date(),
    });
  }
  // In-process lock prevents same-node concurrent runs of same workflow_key.
  // On lock miss we return the row UNCHANGED — never clobber a sibling's
  // status transition (the architect-identified race).
  if (!tryAcquireLock(wf.workflowKey)) {
    return wf;
  }

  try {
    // Atomic DB claim: queued|approved|retrying → running. If another worker
    // (or a future scaled-out replica) already claimed it, claim returns null
    // and we abort cleanly without mutating state.
    const claimed = await storage.claimOrchestratorWorkflow(wf.id, (wf.attemptCount ?? 0) + 1);
    if (!claimed) {
      console.log(`[orchestrator] wf=${wf.id} key=${wf.workflowKey} → already claimed elsewhere; skipping`);
      return wf;
    }

    const memorySnapshot = await recallSnapshot();
    const trace: any[] = [];
    let prevOutputs: Record<string, any> = {};
    let blockedAt: { step: WorkflowStep; gov: ActionEvaluation } | null = null;
    let approvalAt: { step: WorkflowStep; gov: ActionEvaluation } | null = null;

    for (const step of def.steps) {
      const { ok, run, gov, output } = await runOneStep(wf, step, prevOutputs, memorySnapshot);
      trace.push({
        agent: step.agentKey, capability: step.capability,
        status: run.status, confidence: run.confidence, durationMs: run.durationMs,
        governance: gov.decision,
      });
      if (gov.decision === "blocked") { blockedAt = { step, gov }; break; }
      if (gov.decision === "requires_founder_approval") { approvalAt = { step, gov }; break; }
      if (!ok) { break; }
      if (output) prevOutputs = { ...prevOutputs, [step.agentKey]: output };
    }

    const runs = await storage.listOrchestratorAgentRuns(wf.id);

    if (approvalAt) {
      const updated = await storage.updateOrchestratorWorkflow(wf.id, {
        status: "pending_founder_approval",
        agentTrace: trace as any,
        governanceDecision: approvalAt.gov as any,
        result: { stoppedAt: approvalAt.step.capability, reason: approvalAt.gov.reason } as any,
      });
      console.log(`[orchestrator] wf=${wf.id} key=${wf.workflowKey} → pending_founder_approval (${approvalAt.step.capability})`);
      return updated;
    }
    if (blockedAt) {
      const updated = await storage.updateOrchestratorWorkflow(wf.id, {
        status: "blocked",
        agentTrace: trace as any,
        governanceDecision: blockedAt.gov as any,
        result: { stoppedAt: blockedAt.step.capability, reason: blockedAt.gov.reason } as any,
        completedAt: new Date(),
      });
      console.log(`[orchestrator] wf=${wf.id} key=${wf.workflowKey} → blocked (${blockedAt.step.capability})`);
      return updated;
    }

    const anyFailed = runs.some(r => r.status === "failed");
    const finalStatus = anyFailed ? "failed" : "succeeded";
    const summary = await generateExecutiveSummary(wf, runs);
    const updated = await storage.updateOrchestratorWorkflow(wf.id, {
      status: finalStatus,
      agentTrace: trace as any,
      result: { agentOutputs: prevOutputs } as any,
      executiveSummary: summary,
      completedAt: new Date(),
    });
    console.log(`[orchestrator] wf=${wf.id} key=${wf.workflowKey} → ${finalStatus} (${runs.length} steps)`);
    return updated;
  } finally {
    releaseLock(wf.workflowKey);
  }
}

// ─── Founder approval ───────────────────────────────────────────────────────

export async function decideWorkflow(workflowId: number, action: "approve" | "reject" | "defer", deciderKey = "founder"): Promise<OrchestratorWorkflow> {
  const wf = await storage.getOrchestratorWorkflow(workflowId);
  if (!wf) throw new Error("Workflow not found.");
  if (wf.status !== "pending_founder_approval") {
    throw new Error(`Workflow status '${wf.status}' is not awaiting approval.`);
  }
  if (action === "reject") {
    return storage.updateOrchestratorWorkflow(wf.id, {
      status: "rejected", founderDecision: "reject", founderDecidedBy: deciderKey,
      founderDecidedAt: new Date(), completedAt: new Date(),
    });
  }
  if (action === "defer") {
    return storage.updateOrchestratorWorkflow(wf.id, {
      status: "deferred", founderDecision: "defer", founderDecidedBy: deciderKey,
      founderDecidedAt: new Date(),
    });
  }
  // approve: mark approved + immediately re-execute (will re-run steps; the
  // approval-gated capability now still triggers the same gov result so the
  // agent author must opt to call a non-gated counterpart. By design, approval
  // is the founder ACK; actual execution is the founder taking the action
  // themselves elsewhere. Workflow records the green light.)
  return storage.updateOrchestratorWorkflow(wf.id, {
    status: "approved", founderDecision: "approve", founderDecidedBy: deciderKey,
    founderDecidedAt: new Date(), completedAt: new Date(),
  });
}

// ─── Tick loop ──────────────────────────────────────────────────────────────

export async function tickOrchestrator(): Promise<{ summary: string; processed: number }> {
  // Pick up to N queued workflows in priority order.
  const queued = await storage.listQueuedOrchestratorWorkflows(5);
  let processed = 0;
  for (const wf of queued) {
    try { await executeWorkflow(wf.id); processed += 1; }
    catch (e: any) { console.warn(`[orchestrator] tick wf=${wf.id} failed: ${scrub(e?.message, 200)}`); }
  }
  return { summary: `processed ${processed} workflow(s)`, processed };
}
