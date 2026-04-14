import { db } from "../server/db";
import { testimonials } from "../shared/schema";

const items = [
  {
    name: "Amara Johnson",
    handle: "@amaraj_lifestyle",
    rating: 5,
    body: "Bondedlove completely changed how my partner and I connect. The daily check-ins feel like a ritual now. We actually TALK about things that matter instead of just surviving the week together.",
    product: "Bondedlove App",
    approved: true,
  },
  {
    name: "Marcus Okafor",
    handle: "@marcusokafor",
    rating: 5,
    body: "I picked up 'One Clean Meal' on a whim and genuinely didn't expect much. Two months later, I've lost 14 lbs without ever feeling deprived. The mindset chapters are what made the difference.",
    product: "One Clean Meal",
    approved: true,
  },
  {
    name: "Priya Nair",
    handle: "@priya_wellness",
    rating: 5,
    body: "Healthwisesupport is the health app I always wished existed. No obsessive calorie counting, no guilt — just calm, practical tools to stay on top of how I'm feeling. Love it.",
    product: "Healthwisesupport App",
    approved: true,
  },
  {
    name: "David Chen",
    handle: "@davidchenstudio",
    rating: 5,
    body: "The AI Brand Audit was eye-opening. Got back a detailed report in 3 days that identified three things my brand was doing wrong that I had completely missed. Worth every dollar.",
    product: "AI Brand Audit",
    approved: true,
  },
  {
    name: "Layla Hassan",
    handle: "@layla.creates",
    rating: 5,
    body: "Bought the digital art print from Elevate360 Art Studio for my home office. It arrived instantly and the quality of the design exceeded my expectations. Already ordered another piece.",
    product: "Etsy Art Studio",
    approved: true,
  },
  {
    name: "James Thornton",
    handle: "@jt_founder",
    rating: 5,
    body: "The 1:1 creator session helped me finally nail my positioning. Oladele asked questions nobody else had thought to ask. I walked away with a 90-day plan and the confidence to execute it.",
    product: "1:1 Creator Session",
    approved: true,
  },
  {
    name: "Nneka Adeyemi",
    handle: "@nneka_reads",
    rating: 5,
    body: "'Together: Let There Be Love' is the book I wish someone had handed me at the start of my last relationship. Honest, practical, and compassionate. Highly recommend for any couple.",
    product: "Together: Let There Be Love",
    approved: true,
  },
  {
    name: "Sofia Reyes",
    handle: "@sofiareyes.fit",
    rating: 5,
    body: "The music Oladele puts out hits different. 'Resilient' has been on repeat for weeks. It's honest and grounded in a way that feels rare right now. Genuinely moving stuff.",
    product: "Audiomack Music",
    approved: true,
  },
];

async function seed() {
  console.log("Seeding testimonials...");
  for (const item of items) {
    try {
      await db.insert(testimonials).values({
        ...item,
        createdAt: new Date(),
      }).onConflictDoNothing();
      console.log(`✓ ${item.name} — ${item.product}`);
    } catch (err: any) {
      console.error(`✗ ${item.name}:`, err.message);
    }
  }
  console.log(`\nDone. Seeded ${items.length} testimonials.`);
  process.exit(0);
}

seed();
