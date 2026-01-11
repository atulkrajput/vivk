#!/usr/bin/env node

/**
 * VIVK MVP Security Audit Script
 * 
 * This script performs a comprehensive security audit of the application
 * including dependency scanning, configuration validation, and security testing.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class SecurityAuditor {
  constructor() {
    this.findings = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: []
    }
    this.score = 0
  }

  async runSecurityAudit() {
    console.log('🔒 VIVK MVP Security Audit\n')
    console.log('=' .repeat(50))

    try {
      await this.auditDependencies()
      await this.auditConfiguration()
      await this.auditCodeSecurity()
      await this.auditInfrastructure()
      await this.auditDataProtection()
      await this.generateSecurityReport()
    } catch (error) {
      console.error('❌ Security audit failed:', error.message)
      process.exit(1)
    }
  }

  async auditDependencies() {
    console.log('\n📦 Auditing Dependencies...')
    
    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' })
      const audit = JSON.parse(auditResult)
      
      if (audit.vulnerabilities) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
          const severity = vuln.severity
          const finding = {
            type: 'dependency',
            package: pkg,
            severity: severity,
            description: `Vulnerability in ${pkg}: ${vuln.title || 'Unknown vulnerability'}`,
            recommendation: `Update ${pkg} to a secure version`
          }
          
          this.addFinding(severity, finding)
        })
      }
      
      console.log(`  ✅ Dependency audit completed`)
      
    } catch (error) {
      console.log(`  ⚠️ Dependency audit warning: ${error.message}`)
      this.addFinding('medium', {
        type: 'dependency',
        description: 'Could not complete dependency audit',
        recommendation: 'Run npm audit manually to check for vulnerabilities'
      })
    }
  }

  async auditConfiguration() {
    console.log('\n⚙️ Auditing Configuration Security...')
    
    // Check environment variable security
    this.auditEnvironmentVariables()
    
    // Check Next.js configuration
    this.auditNextJSConfig()
    
    // Check authentication configuration
    this.auditAuthConfig()
    
    // Check database configuration
    this.auditDatabaseConfig()
    
    console.log(`  ✅ Configuration audit completed`)
  }

  auditEnvironmentVariables() {
    const sensitiveVars = [
      'NEXTAUTH_SECRET',
      'ANTHROPIC_API_KEY',
      'RAZORPAY_KEY_SECRET',
      'UPSTASH_REDIS_REST_TOKEN',
      'RESEND_API_KEY'
    ]

    sensitiveVars.forEach(varName => {
      const value = process.env[varName]
      
      if (!value) {
        this.addFinding('high', {
          type: 'configuration',
          description: `Missing required environment variable: ${varName}`,
          recommendation: `Set ${varName} in production environment`
        })
      } else if (value.length < 16) {
        this.addFinding('medium', {
          type: 'configuration',
          description: `Environment variable ${varName} appears to be too short`,
          recommendation: `Ensure ${varName} is a secure, long random string`
        })
      }
    })

    // Check NEXTAUTH_URL
    const nextAuthUrl = process.env.NEXTAUTH_URL
    if (nextAuthUrl && !nextAuthUrl.startsWith('https://')) {
      this.addFinding('high', {
        type: 'configuration',
        description: 'NEXTAUTH_URL is not using HTTPS',
        recommendation: 'Set NEXTAUTH_URL to use HTTPS in production'
      })
    }
  }

  auditNextJSConfig() {
    try {
      const configPath = path.join(process.cwd(), 'next.config.js')
      if (fs.existsSync(configPath)) {
        const config = fs.readFileSync(configPath, 'utf8')
        
        // Check for security headers
        if (!config.includes('X-Frame-Options')) {
          this.addFinding('medium', {
            type: 'configuration',
            description: 'Missing X-Frame-Options security header',
            recommendation: 'Add X-Frame-Options header to prevent clickjacking'
          })
        }
        
        if (!config.includes('X-Content-Type-Options')) {
          this.addFinding('medium', {
            type: 'configuration',
            description: 'Missing X-Content-Type-Options security header',
            recommendation: 'Add X-Content-Type-Options: nosniff header'
          })
        }
        
        if (!config.includes('Strict-Transport-Security')) {
          this.addFinding('medium', {
            type: 'configuration',
            description: 'Missing HSTS (Strict-Transport-Security) header',
            recommendation: 'Add HSTS header to enforce HTTPS'
          })
        }
      }
    } catch (error) {
      this.addFinding('low', {
        type: 'configuration',
        description: 'Could not audit Next.js configuration',
        recommendation: 'Manually review next.config.js for security headers'
      })
    }
  }

  auditAuthConfig() {
    // Check NextAuth secret
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret || secret.length < 32) {
      this.addFinding('critical', {
        type: 'authentication',
        description: 'NextAuth secret is missing or too short',
        recommendation: 'Set a secure random string of at least 32 characters for NEXTAUTH_SECRET'
      })
    }

    // Check for auth middleware
    const middlewarePath = path.join(process.cwd(), 'src/middleware.ts')
    if (!fs.existsSync(middlewarePath)) {
      this.addFinding('medium', {
        type: 'authentication',
        description: 'Authentication middleware not found',
        recommendation: 'Implement middleware to protect API routes'
      })
    }
  }

  auditDatabaseConfig() {
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl && !dbUrl.includes('ssl=true') && !dbUrl.includes('sslmode=require')) {
      this.addFinding('high', {
        type: 'database',
        description: 'Database connection may not be using SSL',
        recommendation: 'Ensure database connections use SSL/TLS encryption'
      })
    }
  }

  async auditCodeSecurity() {
    console.log('\n🔍 Auditing Code Security...')
    
    // Check for common security issues in code
    this.auditAPIRoutes()
    this.auditInputValidation()
    this.auditErrorHandling()
    
    console.log(`  ✅ Code security audit completed`)
  }

  auditAPIRoutes() {
    const apiDir = path.join(process.cwd(), 'src/app/api')
    if (fs.existsSync(apiDir)) {
      this.walkDirectory(apiDir, (filePath) => {
        if (filePath.endsWith('route.ts')) {
          const content = fs.readFileSync(filePath, 'utf8')
          
          // Check for SQL injection vulnerabilities
          if (content.includes('query(') && !content.includes('$1')) {
            this.addFinding('high', {
              type: 'code',
              file: filePath,
              description: 'Potential SQL injection vulnerability',
              recommendation: 'Use parameterized queries to prevent SQL injection'
            })
          }
          
          // Check for XSS vulnerabilities
          if (content.includes('innerHTML') || content.includes('dangerouslySetInnerHTML')) {
            this.addFinding('medium', {
              type: 'code',
              file: filePath,
              description: 'Potential XSS vulnerability',
              recommendation: 'Sanitize user input before rendering HTML'
            })
          }
          
          // Check for authentication on sensitive routes
          if (filePath.includes('/api/') && !content.includes('getServerSession') && !content.includes('auth')) {
            this.addFinding('medium', {
              type: 'code',
              file: filePath,
              description: 'API route may lack authentication',
              recommendation: 'Add authentication checks to sensitive API routes'
            })
          }
        }
      })
    }
  }

  auditInputValidation() {
    // Check if input validation library is used
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      
      if (!deps.zod && !deps.joi && !deps.yup) {
        this.addFinding('medium', {
          type: 'code',
          description: 'No input validation library detected',
          recommendation: 'Use a validation library like Zod, Joi, or Yup for input validation'
        })
      }
    }
  }

  auditErrorHandling() {
    // Check for proper error handling
    const errorHandlingPath = path.join(process.cwd(), 'src/lib/error-handling.ts')
    if (!fs.existsSync(errorHandlingPath)) {
      this.addFinding('low', {
        type: 'code',
        description: 'Centralized error handling not found',
        recommendation: 'Implement centralized error handling to prevent information leakage'
      })
    }
  }

  async auditInfrastructure() {
    console.log('\n🏗️ Auditing Infrastructure Security...')
    
    // Check deployment configuration
    this.auditDeploymentConfig()
    
    // Check domain and SSL configuration
    this.auditDomainConfig()
    
    console.log(`  ✅ Infrastructure audit completed`)
  }

  auditDeploymentConfig() {
    // Check Vercel configuration
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json')
    if (fs.existsSync(vercelConfigPath)) {
      const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'))
      
      if (config.headers) {
        const hasSecurityHeaders = config.headers.some(header => 
          header.headers && (
            header.headers['X-Frame-Options'] ||
            header.headers['X-Content-Type-Options'] ||
            header.headers['Strict-Transport-Security']
          )
        )
        
        if (!hasSecurityHeaders) {
          this.addFinding('medium', {
            type: 'infrastructure',
            description: 'Security headers not configured in Vercel',
            recommendation: 'Add security headers to vercel.json configuration'
          })
        }
      }
    }
  }

  auditDomainConfig() {
    const nextAuthUrl = process.env.NEXTAUTH_URL
    if (nextAuthUrl) {
      try {
        const url = new URL(nextAuthUrl)
        
        if (url.protocol !== 'https:') {
          this.addFinding('critical', {
            type: 'infrastructure',
            description: 'Production domain not using HTTPS',
            recommendation: 'Configure SSL/TLS certificate for production domain'
          })
        }
        
        if (url.hostname === 'localhost' || url.hostname.includes('127.0.0.1')) {
          this.addFinding('high', {
            type: 'infrastructure',
            description: 'Production URL appears to be localhost',
            recommendation: 'Set production domain in NEXTAUTH_URL'
          })
        }
      } catch (error) {
        this.addFinding('medium', {
          type: 'infrastructure',
          description: 'Invalid NEXTAUTH_URL format',
          recommendation: 'Ensure NEXTAUTH_URL is a valid URL'
        })
      }
    }
  }

  async auditDataProtection() {
    console.log('\n🛡️ Auditing Data Protection...')
    
    // Check for data encryption
    this.auditDataEncryption()
    
    // Check for privacy compliance
    this.auditPrivacyCompliance()
    
    console.log(`  ✅ Data protection audit completed`)
  }

  auditDataEncryption() {
    // Check if bcrypt is used for password hashing
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      
      if (!deps.bcryptjs && !deps.bcrypt) {
        this.addFinding('high', {
          type: 'data-protection',
          description: 'No password hashing library detected',
          recommendation: 'Use bcrypt or bcryptjs for secure password hashing'
        })
      }
    }
  }

  auditPrivacyCompliance() {
    // Check for privacy policy
    const privacyPaths = [
      'src/app/privacy/page.tsx',
      'src/pages/privacy.tsx',
      'public/privacy.html'
    ]
    
    const hasPrivacyPolicy = privacyPaths.some(p => fs.existsSync(path.join(process.cwd(), p)))
    
    if (!hasPrivacyPolicy) {
      this.addFinding('medium', {
        type: 'data-protection',
        description: 'Privacy policy not found',
        recommendation: 'Create and publish a privacy policy for GDPR compliance'
      })
    }
  }

  async generateSecurityReport() {
    console.log('\n' + '='.repeat(50))
    console.log('🔒 SECURITY AUDIT REPORT')
    console.log('='.repeat(50))

    const totalFindings = Object.values(this.findings).reduce((sum, arr) => sum + arr.length, 0)
    
    console.log(`\n📊 Security Findings Summary:`)
    console.log(`  🔴 Critical: ${this.findings.critical.length}`)
    console.log(`  🟠 High: ${this.findings.high.length}`)
    console.log(`  🟡 Medium: ${this.findings.medium.length}`)
    console.log(`  🟢 Low: ${this.findings.low.length}`)
    console.log(`  ℹ️ Info: ${this.findings.info.length}`)
    console.log(`\n📈 Total Findings: ${totalFindings}`)

    // Calculate security score
    const criticalWeight = 10
    const highWeight = 5
    const mediumWeight = 2
    const lowWeight = 1

    const totalDeductions = 
      (this.findings.critical.length * criticalWeight) +
      (this.findings.high.length * highWeight) +
      (this.findings.medium.length * mediumWeight) +
      (this.findings.low.length * lowWeight)

    this.score = Math.max(0, 100 - totalDeductions)

    console.log(`\n🎯 Security Score: ${this.score}/100`)

    if (this.score >= 90) {
      console.log('✅ Excellent security posture')
    } else if (this.score >= 75) {
      console.log('⚠️ Good security, minor improvements needed')
    } else if (this.score >= 50) {
      console.log('🟡 Moderate security, several issues to address')
    } else {
      console.log('🔴 Poor security, immediate action required')
    }

    // Display critical and high findings
    if (this.findings.critical.length > 0) {
      console.log('\n🔴 CRITICAL FINDINGS (Immediate Action Required):')
      this.findings.critical.forEach((finding, i) => {
        console.log(`  ${i + 1}. ${finding.description}`)
        console.log(`     💡 ${finding.recommendation}`)
      })
    }

    if (this.findings.high.length > 0) {
      console.log('\n🟠 HIGH PRIORITY FINDINGS:')
      this.findings.high.forEach((finding, i) => {
        console.log(`  ${i + 1}. ${finding.description}`)
        console.log(`     💡 ${finding.recommendation}`)
      })
    }

    // Save detailed report
    await this.saveSecurityReport()

    // Determine if production ready from security perspective
    const isSecure = this.findings.critical.length === 0 && this.findings.high.length <= 2
    console.log(`\n🚀 SECURITY CLEARANCE: ${isSecure ? '✅ APPROVED' : '❌ NOT APPROVED'}`)

    if (!isSecure) {
      console.log('⚠️ Address critical and high-priority findings before production deployment.')
    }
  }

  async saveSecurityReport() {
    const reportPath = path.join(process.cwd(), 'security-audit-report.json')
    const report = {
      timestamp: new Date().toISOString(),
      score: this.score,
      findings: this.findings,
      summary: {
        total: Object.values(this.findings).reduce((sum, arr) => sum + arr.length, 0),
        critical: this.findings.critical.length,
        high: this.findings.high.length,
        medium: this.findings.medium.length,
        low: this.findings.low.length,
        info: this.findings.info.length
      }
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed security report saved to: ${reportPath}`)
  }

  addFinding(severity, finding) {
    if (this.findings[severity]) {
      this.findings[severity].push({
        ...finding,
        timestamp: new Date().toISOString()
      })
    }
  }

  walkDirectory(dir, callback) {
    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        this.walkDirectory(filePath, callback)
      } else {
        callback(filePath)
      }
    })
  }
}

// Run the security audit
if (require.main === module) {
  const auditor = new SecurityAuditor()
  auditor.runSecurityAudit().catch(error => {
    console.error('Security audit failed:', error)
    process.exit(1)
  })
}

module.exports = SecurityAuditor