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

**Authentication**: Custom username/password authentication using Passport Local Strategy with bcrypt password hashing. Sessions stored in PostgreSQL with express-session and connect-pg-simple. Users register with username, email, and password.

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
- Click events with comprehensive metadata (IP, geo-location, device, browser)
- Analytics tracking for clicks, conversions, and earnings (aggregated from click events)
- Payment settings for payout methods

**Key Relationships**:
- Users have one-to-one relationships with creator or company profiles
- Offers belong to companies and can have many videos, applications, and reviews
- Applications connect creators to offers with status tracking
- Conversations facilitate messaging between creators and companies
- Analytics track performance metrics per application

### External Dependencies

**Authentication & Sessions**:
- Passport Local Strategy - Username/password authentication
- bcrypt - Password hashing (10 salt rounds)
- Session management via PostgreSQL with 7-day cookie TTL

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

**Geo-location**:
- geoip-lite - IP-to-location lookup (MaxMind GeoLite2 database)

**Design Assets**:
- Google Fonts (Inter, JetBrains Mono) - Typography
- Lucide React - Icon system

## Recent Changes

### Admin Review Management Security Hardening (Latest - October 2025)

**Security Improvements:**
- **Input Validation**: Added Zod validation schemas (`adminReviewUpdateSchema`, `adminNoteSchema`) to prevent mass-assignment vulnerabilities
- **Field Whitelisting**: Admin review updates only allow editing specific fields (reviewText, ratings) via `.pick()` schema
- **Excluded Admin Fields**: `insertReviewSchema` explicitly omits admin-only fields (adminNote, isApproved, approvedBy, isHidden, etc.)
- **Audit Trail Enhancement**: Added `adminNoteUpdatedBy` and `adminNoteUpdatedAt` to track who modified internal notes and when
- **Server-Side Enforcement**: `isEdited` flag set automatically in storage layer, not via API to prevent client manipulation

**Security Pattern:**
All admin routes now follow the pattern: Zod validation → role check → storage operation with automatic audit tracking. This ensures only authorized fields can be modified and all admin actions are fully traceable.

### Enhanced Real-Time Messaging System (October 2025)

**UI/UX Improvements:**
- **Typing Indicators**: Real-time typing status with 3-second timeout and animated bubble display
- **Read Receipts**: Double-check marks show when messages are read, single check for sent
- **Connection Status**: Live online/offline/reconnecting badge with auto-reconnect on disconnect
- **Message Grouping**: Consecutive messages from same sender within 1 minute are grouped for cleaner UI
- **Date Separators**: Smart date labels (Today, Yesterday, full dates) separate message sections
- **Sound Notifications**: Optional notification sound for new messages with toggle in UI (persisted to localStorage)
- **Better Timestamps**: Contextual time display (h:mm a for today, "Yesterday h:mm a", full date for older)
- **Start Conversation**: Companies can initiate conversations with creators directly from applications page
- **Auto-Read Tracking**: Messages automatically marked as read when viewing conversation
- **Improved Empty States**: Helpful messages guide users when no conversations exist
- **URL Deep Linking**: Direct conversation access via `/messages?conversation={id}` query parameter
- **Message Creator Button**: Added to company applications page for quick communication

**WebSocket Architecture (Production-Ready):**
- **Persistent Single Connection**: WebSocket effect depends ONLY on `isAuthenticated` to prevent unnecessary reconnections on UI state changes (conversation switches, sound toggles)
- **Ref-Based State Access**: Uses `selectedConversationRef` and `userIdRef` to avoid closure staleness in WebSocket handlers
- **Robust Reconnection**: Per-effect `shouldReconnect` flag prevents old effect instances from reconnecting; auto-reconnects on unintentional disconnects with 3-second delay
- **Handshake Failure Handling**: Socket assigned to `wsRef.current` immediately upon creation (not after `onopen`) so error/close handlers can identify and recover from handshake failures
- **Identity Checks**: All handlers verify `socket === wsRef.current` before mutating state to prevent stale sockets from interfering
- **Conversation-Aware Typing**: Typing indicators clear on conversation switch; both `user_typing` and `user_stop_typing` events check `conversationId` to ensure conversation-scoped behavior
- **WebSocket Events**: Extended to handle `new_message`, `typing_start`, `typing_stop`, `mark_read`, and `messages_read` events

### Custom Authentication System (October 2025)
- **Replaced Replit Auth**: Migrated from OpenID Connect to custom username/password authentication
- **User Schema Updates**: Added `username` (unique, required) and `password` (bcrypt hashed, required) fields to users table
- **Login/Registration Pages**: Created dedicated `/login` and `/register` pages with form validation
- **Passport Local Strategy**: Implemented secure credential verification with bcrypt.compare
- **Session-based Auth**: HttpOnly cookies with PostgreSQL session store for security
- **Auto-login on Registration**: Users automatically logged in after successful account creation
- **Role Selection**: Users select Creator or Company role during registration
- **Landing Page Updates**: "Get Started" button redirects to registration, "Sign In" to login

### Click Tracking System (October 2025)
- **Individual Click Storage**: Each click creates a `click_events` record with full metadata
- **IP Normalization**: Properly extracts client IP from X-Forwarded-For header (handles proxy chains)
- **Geo-location**: Real-time country/city lookup using geoip-lite (MaxMind GeoLite2)
- **Device Detection**: Parses user agent to identify device type (mobile/tablet/desktop) and browser
- **Unique Click Calculation**: Counts distinct normalized IP addresses per day for accurate analytics
- **Tracking Endpoint**: `/track/:code` → logs metadata → redirects to product URL
- **Metadata Captured**: IP address, country, city, user agent, device type, browser, referer, timestamp

### Database Export & Migration Utilities (October 2025)
- **Export Script**: `scripts/export-database.ts` exports all tables to timestamped JSON files
- **Migration Guide**: `MIGRATION_GUIDE.md` provides step-by-step instructions for database portability
- **SQL Dump Support**: Instructions for PostgreSQL pg_dump for large datasets
- **External DB Setup**: Guides for Neon, Supabase, and local PostgreSQL setup
- **Security Considerations**: Password hashes excluded from JSON export, environment variables documented