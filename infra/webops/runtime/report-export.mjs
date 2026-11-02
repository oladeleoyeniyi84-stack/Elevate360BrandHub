import { constants, openSync, closeSync, fstatSync, realpathSync, readdirSync,
  mkdirSync, rmdirSync, readFileSync, writeFileSync, fsyncSync, linkSync, unlinkSync } from 'node:fs';
import { resolve, join, isAbsolute } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { decodeWorkerReport } from './report-ingest.mjs';

const LIMIT = 64 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const namePattern = /^report-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/;

function privateDirectory(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || realpathSync(path) !== resolve(path))
    throw new Error('unsafe_export_directory');
  const fd = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  const stat = fstatSync(fd);
  if (stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700) {
    closeSync(fd); throw new Error('unsafe_export_directory');
  }
  return fd;
}

function privateFile(path, maximum) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid() || stat.nlink !== 1 ||
        (stat.mode & 0o777) !== 0o600 || stat.size > maximum) throw new Error('unsafe_export_file');
    const data = readFileSync(fd);
    if (data.length > maximum) throw new Error('export_too_large');
    return data;
  } finally { closeSync(fd); }
}

export function verifyReportBundle(bytes, expectedSha256) {
  if (!Buffer.isBuffer(bytes) || bytes.length > LIMIT || !/^[a-f0-9]{64}$/.test(expectedSha256) ||
      hash(bytes) !== expectedSha256) throw new Error('bundle_digest_mismatch');
  const bundle = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  if (bundle.schemaVersion !== 1 || bundle.kind !== 'webops-report-export' ||
      Object.keys(bundle).sort().join(',') !== 'entries,kind,schemaVersion' ||
      !Array.isArray(bundle.entries) || bundle.entries.length < 1 || bundle.entries.length > 720)
    throw new Error('invalid_report_bundle');
  let previous = '', totalBytes = 0;
  for (const entry of bundle.entries) {
    if (!entry || Object.keys(entry).sort().join(',') !== 'base64,bytes,name,sha256' ||
        typeof entry.name !== 'string' || !namePattern.test(entry.name) || entry.name <= previous ||
        typeof entry.base64 !== 'string' || entry.base64.length > 87384)
      throw new Error('invalid_report_bundle');
    const data = Buffer.from(entry.base64, 'base64');
    if (data.toString('base64') !== entry.base64 || data.length !== entry.bytes ||
        data.length > 65536 || hash(data) !== entry.sha256) throw new Error('invalid_report_bundle');
    const {metadata} = decodeWorkerReport(data);
    if (entry.name !== `report-${metadata.runId}.json`) throw new Error('report_name_mismatch');
    previous = entry.name; totalBytes += data.length;
  }
  return {verified: true, reports: bundle.entries.length, reportBytes: totalBytes,
    sha256: expectedSha256, authentic: false, immutable: false};
}

export function exportReports(sourceDirectory, destinationDirectory) {
  const source = resolve(sourceDirectory), destination = resolve(destinationDirectory);
  if (source === destination || source.startsWith(destination + '/') || destination.startsWith(source + '/'))
    throw new Error('overlapping_export_directories');
  // Validate original arguments as absolute, not just the resolved paths.
  const sourceFd = privateDirectory(sourceDirectory);
  let destinationFd, locked = false, temporary;
  const lock = join(source, '.report-store.lock');
  try {
    destinationFd = privateDirectory(destinationDirectory);
    mkdirSync(lock, {mode: 0o700}); locked = true; fsyncSync(sourceFd);
    const names = readdirSync(source).filter(n => n !== '.report-store.lock').sort();
    if (names.length < 1 || names.length > 720) throw new Error('invalid_export_count');
    const entries = names.map(name => {
      if (!namePattern.test(name)) throw new Error('unexpected_report_store_entry');
      const data = privateFile(join(source, name), 65536);
      return {name, bytes: data.length, sha256: hash(data), base64: data.toString('base64')};
    });
    const bytes = Buffer.from(JSON.stringify({schemaVersion: 1, kind: 'webops-report-export', entries}) + '\n');
    const digest = hash(bytes);
    const receipt = verifyReportBundle(bytes, digest);
    const name = `reports-${randomUUID()}.json`, pending = join(destination, '.' + name + '.pending');
    const fd = openSync(pending, 'wx', 0o600); temporary = pending;
    try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    // Read back before atomic publication; never overwrite a previous export.
    verifyReportBundle(privateFile(pending, LIMIT), digest);
    linkSync(pending, join(destination, name)); unlinkSync(pending); temporary = undefined;
    fsyncSync(destinationFd);
    return {...receipt, name, bundleBytes: bytes.length, exported: true, sourceDeleted: false};
  } finally {
    try { if (temporary) unlinkSync(temporary); }
    finally {
      try { if (locked) {rmdirSync(lock); fsyncSync(sourceFd);} }
      finally { closeSync(sourceFd); if (destinationFd !== undefined) closeSync(destinationFd); }
    }
  }
}

export function verifyReportBundleFile(path, expectedSha256) {
  if (!isAbsolute(path) || realpathSync(path) !== resolve(path)) throw new Error('unsafe_bundle_path');
  return verifyReportBundle(privateFile(path, LIMIT), expectedSha256);
}
