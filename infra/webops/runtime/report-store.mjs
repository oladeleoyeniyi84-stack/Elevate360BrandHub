import { constants, openSync, closeSync, fstatSync, realpathSync, readdirSync,
  lstatSync, mkdirSync, rmdirSync, writeFileSync, fsyncSync, linkSync, unlinkSync } from 'node:fs';
import { resolve, join, isAbsolute } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { buildDiagnosticReport } from './report.mjs';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const REPORT_NAME = new RegExp(`^report-${UUID}\\.json$`);
const MAX_REPORT_BYTES = 65536;
const LOCK = '.report-store.lock';

// Host-side storage primitive only. Never imported by the isolated worker CLI.
// Directory and its ancestors must be controlled by the trusted operator.
export function storeDiagnosticReport(monitor, metadata, { directory, maxReports = 720 } = {}) {
  const report = buildDiagnosticReport(monitor, metadata);
  const data = Buffer.from(JSON.stringify(report) + '\n');
  if (typeof directory !== 'string' || !isAbsolute(directory) ||
      !Number.isInteger(maxReports) || maxReports < 1 || maxReports > 720 ||
      data.length > MAX_REPORT_BYTES) throw new Error('invalid_report_store_configuration');
  const root = resolve(directory);
  if (realpathSync(root) !== root) throw new Error('unsafe_report_directory');
  const dirFd = openSync(root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  let locked = false, temporary;
  try {
    const dirStat = fstatSync(dirFd);
    if (!dirStat.isDirectory() || (dirStat.mode & 0o777) !== 0o700 ||
        dirStat.uid !== process.getuid()) throw new Error('unsafe_report_directory');
    try { mkdirSync(join(root, LOCK), {mode: 0o700}); locked = true; }
    catch (error) {
      if (error.code === 'EEXIST') throw new Error('report_store_locked');
      throw error;
    }
    const names = readdirSync(root).filter(name => name !== LOCK);
    // No pruning: a full store requires operator export/review before resuming.
    if (names.length >= maxReports) throw new Error('report_store_full');
    for (const name of names) {
      const info = lstatSync(join(root, name));
      if (!REPORT_NAME.test(name) || !info.isFile() || info.nlink !== 1 ||
          info.uid !== process.getuid() || (info.mode & 0o777) !== 0o600 ||
          info.size > MAX_REPORT_BYTES) throw new Error('unexpected_report_store_entry');
    }
    const name = `report-${report.runId}.json`;
    if (names.includes(name)) throw new Error('duplicate_report_run');
    const pendingPath = join(root, `.pending-${randomUUID()}`);
    const fd = openSync(pendingPath, 'wx', 0o600);
    temporary = pendingPath; // Cleanup only a file this writer actually created.
    try { writeFileSync(fd, data); fsyncSync(fd); }
    finally { closeSync(fd); }
    // Hard-link publication is atomic and refuses to replace an existing name.
    linkSync(temporary, join(root, name));
    unlinkSync(temporary); temporary = undefined;
    fsyncSync(dirFd);
    return Object.freeze({ name, bytes: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
      stored: true, immutable: false, reportsRemaining: maxReports - names.length - 1 });
  } finally {
    try {
      if (temporary) unlinkSync(temporary);
    } finally {
      try {
        if (locked) { rmdirSync(join(root, LOCK)); fsyncSync(dirFd); }
      } finally { closeSync(dirFd); }
    }
  }
}
