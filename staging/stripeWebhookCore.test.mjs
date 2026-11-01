import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {verifySandboxSignature,parseSandboxEvent,MAX_BODY_BYTES,SIGNATURE_TOLERANCE_SECONDS} from "./stripeWebhookCore.mjs";

const secret = "whsec_fixture_test_only_never_external";
const now = 1793490000;
const payload = Buffer.from(JSON.stringify({id:"evt_test123456",type:"checkout.session.completed",livemode:false,data:{object:{id:"cs_test_123"}}}));
function sign(body=payload,at=now){
  const hmac = createHmac("sha256",secret).update(String(at)).update(".").update(body).digest("hex");
  return `t=${at},v1=${hmac}`;
}
test("valid test-mode raw-body signature passes and exposes only event ID/type", () => {
  assert.equal(verifySandboxSignature(payload,sign(),secret,now),true);
  assert.deepEqual(parseSandboxEvent(payload),{id:"evt_test123456",type:"checkout.session.completed",livemode:false});
});
test("payload tampering, invalid signature and empty body are rejected", () => {
  assert.throws(()=>verifySandboxSignature(Buffer.from(payload.toString().replace("completed","expired")),sign(),secret,now),/signature/i);
  assert.throws(()=>verifySandboxSignature(payload,"t="+now+",v1="+"0".repeat(64),secret,now),/signature/i);
  assert.throws(()=>verifySandboxSignature(Buffer.alloc(0),sign(),secret,now),/body/i);
});
test("timestamps older or newer than five minutes cannot be accepted", () => {
  assert.equal(SIGNATURE_TOLERANCE_SECONDS,300);
  assert.throws(()=>verifySandboxSignature(payload,sign(payload,now-301),secret,now),/timestamp/i);
  assert.throws(()=>verifySandboxSignature(payload,sign(payload,now+301),secret,now),/timestamp/i);
});
test("test-only guard rejects live events and malformed Stripe objects", () => {
  const live=Buffer.from(JSON.stringify({id:"evt_live123456",type:"checkout.session.completed",livemode:true}));
  assert.equal(verifySandboxSignature(live,sign(live),secret,now),true);
  assert.throws(()=>parseSandboxEvent(live),/Live-mode/);
  assert.throws(()=>parseSandboxEvent(Buffer.from('{"type":"payment_intent.succeeded","livemode":false}')),/event id/);
  assert.throws(()=>parseSandboxEvent(Buffer.from('{"id":"evt_ok123","type":"<script>","livemode":false}')),/event type/);
});
test("reject oversized payload and malformed signature header", () => {
  assert.throws(()=>verifySandboxSignature(Buffer.alloc(MAX_BODY_BYTES+1),sign(),secret,now),/body/);
  assert.throws(()=>verifySandboxSignature(payload,"garbage",secret,now),/signature/i);
  assert.throws(()=>verifySandboxSignature(payload,sign(),"sk_live_definitely_not_a_webhook_secret",now),/secret/i);
});
