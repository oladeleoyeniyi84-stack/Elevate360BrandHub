import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql=readFileSync("scripts/verify-db-restore-readonly.sql","utf8");
test("restore drill validation performs only read-only metadata queries",()=>{
  const scrubbed=sql.replace(/^--.*$/gm,"");
  const stmts=scrubbed.split(";").map(x=>x.trim()).filter(Boolean);
  assert.equal(stmts[0].toUpperCase(),"BEGIN READ ONLY");
  assert.equal(stmts.at(-1).toUpperCase(),"COMMIT");
  for(const stmt of stmts){
    assert.match(stmt,/^(?:BEGIN READ ONLY|SET LOCAL statement_timeout\s*=|SELECT\s|WITH\s|COMMIT$)/i);
    assert.doesNotMatch(stmt,/\b(?:DROP|DELETE|INSERT|UPDATE|ALTER|TRUNCATE|COPY|CREATE|GRANT|REVOKE|VACUUM|ANALYZE)\s/i);
  }
  assert.match(sql,/information_schema\.tables/);
  assert.match(sql,/pg_stat_user_tables/);
  for(const name of ["orders","stripe_processed_events","user_sessions","bookings","contact_messages","newsletter_subscribers"]){
    assert.ok(sql.includes("'"+name+"'"));
  }
});
