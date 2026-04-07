/**
 * Seed Elevate360Official offers into Stripe.
 * Idempotent — checks for existing products before creating.
 *
 * Run: npx tsx scripts/seed-stripe-products.ts
 */
import "../server/stripeClient";
import { getUncachableStripeClient } from "../server/stripeClient";

const OFFERS = [
  {
    name: "AI Brand Audit",
    description:
      "A deep-dive review of your brand's digital presence, messaging, visual identity, and positioning. Delivered as a detailed action-plan report with prioritised recommendations.",
    amount: 9700, // $97
    metadata: { icon: "🔍", displayOrder: "1", category: "offer", deliveryDays: "3" },
  },
  {
    name: "Premium Content Strategy Pack",
    description:
      "A 90-day content roadmap built around your brand voice, target audience, and growth goals — includes platform-specific content pillars, headline templates, and a scheduling framework.",
    amount: 14700, // $147
    metadata: { icon: "📋", displayOrder: "2", category: "offer", deliveryDays: "5" },
  },
  {
    name: "1:1 Creator Session",
    description:
      "A focused 60-minute live strategy call where we tackle your biggest challenge — from product launches and brand positioning to monetisation and creative breakthroughs.",
    amount: 9700, // $97
    metadata: { icon: "🎙️", displayOrder: "3", category: "offer", highlight: "true" },
  },
  {
    name: "Art Commission Deposit",
    description:
      "Reserve your spot for a custom digital art commission from Elevate360 Art Studio. Price is a deposit; final balance invoiced on delivery based on scope.",
    amount: 5000, // $50 deposit
    metadata: { icon: "🎨", displayOrder: "4", category: "offer" },
  },
  {
    name: "Creative Review Session",
    description:
      "A 45-minute recorded feedback session on your existing creative work — pitch decks, social content, copy, or visuals. Includes a written summary with actionable notes.",
    amount: 7700, // $77
    metadata: { icon: "✏️", displayOrder: "5", category: "offer" },
  },
];

async function seed() {
  const stripe = await getUncachableStripeClient();
  console.log("🚀 Seeding Elevate360 offers into Stripe…\n");

  for (const offer of OFFERS) {
    // Check if already exists
    const existing = await stripe.products.search({
      query: `name:'${offer.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ Already exists: ${offer.name} (${existing.data[0].id})`);
      continue;
    }

    const product = await stripe.products.create({
      name: offer.name,
      description: offer.description,
      metadata: offer.metadata,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: offer.amount,
      currency: "usd",
    });

    console.log(`✅ Created: ${offer.name} — $${(offer.amount / 100).toFixed(0)} (${product.id} / ${price.id})`);
  }

  console.log("\n✅ Seed complete! Products will sync to your database via webhooks.");
}

seed().catch((e) => {
  console.error("❌ Seed error:", e.message);
  process.exit(1);
});
