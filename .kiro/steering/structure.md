# Project Structure

VIVK follows Next.js 14 App Router conventions with a clear separation of concerns and modular architecture.

## Root Directory Structure

```
vivk-landing/
├── .kiro/                    # Kiro configuration and specs
│   ├── specs/vivk-mvp/      # MVP specification documents
│   └── steering/            # Project steering rules
├── index.html               # Current landing page (static)
├── README.md               # Project documentation
├── vercel.json             # Vercel deployment configuration
└── (Future MVP structure below)
```

## Planned MVP Application Structure

```
app/                        # Next.js App Router directory
├── (auth)/                 # Authentication route group
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── reset-password/    # Password reset
├── (dashboard)/           # Protected dashboard routes
│   ├── chat/             # Main chat interface
│   ├── conversations/    # Conversation management
│   ├── settings/         # User settings
│   └── billing/          # Subscription management
├── api/                   # API routes
│   ├── auth/             # Authentication endpoints
│   ├── chat/             # Chat and AI endpoints
│   ├── subscription/     # Payment and subscription
│   └── user/             # User management
├── globals.css           # Global styles
├── layout.tsx            # Root layout
└── page.tsx              # Landing page

components/                # Reusable UI components
├── ui/                   # Base UI components
├── chat/                 # Chat-specific components
├── auth/                 # Authentication components
└── dashboard/            # Dashboard components

lib/                      # Utility libraries
├── auth.ts              # NextAuth configuration
├── db.ts                # Database utilities
├── ai.ts                # AI service integration
├── payments.ts          # Razorpay integration
└── utils.ts             # General utilities

types/                   # TypeScript type definitions
├── database.types.ts    # Supabase generated types
├── auth.types.ts        # Authentication types
└── api.types.ts         # API response types

middleware.ts            # Next.js middleware for auth/rate limiting
```

## Key Architectural Principles

- **Route Groups**: Use Next.js route groups `(auth)` and `(dashboard)` for logical organization
- **Server Components**: Default to Server Components for better performance
- **API Routes**: RESTful API design with proper HTTP methods
- **Type Safety**: Comprehensive TypeScript coverage
- **Component Reusability**: Shared UI components in `/components/ui/`
- **Service Layer**: Business logic abstracted into `/lib/` utilities

## File Naming Conventions

- **Pages**: `page.tsx` for route pages
- **Layouts**: `layout.tsx` for route layouts
- **Components**: PascalCase (e.g., `ChatMessage.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: `.types.ts` suffix for type definitions
- **API Routes**: `route.ts` for API endpoints

## Current vs Future State

**Current**: Static HTML landing page with Tailwind CSS
**Future**: Full-stack Next.js application with the above structure

The current `index.html` serves as the marketing landing page and will be migrated to Next.js as part of the MVP development, with the main application accessible at `/app` or similar route.