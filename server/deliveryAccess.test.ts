import test from "node:test";
import assert from "node:assert/strict";
import { deliveryOwnerHash, initializeDeliveryOwner, ownsDelivery, signDeliveryToken, validDeliveryToken } from "./billing/deliveryAccess";

test("delivery ownership fails closed for another browser and legacy orders", () => {
  const a = initializeDeliveryOwner({});
  const b = initializeDeliveryOwner({});
  assert.ok(ownsDelivery(a, deliveryOwnerHash(a)));
  assert.equal(ownsDelivery(b, deliveryOwnerHash(a)), false);
  assert.equal(ownsDelivery(a, undefined), false);
  assert.equal(ownsDelivery(undefined, deliveryOwnerHash(a)), false);
});

test("delivery tokens reject session swapping, browser swapping, tampering and expiry", () => {
  const owner = initializeDeliveryOwner({});
  const other = initializeDeliveryOwner({});
  const secret = "test-only-secret";
  const now = 1_000_000;
  const token = signDeliveryToken("cs_test_a", owner, secret, now);
  assert.ok(validDeliveryToken(token, "cs_test_a", owner, secret, now));
  assert.equal(validDeliveryToken(token, "cs_test_b", owner, secret, now), false);
  assert.equal(validDeliveryToken(token, "cs_test_a", other, secret, now), false);
  assert.equal(validDeliveryToken(token + "x", "cs_test_a", owner, secret, now), false);
  assert.equal(validDeliveryToken(token, "cs_test_a", owner, secret, now + 15 * 60_000), false);
  assert.equal(validDeliveryToken(token, "cs_test_a", owner, "wrong-secret", now), false);
});
