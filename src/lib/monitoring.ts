/**
 * Production Monitoring and Logging Configuration for VIVK MVP
 * 
 * This module provides comprehensive monitoring, logging, and alerting
 * capabilities for the production environment.
 */

import { NextRequest } from 'next/server'

// Types for monitoring
interface MetricData {
  name: string
  value: number
  tags?: Record<string, string>
  timestamp?: Date
}

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  metadata?: Record<string, any>
  userId?: string
  requestId?: string
  timestamp: Date
}

interface PerformanceMetric {
  route: string
  method: string
  duration: number
  statusCode: number
  timestamp: Date
}

interface ErrorReport {
  error: Error
  context: Record<string, any>
  userId?: string
  requestId?: string
  timestamp: Date
}

class ProductionMonitoring {
  private static instance: ProductionMonitoring
  private isEnabled: boolean
  private logBuffer: LogEntry[] = []
  private metricsBuffer: MetricData[] = []

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production' && 
                    process.env.PERFORMANCE_MONITORING_ENABLED === 'true'
  }

  static getInstance(): ProductionMonitoring {
    if (!ProductionMonitoring.instance) {
      ProductionMonitoring.instance = new ProductionMonitoring()
    }
    return ProductionMonitoring.instance
  }

  /**
   * Log application events with structured data
   */
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    if (!this.isEnabled) return

    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date()
    }

    // Add to buffer
    this.logBuffer.push(logEntry)

    // Console output for immediate visibility
    const logMessage = `[${logEntry.level.toUpperCase()}] ${logEntry.message}`
    const metadata = logEntry.metadata ? JSON.stringify(logEntry.metadata) : ''
    
    switch (logEntry.level) {
      case 'error':
        console.error(logMessage, metadata)
        break
      case 'warn':
        console.warn(logMessage, metadata)
        break
      case 'debug':
        console.debug(logMessage, metadata)
        break
      default:
        console.log(logMessage, metadata)
    }

    // Flush buffer if it gets too large
    if (this.logBuffer.length > 100) {
      this.flushLogs()
    }
  }

  /**
   * Record performance metrics
   */
  recordMetric(metric: MetricData): void {
    if (!this.isEnabled) return

    const metricWithTimestamp: MetricData = {
      ...metric,
      timestamp: metric.timestamp || new Date()
    }

    this.metricsBuffer.push(metricWithTimestamp)

    // Flush metrics buffer periodically
    if (this.metricsBuffer.length > 50) {
      this.flushMetrics()
    }
  }

  /**
   * Record API performance
   */
  recordApiPerformance(metric: PerformanceMetric): void {
    this.recordMetric({
      name: 'api_response_time',
      value: metric.duration,
      tags: {
        route: metric.route,
        method: metric.method,
        status_code: metric.statusCode.toString()
      }
    })

    // Log slow requests
    if (metric.duration > 5000) {
      this.log({
        level: 'warn',
        message: 'Slow API response detected',
        metadata: {
          route: metric.route,
          method: metric.method,
          duration: metric.duration,
          statusCode: metric.statusCode
        }
      })
    }
  }

  /**
   * Report errors with context
   */
  reportError(report: ErrorReport): void {
    this.log({
      level: 'error',
      message: report.error.message,
      metadata: {
        stack: report.error.stack,
        context: report.context,
        userId: report.userId,
        requestId: report.requestId
      }
    })

    // Send to external error reporting service if configured
    if (process.env.SENTRY_DSN) {
      this.sendToSentry(report)
    }
  }

  /**
   * Monitor database performance
   */
  recordDatabaseQuery(query: string, duration: number, success: boolean): void {
    this.recordMetric({
      name: 'database_query_time',
      value: duration,
      tags: {
        success: success.toString(),
        query_type: this.extractQueryType(query)
      }
    })

    // Log slow queries
    if (duration > 1000) {
      this.log({
        level: 'warn',
        message: 'Slow database query detected',
        metadata: {
          query: query.substring(0, 200), // Truncate for privacy
          duration,
          success
        }
      })
    }
  }

  /**
   * Monitor AI API performance
   */
  recordAiApiCall(provider: string, model: string, duration: number, success: boolean, tokenCount?: number): void {
    this.recordMetric({
      name: 'ai_api_response_time',
      value: duration,
      tags: {
        provider,
        model,
        success: success.toString()
      }
    })

    if (tokenCount) {
      this.recordMetric({
        name: 'ai_tokens_used',
        value: tokenCount,
        tags: { provider, model }
      })
    }

    // Log AI API issues
    if (!success || duration > 30000) {
      this.log({
        level: success ? 'warn' : 'error',
        message: `AI API ${success ? 'slow response' : 'failure'}`,
        metadata: {
          provider,
          model,
          duration,
          success,
          tokenCount
        }
      })
    }
  }

  /**
   * Monitor user activity
   */
  recordUserActivity(userId: string, action: string, metadata?: Record<string, any>): void {
    this.recordMetric({
      name: 'user_activity',
      value: 1,
      tags: {
        action,
        user_id: userId
      }
    })

    this.log({
      level: 'info',
      message: `User activity: ${action}`,
      userId,
      metadata
    })
  }

  /**
   * Health check monitoring
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, boolean>
    timestamp: Date
  }> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      ai_providers: await this.checkAiProviders(),
      payment_gateway: await this.checkPaymentGateway()
    }

    const healthyCount = Object.values(checks).filter(Boolean).length
    const totalChecks = Object.keys(checks).length

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyCount === totalChecks) {
      status = 'healthy'
    } else if (healthyCount >= totalChecks * 0.7) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    const result = {
      status,
      checks,
      timestamp: new Date()
    }

    this.log({
      level: status === 'healthy' ? 'info' : 'warn',
      message: `Health check completed: ${status}`,
      metadata: result
    })

    return result
  }

  /**
   * Flush logs to external service
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return

    const logs = [...this.logBuffer]
    this.logBuffer = []

    try {
      // Send to external logging service (e.g., Vercel Analytics, DataDog, etc.)
      if (process.env.VERCEL_ANALYTICS_ID) {
        await this.sendLogsToVercel(logs)
      }
    } catch (error) {
      console.error('Failed to flush logs:', error)
      // Re-add logs to buffer for retry
      this.logBuffer.unshift(...logs)
    }
  }

  /**
   * Flush metrics to external service
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return

    const metrics = [...this.metricsBuffer]
    this.metricsBuffer = []

    try {
      // Send to external metrics service
      if (process.env.VERCEL_ANALYTICS_ID) {
        await this.sendMetricsToVercel(metrics)
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error)
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metrics)
    }
  }

  // Health check implementations
  private async checkDatabase(): Promise<boolean> {
    try {
      // Simple database connectivity check
      const response = await fetch('/api/health/database', { 
        method: 'GET',
        headers: { 'x-health-check': 'true' }
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const response = await fetch('/api/health/redis', { 
        method: 'GET',
        headers: { 'x-health-check': 'true' }
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async checkAiProviders(): Promise<boolean> {
    try {
      const response = await fetch('/api/health/ai', { 
        method: 'GET',
        headers: { 'x-health-check': 'true' }
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async checkPaymentGateway(): Promise<boolean> {
    try {
      const response = await fetch('/api/health/payments', { 
        method: 'GET',
        headers: { 'x-health-check': 'true' }
      })
      return response.ok
    } catch {
      return false
    }
  }

  // External service integrations
  private async sendToSentry(report: ErrorReport): Promise<void> {
    // Sentry integration would go here
    console.log('Would send to Sentry:', report.error.message)
  }

  private async sendLogsToVercel(logs: LogEntry[]): Promise<void> {
    // Vercel Analytics integration would go here
    console.log(`Would send ${logs.length} logs to Vercel Analytics`)
  }

  private async sendMetricsToVercel(metrics: MetricData[]): Promise<void> {
    // Vercel Analytics integration would go here
    console.log(`Would send ${metrics.length} metrics to Vercel Analytics`)
  }

  private extractQueryType(query: string): string {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.startsWith('select')) return 'select'
    if (trimmed.startsWith('insert')) return 'insert'
    if (trimmed.startsWith('update')) return 'update'
    if (trimmed.startsWith('delete')) return 'delete'
    return 'other'
  }
}

// Middleware for automatic request monitoring
export function createMonitoringMiddleware() {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()
    const monitoring = ProductionMonitoring.getInstance()

    // Add request ID to headers for tracing
    request.headers.set('x-request-id', requestId)

    monitoring.log({
      level: 'info',
      message: 'Request started',
      requestId,
      metadata: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent')
      }
    })

    return {
      onResponse: (response: Response) => {
        const duration = Date.now() - startTime
        
        monitoring.recordApiPerformance({
          route: new URL(request.url).pathname,
          method: request.method,
          duration,
          statusCode: response.status,
          timestamp: new Date()
        })

        monitoring.log({
          level: response.status >= 400 ? 'warn' : 'info',
          message: 'Request completed',
          requestId,
          metadata: {
            statusCode: response.status,
            duration
          }
        })
      }
    }
  }
}

// Export singleton instance
export const monitoring = ProductionMonitoring.getInstance()

// Export types for use in other modules
export type {
  MetricData,
  LogEntry,
  PerformanceMetric,
  ErrorReport
}