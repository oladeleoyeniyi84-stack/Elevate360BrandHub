import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, fsyncSync, openSync, readFileSync, writeSync } from "node:fs";
import type { AppendOnlyGatewayAudit, NewGatewayAuditEvent } from "./phase3Audit";
import type { GatewayAuditEvent } from "./phase3GatewayPolicy";

export interface GatewayAuditCheckpoint {
  sequence: number;
  hash: string;
}

/**
 * Single-writer, synchronous, chained host-file audit journal.
 * This makes inadvertent corruption detectable, NOT tampering impossible.
 * Production acceptance requires a host-owned append-only export/remote immutable sink,
 * retention policy, external hash checkpoints and evidence of worker write isolation.
 */
export class FileGatewayAudit implements AppendOnlyGatewayAudit {
  private readonly fd: number;
  private readonly events: GatewayAuditEvent[] = [];
  private lastHash = "0".repeat(64);

  constructor(path: string) {
    if (!path.startsWith("/") || path.includes("\u0000")) throw new Error("audit_absolute_path_required");
    // O_NOFOLLOW rejects a symlink at the journal path; the directory must
    // also be controlled by the host and not writable by the worker.
    this.fd = openSync(path, constants.O_RDWR | constants.O_APPEND | constants.O_CREAT |
      constants.O_NOFOLLOW | constants.O_DSYNC, 0o600);
    try {
      const meta = fstatSync(this.fd);
      if (!meta.isFile() || meta.nlink !== 1 || (meta.mode & 0o077) !== 0) {
        throw new Error("audit_path_not_private_regular_file");
      }
      const raw = readFileSync(this.fd, "utf8");
      let previous = "0".repeat(64);
      if (raw.length > 16_000_000) throw new Error("audit_file_too_large");
      if (raw !== "" && !raw.endsWith("\n")) throw new Error("audit_journal_truncated");
      for (const line of raw.split("\n").filter(Boolean)) {
        const record: unknown = JSON.parse(line);
        if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("audit_record_invalid");
        const entry = record as Record<string, unknown>;
        if (entry.previousHash !== previous || typeof entry.hash !== "string" ||
            !Number.isSafeInteger(entry.sequence) || entry.sequence !== this.events.length + 1 ||
            !entry.event || typeof entry.event !== "object") throw new Error("audit_chain_invalid");
        const encoded = JSON.stringify({ sequence: entry.sequence, previousHash: previous, event: entry.event });
        const hash = createHash("sha256").update(encoded).digest("hex");
        if (hash !== entry.hash) throw new Error("audit_hash_invalid");
        const event = entry.event as GatewayAuditEvent;
        if (event.sequence !== entry.sequence || event.immutable !== true ||
            !Array.isArray(event.resolvedAddresses) ||
            !["allow", "deny"].includes(event.decision)) throw new Error("audit_event_invalid");
        this.events.push(Object.freeze({ ...event, resolvedAddresses: Object.freeze([...event.resolvedAddresses]) }));
        previous = hash;
      }
      this.lastHash = previous;
    } catch (error) {
      closeSync(this.fd);
      throw error;
    }
  }

  append(event: NewGatewayAuditEvent): GatewayAuditEvent {
    const stored = Object.freeze({
      ...event,
      resolvedAddresses: Object.freeze([...event.resolvedAddresses]),
      sequence: this.events.length + 1,
      immutable: true as const,
    });
    const previousHash = this.lastHash;
    const encoded = JSON.stringify({ sequence: stored.sequence, previousHash, event: stored });
    const hash = createHash("sha256").update(encoded).digest("hex");
    const line = Buffer.from(JSON.stringify({ sequence: stored.sequence, previousHash, event: stored, hash }) + "\n");
    // If the write fails, do not report an audit success or continue with egress.
    let offset = 0;
    while (offset < line.length) {
      const n = writeSync(this.fd, line, offset, line.length - offset);
      if (n <= 0) throw new Error("audit_write_failed");
      offset += n;
    }
    fsyncSync(this.fd);
    this.events.push(stored);
    this.lastHash = hash;
    return stored;
  }

  checkpoint(): GatewayAuditCheckpoint {
    return Object.freeze({ sequence: this.events.length, hash: this.lastHash });
  }

  snapshot(): readonly GatewayAuditEvent[] {
    return Object.freeze([...this.events]);
  }

  close(): void {
    closeSync(this.fd);
  }
}
