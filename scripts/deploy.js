#!/usr/bin/env node

/**
 * VIVK MVP Deployment Script
 * 
 * This script handles the deployment process for VIVK MVP to Vercel
 * with proper environment validation and database setup.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
  log('🔍 Checking environment variables...', 'blue');
  
  const requiredVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'ANTHROPIC_API_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'RESEND_API_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log('❌ Missing required environment variables:', 'red');
    missing.forEach(varName => log(`   - ${varName}`, 'red'));
    log('\nPlease configure these in your Vercel dashboard or .env.local file', 'yellow');
    process.exit(1);
  }
  
  log('✅ All required environment variables are set', 'green');
}

function runTests() {
  log('🧪 Running tests before deployment...', 'blue');
  
  try {
    execSync('npm test', { stdio: 'inherit' });
    log('✅ All tests passed', 'green');
  } catch (error) {
    log('❌ Tests failed. Deployment aborted.', 'red');
    process.exit(1);
  }
}

function runTypeCheck() {
  log('🔍 Running TypeScript type check...', 'blue');
  
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
    log('✅ TypeScript check passed', 'green');
  } catch (error) {
    log('❌ TypeScript errors found. Deployment aborted.', 'red');
    process.exit(1);
  }
}

function buildApplication() {
  log('🏗️  Building application...', 'blue');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    log('✅ Build completed successfully', 'green');
  } catch (error) {
    log('❌ Build failed. Deployment aborted.', 'red');
    process.exit(1);
  }
}

function deployToVercel() {
  log('🚀 Deploying to Vercel...', 'blue');
  
  try {
    const deployCommand = process.argv.includes('--production') 
      ? 'vercel --prod' 
      : 'vercel';
    
    execSync(deployCommand, { stdio: 'inherit' });
    log('✅ Deployment completed successfully', 'green');
  } catch (error) {
    log('❌ Deployment failed', 'red');
    process.exit(1);
  }
}

function validateDeployment() {
  log('🔍 Validating deployment...', 'blue');
  
  const deploymentUrl = process.env.VERCEL_URL || 'https://vivk.in';
  
  log(`📍 Deployment URL: ${deploymentUrl}`, 'cyan');
  log('🔍 Please manually verify the following:', 'yellow');
  log('   - Landing page loads correctly', 'yellow');
  log('   - Authentication system works', 'yellow');
  log('   - Chat interface is functional', 'yellow');
  log('   - Payment integration works', 'yellow');
  log('   - Database connections are stable', 'yellow');
}

function main() {
  log('🚀 VIVK MVP Deployment Process Started', 'bright');
  log('=====================================', 'bright');
  
  try {
    checkEnvironmentVariables();
    runTests();
    runTypeCheck();
    buildApplication();
    deployToVercel();
    validateDeployment();
    
    log('\n🎉 Deployment process completed successfully!', 'green');
    log('🔗 Your VIVK MVP is now live at: https://vivk.in', 'cyan');
    
  } catch (error) {
    log(`\n❌ Deployment failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the deployment process
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  runTests,
  runTypeCheck,
  buildApplication,
  deployToVercel,
  validateDeployment
};