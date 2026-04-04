import { db } from "../server/db";
import { knowledgeDocuments } from "../shared/schema";

const docs = [
  {
    title: "About Elevate360Official — Brand Overview",
    category: "brand",
    priority: 100,
    isPublished: true,
    content: `Elevate360Official is a digital brand ecosystem founded by Oladele Oyeniyi. The mission is to empower lives through technology and words. The brand operates across four verticals:

1. MOBILE APPS — Practical apps solving real problems: Bondedlove (relationship companion for couples), Healthwisesupport (wellness and health tracking), Video Crafter (creative video editing app).

2. BOOKS (Amazon KDP) — Accessible books on wellness and relationships: "Healthwise: Stay Healthy", "Together: Let There Be Love", "One Clean Meal" (healthy eating), "The Art of Mindful Living".

3. ETSY ART STUDIO — Original digital artwork, printables, and custom commissions through the Elevate360 Art Studio on Etsy.

4. MUSIC — Original music by Oladele Oyeniyi available free on Audiomack, spanning inspirational hip-hop, R&B, and spoken word.

The website is www.elevate360official.com. Contact: weareelevate360@gmail.com. WhatsApp: +17742230266.`,
  },
  {
    title: "Bondedlove App — Full Details",
    category: "apps",
    priority: 90,
    isPublished: true,
    content: `Bondedlove is a relationship companion app for couples. It helps couples stay genuinely connected through:

FEATURES:
- Daily check-in questions that build emotional awareness over time
- Shared memory log with photos, captions, and mood tags
- Relationship health insights based on check-in data
- Private space just for the two partners — no social feed, no algorithm

DESIGN PHILOSOPHY: Intentionally calm, no infinite scroll or like counts. Designed to interrupt the slow drift that happens when couples get busy.

WHO IT'S FOR: Couples at any stage — newly dating, long-distance, engaged, married. Anyone who wants a daily tool to invest in their relationship.

AVAILABILITY: Available on iOS and Android. Search "Bondedlove" on the App Store or Google Play.

PRICING: Free to download with premium features available.`,
  },
  {
    title: "Healthwisesupport App — Full Details",
    category: "apps",
    priority: 90,
    isPublished: true,
    content: `Healthwisesupport is a wellness companion app that takes a wellness-first, not metrics-first approach to health.

CORE PILLARS:
1. Symptom Journaling — Log physical and emotional feelings daily to spot patterns over time
2. Personalised Wellness Routines — Custom daily routines built around sleep, hydration, movement, and mental health
3. Trusted Health Information — Clear, evidence-based answers without alarming content

WHY IT WAS BUILT: Oladele Oyeniyi saw family members struggle to manage chronic health concerns without proper support between doctor visits. The app bridges that gap.

KEY DIFFERENCE: Not a replacement for medical care, but a thoughtful supplement to it. No obsessive calorie counting or step tracking.

AVAILABILITY: Free to download on iOS and Android. Search "Healthwisesupport".`,
  },
  {
    title: "Books & Publications — Full Catalog",
    category: "books",
    priority: 85,
    isPublished: true,
    content: `Elevate360Official publishes books through Amazon KDP. All books are by Oladele Oyeniyi.

CURRENT CATALOG:

1. "Healthwise: Stay Healthy" — A comprehensive wellness and nutrition guide. Practical strategies for long-term health without extreme diets.

2. "Together: Let There Be Love" — A relationship and couples guide. Covers communication, conflict resolution, intimacy, and building lasting partnerships.

3. "One Clean Meal" — Healthy eating made simple. The premise: eat one intentional, nutritious meal per day. Includes a 30-day starter plan with recipes under 20 minutes, plus mindset chapters on emotional eating.

4. "The Art of Mindful Living" — A guide to intentional daily living, present-moment awareness, and building a life that aligns with your values.

HOW TO PURCHASE: All books available on Amazon. Search the title or "Oladele Oyeniyi" on Amazon.com. Also available as Kindle eBooks.`,
  },
  {
    title: "Services & Consultation Packages",
    category: "services",
    priority: 95,
    isPublished: true,
    content: `Elevate360Official offers the following premium services:

1. AI BRAND AUDIT ($97) — A deep-dive review of your brand's digital presence, messaging, visual identity, and positioning. Delivered as a detailed action-plan report with prioritised recommendations. Delivery: 3 business days.

2. PREMIUM CONTENT STRATEGY PACK ($147) — A 90-day content roadmap built around your brand voice, target audience, and growth goals. Includes platform-specific content pillars, headline templates, and a scheduling framework. Delivery: 5 business days.

3. 1:1 CREATOR SESSION ($97) — A focused 60-minute live strategy call. Topics: product launches, brand positioning, monetisation, creative breakthroughs. Booking available on the website.

4. ART COMMISSION DEPOSIT ($50) — Reserve a custom digital art commission from Elevate360 Art Studio. Final balance invoiced on delivery based on scope.

5. CREATIVE REVIEW SESSION — A targeted review of your creative work (music, writing, design) with actionable feedback.

BOOKING: Use the booking form on the website or WhatsApp (+17742230266) to enquire.`,
  },
  {
    title: "Music — Audiomack Catalog",
    category: "music",
    priority: 75,
    isPublished: true,
    content: `Oladele Oyeniyi creates original music available free on Audiomack.

GENRE/STYLE: Inspirational hip-hop, R&B, and spoken word. The music explores themes of resilience, faith, relationships, and identity.

THEMES:
- Resilience — Keeping going when the path isn't clear
- Faith — Honest, wrestling-with-doubt spirituality
- Relationships — Love, loss, growth
- Identity — Owning who you are

PHILOSOPHY: "Some truths can only be felt, not explained. Music gets to places that apps and words alone can't reach."

HOW TO LISTEN: Free on Audiomack. Search "Oladele Oyeniyi" or "Elevate360Music". Follow to get notified of new releases.`,
  },
  {
    title: "Etsy Art Studio",
    category: "art",
    priority: 75,
    isPublished: true,
    content: `Elevate360 Art Studio sells original digital artwork and custom commissions on Etsy.

PRODUCTS:
- Digital printables for home and office
- Custom commissioned digital artwork
- Inspirational quote art
- Brand-themed decorative pieces

HOW TO ORDER:
- Browse the Elevate360 Art Studio on Etsy
- For custom commissions, use the Art Commission Deposit service ($50 deposit, final price based on scope)
- Contact weareelevate360@gmail.com or WhatsApp +17742230266 for custom enquiries

TURNAROUND: Standard digital downloads are instant. Custom commissions quoted per project.`,
  },
  {
    title: "Contact, Social Media & Where to Find Us",
    category: "contact",
    priority: 80,
    isPublished: true,
    content: `WEBSITE: www.elevate360official.com
EMAIL: weareelevate360@gmail.com
WHATSAPP: +17742230266 (for quick questions and booking enquiries)

SOCIAL MEDIA & PLATFORMS:
- Audiomack: Search "Oladele Oyeniyi" or "Elevate360Music" for free music streaming
- Etsy: Search "Elevate360 Art Studio" for digital artwork
- Amazon: Search "Oladele Oyeniyi" for books
- App Stores: Search "Bondedlove" or "Healthwisesupport" for mobile apps

PRESS & MEDIA: A full press kit is available at www.elevate360official.com/press-kit — includes founder bio, brand overview, product portfolio, brand colors, and typography guidelines.

BOOKING: Use the booking form on the website for consultation sessions. Response time: within 24 hours on business days.`,
  },
  {
    title: "Founder — Oladele Oyeniyi",
    category: "founder",
    priority: 85,
    isPublished: true,
    content: `Oladele Oyeniyi is the founder of Elevate360Official.

BACKGROUND: A multi-disciplinary creator working across technology, writing, music, and art. Oladele built Elevate360Official from a belief that empowerment happens when people have the right tools, the right information, and the right environment to grow.

EXPERTISE:
- Mobile app development and product strategy
- Brand building and digital marketing
- Health and wellness (personal experience + research)
- Relationship coaching and couples communication
- Creative direction across music, writing, and visual art

SPEAKING & PRESS: Available for podcast interviews, blog features, panel discussions, and keynote talks on entrepreneurship, technology, and creative business.

CONTACT FOR PRESS: weareelevate360@gmail.com
PRESS KIT: www.elevate360official.com/press-kit

PHILOSOPHY: "Elevation in every direction — inward, outward, forward. 360 degrees of growth."`,
  },
  {
    title: "FAQ — Common Questions",
    category: "faq",
    priority: 70,
    isPublished: true,
    content: `FREQUENTLY ASKED QUESTIONS:

Q: How do I download the apps?
A: Search "Bondedlove" or "Healthwisesupport" on the Apple App Store or Google Play Store. They are free to download.

Q: Where can I buy the books?
A: All books are available on Amazon. Search the title or "Oladele Oyeniyi" on Amazon.com. Available as paperback and Kindle.

Q: Can I commission custom artwork?
A: Yes. Use the Art Commission Deposit ($50) to reserve your spot, or email weareelevate360@gmail.com with your requirements.

Q: How do I book a consultation?
A: Use the booking form on the website (scroll to the Consultations section) or WhatsApp +17742230266.

Q: Where can I listen to the music?
A: Free on Audiomack. Search "Oladele Oyeniyi" or "Elevate360Music".

Q: How do I contact Elevate360Official?
A: Email weareelevate360@gmail.com, WhatsApp +17742230266, or use the contact form on the website.

Q: Do you offer refunds?
A: For digital products, contact us within 7 days if unsatisfied. For services, discuss with us before booking.

Q: Is there a newsletter?
A: Yes — subscribe on the website footer to receive updates, new releases, and exclusive content.`,
  },
];

async function seed() {
  console.log("Seeding knowledge documents...");
  for (const doc of docs) {
    try {
      await db.insert(knowledgeDocuments).values({
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
      console.log(`✓ ${doc.title}`);
    } catch (err: any) {
      console.error(`✗ Failed: ${doc.title} —`, err.message);
    }
  }
  console.log(`\nDone. Seeded ${docs.length} knowledge documents.`);
  process.exit(0);
}

seed();
