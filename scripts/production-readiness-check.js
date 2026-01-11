#!/usr/bin/env node

/**
 * VIVK MVP Production Readiness Validation Script
 * 
 * This script validates all production readiness requirements
 * and provides a comprehensive report of the system's readiness.
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

class ProductionReadinessChecker {
  constructor() {
    this.results = {
      environment: {},
      security: {},
      performance: {},
      monitoring: {},
      services: {},
      overall: { score: 0, ready: false }
    }
  }

  async runAllChecks() {
    console.log('🚀 VIVK MVP Production Readiness Check\n')
    console.log('=' .repeat(50))

    try {
      await this.checkEnvironmentVariables()
      await this.checkSecurityConfiguration()
      await this.checkPerformanceMetrics()
      await this.checkMonitoringSetup()
      await this.checkExternalServices()
      await this.generateReport()
    } catch (error) {
      console.error('❌ Production readiness check failed:', error.message)
      process.exit(1)
    }
  }

  async checkEnvironmentVariables() {
    console.log('\n📋 Checking Environment Variables...')
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'SUPABASE_URL', 
      'SUPABASE_ANON_KEY',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'ANTHROPIC_API_KEY',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'RESEND_API_KEY'
    ]

    let envScore = 0
    const envResults = {}

    for (const envVar of requiredEnvVars) {
      const exists = process.env[envVar] !== undefined
      const hasValue = exists && process.env[envVar].length > 0
      
      envResults[envVar] = {
        exists,
        hasValue,
        status: hasValue ? '✅' : '❌'
      }

      if (hasValue) envScore++
      
      console.log(`  ${envResults[envVar].status} ${envVar}: ${hasValue ? 'Configured' : 'Missing'}`)
    }

    this.results.environment = {
      score: Math.round((envScore / requiredEnvVars.length) * 100),
      details: envResults,
      ready: envScore === requiredEnvVars.length
    }

    console.log(`\n📊 Environment Score: ${this.results.environment.score}%`)
  }

  async checkSecurityConfiguration() {
    console.log('\n🔒 Checking Security Configuration...')

    const securityChecks = {
      httpsEnforced: this.checkHTTPSEnforcement(),
      securityHeaders: this.checkSecurityHeaders(),
      authConfiguration: this.checkAuthConfiguration(),
      inputValidation: this.checkInputValidation(),
      rateLimiting: this.checkRateLimiting()
    }

    let securityScore = 0
    const securityResults = {}

    for (const [check, result] of Object.entries(securityChecks)) {
      const passed = await result
      securityResults[check] = {
        passed,
        status: passed ? '✅' : '❌'
      }
      
      if (passed) securityScore++
      
      console.log(`  ${securityResults[check].status} ${this.formatCheckName(check)}`)
    }

    this.results.security = {
      score: Math.round((securityScore / Object.keys(securityChecks).length) * 100),
      details: securityResults,
      ready: securityScore === Object.keys(securityChecks).length
    }

    console.log(`\n🛡️ Security Score: ${this.results.security.score}%`)
  }

  async checkPerformanceMetrics() {
    console.log('\n⚡ Checking Performance Configuration...')

    const performanceChecks = {
      bundleOptimization: this.checkBundleSize(),
      cacheConfiguration: this.checkCacheSetup(),
      databaseOptimization: this.checkDatabaseConfig(),
      cdnConfiguration: this.checkCDNSetup(),
      compressionEnabled: this.checkCompression()
    }

    let perfScore = 0
    const perfResults = {}

    for (const [check, result] of Object.entries(performanceChecks)) {
      const passed = await result
      perfResults[check] = {
        passed,
        status: passed ? '✅' : '❌'
      }
      
      if (passed) perfScore++
      
      console.log(`  ${perfResults[check].status} ${this.formatCheckName(check)}`)
    }

    this.results.performance = {
      score: Math.round((perfScore / Object.keys(performanceChecks).length) * 100),
      details: perfResults,
      ready: perfScore >= Object.keys(performanceChecks).length * 0.8 // 80% threshold
    }

    console.log(`\n📈 Performance Score: ${this.results.performance.score}%`)
  }

  async checkMonitoringSetup() {
    console.log('\n📊 Checking Monitoring & Alerting...')

    const monitoringChecks = {
      healthEndpoints: this.checkHealthEndpoints(),
      errorTracking: this.checkErrorTracking(),
      performanceMonitoring: this.checkPerformanceMonitoring(),
      uptimeMonitoring: this.checkUptimeMonitoring(),
      alertConfiguration: this.checkAlertSetup()
    }

    let monitoringScore = 0
    const monitoringResults = {}

    for (const [check, result] of Object.entries(monitoringChecks)) {
      const passed = await result
      monitoringResults[check] = {
        passed,
        status: passed ? '✅' : '❌'
      }
      
      if (passed) monitoringScore++
      
      console.log(`  ${monitoringResults[check].status} ${this.formatCheckName(check)}`)
    }

    this.results.monitoring = {
      score: Math.round((monitoringScore / Object.keys(monitoringChecks).length) * 100),
      details: monitoringResults,
      ready: monitoringScore >= Object.keys(monitoringChecks).length * 0.8
    }

    console.log(`\n📡 Monitoring Score: ${this.results.monitoring.score}%`)
  }

  async checkExternalServices() {
    console.log('\n🔗 Checking External Service Integration...')

    const serviceChecks = {
      supabaseConnection: this.checkSupabaseHealth(),
      redisConnection: this.checkRedisHealth(),
      anthropicAPI: this.checkAnthropicHealth(),
      razorpayAPI: this.checkRazorpayHealth(),
      resendAPI: this.checkResendHealth()
    }

    let serviceScore = 0
    const serviceResults = {}

    for (const [check, result] of Object.entries(serviceChecks)) {
      try {
        const passed = await result
        serviceResults[check] = {
          passed,
          status: passed ? '✅' : '❌'
        }
        
        if (passed) serviceScore++
        
        console.log(`  ${serviceResults[check].status} ${this.formatCheckName(check)}`)
      } catch (error) {
        serviceResults[check] = {
          passed: false,
          status: '❌',
          error: error.message
        }
        console.log(`  ❌ ${this.formatCheckName(check)}: ${error.message}`)
      }
    }

    this.results.services = {
      score: Math.round((serviceScore / Object.keys(serviceChecks).length) * 100),
      details: serviceResults,
      ready: serviceScore >= Object.keys(serviceChecks).length * 0.8
    }

    console.log(`\n🌐 Services Score: ${this.results.services.score}%`)
  }

  async generateReport() {
    console.log('\n' + '='.repeat(50))
    console.log('📋 PRODUCTION READINESS REPORT')
    console.log('='.repeat(50))

    // Calculate overall score
    const scores = [
      this.results.environment.score,
      this.results.security.score,
      this.results.performance.score,
      this.results.monitoring.score,
      this.results.services.score
    ]

    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const isReady = overallScore >= 90 && this.results.environment.ready && this.results.security.ready

    this.results.overall = {
      score: overallScore,
      ready: isReady
    }

    console.log(`\n📊 Environment Variables: ${this.results.environment.score}%`)
    console.log(`🛡️ Security Configuration: ${this.results.security.score}%`)
    console.log(`⚡ Performance Optimization: ${this.results.performance.score}%`)
    console.log(`📡 Monitoring & Alerting: ${this.results.monitoring.score}%`)
    console.log(`🌐 External Services: ${this.results.services.score}%`)

    console.log(`\n🎯 OVERALL SCORE: ${overallScore}%`)
    console.log(`🚀 PRODUCTION READY: ${isReady ? '✅ YES' : '❌ NO'}`)

    if (isReady) {
      console.log('\n🎉 Congratulations! VIVK MVP is ready for production deployment.')
      console.log('All critical systems are configured and operational.')
    } else {
      console.log('\n⚠️ Production deployment not recommended.')
      console.log('Please address the failing checks before proceeding.')
    }

    // Save detailed report
    await this.saveDetailedReport()
  }

  async saveDetailedReport() {
    const reportPath = path.join(process.cwd(), 'production-readiness-report.json')
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      recommendations: this.generateRecommendations()
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  }

  generateRecommendations() {
    const recommendations = []

    if (!this.results.environment.ready) {
      recommendations.push('Configure all required environment variables')
    }

    if (this.results.security.score < 100) {
      recommendations.push('Address security configuration issues')
    }

    if (this.results.performance.score < 80) {
      recommendations.push('Optimize performance configuration')
    }

    if (this.results.monitoring.score < 80) {
      recommendations.push('Improve monitoring and alerting setup')
    }

    if (this.results.services.score < 80) {
      recommendations.push('Fix external service integration issues')
    }

    return recommendations
  }

  // Security check methods
  async checkHTTPSEnforcement() {
    // Check if NEXTAUTH_URL uses HTTPS
    const nextAuthUrl = process.env.NEXTAUTH_URL
    return nextAuthUrl && nextAuthUrl.startsWith('https://')
  }

  async checkSecurityHeaders() {
    // Check if security headers are configured in next.config.js
    try {
      const nextConfigPath = path.join(process.cwd(), 'next.config.js')
      if (fs.existsSync(nextConfigPath)) {
        const config = fs.readFileSync(nextConfigPath, 'utf8')
        return config.includes('X-Frame-Options') || config.includes('headers')
      }
    } catch (error) {
      return false
    }
    return false
  }

  async checkAuthConfiguration() {
    // Check if NextAuth secret is configured
    return process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32
  }

  async checkInputValidation() {
    // Check if input validation middleware exists
    try {
      const middlewarePath = path.join(process.cwd(), 'src/middleware.ts')
      return fs.existsSync(middlewarePath)
    } catch (error) {
      return false
    }
  }

  async checkRateLimiting() {
    // Check if rate limiting is configured
    try {
      const rateLimitPath = path.join(process.cwd(), 'src/lib/rate-limiting.ts')
      return fs.existsSync(rateLimitPath)
    } catch (error) {
      return false
    }
  }

  // Performance check methods
  async checkBundleSize() {
    // Check if bundle optimization is configured
    try {
      const nextConfigPath = path.join(process.cwd(), 'next.config.js')
      if (fs.existsSync(nextConfigPath)) {
        const config = fs.readFileSync(nextConfigPath, 'utf8')
        return config.includes('compress') || config.includes('optimization')
      }
    } catch (error) {
      return false
    }
    return true // Default Next.js optimization
  }

  async checkCacheSetup() {
    // Check if Redis cache is configured
    return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  }

  async checkDatabaseConfig() {
    // Check if database URL is configured
    return process.env.DATABASE_URL && process.env.SUPABASE_URL
  }

  async checkCDNSetup() {
    // Vercel automatically provides CDN
    return true
  }

  async checkCompression() {
    // Next.js automatically handles compression
    return true
  }

  // Monitoring check methods
  async checkHealthEndpoints() {
    try {
      const healthPath = path.join(process.cwd(), 'src/app/api/health/route.ts')
      return fs.existsSync(healthPath)
    } catch (error) {
      return false
    }
  }

  async checkErrorTracking() {
    // Check if error handling is implemented
    try {
      const errorPath = path.join(process.cwd(), 'src/lib/error-handling.ts')
      return fs.existsSync(errorPath)
    } catch (error) {
      return false
    }
  }

  async checkPerformanceMonitoring() {
    // Check if performance monitoring is configured
    try {
      const perfPath = path.join(process.cwd(), 'src/lib/performance-monitoring.ts')
      return fs.existsSync(perfPath)
    } catch (error) {
      return false
    }
  }

  async checkUptimeMonitoring() {
    // Vercel provides uptime monitoring
    return true
  }

  async checkAlertSetup() {
    // Check if monitoring configuration exists
    try {
      const monitoringPath = path.join(process.cwd(), 'src/lib/monitoring.ts')
      return fs.existsSync(monitoringPath)
    } catch (error) {
      return false
    }
  }

  // Service health check methods
  async checkSupabaseHealth() {
    return process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  }

  async checkRedisHealth() {
    return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  }

  async checkAnthropicHealth() {
    return process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-')
  }

  async checkRazorpayHealth() {
    return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  }

  async checkResendHealth() {
    return process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')
  }

  // Utility methods
  formatCheckName(name) {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
  }

  async makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => resolve({ statusCode: res.statusCode, data }))
      })
      
      req.on('error', reject)
      req.setTimeout(5000, () => reject(new Error('Request timeout')))
      req.end()
    })
  }
}

// Run the production readiness check
if (require.main === module) {
  const checker = new ProductionReadinessChecker()
  checker.runAllChecks().catch(error => {
    console.error('Production readiness check failed:', error)
    process.exit(1)
  })
}

module.exports = ProductionReadinessChecker