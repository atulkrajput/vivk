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

## 📊 Current Status

✅ **Completed (Task 1)**:
- Next.js 14 project setup with TypeScript
- Tailwind CSS configuration
- Landing page migration from static HTML
- Basic project structure and dependencies
- Development environment setup

🚧 **In Progress**:
- Database schema implementation
- Authentication system
- Chat interface
- AI integration
- Payment system

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