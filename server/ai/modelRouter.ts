import { openaiProvider } from "./providers/openaiProvider";
import { deepseekProvider } from "./providers/deepseekProvider";
import type {
  TaskType,
  ProviderCallOptions,
  ProviderResult,
  ProviderName,
  AIProvider,
} from "./types";

const PREMIUM_TASKS = new Set<TaskType>([
  "concierge",
  "brand_strategy",
  "premium_consultation",
  "emotional_support",
  "executive_copy",
]);

const AUTOMATION_TASKS = new Set<TaskType>([
  "seo",
  "social",
  "content_generation",
  "automation",
  "coding",
  "digest",
  "followup",
  "session_summary",
  "diagnostics",
]);

function getProvider(name: ProviderName): AIProvider {
  return name === "deepseek" ? deepseekProvider : openaiProvider;
}

export function pickProvider(task: TaskType): ProviderName {
  if (PREMIUM_TASKS.has(task)) {
    return (process.env.AI_PREMIUM_PROVIDER as ProviderName) || "openai";
  }
  if (AUTOMATION_TASKS.has(task)) {
    const preferred = (process.env.AI_AUTOMATION_PROVIDER as ProviderName) || "deepseek";
    if (preferred === "deepseek" && deepseekProvider.isConfigured()) return "deepseek";
    return "openai";
  }
  return "openai";
}

export interface RunTaskOptions {
  /**
   * Hard-lock the provider, bypassing task-based routing AND env overrides.
   * Use for premium copy that must never drift to a cheaper model.
   */
  providerOverride?: ProviderName;
}

export async function runTask(
  task: TaskType,
  options: ProviderCallOptions,
  runOptions: RunTaskOptions = {}
): Promise<ProviderResult> {
  const overrideUsed = !!runOptions.providerOverride;
  const primaryName: ProviderName = runOptions.providerOverride ?? pickProvider(task);
  const primary = getProvider(primaryName);

  try {
    const result = await primary.call(options);
    console.log(
      `[modelRouter] task=${task} provider=${result.provider} model=${result.model} latency=${result.latencyMs}ms fallback=false providerOverrideUsed=${overrideUsed}`
    );
    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown error";
    // Fallback only allowed when NOT using a hard override, and only deepseek→openai
    if (!overrideUsed && primaryName === "deepseek" && openaiProvider.isConfigured()) {
      console.warn(
        `[modelRouter] task=${task} provider=deepseek failed (${errMsg}); falling back to openai`
      );
      const fallback = await openaiProvider.call(options);
      console.log(
        `[modelRouter] task=${task} provider=${fallback.provider} model=${fallback.model} latency=${fallback.latencyMs}ms fallback=true providerOverrideUsed=false`
      );
      return { ...fallback, fallback: true };
    }
    console.error(
      `[modelRouter] task=${task} provider=${primaryName} failed: ${errMsg} providerOverrideUsed=${overrideUsed}`
    );
    throw err;
  }
}

export function getAIStatus() {
  const automationPreferred =
    (process.env.AI_AUTOMATION_PROVIDER as ProviderName) || "deepseek";
  const premiumPreferred = (process.env.AI_PREMIUM_PROVIDER as ProviderName) || "openai";
  return {
    openai: openaiProvider.isConfigured() ? "configured" : "missing",
    deepseek: deepseekProvider.isConfigured() ? "configured" : "missing",
    router: "active",
    defaultPremiumModel: premiumPreferred,
    defaultAutomationModel:
      automationPreferred === "deepseek" && !deepseekProvider.isConfigured()
        ? "openai"
        : automationPreferred,
  };
}
