# November 2026 — production database access and recovery assurance

**Status: evidence collection and operator drill pending; not a completed restoration.**
This procedure applies to the paid Render Postgres **elevate360-db**, not the separate expiring Stripe sandbox database.
The live service **Elevate360BrandHub-1** must keep its original DATABASE_URL, webhook configuration and production schedule.

## Verified non-invasive facts (November 1, 2026)

- Production DB: PostgreSQL 18, paid `basic_1gb` instance, Ohio, `available`, 1 GB provisioned disk.
- Database size ~249 MB, 105 public tables; WAL setting `archive_mode=on` and `wal_level=replica`.
- The database's **external** IP allowlist has a permissive `everywhere` entry (`0.0.0.0/0`).
- A single snapshot of `pg_stat_activity` showed three client connections and no non-private source addresses. This **does not inventory intermittent, historic, or off-platform external clients**.
- Application source uses `process.env.DATABASE_URL`, but code and SQL cannot establish whether its current configured hostname is the Render **internal** host. Operator confirmation required without sharing a URL or credential.
- Existing recovery runbook records a successful October 2 logical export and a *then-observed* point-in-time recovery window. This does not verify backup freshness or restore success today.
- Neither availability of provider PITR nor retention can be verified from `archive_mode` or `wal_level` alone; verify the Render **Recovery** page.
- No user records, credentials, payment events, production data, or backup files were exported by this audit.

## Network hardening: safe execution gate

1. On **Elevate360BrandHub-1 → Environment**, inspect only the **host** in `DATABASE_URL` without copying or exposing the value. It must be the **internal** hostname for the paid production DB, *not* the public external host and not the Stripe sandbox database.
2. Inventory legitimate external consumers: operators' `psql`/GUI clients, migrations/CI, backup/export tooling, BI/analytics, contractors, WebOps, and any third-party integrations. `pg_stat_activity` is only a momentary sample.
3. Determine whether those clients can instead use a secure private path or authorized fixed CIDR addresses. Record owners and expiry dates for any necessary exception, **not public IP values in this public repository**.
4. Validate that ordinary production requests and database-dependent scheduled work succeed while existing allowlist is still unchanged. Record a redacted baseline.
5. **Only then**, in Render → `elevate360-db` → Info/Networking/Access Control, replace `0.0.0.0/0` with the agreed fixed CIDR list or disable external access entirely if no external consumers are legitimate. Same-region internal Render connections do not use the external allowlist.
6. Recheck production application health, database-backed endpoint behavior, authentication/session persistence and scheduled work. Verify any approved off-platform integrations.
7. If an important legitimate connection fails, restore the *documented prior allowlist* from the Render dashboard, and re-investigate. **Do not rotate credentials** absent compromise.
8. Record the final change time, operator, allowed scopes, verification and rollback evidence in a restricted operational record.

**Not yet changed:** There is no database IP-allowlist update action in the currently available connected Render tools. The operator must perform the actual network setting update after the dependency gate is satisfied.

## Recovery: provider-supported isolated PITR drill (do not cut over)

1. Render → paid `elevate360-db` → **Recovery**: record available PITR date/time range and latest logical export timestamp. Hobby workspaces normally have a three-day PITR window; Pro or higher normally seven days, subject to actual plan and database state.
2. Confirm paid restoration capacity and possible **new-instance charges**. Select an off-peak point at least ten minutes in the past, within the visible recovery window. Set proposed targets **RPO ≤ 1 hour** and **RTO ≤ 4 hours**, subject to Founder approval; do not assert they are achieved.
3. Click **Restore Database**. Give the new, separate instance a distinct name such as `elevate360-restore-drill-202611`. Choose **Copy Existing Settings: No** if available, and review compute plan. Render documents that PITR **copies the source IP allowlist even when other settings are not copied**. Immediately restrict the new restore instance's *external* allowlist before attaching any clients.
4. Do **not** attach the restore target to the production environment group, main web service, Stripe, outbound email, or autonomous background jobs. **Do not change the production `DATABASE_URL` or suspend/delete the source.**
5. On the isolated restored database, run `scripts/verify-db-restore-readonly.sql` via an approved secure DB client. This executes only read-only metadata and aggregate-count queries; store results in access-controlled evidence, not a public repo.
6. Confirm expected critical tables and non-sensitive data integrity with the responsible application owner. A restored point in the past may legitimately have lower counts than current production.
7. Measure restore start, ready-for-validation timestamp and validation end; calculate actual restoration duration and whether selected backup time meets the RPO. These timings must be **observed**, not estimated.
8. Record a sanitized pass/fail checklist, PITR source and target timestamps, actual RPO/RTO results, and any issue in a restricted evidence record. Suspend/delete the temporary restore DB with explicit operator approval after evidence is retained, to avoid ongoing cost.
9. Repeat the drill periodically and test the separate logical-export route as a distinct exercise, with privacy and retention controls.

## Evidence sheet

| Check | Expected | Actual result |
|---|---|---|
| Current PITR available interval visible in Render Recovery | Recorded, dated | Not yet verified |
| Latest logical backup / export timestamp | Recorded, dated | Last known October 2 export; today's status unverified |
| Production URL uses correct internal DB hostname | Confirmed by operator | Pending |
| Legitimate external DB clients inventoried | Yes | Pending |
| External 0.0.0.0/0 replaced or explicitly risk-accepted | Yes | Pending |
| Isolated PITR target created and network-restricted | Yes | Not yet performed |
| Restored DB tables and metadata validated | Yes | Not yet performed |
| Actual RPO against selected recovery point | Founder-approved objective | Not yet measured |
| Actual end-to-end recovery duration / RTO | Founder-approved objective | Not yet measured |
| Temporary restore disposed / costs checked | Confirmed | Not applicable yet |

**Security:** No secrets, private hostnames, user records, exports, or backup archives should be committed here. The restore target contains a *copy of production data* and must be treated as sensitive. Production keys and credentials should never be copied into a new running application.
