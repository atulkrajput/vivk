# Technology Stack

VIVK is built as a modern full-stack web application optimized for performance, scalability, and cost-effectiveness in the Indian market.

## Core Technologies

- **Frontend & Backend**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **Database**: Supabase PostgreSQL
- **Authentication**: NextAuth.js v5
- **AI Integration**: Anthropic Claude API (Haiku for free, Sonnet for paid users)
- **Payments**: Razorpay for Indian market
- **Caching**: Upstash Redis for rate limiting and sessions
- **Email**: Resend for transactional emails
- **Deployment**: Vercel with automatic deployments

## Architecture Patterns

- **Server Components**: Leverage Next.js App Router for better performance
- **Streaming Responses**: Real-time AI response streaming using Server-Sent Events
- **API Routes**: RESTful endpoints for all backend functionality
- **Middleware**: Authentication and rate limiting at the edge
- **Database Design**: Normalized schema with proper indexing for performance

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linting
npm run lint

# Database migrations (Supabase)
npx supabase db push

# Generate database types
npx supabase gen types typescript --local > types/database.types.ts
```

## Environment Variables Required

```bash
# Database
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# AI Integration
ANTHROPIC_API_KEY=

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Caching
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email
RESEND_API_KEY=
```

## Performance Targets

- Page load time: < 2 seconds
- API response time: < 5 seconds
- AI response streaming: Real-time
- Concurrent users: 1000+
- Database query optimization: < 100ms average