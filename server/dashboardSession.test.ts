import test from "node:test";
import assert from "node:assert/strict";
import { dashboardSessionPermitted } from "./auth/dashboardSession";

test("dashboard permissions reject customer, missing role, unknown role and read-only mutations", () => {
  assert.equal(dashboardSessionPermitted({ customerId: "customer" }, "GET"), false);
  assert.equal(dashboardSessionPermitted({ dashboardAuthed: true }, "POST"), false);
  assert.equal(dashboardSessionPermitted({ dashboardAuthed: true, dashboardRole: "unknown" }, "GET"), false);
  assert.ok(dashboardSessionPermitted({ dashboardAuthed: true, dashboardRole: "analyst" }, "GET"));
  assert.equal(dashboardSessionPermitted({ dashboardAuthed: true, dashboardRole: "analyst" }, "POST"), false);
  assert.ok(dashboardSessionPermitted({ dashboardAuthed: true, dashboardRole: "founder" }, "POST"));
});
