import assert from "node:assert/strict";
import test from "node:test";
import { canonicalRedirect } from "./canonicalRedirect";
import { escapeEmailHtml, sanitizeEmailHeader } from "./email";
import { rateLimit } from "./routes";
import {
  insertBookingSchema,
  insertContactMessageSchema,
  insertLeadMagnetLeadSchema,
  insertNewsletterSubscriberSchema,
} from "@shared/schema";

test("email helpers escape markup and strip header injection", () => {
  assert.equal(
    escapeEmailHtml(`<img src=x onerror="alert(1)"> O'Brien & Co`),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; O&#39;Brien &amp; Co",
  );
  assert.equal(sanitizeEmailHeader("Hello\r\nBcc: victim@example.com"), "Hello Bcc: victim@example.com");
});

test("canonical redirect never reflects an attacker-controlled host", () => {
  const previous = process.env.CANONICAL_HOST;
  process.env.CANONICAL_HOST = "www.elevate360official.com";
  let location = "";
  const req = {
    get: () => "attacker.example",
    hostname: "attacker.example",
    secure: false,
    originalUrl: "/pricing?plan=pro",
  };
  const res = {
    status: (status: number) => {
      assert.equal(status, 301);
      return res;
    },
    setHeader: (name: string, value: string) => {
      assert.equal(name, "Location");
      location = value;
    },
    end: () => res,
  };
  canonicalRedirect(req as any, res as any, () => assert.fail("should redirect"));
  assert.equal(location, "https://www.elevate360official.com/pricing?plan=pro");
  if (previous === undefined) delete process.env.CANONICAL_HOST;
  else process.env.CANONICAL_HOST = previous;
});

test("canonical redirect keeps network-path inputs on the canonical origin", () => {
  const previousCanonicalHost = process.env.CANONICAL_HOST;
  process.env.CANONICAL_HOST = "www.elevate360official.com";
  try {
    let location = "";
    const req = {
      get: () => "attacker.example",
      hostname: "attacker.example",
      secure: false,
      originalUrl: "//attacker.example/phish?campaign=test",
    };
    const res = {
      status: () => res,
      setHeader: (_name: string, value: string) => {
        location = value;
      },
      end: () => res,
    };
    canonicalRedirect(req as never, res as never, (() => undefined) as never);
    const target = new URL(location);
    assert.equal(target.origin, "https://www.elevate360official.com");
    assert.equal(target.search, "?campaign=test");
  } finally {
    if (previousCanonicalHost === undefined) delete process.env.CANONICAL_HOST;
    else process.env.CANONICAL_HOST = previousCanonicalHost;
  }
});

test("invalid canonical configuration fails open without reflecting request data", () => {
  const previous = process.env.CANONICAL_HOST;
  process.env.CANONICAL_HOST = "https://example.com/unsafe-path";
  let nextCalled = false;
  canonicalRedirect(
    { get: () => "attacker.example", hostname: "attacker.example" } as any,
    { redirect: () => assert.fail("should not redirect") } as any,
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
  if (previous === undefined) delete process.env.CANONICAL_HOST;
  else process.env.CANONICAL_HOST = previous;
});

test("checkout-style rate limiter rejects requests after its quota", () => {
  const middleware = rateLimit(5, 60);
  const path = `/phase72-8-rate-limit-${Date.now()}`;
  const statuses: number[] = [];
  let allowed = 0;
  const req = {
    path,
    ip: "198.51.100.72",
    headers: {},
    socket: {},
  };
  const res = {
    set() { return res; },
    status(code: number) {
      statuses.push(code);
      return res;
    },
    json() { return res; },
  };
  for (let i = 0; i < 6; i++) {
    middleware(req, res, () => { allowed++; });
  }
  assert.equal(allowed, 5);
  assert.deepEqual(statuses, [429]);
});

test("public PII capture schemas trim and canonicalize email identities", () => {
  assert.equal(
    insertContactMessageSchema.parse({
      name: "  Ada  ",
      email: " ADA@Example.COM ",
      message: "  Please contact me. ",
    }).email,
    "ada@example.com",
  );
  assert.equal(
    insertNewsletterSubscriberSchema.parse({ email: " Reader@Example.COM " }).email,
    "reader@example.com",
  );
  assert.equal(
    insertLeadMagnetLeadSchema.parse({
      firstName: "  Ada ",
      email: " ADA@Example.COM ",
      source: "  homepage ",
    }).email,
    "ada@example.com",
  );
  assert.equal(
    insertBookingSchema.parse({
      clientName: " Ada ",
      clientEmail: " ADA@Example.COM ",
      preferredDate: " 2026-09-01 ",
    }).clientEmail,
    "ada@example.com",
  );
});

test("public booking schema rejects blank request fields after normalization", () => {
  assert.equal(
    insertBookingSchema.safeParse({
      clientName: " ",
      clientEmail: "person@example.com",
    }).success,
    false,
  );
  assert.equal(
    insertBookingSchema.safeParse({
      clientName: "Person",
      clientEmail: "person@example.com",
      preferredDate: " ",
    }).success,
    false,
  );
});