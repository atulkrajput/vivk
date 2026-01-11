// Performance monitoring and metrics collection

import { CacheService, CACHE_KEYS, CACHE_TTL } from './redis'

/**
 * Performance metrics types
 */
export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
  unit?: 'ms' | 'bytes' | 'count' | 'percent'
}

export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
  url: string
  userId?: string
}

export interface APIPerformanceMetric {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: number
  userId?: string
  userAgent?: string
  cached?: boolean
}

/**
 * Performance monitoring service
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = []
  private static readonly MAX_METRICS = 1000
  
  /**
   * Record a performance metric
   */
  static recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    }
    
    this.metrics.push(fullMetric)
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }
    
    // Store in Redis for persistence
    this.storeMetricInRedis(fullMetric)
  }
  
  /**
   * Store metric in Redis for persistence and aggregation
   */
  private static async storeMetricInRedis(metric: PerformanceMetric) {
    try {
      const key = `${CACHE_KEYS.SESSION}performance:${metric.name}:${new Date().toISOString().split('T')[0]}`
      
      // Get existing metrics for the day
      const existingMetrics = await CacheService.get<PerformanceMetric[]>(key) || []
      existingMetrics.push(metric)
      
      // Keep only last 100 metrics per day per metric type
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100)
      }
      
      await CacheService.set(key, existingMetrics, CACHE_TTL.SESSION)
    } catch (error) {
      console.error('Failed to store performance metric:', error)
    }
  }
  
  /**
   * Get performance metrics
   */
  static getMetrics(name?: string, since?: number): PerformanceMetric[] {
    let filtered = this.metrics
    
    if (name) {
      filtered = filtered.filter(m => m.name === name)
    }
    
    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since)
    }
    
    return filtered
  }
  
  /**
   * Get performance statistics
   */
  static getStats(name: string, since?: number): {
    count: number
    average: number
    median: number
    p95: number
    min: number
    max: number
  } | null {
    const metrics = this.getMetrics(name, since)
    
    if (metrics.length === 0) {
      return null
    }
    
    const values = metrics.map(m => m.value).sort((a, b) => a - b)
    const sum = values.reduce((acc, val) => acc + val, 0)
    
    return {
      count: values.length,
      average: Math.round(sum / values.length),
      median: values[Math.floor(values.length / 2)],
      p95: values[Math.floor(values.length * 0.95)],
      min: values[0],
      max: values[values.length - 1]
    }
  }
  
  /**
   * Clear old metrics
   */
  static clearOldMetrics(olderThan: number = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - olderThan
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff)
  }
}

/**
 * Web Vitals monitoring
 */
export class WebVitalsMonitor {
  /**
   * Record Web Vitals metric
   */
  static recordWebVital(metric: WebVitalsMetric) {
    // Store in performance monitor
    PerformanceMonitor.recordMetric({
      name: `web_vitals_${metric.name.toLowerCase()}`,
      value: metric.value,
      tags: {
        rating: metric.rating,
        url: metric.url,
        userId: metric.userId || 'anonymous'
      },
      unit: 'ms'
    })
    
    // Log poor performance
    if (metric.rating === 'poor') {
      console.warn(`Poor Web Vital detected: ${metric.name} = ${metric.value}ms on ${metric.url}`)
    }
  }
  
  /**
   * Get Web Vitals thresholds
   */
  static getThresholds() {
    return {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 }
    }
  }
  
  /**
   * Rate Web Vital performance
   */
  static ratePerformance(name: keyof ReturnType<typeof WebVitalsMonitor.getThresholds>, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = this.getThresholds()[name]
    
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.poor) return 'needs-improvement'
    return 'poor'
  }
}

/**
 * API Performance monitoring
 */
