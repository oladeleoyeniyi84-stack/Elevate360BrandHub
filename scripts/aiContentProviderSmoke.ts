/**
 * Opt-in DeepSeek long-form smoke test, run only in an approved secure environment.
 * No credentials or generated article bodies are logged.
 * This script makes ONE real, potentially billable provider request.
 *
 * Usage (with DEEPSEEK_API_KEY supplied securely by the environment):
 * npx tsx scripts/aiContentProviderSmoke.ts
 */
import { deepseekChat, isDeepseekConfigured } from "../server/services/deepseek";
import { MAX_TOKENS_BY_TYPE } from "../server/routes/aiContentPolicy";

async function main(): Promise<void> {
  if (!isDeepseekConfigured()) {
    console.error("SKIP: DEEPSEEK_API_KEY is not configured. No provider request made.");
    process.exitCode = 2;
    return;
  }
  if (MAX_TOKENS_BY_TYPE.blog !== 6000) {
    throw new Error("Unexpected blog token budget");
  }
  // Restrict this probe to a simple educational sample; no customer or proprietary data.
  const response = await deepseekChat({
    maxTokens: MAX_TOKENS_BY_TYPE.blog,
    temperature: 0.6,
    messages: [
      { role: "system", content: "Write a complete, technically accurate educational article. No secrets or personal data." },
      { role: "user", content: "Write a 1600–1900 word educational article on Git blob objects, Git trees and commits, staging, content addressing, packfiles, and safe Git usage. Include a working command demonstration, a Conclusion section, and an Official Git Documentation section with links to git-scm.com. Return only the complete article." },
    ],
  });
  const body = response.content;
  const checks = {
    returned_text: body.trim().length >= 4500,
    conclusion: /(?:^|\n)#{1,4}\s*conclusion\b|(?:^|\n)#{1,4}\s*(?:final thoughts|takeaways)\b/im.test(body),
    documentation: /git-scm\.com/i.test(body),
    git_blob: /\bblob\b/i.test(body),
    stop_reason: response.finishReason === "stop",
  };
  // Do not log article content; only bounded metadata and boolean checks.
  console.log(JSON.stringify({
    smoke: "ai-content-longform-provider",
    model: response.model,
    finishReason: response.finishReason,
    characters: body.length,
    maxTokens: MAX_TOKENS_BY_TYPE.blog,
    checks,
  }, null, 2));
  if (Object.values(checks).some(v => !v)) process.exitCode = 1;
}

main().catch(() => {
  console.error("FAIL: Real-provider long-form smoke test failed; provider error suppressed to protect credentials.");
  process.exitCode = 1;
});
