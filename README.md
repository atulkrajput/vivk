# VIVK MVP - India's Smartest AI Assistant

VIVK (Virtual Intelligent Versatile Knowledge) is an AI-powered assistant platform built specifically for the Indian market. This MVP provides users with AI-powered conversations, subscription management, and usage tracking through a modern web interface with affordable pricing tiers.

## 🚀 Features

- **AI-Powered Chat**: Natural conversations with Claude AI
- **Subscription Tiers**: Free, Pro (₹499/month), Business (₹2,999/month)
- **Usage Tracking**: Daily limits for free users, unlimited for paid
- **Indian Context**: Built to understand Indian culture and business practices
- **Secure Authentication**: Email/password with JWT sessions
- **Payment Integration**: Razorpay for Indian payment methods
- **Real-time Streaming**: Live AI response streaming

## 🛠️ Tech Stack

- **Frontend & Backend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase PostgreSQL
- **Authentication**: NextAuth.js v5
- **AI Integration**: Anthropic Claude API
- **Payments**: Razorpay
- **Caching**: Upstash Redis
- **Email**: Resend
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Anthropic API key
- Razorpay account
- Upstash Redis account
- Resend account

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vivk-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your API keys and database URLs in `.env.local`

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   ├── landing/           # Landing page
│   └── app/               # Main application
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── chat/             # Chat-specific components
│   ├── auth/             # Authentication components
│   └── dashboard/        # Dashboard components
├── lib/                  # Utility libraries
├── types/                # TypeScript type definitions
└── middleware.ts         # Next.js middleware
```

## 🔧 Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🌐 Environment Variables

See `.env.example` for all required environment variables:

- Database: Supabase URL and keys
- Authentication: NextAuth secret and URL
- AI: Anthropic API key
- Payments: Razorpay keys
- Caching: Upstash Redis URL and token
- Email: Resend API key

## � Admin Panel

The admin panel is accessible at `/admin` and restricted to users with `@vivk.in` email addresses.

**Access URL:** `https://www.vivk.in/admin`

**Authentication:** Server-side check — only users whose email ends with `@vivk.in` can access the admin panel. Non-admin users are redirected to `/chat`.

### Admin Pages

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard overview — total users, active subscriptions, monthly revenue, messages, AI tokens used, error rate |
| `/admin/users` | User management — search, filter by plan, view details, message counts, pagination |
| `/admin/subscriptions` | Subscription tracking — plan distribution, revenue metrics, recent paid users list |
| `/admin/tracking` | Tracking codes — manage Google Analytics, Facebook Pixel, GTM, and custom scripts |
| `/admin/plans` | Plan management — edit pricing, daily message limits, AI model assignment, enable/disable plans |
| `/admin/ai-keys` | AI key management — configure Anthropic/Groq/OpenAI keys, view usage, set monthly limits |
| `/admin/errors` | Error & usage tracking — API error logs by severity, daily usage history (messages, tokens, active users) |
| `/admin/settings` | Platform settings — maintenance mode toggle, platform info |

### Admin API Endpoints

All admin APIs require authentication and `@vivk.in` email verification:

- `GET /api/admin/dashboard` — Platform metrics
- `GET /api/admin/users` — List users (supports `?search=`, `?tier=`, `?page=`)
- `GET /api/admin/subscriptions` — Subscription stats and recent paid users
- `GET/POST /api/admin/tracking` — Read/write tracking code configuration
- `GET/POST /api/admin/plans` — Read/write plan configuration
- `GET/POST /api/admin/ai-keys` — AI provider key management
- `GET /api/admin/errors` — Error logs and usage history
- `GET/POST /api/admin/maintenance` — Maintenance mode control

### Adding Admin Users

Admin access is controlled in `src/lib/admin.ts`. To grant admin access:

1. Add the email to the `ADMIN_EMAILS` array, or
2. Use any email with the `@vivk.in` domain

```typescript
// src/lib/admin.ts
const ADMIN_EMAILS = ['admin@vivk.in', 'atul@vivk.in']
const ADMIN_DOMAIN = '@vivk.in'
```

## 📊 Current Status

✅ **Completed**:
- Next.js 15 project with TypeScript and App Router
- Tailwind CSS with VIVK design system
- Landing page at root (/)
- Authentication (login, register, reset-password)
- AI chat interface with streaming
- Dashboard with usage stats
- Subscription & billing management
- Razorpay payment integration
- Admin panel with full platform management
- Privacy Policy, Terms of Service, Refund Policy pages

🚧 **Planned**:
- Team collaboration features (Business plan)
- Multi-language support
- Advanced analytics dashboard

## 🚀 Deployment

The application is configured for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 📝 License

This project is proprietary software for VIVK platform.

## 🤝 Contributing

This is a private project. Please contact the team for contribution guidelines.

---

Made with ❤️ in India for India 🇮🇳