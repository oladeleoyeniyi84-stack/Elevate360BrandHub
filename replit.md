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
- Apps showcase (Bondedlove, Healthwisesupport, Video Crafter)
- Publications section with real Amazon book covers
- Featured book sections (Healthwise: Stay Healthy, Together: Let There Be Love, One Clean Meal)
- Contact form (dialog) - saves to PostgreSQL
- Newsletter signup - saves to PostgreSQL
- Instagram social link (@officialelevate360)

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
- Brand logo: attached_assets/Elevate360_Brand_Logo_1772418122164.png