export class APIPerformanceMonitor {
  /**
   * Record API performance metric
   */
  static recordAPICall(metric: APIPerformanceMetric) {
    PerformanceMonitor.recordMetric({
      name: 'api_response_time',
      value: metric.responseTime,
      tags: {
        endpoint: metric.endpoint,
        method: metric.method,
        statusCode: metric.statusCode.toString(),
        cached: metric.cached ? 'true' : 'false',
        userId: metric.userId || 'anonymous'
      },
      unit: 'ms'
    })
    
    // Log slow API calls
    if (metric.responseTime > 5000) {
      console.warn(`Slow API call detected: ${metric.method} ${metric.endpoint} took ${metric.responseTime}ms`)
    }
    
    // Log errors
    if (metric.statusCode >= 400) {
      PerformanceMonitor.recordMetric({
        name: 'api_error',
        value: 1,
        tags: {
          endpoint: metric.endpoint,
          method: metric.method,
          statusCode: metric.statusCode.toString()
        },
        unit: 'count'
      })
    }
  }
  
  /**
   * Get API performance statistics
   */
  static async getAPIStats(endpoint?: string, since?: number) {
    const metrics = PerformanceMonitor.getMetrics('api_response_time', since)
    
    let filtered = metrics
    if (endpoint) {
      filtered = metrics.filter(m => m.tags?.endpoint === endpoint)
    }
    
    // Group by endpoint
    const byEndpoint: Record<string, number[]> = {}
    
    filtered.forEach(metric => {
      const ep = metric.tags?.endpoint || 'unknown'
      if (!byEndpoint[ep]) {
        byEndpoint[ep] = []
      }
      byEndpoint[ep].push(metric.value)
    })
    
    // Calculate stats for each endpoint
    const stats: Record<string, any> = {}
    
    Object.entries(byEndpoint).forEach(([ep, values]) => {
      const sorted = values.sort((a, b) => a - b)
      const sum = values.reduce((acc, val) => acc + val, 0)
      
      stats[ep] = {
        count: values.length,
        average: Math.round(sum / values.length),
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        min: sorted[0],
        max: sorted[sorted.length - 1]
      }
    })
    
    return stats
  }
}

/**
 * Database Performance monitoring
 */
export class DatabasePerformanceMonitor {
  /**
   * Record database query performance
   */
  static recordQuery(queryName: string, executionTime: number, cached: boolean = false) {
    PerformanceMonitor.recordMetric({
      name: 'db_query_time',
      value: executionTime,
      tags: {
        query: queryName,
        cached: cached ? 'true' : 'false'
      },
      unit: 'ms'
    })
    
    // Log slow queries
    if (executionTime > 1000) {
      console.warn(`Slow database query detected: ${queryName} took ${executionTime}ms`)
    }
  }
  
  /**
   * Record cache hit/miss
   */
  static recordCacheEvent(operation: 'hit' | 'miss' | 'set' | 'delete', key: string) {
    PerformanceMonitor.recordMetric({
      name: `cache_${operation}`,
      value: 1,
      tags: {
        key_type: key.split(':')[0] || 'unknown'
      },
      unit: 'count'
    })
  }
  
  /**
   * Get cache performance statistics
   */
  static getCacheStats(since?: number) {
    const hits = PerformanceMonitor.getMetrics('cache_hit', since)
    const misses = PerformanceMonitor.getMetrics('cache_miss', since)
    
    const totalRequests = hits.length + misses.length
    const hitRate = totalRequests > 0 ? (hits.length / totalRequests) * 100 : 0
    
    return {
      hits: hits.length,
      misses: misses.length,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests
    }
  }
}

/**
 * Memory and Resource monitoring
 */
export class ResourceMonitor {
  /**
   * Record memory usage
   */
  static recordMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      
      PerformanceMonitor.recordMetric({
        name: 'memory_heap_used',
        value: usage.heapUsed,
        unit: 'bytes'
      })
      
      PerformanceMonitor.recordMetric({
        name: 'memory_heap_total',
        value: usage.heapTotal,
        unit: 'bytes'
      })
      
      PerformanceMonitor.recordMetric({
        name: 'memory_rss',
        value: usage.rss,
        unit: 'bytes'
      })
    }
  }
  
  /**
   * Record CPU usage (if available)
   */
  static recordCPUUsage() {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage()
      
      PerformanceMonitor.recordMetric({
        name: 'cpu_user',
        value: usage.user,
        unit: 'ms'
      })
      
      PerformanceMonitor.recordMetric({
        name: 'cpu_system',
        value: usage.system,
        unit: 'ms'
      })
    }
  }
  
  /**
   * Start periodic resource monitoring
   */
  static startMonitoring(intervalMs: number = 60000) {
    const interval = setInterval(() => {
      this.recordMemoryUsage()
      this.recordCPUUsage()
    }, intervalMs)
    
    return () => clearInterval(interval)
  }
}

