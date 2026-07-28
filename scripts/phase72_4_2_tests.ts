// Phase 72.4.2 — Search Intelligence authentication UX regression tests.
// Run with the dev server up on :5000:  npx tsx scripts/phase72_4_2_tests.ts
//
// Backend contract checks run over HTTP (401 without session, PIN login,
// successful retry with the fresh session cookie). Client routing rules
// (401 → PIN gate, 403 → access-denied copy, 5xx/network → generic error
// with retry) are verified as structural assertions against the page source,
// matching this project's script-based test conventions.

import fs from "fs";

const BASE_URL = "http://localhost:5000";
const PAGE = fs.readFileSync("client/src/pages/SearchIntelligence.tsx", "utf-8");

let pass = 0, fail = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}
function section(t: string) { console.log(`\n━━ ${t} ━━`); }

async function main() {
  // ── A. Backend contract (unchanged middleware) ────────────────────────────
  section("A. Backend auth contract");
  const unauth = await fetch(`${BASE_URL}/api/dashboard/search-intelligence`);
  check("unauthenticated dashboard GET → 401", unauth.status === 401);
  check("401 is JSON (not SPA shell)", (unauth.headers.get("content-type") ?? "").includes("application/json"));

  const badPin = await fetch(`${BASE_URL}/api/dashboard/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: "definitely-wrong" }),
  });
  check("wrong PIN → 401", badPin.status === 401);

  const realPin = process.env.DASHBOARD_PIN;
  if (!realPin) {
    check("DASHBOARD_PIN available for retry test", false, "env var missing");
  } else {
    const login = await fetch(`${BASE_URL}/api/dashboard/auth`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: realPin }),
    });
    check("correct PIN → 200", login.status === 200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
    check("session cookie issued", cookie.length > 0);

    // Successful retry after authentication — the exact flow the page now
    // performs automatically after PinGate succeeds.
    const retry = await fetch(`${BASE_URL}/api/dashboard/search-intelligence`, { headers: { cookie } });
    check("authenticated retry → 200", retry.status === 200);
    const body = await retry.json().catch(() => null);
    check("retry returns full dashboard payload", !!body?.firstParty && !!body?.syncStatus);
  }

  // ── B. Client routing rules (structural) ──────────────────────────────────
  section("B. Client 401/403/5xx/network routing");
  check("HttpError carries status from fetch", /class HttpError extends Error/.test(PAGE) && /throw new HttpError\(res\.status\)/.test(PAGE));
  check("401 routes to PIN flow (onUnauthenticated), not error screen",
    /status === 401/.test(PAGE) && /onUnauthenticated\(\)/.test(PAGE) && /if \(unauthorized\)/.test(PAGE));
  check("401 clears stale sessionStorage hint before re-gating",
    /sessionStorage\.removeItem\("e360_dashboard_auth"\)/.test(PAGE));
  check("successful PIN auth clears cached 401 so console auto-retries",
    /removeQueries\(\{ queryKey: \["\/api\/dashboard\/search-intelligence"\] \}\)/.test(PAGE) && /onAuth=\{handleAuth\}/.test(PAGE));
  check("403 gets a distinct access-denied message (no PIN loop)",
    /status === 403/.test(PAGE) && /Access denied/.test(PAGE));
  check("generic failure copy reserved for non-auth errors (5xx/network)",
    /Could not load search intelligence\./.test(PAGE) && PAGE.indexOf("if (unauthorized)") < PAGE.indexOf("Could not load search intelligence."));
  check("5xx/network failures keep the Retry button",
    /query\.refetch\(\)/.test(PAGE) && /!forbidden && \(/.test(PAGE));
  check("no client retry storm on 401/403; transient errors retried",
    /err\.status === 401 \|\| err\.status === 403/.test(PAGE) && /count < 2/.test(PAGE));
  check("PIN gate flow itself unchanged (posts to /api/dashboard/auth)",
    /fetch\("\/api\/dashboard\/auth"/.test(PAGE) && /input-search-pin/.test(PAGE));

  console.log(`\n══════ RESULT: ${pass} passed, ${fail} failed ══════`);
  if (fail) { console.log("Failures:", failures.join(" | ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
