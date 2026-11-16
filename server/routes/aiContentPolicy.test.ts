import assert from "node:assert/strict";
import test from "node:test";
import { formatContentGenerationResponse, MAX_TOKENS_BY_TYPE } from "./aiContentPolicy";

const complete = {
  content: "# Finished article\n\nComplete conclusion and references.",
  model: "deepseek-chat",
  latencyMs: 123,
  finishReason: "stop",
};

test("blog uses 6000-token budget without raising other content budgets", () => {
  assert.equal(MAX_TOKENS_BY_TYPE.blog, 6000);
  assert.equal(MAX_TOKENS_BY_TYPE.social, 400);
  assert.equal(MAX_TOKENS_BY_TYPE.email, 1200);
  assert.equal(MAX_TOKENS_BY_TYPE.summary, 600);
  assert.equal(MAX_TOKENS_BY_TYPE.headline, 80);
});

test("completed blog returns HTTP 200 response with full generated text", () => {
  const r = formatContentGenerationResponse("blog", complete);
  assert.equal(r.status, 200);
  assert.equal(r.body.maxTokens, 6000);
  assert.equal(r.body.finishReason, "stop");
  assert.equal(r.body.content, complete.content);
});

test("length-limited blog returns HTTP 422 instead of publishing partial content", () => {
  const r = formatContentGenerationResponse("blog", { ...complete, content: "Partial...", finishReason: "length" });
  assert.equal(r.status, 422);
  assert.equal(r.body.code, "AI_OUTPUT_TRUNCATED");
  assert.equal(r.body.maxTokens, 6000);
  assert.equal(Object.hasOwn(r.body, "content"), false);
});

test("length-limited social content preserves the 400-token limit", () => {
  const r = formatContentGenerationResponse("social", { ...complete, finishReason: "length" });
  assert.equal(r.status, 422);
  assert.equal(r.body.maxTokens, 400);
});

test("empty provider result returns HTTP 502 instead of a blank successful draft", () => {
  const r = formatContentGenerationResponse("blog", { ...complete, content: " \n " });
  assert.equal(r.status, 502);
  assert.equal(r.body.code, "AI_OUTPUT_EMPTY");
});

test("unknown completion reason preserves nonempty content for review", () => {
  const r = formatContentGenerationResponse("blog", { ...complete, finishReason: null });
  assert.equal(r.status, 200);
});
