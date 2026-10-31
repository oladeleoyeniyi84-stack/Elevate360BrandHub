import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  customerSignupSchema,
  customerLoginSchema,
  insertContactMessageSchema,
  insertNewsletterSubscriberSchema,
  insertBookingSchema,
  chatRequestSchema,
} from "../shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

test("Zod 4 input contracts: valid contact and newsletter normalize email", () => {
  const contact = insertContactMessageSchema.parse({
    name: " Ada ",
    email: " ADA@Example.com ",
    message: " Hello ",
  });
  assert.deepEqual(contact, { name: "Ada", email: "ada@example.com", message: "Hello" });
  const sub = insertNewsletterSubscriberSchema.parse({ email: " Member@Example.com " });
  assert.equal(sub.email, "member@example.com");
});

test("Zod 4 input contracts: reject invalid contact and booking", () => {
  for (const input of [
    { name: "", email: "invalid", message: "Hello" },
    { name: "Ada", email: "valid@example.com", message: "" },
    { name: "Ada", email: "valid@example.com", message: "X".repeat(5001) },
  ]) {
    assert.equal(insertContactMessageSchema.safeParse(input).success, false);
  }
  const valid = insertBookingSchema.parse({
    clientName: " Alex ",
    clientEmail: " ALEX@Example.com ",
    preferredDate: "Friday",
  });
  assert.equal(valid.clientName, "Alex");
  assert.equal(valid.clientEmail, "alex@example.com");
  assert.equal(insertBookingSchema.safeParse({ clientName: "", clientEmail: "nope" }).success, false);
});

test("Zod 4 input contracts: signup and concierge input limits", () => {
  assert.equal(customerSignupSchema.safeParse({ email: "founder@example.com", password: "12345678" }).success, true);
  assert.equal(customerSignupSchema.safeParse({ email: "founder@example.com", password: "short" }).success, false);
  assert.equal(customerLoginSchema.safeParse({ email: "founder@example.com", password: "" }).success, false);
  assert.equal(chatRequestSchema.safeParse({ sessionId: "session_1", message: "Hello" }).success, true);
  assert.equal(chatRequestSchema.safeParse({ sessionId: "x", message: "X".repeat(2001) }).success, false);
  assert.equal(chatRequestSchema.safeParse({ sessionId: "bad/id", message: "Hello" }).success, false);
});

test("Zod 4 uses issues and maintains user-facing error string", () => {
  const parsed = insertContactMessageSchema.safeParse({ name: "", email: "x", message: "" });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.ok(parsed.error instanceof ZodError);
  assert.ok(Array.isArray(parsed.error.issues));
  assert.ok(parsed.error.issues.length > 0);
  assert.equal(typeof fromZodError(parsed.error).message, "string");
});

test("Request body remains capped before Zod validation to avoid unbounded request allocations", () => {
  const entry = readFileSync(resolve("server/index.ts"), "utf8");
  assert.match(entry, /express\.json\(\{[\s\S]*?limit:\s*"256kb"/);
  assert.match(entry, /express\.urlencoded\(\{\s*extended:\s*false,\s*limit:\s*"64kb"/);
});
