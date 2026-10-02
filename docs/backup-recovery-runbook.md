# Backup and recovery runbook

This runbook records the evidence required before Elevate360Official is treated
as recoverable. It does not enable, change, or test production backups by
itself.

## Required production evidence

An authorized hosting/database operator must record:

- database provider and production instance identifier;
- automated-backup and point-in-time-recovery status;
- encryption, retention period, backup region, and deletion protections;
- recovery-point objective (RPO) and recovery-time objective (RTO);
- application secrets/configuration recovery owner and secure storage location;
- the latest isolated restore-test date, operator, result, and evidence link.

Do not put credentials, connection strings, personal data, or backup contents in
this repository.

## Isolated restore drill

1. Obtain explicit approval from the database owner and choose a non-production
   target that cannot send email, charge payments, or call production webhooks.
2. Record the source backup timestamp and expected RPO.
3. Restore using the provider-supported procedure to the isolated target.
4. Validate schema/migration version, critical table counts, referential
   integrity, and a small set of non-sensitive application reads.
5. Confirm secrets and production integrations were not copied into an active
   environment.
6. Measure elapsed recovery time against the RTO.
7. Destroy the isolated restore using the provider's approved process after the
   evidence is retained.
8. Record gaps, owners, due dates, and the next drill date.

## Evidence log

| Drill date | Backup timestamp | RPO result | Restore duration / RTO result | Operator | Evidence link | Follow-ups |
|---|---|---|---|---|---|---|
| Not yet verified | — | — | — | — | — | Hosting owner must confirm backup/PITR settings and run the first drill. |

Source archives, Git history, and deployment artifacts are not database
backups and must not be used as proof of recoverability.

## October 2, 2026 operator evidence

Render `elevate360-db` was available. The Recovery screen displayed a three-day point-in-time recovery window and at least seven-day logical-export retention. A logical export completed on October 2, 2026 at 4:06 PM Eastern, visible with a success indicator in Render. This is not a completed restore drill or a measured RPO/RTO.

The actual production web service is `Elevate360BrandHub-1` (`srv-d88th2egvqtc73bf9mfg`), serving `www.elevate360official.com`. The similarly named Starter service is not the brand domain service.

## Marketplace access transition

New marketplace orders record only a hash of a random server-session owner. Delivery requires the original checkout browser plus a signed token valid for 15 minutes; payment/refund state is rechecked on every delivery. Legacy orders have no ownership binding and fail closed. Do not backfill ownership from a submitted email or Stripe session ID. Verify the purchaser through a trusted support channel before providing replacement delivery. Browser-session expiry requires the same support recovery. Account-bound cross-device recovery remains a separate identity-verification task. No order schema migration is required.
