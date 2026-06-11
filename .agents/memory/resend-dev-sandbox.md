---
name: Resend dev sandbox restriction
description: Why outbound emails to real recipients 403 in dev but admin emails succeed
---

In development, Resend (via `server/email.ts`) runs in sandbox/test mode: it can ONLY
deliver to the account's own verified address. Sending to any other recipient returns
`403 validation_error` ("You can only send testing emails to your own email address…
verify a domain at resend.com/domains and change the `from` address").

**Why:** the `from` address defaults to `onboarding@resend.dev` (env `EMAIL_FROM` unset)
and no custom domain is verified on the dev Resend account.

**How to apply:** A 403 from Resend in dev when emailing a lead/customer is EXPECTED,
not a code bug — do not "fix" the email code in response to it. Admin notifications to
the founder address succeed because that address is the verified owner. Real delivery to
arbitrary recipients requires verifying a domain + setting `EMAIL_FROM` in production.
All email sends are fire-and-forget (`.catch(() => {})`), so a 403 never breaks the
request's success response.
