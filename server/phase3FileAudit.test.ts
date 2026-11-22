import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileGatewayAudit } from "./webops/phase3FileAudit";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "webops-audit-"));
  return { dir, path: join(dir, "gateway.jsonl") };
}
const event = {
  requestId: "fixture-one", url: "https://www.elevate360official.com/",
  hostname: "www.elevate360official.com", resolvedAddresses: ["93.184.216.34"],
  decision: "allow" as const, reason: "fixture-only", registryVersion: 1,
};

test("file journal appends, recovers after reopen and validates its SHA chain", () => {
  const { dir, path } = fixture();
  try {
    const a = new FileGatewayAudit(path);
    const first = a.append(event);
    assert.equal(first.sequence, 1);
    assert.equal(first.immutable, true);
    const checkpoint = a.checkpoint();
    assert.match(checkpoint.hash, /^[a-f0-9]{64}$/);
    a.close();
    const b = new FileGatewayAudit(path);
    assert.deepEqual(b.checkpoint(), checkpoint);
    assert.equal(b.snapshot().length, 1);
    b.append({ ...event, requestId: "fixture-two", decision: "deny", reason: "test" });
    assert.equal(b.checkpoint().sequence, 2);
    b.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("file journal rejects tampering with previously persisted records", () => {
  const { dir, path } = fixture();
  try {
    const a = new FileGatewayAudit(path);
    a.append(event);
    a.close();
    const raw = readFileSync(path, "utf8");
    writeFileSync(path, raw.replace("fixture-only", "altered-audit"));
    assert.throws(() => new FileGatewayAudit(path), /audit_hash_invalid/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("file journal rejects a truncated final record", () => {
  const { dir, path } = fixture();
  try {
    writeFileSync(path, '{"incomplete":true}', { mode: 0o600 });
    assert.throws(() => new FileGatewayAudit(path), /audit_journal_truncated/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
