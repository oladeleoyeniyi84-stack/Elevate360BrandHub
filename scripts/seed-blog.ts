import { db } from "../server/db";
import { blogPosts } from "../shared/schema";

const posts = [
  {
    title: "How Bondedlove Is Redefining Relationship Tracking for Modern Couples",
    slug: "bondedlove-relationship-tracking-app",
    excerpt: "Discover how Bondedlove helps couples build deeper connections through intentional daily check-ins, shared memories, and relationship health insights.",
    body: `In a world where notifications compete for every second of our attention, real connection often gets pushed to the margins. That's the problem Bondedlove was built to solve.

## What Is Bondedlove?

Bondedlove is a relationship companion app designed for couples who want to stay genuinely connected — not just "liked" or "followed," but truly seen and understood. Unlike social media, which performs connection, Bondedlove facilitates it.

## Core Features

**Daily Check-Ins** — Every day, both partners answer a simple question. Over time, these answers become a timeline of your relationship's emotional landscape. You see patterns, growth, and the moments that mattered.

**Shared Memory Log** — From first dates to spontaneous Tuesday adventures, you can log memories together with photos, captions, and mood tags. It becomes a living scrapbook only the two of you can see.

**Relationship Health Insights** — Bondedlove uses your check-in data to surface gentle nudges — things like, "You haven't logged a date night in three weeks," or "This week's mood trend looks low. Anything worth talking about?"

## Why It Works

Most relationship problems aren't dramatic blow-ups. They're slow drifts. Two people get busy, stop checking in, and wake up one day feeling like strangers. Bondedlove interrupts that drift before it becomes a distance.

The design is intentionally calm — no infinite scroll, no like counts, no algorithmic chaos. Just space for the two of you.

## Who It's For

Bondedlove is for couples at any stage — newly dating, long-distance, engaged, or ten years married. If you care about your relationship and want a simple tool to invest in it daily, this app is for you.

**Available on iOS and Android. Search "Bondedlove" on your app store today.**`,
    category: "apps",
    published: true,
  },
  {
    title: "The Healthwisesupport App: Your 24/7 Wellness Companion",
    slug: "healthwisesupport-wellness-app-overview",
    excerpt: "Healthwisesupport brings personalised health guidance, symptom tracking, and wellness routines together in one calm, easy-to-use mobile app.",
    body: `Your health deserves more than a quick Google search. It deserves consistency, context, and care. That's what Healthwisesupport was built to deliver.

## The Problem With Health Apps Today

Most health apps either overwhelm you with data — steps, calories, heart rate variability — or they're so generic they give advice that applies to literally everyone and therefore no one. Neither approach actually helps.

## A Different Approach

Healthwisesupport takes a wellness-first, not metrics-first, philosophy. The app focuses on three pillars:

### 1. Symptom Journaling
Log how you're feeling each day — physically and emotionally. Over time, the app helps you spot patterns. Tired every Sunday? Headaches after certain meals? This kind of data is far more useful than a step count.

### 2. Personalised Wellness Routines
Based on your health goals, Healthwisesupport builds simple daily routines around sleep, hydration, movement, and mental health. These aren't rigid — they flex with your life.

### 3. Trusted Health Information
When you search for health information in the app, you get clear, evidence-based answers — not alarming WebMD spirals. Every response is written to inform, not frighten.

## Why Oladele Built It

The creator of Healthwisesupport, Oladele Oyeniyi, saw family members struggle to manage chronic health concerns without proper support between doctor visits. The app bridges that gap — not as a replacement for medical care, but as a thoughtful supplement to it.

## Try It Today

Healthwisesupport is free to download. Your journey to a healthier, more informed life starts with one tap.`,
    category: "apps",
    published: true,
  },
  {
    title: "Why 'One Clean Meal' Is the Nutrition Book Busy People Actually Need",
    slug: "one-clean-meal-nutrition-book-review",
    excerpt: "One Clean Meal by Oladele Oyeniyi reframes healthy eating as a simple daily choice, not a total lifestyle overhaul. Here's why that matters.",
    body: `Every year, millions of people start ambitious diet plans. By February, most have quit. The problem isn't willpower — it's the all-or-nothing thinking that sets them up to fail.

## One Clean Meal Takes a Different Stance

The premise is refreshingly simple: you don't have to eat perfectly. You just have to eat *one clean meal* per day. That's it.

This isn't a cop-out. It's a strategy.

When you commit to one intentional, nutritious meal — regardless of what else you eat that day — you create a daily anchor. A habit. A win. And wins compound.

## What You'll Find Inside

**The Food Foundations chapter** breaks down what "clean" actually means without dogma or diet-culture jargon. There's no demonising of food groups, no calorie obsession — just clarity.

**The 30-Day Starter Plan** gives you exactly one clean meal recipe per day for a month. Each recipe is designed for real kitchens, real budgets, and real time constraints. Most take under 20 minutes.

**The Mindset Chapters** are what separates this book from a cookbook. Oladele writes about the psychology of food choices, emotional eating, and how to build a sustainable relationship with what you eat.

## Who It's For

If you've tried and failed at every diet, if you're busy and just want something that works, if you want to feel better without turning your life upside down — this book is for you.

**Available on Amazon KDP. Search "One Clean Meal Oladele Oyeniyi" to get your copy.**`,
    category: "books",
    published: true,
  },
  {
    title: "Oladele Oyeniyi's Music on Audiomack: Stories Told Through Sound",
    slug: "oladele-oyeniyi-music-audiomack",
    excerpt: "Explore the musical dimension of Elevate360Official — where Oladele Oyeniyi translates personal experience, faith, and creativity into original sound.",
    body: `Most people know Elevate360Official for its apps and books. Fewer know that at the heart of the brand is a musician.

## The Music Side of Elevate360

Oladele Oyeniyi has been creating original music for years — not as a side project, but as a core expression of the same values that drive his apps and writing. The music is about elevation. About the internal work. About the journey.

You can find the full catalogue on **Audiomack**, where streaming is free.

## What Kind of Music?

The sound sits at the intersection of spoken word, R&B, and inspirational hip-hop. Tracks explore themes of:

- **Resilience** — What it means to keep going when the path isn't clear
- **Faith** — Not in a preachy way, but in the honest, wrestling-with-doubt kind of way
- **Relationships** — Love, loss, growth, and the space between people
- **Identity** — Finding and owning who you are in a world that constantly tries to define you

## Why Music?

When asked why he makes music alongside building apps and writing books, Oladele's answer is simple: "Some truths can only be felt, not explained. Music gets to places that apps and words alone can't reach."

That's the point. The apps support your daily life. The books give you frameworks. The music gives you a feeling — and sometimes that's what you need most.

## Listen Now

Head to **Audiomack** and search **Oladele Oyeniyi** to listen to the full catalogue for free. Follow to get notified when new tracks drop.`,
    category: "music",
    published: true,
  },
  {
    title: "Building a Brand Ecosystem: How Elevate360Official Connects Apps, Books, Art and Music",
    slug: "elevate360-brand-ecosystem-strategy",
    excerpt: "Most entrepreneurs build products. Oladele Oyeniyi built an ecosystem. Here's the thinking behind Elevate360Official and why it works.",
    body: `There's a difference between building a business and building an ecosystem. A business sells products. An ecosystem creates a world — a set of values, experiences, and touchpoints that reinforce each other.

Elevate360Official is the second kind.

## One Mission, Many Expressions

The mission is simple: **empower lives through technology and words**. That mission expresses itself across multiple channels:

- **Mobile Apps** — Bondedlove for relationships, Healthwisesupport for wellness, Video Crafter for content creators. Each app solves a real problem for real people.
- **KDP Books** — A growing library of practical, accessible books on topics from nutrition to relationships to personal growth.
- **Etsy Art Studio** — Original digital artwork and printables that bring intentional beauty into everyday spaces.
- **Audiomack Music** — Original tracks that translate the brand's values into sound and feeling.

## Why This Approach?

Because trust accumulates across touchpoints.

When someone uses the Bondedlove app and it genuinely improves their relationship, they're more likely to trust an Elevate360 book on relationships. When they read the book and it helps, they're more open to the music. Each product reinforces the others.

This is the same model that makes great creative brands durable — the work across mediums all points back to the same core identity.

## What "Elevate360" Actually Means

Elevation in every direction. Not just upward — but inward, outward, forward, and backward (reflection). 360 degrees of growth.

It's a total philosophy of development. The apps support your daily habits. The books build your thinking. The art feeds your soul. The music moves your spirit.

## The Road Ahead

Elevate360Official is still growing. New apps, new books, new art, new music — all of it in service of the same mission: to create tools and experiences that help people live with more intention, more connection, and more joy.

**Follow the journey at [www.elevate360official.com](https://www.elevate360official.com).**`,
    category: "entrepreneurship",
    published: true,
  },
];

async function seed() {
  console.log("Seeding blog posts...");
  for (const post of posts) {
    try {
      await db.insert(blogPosts).values({
        ...post,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
      console.log(`✓ Inserted: ${post.title}`);
    } catch (err: any) {
      console.error(`✗ Failed: ${post.title} —`, err.message);
    }
  }
  console.log("Done.");
  process.exit(0);
}

seed();