/**
 * Performance middleware for API routes
 */
export function withPerformanceMonitoring(
  handler: (request: Request, ...args: any[]) => Promise<Response>
) {
  return async function (request: Request, ...args: any[]): Promise<Response> {
    const startTime = Date.now()
    const url = new URL(request.url)
    const endpoint = url.pathname
    const method = request.method
    
    try {
      const response = await handler(request, ...args)
      const responseTime = Date.now() - startTime
      
      // Record API performance
      APIPerformanceMonitor.recordAPICall({
        endpoint,
        method,
        statusCode: response.status,
        responseTime,
        timestamp: startTime,
        cached: response.headers.get('x-cache') === 'HIT'
      })
      
      // Add performance headers
      response.headers.set('X-Response-Time', `${responseTime}ms`)
      response.headers.set('X-Timestamp', startTime.toString())
      
      return response
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      // Record error
      APIPerformanceMonitor.recordAPICall({
        endpoint,
        method,
        statusCode: 500,
        responseTime,
        timestamp: startTime
      })
      
      throw error
    }
  }
}

/**
 * Performance dashboard data
 */
export class PerformanceDashboard {
  /**
   * Get comprehensive performance overview
   */
  static async getOverview(since?: number) {
    const sinceTime = since || Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    
    return {
      api: await APIPerformanceMonitor.getAPIStats(undefined, sinceTime),
      cache: DatabasePerformanceMonitor.getCacheStats(sinceTime),
      webVitals: {
        lcp: PerformanceMonitor.getStats('web_vitals_lcp', sinceTime),
        fid: PerformanceMonitor.getStats('web_vitals_fid', sinceTime),
        cls: PerformanceMonitor.getStats('web_vitals_cls', sinceTime),
        fcp: PerformanceMonitor.getStats('web_vitals_fcp', sinceTime),
        ttfb: PerformanceMonitor.getStats('web_vitals_ttfb', sinceTime)
      },
      database: {
        queryTime: PerformanceMonitor.getStats('db_query_time', sinceTime)
      },
      memory: {
        heapUsed: PerformanceMonitor.getStats('memory_heap_used', sinceTime),
        heapTotal: PerformanceMonitor.getStats('memory_heap_total', sinceTime),
        rss: PerformanceMonitor.getStats('memory_rss', sinceTime)
      }
    }
  }
  
  /**
   * Get performance alerts
   */
  static getAlerts(since?: number) {
    const sinceTime = since || Date.now() - (60 * 60 * 1000) // Last hour
    const alerts: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = []
    
    // Check API response times
    const apiStats = PerformanceMonitor.getStats('api_response_time', sinceTime)
    if (apiStats && apiStats.p95 > 5000) {
      alerts.push({
        type: 'api_performance',
        message: `API response time P95 is ${apiStats.p95}ms (threshold: 5000ms)`,
        severity: 'high'
      })
    }
    
    // Check cache hit rate
    const cacheStats = DatabasePerformanceMonitor.getCacheStats(sinceTime)
    if (cacheStats.hitRate < 80 && cacheStats.totalRequests > 10) {
      alerts.push({
        type: 'cache_performance',
        message: `Cache hit rate is ${cacheStats.hitRate}% (threshold: 80%)`,
        severity: 'medium'
      })
    }
    
    // Check memory usage
    const memoryStats = PerformanceMonitor.getStats('memory_heap_used', sinceTime)
    if (memoryStats && memoryStats.average > 500 * 1024 * 1024) { // 500MB
      alerts.push({
        type: 'memory_usage',
        message: `Average memory usage is ${Math.round(memoryStats.average / 1024 / 1024)}MB (threshold: 500MB)`,
        severity: 'medium'
      })
    }
    
    return alerts
  }
}

// Start resource monitoring in production
if (process.env.NODE_ENV === 'production') {
  ResourceMonitor.startMonitoring(60000) // Every minute
}