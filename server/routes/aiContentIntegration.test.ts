import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";

test("authenticated AI content endpoint handles long-form completion, truncation, empty and denial without a live provider", async () => {
  process.env.DEEPSEEK_API_KEY = "test-provider-key-not-real";
  process.env.DATABASE_URL ??= "postgres://fake:fake@127.0.0.1:1/fake";
  const observed: Array<Record<string, any>> = [];
  let finishReason = "stop";
  let resultContent = "# Git Internals\\n\\n" + "Explanation. ".repeat(2700) + "\\n\\n## Conclusion\\n\\nReferences.";
  const fakeProvider = createServer(async (req, res) => {
    if (req.method !== "POST" || !req.url?.includes("/chat/completions")) {
      res.writeHead(404).end(); return;
    }
    let raw = "";
    for await (const chunk of req) raw += String(chunk);
    observed.push(JSON.parse(raw));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "chatcmpl-test", object: "chat.completion", created: 1, model: "deepseek-chat",
      choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content: resultContent } }],
      usage: { prompt_tokens: 30, completion_tokens: 2000, total_tokens: 2030 },
    }));
  });
  await new Promise<void>(resolve => fakeProvider.listen(0, "127.0.0.1", resolve));
  const providerAddress = fakeProvider.address();
  assert.ok(providerAddress && typeof providerAddress !== "string");
  process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${providerAddress.port}/v1`;

  const { aiContentRouter } = await import("./aiContent");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = req.headers["x-test-founder"] === "yes"
      ? { dashboardAuthed: true, dashboardRole: "founder" } : {};
    next();
  });
  app.use("/api/ai/content", aiContentRouter);
  const api = createServer(app);
  await new Promise<void>(resolve => api.listen(0, "127.0.0.1", resolve));
  const apiAddress = api.address();
  assert.ok(apiAddress && typeof apiAddress !== "string");
  const url = `http://127.0.0.1:${apiAddress.port}/api/ai/content`;
  const payload = { type: "blog", prompt: "Write a complete article about Git blobs.", useBrandVoice: true, founderVoice: true };
  const request = (founder: boolean) => fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(founder ? { "x-test-founder": "yes" } : {}) },
    body: JSON.stringify(payload),
  });

  try {
    const denied = await request(false);
    assert.equal(denied.status, 401);
    assert.equal(observed.length, 0, "unauthenticated traffic must not call the AI provider");

    const allowed = await request(true);
    assert.equal(allowed.status, 200);
    const success = await allowed.json();
    assert.equal(success.maxTokens, 6000);
    assert.equal(success.finishReason, "stop");
    assert.equal(success.content, resultContent);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].max_tokens, 6000);
    assert.equal(observed[0].model, "deepseek-chat");

    finishReason = "length";
    resultContent = "Incomplete technical article";
    const truncated = await request(true);
    assert.equal(truncated.status, 422);
    const truncJson = await truncated.json();
    assert.equal(truncJson.code, "AI_OUTPUT_TRUNCATED");
    assert.equal("content" in truncJson, false);

    finishReason = "stop";
    resultContent = "";
    const empty = await request(true);
    assert.equal(empty.status, 502);
    assert.equal((await empty.json()).code, "AI_OUTPUT_EMPTY");
  } finally {
    await new Promise<void>((resolve, reject) => api.close(e => e ? reject(e) : resolve()));
    await new Promise<void>((resolve, reject) => fakeProvider.close(e => e ? reject(e) : resolve()));
  }
});
