const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CREATOR_EMAIL = process.env.CREATOR_EMAIL;
const FROM_ADDRESS = "Elevate360 <onboarding@resend.dev>";
const BRAND_GOLD = "#F4A62A";
const BRAND_NAVY = "#0d1a2e";

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
        <!-- Header -->
        <tr>
          <td style="background:${BRAND_NAVY};padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:${BRAND_GOLD};letter-spacing:0.04em;">ELEVATE360</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.55);letter-spacing:0.06em;text-transform:uppercase;">${title}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Elevate360Official · <a href="https://www.elevate360official.com" style="color:${BRAND_GOLD};text-decoration:none;">elevate360official.com</a>
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">This notification was sent automatically from your brand hub.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`[email] Resend error ${res.status}:`, err);
  } else {
    console.log(`[email] Sent "${subject}" → ${to}`);
  }
}

export async function notifyNewContact(
  name: string,
  email: string,
  message: string
): Promise<void> {
  if (!CREATOR_EMAIL) return;

  const body = `
    <h2 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#111827;">New Contact Message</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">From</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">${name}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Email</p>
          <a href="mailto:${email}" style="margin:4px 0 0;display:block;font-size:16px;color:${BRAND_GOLD};text-decoration:none;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
          <p style="margin:4px 0 0;font-size:15px;color:#374151;line-height:1.7;">${message.replace(/\n/g, "<br>")}</p>
        </td>
      </tr>
    </table>
    <div style="margin-top:32px;">
      <a href="mailto:${email}" style="display:inline-block;padding:12px 28px;background:${BRAND_GOLD};color:#0d1a2e;font-weight:700;font-size:14px;border-radius:999px;text-decoration:none;">Reply to ${name}</a>
    </div>`;

  await sendEmail(
    CREATOR_EMAIL,
    `📬 New contact from ${name} — Elevate360`,
    baseTemplate("New Contact Message", body)
  );
}

