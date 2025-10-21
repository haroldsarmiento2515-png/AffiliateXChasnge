# CreatorLink - Affiliate Marketplace Platform

## Overview

CreatorLink is a multi-sided marketplace platform connecting video content creators with brands for affiliate marketing opportunities. The platform enables creators to discover and apply for affiliate offers, track their performance, and earn commissions, while companies can list offers, manage creator partnerships, and monitor campaign results. The application features role-based dashboards for creators, companies, and administrators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**UI Component System**: shadcn/ui (Radix UI primitives) with Tailwind CSS for styling. The design follows a "New York" style variant with comprehensive component coverage including forms, dialogs, data tables, and navigation elements.

**Routing**: Wouter for client-side routing with role-based route protection. Different dashboard views are rendered based on user roles (creator, company, admin).

**State Management**: 
- TanStack Query (React Query) for server state management, data fetching, and caching
- Local React state for UI-specific concerns
- WebSocket connections for real-time messaging features

**Design System**: Custom design tokens following inspiration from Airbnb (marketplace patterns), Linear (clean dashboards), Stripe (financial interfaces), and Instagram/TikTok (creator-focused elements). Uses HSL color system with comprehensive light/dark mode support.

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful API endpoints with role-based middleware protection. Authentication required for most routes with specific role checks (creator, company, admin) where needed.

**Authentication**: Replit Auth (OpenID Connect) using Passport.js strategy with session-based authentication. Sessions stored in PostgreSQL with express-session and connect-pg-simple.

**Real-time Communication**: WebSocket server integrated with HTTP server for real-time messaging between creators and companies.

**File Upload**: Uppy integration for client-side file handling with AWS S3-compatible upload via Google Cloud Storage. Custom ACL (Access Control List) system for object-level permissions with owner, visibility, and group-based access rules.

### Database Architecture

**Database**: PostgreSQL (via Neon serverless) with connection pooling.

**ORM**: Drizzle ORM for type-safe database operations and schema management.

**Schema Design**:
- User system with role-based access (creator, company, admin)
- Creator profiles with social media links, follower counts, and niche preferences
- Company profiles with approval workflow (pending, approved, rejected)
- Offers with multiple commission types (per_sale, per_lead, per_click, monthly_retainer, hybrid)
- Offer videos for promotional content
- Application system with auto-approval workflow and tracking links
- Messaging system with conversations and real-time updates
- Reviews and ratings for offers
- Favorites/bookmarks for creators
- Analytics tracking for clicks, conversions, and earnings
- Payment settings for payout methods

**Key Relationships**:
- Users have one-to-one relationships with creator or company profiles
- Offers belong to companies and can have many videos, applications, and reviews
- Applications connect creators to offers with status tracking
- Conversations facilitate messaging between creators and companies
- Analytics track performance metrics per application

### External Dependencies

**Authentication & Sessions**:
- Replit Auth (OpenID Connect) - Primary authentication provider
- Session management via PostgreSQL

**Database**:
- Neon (PostgreSQL serverless) - Primary data storage
- Drizzle Kit - Database migrations and schema management

**File Storage**:
- Google Cloud Storage - Object storage for media files (avatars, videos, promotional content)
- Custom ACL implementation for access control

**UI Libraries**:
- Radix UI - Accessible component primitives
- Tailwind CSS - Utility-first styling
- Recharts - Data visualization for analytics dashboards
- Uppy - File upload handling

**Development Tools**:
- Vite - Frontend build tool and dev server
- TypeScript - Type safety across frontend and backend
- ESBuild - Backend bundling for production

**WebSocket**:
- ws library - Real-time bidirectional communication for messaging

**Design Assets**:
- Google Fonts (Inter, JetBrains Mono) - Typography
- Lucide React - Icon system