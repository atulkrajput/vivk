# Environment Variables Setup for Deployment

This guide explains how to properly configure environment variables for VIVK MVP deployment.

## Required Environment Variables

### 1. Database (Supabase)
```bash
# Public variables (exposed to client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side variables
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 2. Authentication
```bash
NEXTAUTH_SECRET=your-secure-random-secret-key
NEXTAUTH_URL=https://vivk.in
```

### 3. AI Integration
```bash
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 4. Payments (Razorpay)
```bash
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

### 5. Caching (Upstash Redis)
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 6. Email (Resend)
```bash
RESEND_API_KEY=your-resend-api-key
```

## Vercel Deployment Setup

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Configure Environment Variables**: In Vercel dashboard, go to Project Settings > Environment Variables
3. **Add Variables**: Add all the required environment variables listed above
4. **Deploy**: Trigger a new deployment

## Environment Variable Validation

The application includes runtime validation for environment variables:

- Build-time: Uses placeholder values to allow successful builds
- Runtime: Validates actual environment variables and shows appropriate errors
- Health checks: `/api/health` endpoints verify all services are properly configured

## Security Notes

- Never commit real environment variables to version control
- Use different keys for development and production
- Regularly rotate API keys and secrets
- Monitor environment variable usage in logs

## Troubleshooting

### Build Failures
- Ensure placeholder values are set in Next.js config
- Check that all required environment variables are defined
- Verify no syntax errors in environment variable names

### Runtime Errors
- Check Vercel deployment logs for missing variables
- Verify API keys are valid and have proper permissions
- Test database connectivity using health check endpoints

### Database Connection Issues
- Verify Supabase project is active
- Check database URL format and credentials
- Ensure IP restrictions allow Vercel's IP ranges

## Health Check Endpoints

Use these endpoints to verify your deployment:

- `/api/health` - Overall system health
- `/api/health/database` - Database connectivity
- `/api/health/redis` - Redis cache connectivity
- `/api/health/ai` - AI service connectivity
- `/api/health/payments` - Payment service connectivity