export async function notifyNewLead(
  sessionId: string,
  name?: string,
  email?: string
): Promise<void> {
  if (!CREATOR_EMAIL || !email) return;

  const displayName = name || "Anonymous visitor";

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">New Lead Captured</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Someone engaged with the AI Concierge and shared their contact details.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Name</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">${displayName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Email</p>
          <a href="mailto:${email}" style="margin:4px 0 0;display:block;font-size:16px;color:${BRAND_GOLD};text-decoration:none;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Session</p>
          <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;font-family:monospace;">${sessionId}</p>
        </td>
      </tr>
    </table>
    <div style="margin-top:32px;">
      <a href="mailto:${email}" style="display:inline-block;padding:12px 28px;background:${BRAND_GOLD};color:#0d1a2e;font-weight:700;font-size:14px;border-radius:999px;text-decoration:none;">Follow Up with ${displayName}</a>
    </div>`;

  await sendEmail(
    CREATOR_EMAIL,
    `🎯 New lead: ${displayName} — Elevate360 Concierge`,
    baseTemplate("AI Concierge Lead", body)
  );
}

export async function sendContactReply(
  toName: string,
  toEmail: string,
  replyText: string
): Promise<void> {
  const body = `
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">Hello ${toName},</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Thank you for reaching out to Elevate360. Here's our reply to your message:</p>
    <div style="padding:20px 24px;background:#f9fafb;border-left:4px solid ${BRAND_GOLD};border-radius:0 12px 12px 0;margin-bottom:28px;">
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.8;white-space:pre-wrap;">${replyText.replace(/\n/g, "<br>")}</p>
    </div>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">
      Feel free to reply to this email if you have further questions. We look forward to hearing from you.
    </p>
    <p style="margin:20px 0 0;font-size:14px;color:#374151;font-weight:600;">— The Elevate360 Team</p>`;

  await sendEmail(
    toEmail,
    `Re: Your message to Elevate360`,
    baseTemplate("Reply from Elevate360", body)
  );
}

export async function notifyNewSubscriber(email: string): Promise<void> {
  const welcomeBody = `
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#111827;">Welcome to Elevate360! 🎉</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
      You're now part of the Elevate360 community. You'll be among the first to know about new apps, book releases, music drops, and exclusive content from Oladele Oyeniyi.
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.7;">
      In the meantime, explore what we've built:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <a href="https://bondedlove.elevate360official.com" style="font-size:14px;color:${BRAND_GOLD};font-weight:600;text-decoration:none;">📱 Bondedlove — Dating App</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <a href="https://health.elevate360official.com" style="font-size:14px;color:${BRAND_GOLD};font-weight:600;text-decoration:none;">💚 Healthwisesupport — Wellness App</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <a href="https://www.amazon.com/dp/B0GMBNPZC9" style="font-size:14px;color:${BRAND_GOLD};font-weight:600;text-decoration:none;">📚 Healthwise: Stay Healthy — Book</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <a href="https://audiomack.com/elevate360music" style="font-size:14px;color:${BRAND_GOLD};font-weight:600;text-decoration:none;">🎵 Elevate360 Music on Audiomack</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9ca3af;">— The Elevate360 Team</p>`;

  const adminBody = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">New Newsletter Subscriber</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Someone just subscribed to the Elevate360 newsletter.</p>
    <div style="padding:20px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Subscriber Email</p>
      <a href="mailto:${email}" style="margin:6px 0 0;display:block;font-size:18px;color:${BRAND_GOLD};font-weight:700;text-decoration:none;">${email}</a>
    </div>`;

  await Promise.all([
    sendEmail(email, "Welcome to Elevate360! 🎉", baseTemplate("Welcome Aboard", welcomeBody)),
    CREATOR_EMAIL
      ? sendEmail(CREATOR_EMAIL, `📧 New subscriber: ${email}`, baseTemplate("Newsletter Signup", adminBody))
      : Promise.resolve(),
  ]);
}

export interface DigestStats {
  pageViewsTotal: number;
  pageViews7d: number;
  chatTotal: number;
  chat7d: number;
  leadsTotal: number;
  leads7d: number;
  contactsTotal: number;
  contacts7d: number;
  subscribersTotal: number;
  subscribers7d: number;
  topClicks: { label: string; product: string; count: number }[];
  generatedAt: string;
}

export async function sendDigestEmail(stats: DigestStats): Promise<void> {
  if (!RESEND_API_KEY || !CREATOR_EMAIL) return;

  const PRODUCT_COLORS: Record<string, string> = {
    app: BRAND_GOLD,
    book: "#38bdf8",
    music: "#a78bfa",
    art: "#22c55e",
  };

  function statRow(label: string, total: number, week: number, color: string): string {
    const trend = week > 0 ? `<span style="color:${color};font-weight:700;">+${week} this week</span>` : `<span style="color:#9ca3af;">0 this week</span>`;
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:14px;color:#374151;font-weight:600;">${label}</span><br/>
          <span style="font-size:22px;font-weight:800;color:#111827;">${total.toLocaleString()}</span>
          &nbsp;&nbsp;${trend}
        </td>
      </tr>`;
  }

  const clickRows = stats.topClicks.slice(0, 5).map((c, i) => {
    const color = PRODUCT_COLORS[c.product] ?? BRAND_GOLD;
    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:13px;color:#6b7280;">#${i + 1}</span>
          &nbsp;
          <span style="font-size:14px;font-weight:600;color:#111827;">${c.label}</span>
          <span style="float:right;font-size:14px;font-weight:700;color:${color};">${c.count} click${c.count !== 1 ? "s" : ""}</span>
        </td>
      </tr>`;
  }).join("");

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Your Site Digest</h2>
    <p style="margin:0 0 28px;font-size:14px;color:#6b7280;">Generated ${stats.generatedAt} · Dashboard: <a href="https://www.elevate360official.com/dashboard" style="color:${BRAND_GOLD};">View Dashboard</a></p>

    <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Traffic & Engagement</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:28px;">
      ${statRow("Page Views", stats.pageViewsTotal, stats.pageViews7d, "#fb923c")}
      ${statRow("Chat Sessions", stats.chatTotal, stats.chat7d, BRAND_GOLD)}
      ${statRow("Leads Captured", stats.leadsTotal, stats.leads7d, "#22c55e")}
      ${statRow("Contact Forms", stats.contactsTotal, stats.contacts7d, "#a78bfa")}
      ${statRow("Newsletter Subscribers", stats.subscribersTotal, stats.subscribers7d, "#38bdf8")}
    </table>

    ${stats.topClicks.length > 0 ? `
    <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Top Clicked Products</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:28px;">
      ${clickRows}
    </table>` : ""}

    <div style="background:#f9fafb;border-radius:12px;padding:20px;text-align:center;">
      <a href="https://www.elevate360official.com/dashboard" style="display:inline-block;padding:12px 28px;background:${BRAND_GOLD};color:#0d1a2e;font-weight:800;border-radius:8px;text-decoration:none;font-size:14px;">Open Dashboard →</a>
    </div>`;

  await sendEmail(
    CREATOR_EMAIL,
    `📊 Elevate360 Site Digest — ${stats.generatedAt}`,
    baseTemplate("Creator Digest", body),
  );
}

// Phase 48 — Automated Lead Follow-Up
export async function sendLeadFollowupEmail(params: {
  toName: string | null | undefined;
  toEmail: string;
  subject: string;
  bodyText: string;
}): Promise<void> {
  const { toName, toEmail, subject, bodyText } = params;
  const displayName = toName || "there";

  const body = `
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">Hey ${displayName},</h2>
    <div style="font-size:15px;color:#374151;line-height:1.85;">
      ${bodyText.replace(/\n\n/g, '</p><p style="margin:0 0 12px;">').replace(/\n/g, "<br>")}
    </div>
    <div style="margin-top:32px;padding:20px;background:#f9fafb;border-radius:12px;text-align:center;">
      <a href="https://www.elevate360official.com" style="display:inline-block;padding:12px 28px;background:${BRAND_GOLD};color:#0d1a2e;font-weight:800;border-radius:8px;text-decoration:none;font-size:14px;">Visit Elevate360 →</a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
      — Oladele Oyeniyi · <a href="https://www.elevate360official.com" style="color:${BRAND_GOLD};text-decoration:none;">Elevate360Official</a>
    </p>`;

  await sendEmail(toEmail, subject, baseTemplate("A Note from Elevate360", body));
}

export async function notifyNewBooking(params: {
  clientName: string;
  clientEmail: string;
  consultationTitle?: string;
  preferredDate?: string;
  message?: string;
}): Promise<void> {
  if (!RESEND_API_KEY || !CREATOR_EMAIL) return;
  const { clientName, clientEmail, consultationTitle, preferredDate, message } = params;
  const adminBody = `
    <p style="font-size:16px;color:#374151;">A new consultation booking has been submitted on <strong>Elevate360Official</strong>.</p>
    <table width="100%" cellpadding="8" style="border-collapse:collapse;border-radius:12px;overflow:hidden;margin-top:16px;">
      <tr style="background:#f9fafb;"><td style="font-weight:600;color:#374151;width:40%;">Client Name</td><td style="color:#111827;">${clientName}</td></tr>
      <tr><td style="font-weight:600;color:#374151;">Client Email</td><td><a href="mailto:${clientEmail}" style="color:${BRAND_GOLD};">${clientEmail}</a></td></tr>
      <tr style="background:#f9fafb;"><td style="font-weight:600;color:#374151;">Session Type</td><td style="color:#111827;">${consultationTitle ?? "Not specified"}</td></tr>
      <tr><td style="font-weight:600;color:#374151;">Preferred Date</td><td style="color:#111827;">${preferredDate ?? "Flexible"}</td></tr>
      ${message ? `<tr style="background:#f9fafb;"><td style="font-weight:600;color:#374151;vertical-align:top;">Message</td><td style="color:#374151;">${message}</td></tr>` : ""}
    </table>
    <div style="margin-top:24px;background:#f9fafb;border-radius:12px;padding:20px;text-align:center;">
      <a href="https://www.elevate360official.com/dashboard" style="display:inline-block;padding:12px 28px;background:${BRAND_GOLD};color:#0d1a2e;font-weight:800;border-radius:8px;text-decoration:none;font-size:14px;">View in Dashboard →</a>
    </div>`;
  const clientBody = `
    <p style="font-size:16px;color:#374151;">Hi <strong>${clientName}</strong>,</p>
    <p style="color:#374151;">Thank you for booking a <strong>${consultationTitle ?? "consultation"}</strong> with Elevate360Official!</p>
    <p style="color:#374151;">We've received your request and will be in touch within <strong>24 hours</strong> to confirm your session${preferredDate ? ` for <strong>${preferredDate}</strong>` : ""}.</p>
    <p style="color:#374151;">In the meantime, feel free to explore our resources at <a href="https://www.elevate360official.com" style="color:${BRAND_GOLD};">www.elevate360official.com</a>.</p>
    <p style="color:#374151;margin-top:24px;">— The Elevate360Official Team</p>`;
  await Promise.allSettled([
    sendEmail(CREATOR_EMAIL, `📅 New Booking: ${consultationTitle ?? "Consultation"} — ${clientName}`, baseTemplate("New Booking Request", adminBody)),
    sendEmail(clientEmail, `✅ Your Elevate360 Booking is Confirmed — ${consultationTitle ?? "Consultation"}`, baseTemplate("Booking Confirmed", clientBody)),
  ]);
}
