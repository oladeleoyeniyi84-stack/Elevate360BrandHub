# Elevate360Official Portfolio Website

## Overview
A full-stack brand portfolio website for **Elevate360Official** featuring mobile applications (Bondedlove, Healthwisesupport, Video Crafter) and Amazon KDP publications.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui components
- **Backend**: Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)

## Brand Colors
- **Gold**: Primary (`43 65% 55%`)
- **Navy Blue**: Background (`220 50% 10%`)
- **Orange**: Secondary/Accent (`30 90% 55%`)
- **Brown**: Muted tones (`30 40% 25%`)

## Key Features
- Hero section with overlapping typographic background
- Apps showcase (Bondedlove, Healthwisesupport, Video Crafter) with equal-height card grid
- Elevate360 Art Studio section with presentation image + Etsy shop link
- Publications section with real Amazon book covers
- Featured book sections (Healthwise: Stay Healthy, Together: Let There Be Love, One Clean Meal)
- Contact form (dialog) - saves to PostgreSQL
- Newsletter signup - saves to PostgreSQL
- Social links: Instagram, YouTube, Etsy

## Design System (CSS)
- **btn-primary**: Gold filled CTA button (#F4A62A)
- **btn-secondary**: Gold outline button
- **btn-tertiary**: Gold text link
- **badge-gold**: Trust badge pill (gold border + tint)
- **safe-bottom**: iPhone Safari safe area padding
- Smooth scroll anchors (#apps, #books, #art-studio)
- line-clamp-3 on app descriptions with "Learn more" links

## Data Models
- `contactMessages` - name, email, message, createdAt
- `newsletterSubscribers` - email (unique), subscribedAt
- `chatConversations` - sessionId (unique), messages (JSONB), leadName, leadEmail, createdAt, updatedAt

## API Routes
- `POST /api/contact` - Submit contact form
- `POST /api/newsletter` - Subscribe to newsletter
- `POST /api/chat` - AI Concierge chat (OpenAI GPT-4o, stores history in DB)
- `POST /api/dashboard/auth` - PIN-based dashboard login (session-based)
- `POST /api/dashboard/logout` - Clear dashboard session
- `GET /api/dashboard/leads` - All chat conversations (auth required)
- `GET /api/dashboard/contacts` - All contact form messages (auth required)
- `GET /api/dashboard/subscribers` - All newsletter subscribers (auth required)
- `POST /api/dashboard/generate` - Brand voice content generation via GPT-4o (auth required)

## AI Concierge
- `client/src/components/AIConcierge.tsx` - Chat widget (floating button, panel, quick prompts, lead capture form)
- `server/openai.ts` - OpenAI GPT-4o integration with full Elevate360 brand system prompt
- Sessions stored per visitor using sessionStorage; full conversation saved to PostgreSQL

## Creator Dashboard
- Private route at `/dashboard` — PIN-protected via `DASHBOARD_PIN` env var
- `client/src/pages/Dashboard.tsx` — 4 tabs: Brand Voice Generator, Chat Leads, Contacts, Newsletter
- Server sessions via `express-session` (8-hour duration)

## Brand Voice Generator (Phase 3)
- `POST /api/dashboard/generate` — session-protected, calls GPT-4o with brand voice system prompt
- 10 content types: instagram_caption, newsletter, tweet, youtube_description, product_description, book_promo, music_release, press_release, email_subject_lines, blog_intro
- `server/openai.ts` exports both `getConciergeReply` (visitor chat) and `generateBrandCopy` (creator tool)

## Scroll-Reveal Animations (Phase 9)
- `client/src/hooks/useScrollReveal.ts` — lightweight IntersectionObserver hook, fires once per element when 10% visible + 60px root margin
- `client/src/index.css` — 4 animation classes: `.reveal` (fade up), `.reveal-left` (slide right), `.reveal-right` (slide left), `.reveal-scale` (zoom in); `.in-view` triggers via JS; stagger via `.reveal-delay-1/2/3/4`; `prefers-reduced-motion` respected
- Applied to: Apps section header, 3 app cards (staggered), Art Studio left/right, Music left/right, Publications left/right, 3 featured book lux-cards (staggered scale-in), CTA heading

## Audiomack Live Player (Phase 8)
- Music section on homepage: replaced static mock track list with a live Audiomack embed player
- Embed URL: `https://audiomack.com/embed/artist-page/elevate360music`
- iframe styled with rounded-3xl border, violet glow shadow; 420px height; autoplay allowed
- "Streaming live · Powered by Audiomack" label beneath the player

## PWA — Progressive Web App (Phase 7)
- `client/public/manifest.json` — app name, short_name, theme_color (#F4A62A), background (#0d1a2e), standalone display, 3 shortcuts (Apps, Books, Music)
- `client/public/sw.js` — service worker: cache-first for static assets, network-first for API/dashboard, offline fallback to "/"
- `client/index.html` — manifest link, apple-touch-icon, apple-mobile-web-app meta tags
- `client/src/main.tsx` — service worker registration on window load
- Install prompt: Chrome/Android will show "Add to Home Screen" automatically when PWA criteria are met

## SEO & Structured Data (Phase 4)
- `client/index.html` — Full JSON-LD schema markup: Organization, WebSite, SoftwareApplication ×3, Book ×3, MusicGroup, Person
- `client/public/robots.txt` — `Allow: /` with Sitemap reference
- `server/sitemap.ts` — Dynamic XML sitemap generator with all pages and anchor sections
- `/sitemap.xml` route — serves sitemap with 24-hour cache header
- Enhanced meta: keywords, author, robots, theme-color, og:locale, twitter:creator

## Custom Domain
- Canonical host: `www.elevate360official.com` (set via `CANONICAL_HOST` env var)
- `server/canonicalRedirect.ts` middleware redirects non-canonical hosts and enforces HTTPS via 301 redirects
- Dev bypass for localhost, 127.0.0.1, and .replit.dev domains

## File Structure
- `client/src/pages/Home.tsx` - Main landing page
- `client/src/components/ContactDialog.tsx` - Contact form dialog
- `client/src/components/NewsletterForm.tsx` - Newsletter signup form
- `shared/schema.ts` - Database schema + Zod validation
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database CRUD operations
- `server/db.ts` - Database connection
- `server/canonicalRedirect.ts` - Canonical host redirect middleware

## External Links
- Amazon Books: B0GMBNPZC9, B0G5DWG61V, B0FSDTPVJC
- Instagram: https://www.instagram.com/officialelevate360/
- YouTube: https://www.youtube.com/channel/UCDGnUhgvM__6Mw8q26H-urQ
- Etsy: https://www.etsy.com/shop/Elevate360Official
- Brand logo: @assets/Elevate360_Brand_Logo_1772418122164.png
- Art Studio image: @assets/Elevate360Art_Studio_Presentation_1772460961759.png