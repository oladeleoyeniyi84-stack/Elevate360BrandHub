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

## API Routes
- `POST /api/contact` - Submit contact form
- `POST /api/newsletter` - Subscribe to newsletter

## File Structure
- `client/src/pages/Home.tsx` - Main landing page
- `client/src/components/ContactDialog.tsx` - Contact form dialog
- `client/src/components/NewsletterForm.tsx` - Newsletter signup form
- `shared/schema.ts` - Database schema + Zod validation
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database CRUD operations
- `server/db.ts` - Database connection

## External Links
- Amazon Books: B0GMBNPZC9, B0G5DWG61V, B0FSDTPVJC
- Instagram: https://www.instagram.com/officialelevate360/
- YouTube: https://www.youtube.com/channel/UCDGnUhgvM__6Mw8q26H-urQ
- Etsy: https://www.etsy.com/shop/Elevate360Official
- Brand logo: @assets/Elevate360_Brand_Logo_1772418122164.png
- Art Studio image: @assets/Elevate360Art_Studio_Presentation_1772460961759.png