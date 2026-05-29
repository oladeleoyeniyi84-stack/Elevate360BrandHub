// Phase 60 — Governance Engine
//
// The single chokepoint that every orchestrator action passes through.
// Hard contract — enforced regardless of caller intent:
//   - No autonomous Stripe / refund / pricing / payment mutations.
//   - No autonomous infrastructure deploys / DB destructive operations.
//   - No autonomous outbound email or mass communication.
//   - No external network egress initiated by agent reasoning.
//   - No secret exposure (returns sanitized rationales only).
// Anything not explicitly allow-listed is BLOCKED by default.

export type ActionDecision = "allowed" | "blocked" | "requires_founder_approval";

export type ActionRequest = {
  agentKey: string;
  capability: string;        // verb-shaped, e.g. "analyze.revenue", "propose.experiment"
  surface?: string;          // optional surface label (e.g. "hero", "checkout")
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export type ActionEvaluation = {
  decision: ActionDecision;
  reason: string;            // short, founder-facing — never includes raw payload
  blockedBy?: string;        // which rule triggered the block
};

// ── Hard global blocklist (overrides everything, including allowlists) ──────
// Phrased as substrings — any capability containing one of these tokens is
// rejected. Use case: even if a future agent registration accidentally permits
// `mutate.stripe`, this layer still vetoes.
const HARD_BLOCK_TOKENS = [
  "stripe.write", "stripe.charge", "stripe.refund", "stripe.create_price",
  "stripe.update_price", "stripe.cancel_subscription",
  "pricing.set", "pricing.change", "pricing.publish",
  "refund.issue", "refund.execute",
  "payment.execute", "payment.capture",
  "email.send_campaign", "email.broadcast", "email.bulk",
  "deploy.execute", "deploy.rollout", "deploy.production",
  "infra.provision", "infra.destroy", "infra.scale",
  "db.drop", "db.truncate", "db.delete_all",
  "network.fetch", "network.egress",
  "secret.read", "secret.expose", "env.read",
];

// ── Approval-required tokens (allowed only after founder approval) ──────────
const REQUIRES_APPROVAL_TOKENS = [
  "propose.pricing", "recommend.pricing", "publish.outbound",
  "activate.campaign", "activate.experiment.high_traffic",
  "activate.personalization.high_traffic", "infra.tune",
];

// ── Agent allowlists (capability prefixes each agent may attempt) ───────────
// The orchestrator checks (agentKey, capability) ∈ allowlist before invoking
// the agent function. Prefix match — `analyze.*` allows `analyze.revenue`,
// `analyze.funnel`, etc.
const AGENT_CAPABILITY_ALLOWLIST: Record<string, string[]> = {
  growth_agent:          ["analyze.growth", "analyze.funnel", "recommend.growth", "propose.experiment", "activate.campaign", "publish.outbound"],
  revenue_agent:         ["analyze.revenue", "analyze.forecast", "recommend.revenue", "propose.pricing"],
  reliability_agent:     ["analyze.health", "analyze.errors", "recommend.recovery"],
  experiment_agent:      ["propose.experiment", "evaluate.experiment", "rollback.experiment"],
  personalization_agent: ["analyze.segments", "propose.personalization", "evaluate.personalization"],
  content_agent:         ["analyze.content", "propose.content"],
  founder_agent:         ["synthesize.executive", "summarize.workflow"],
  // ── Phase 62 — Execution Mesh workers ──────────────────────────────────────
  // Distributed worker agents. All operate in recommendation-only mode; risky
  // capabilities (pricing, outbound, infra) still hit the approval gate.
  growth_worker:         ["analyze.growth", "analyze.funnel", "recommend.growth", "propose.experiment"],
  revenue_worker:        ["analyze.revenue", "analyze.forecast", "recommend.revenue", "propose.pricing"],
  experiment_worker:     ["propose.experiment", "evaluate.experiment", "rollback.experiment"],
  personalization_worker:["analyze.segments", "propose.personalization", "evaluate.personalization"],
  reliability_worker:    ["analyze.health", "analyze.errors", "recommend.recovery"],
  content_worker:        ["analyze.content", "propose.content"],
  executive_worker:      ["synthesize.executive", "summarize.workflow", "summarize.mission"],
  strategy_worker:       ["analyze.strategy", "recommend.strategy", "summarize.workflow"],
  automation_worker:     ["analyze.automation", "recommend.recovery", "summarize.workflow"],
};

function matchesToken(capability: string, tokens: string[]): string | null {
  const c = capability.toLowerCase();
  for (const tok of tokens) if (c.includes(tok)) return tok;
  return null;
}

function isAgentCapabilityAllowed(agentKey: string, capability: string): boolean {
  const list = AGENT_CAPABILITY_ALLOWLIST[agentKey];
  if (!list) return false;
  const c = capability.toLowerCase();
  return list.some(prefix => c === prefix || c.startsWith(prefix + "."));
}

/**
 * Single chokepoint for every agent action. Order of precedence:
 *  1) Hard block (always wins).
 *  2) Agent allowlist (capability must be allowed for this specific agent).
 *  3) Approval-required gate.
 *  4) Otherwise → allowed.
 */
export function evaluateActionSafety(req: ActionRequest): ActionEvaluation {
  const cap = String(req.capability || "").toLowerCase();
  if (!cap) return { decision: "blocked", reason: "Empty capability.", blockedBy: "validation" };

  const hard = matchesToken(cap, HARD_BLOCK_TOKENS);
  if (hard) {
    return {
      decision: "blocked",
      reason: `Capability '${cap}' is on the hard block list. The orchestrator never performs autonomous money, infrastructure, or secret operations.`,
      blockedBy: hard,
    };
  }

  if (!isAgentCapabilityAllowed(req.agentKey, cap)) {
    return {
      decision: "blocked",
      reason: `Agent '${req.agentKey}' is not permitted capability '${cap}'.`,
      blockedBy: "agent_allowlist",
    };
  }

  const approval = matchesToken(cap, REQUIRES_APPROVAL_TOKENS);
  if (approval) {
    return {
      decision: "requires_founder_approval",
      reason: `Capability '${cap}' requires explicit founder approval before execution.`,
      blockedBy: approval,
    };
  }

  return { decision: "allowed", reason: "Permitted by allowlist; no approval required." };
}

export function listAgentCapabilities(): Record<string, string[]> {
  return AGENT_CAPABILITY_ALLOWLIST;
}

export function listHardBlocks(): string[] {
  return [...HARD_BLOCK_TOKENS];
}

export function listApprovalGates(): string[] {
  return [...REQUIRES_APPROVAL_TOKENS];
}
