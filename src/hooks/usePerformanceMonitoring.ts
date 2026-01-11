// Client-side performance monitoring hook

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface PerformanceMetric {
  type: 'web-vital' | 'navigation' | 'resource' | 'custom'
  name: string
  value: number
  tags?: Record<string, string>
  url?: string
}

/**
 * Hook for monitoring client-side performance
 */
export function usePerformanceMonitoring() {
  const router = useRouter()
  
  /**
   * Send performance metric to server
   */
  const recordMetric = useCallback(async (metric: PerformanceMetric) => {
    try {
      await fetch('/api/admin/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metric,
          url: metric.url || window.location.pathname,
          timestamp: Date.now()
        })
      })
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.debug('Failed to record performance metric:', error)
    }
  }, [])
  
  /**
   * Record Web Vitals
   */
  const recordWebVital = useCallback((metric: any) => {
    recordMetric({
      type: 'web-vital',
      name: metric.name,
      value: metric.value,
      tags: {
        rating: metric.rating || 'unknown',
        id: metric.id || 'unknown'
      }
    })
  }, [recordMetric])
  
  /**
   * Record navigation timing
   */
  const recordNavigationTiming = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        // Time to First Byte
        recordMetric({
          type: 'navigation',
          name: 'TTFB',
          value: navigation.responseStart - navigation.requestStart,
          tags: { type: 'navigation' }
        })
        
        // DOM Content Loaded
        recordMetric({
          type: 'navigation',
          name: 'DCL',
          value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          tags: { type: 'navigation' }
        })
        
        // Load Complete
        recordMetric({
          type: 'navigation',
          name: 'Load',
          value: navigation.loadEventEnd - navigation.fetchStart,
          tags: { type: 'navigation' }
        })
        
        // DNS Lookup Time
        recordMetric({
          type: 'navigation',
          name: 'DNS',
          value: navigation.domainLookupEnd - navigation.domainLookupStart,
          tags: { type: 'navigation' }
        })
        
        // Connection Time
        recordMetric({
          type: 'navigation',
          name: 'Connection',
          value: navigation.connectEnd - navigation.connectStart,
          tags: { type: 'navigation' }
        })
      }
    }
  }, [recordMetric])
  
  /**
   * Record resource timing
   */
  const recordResourceTiming = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      // Group resources by type
      const resourcesByType: Record<string, PerformanceResourceTiming[]> = {}
      
      resources.forEach(resource => {
        const type = getResourceType(resource.name)
        if (!resourcesByType[type]) {
          resourcesByType[type] = []
        }
        resourcesByType[type].push(resource)
      })
      
      // Record average load times by resource type
      Object.entries(resourcesByType).forEach(([type, typeResources]) => {
        const totalTime = typeResources.reduce((sum, resource) => {
          return sum + (resource.responseEnd - resource.startTime)
        }, 0)
        
        const averageTime = totalTime / typeResources.length
        
        recordMetric({
          type: 'resource',
          name: `${type}_load_time`,
          value: averageTime,
          tags: {
            type: 'resource',
            resourceType: type,
            count: typeResources.length.toString()
          }
        })
      })
    }
  }, [recordMetric])
  
  /**
   * Record custom performance metric
   */
  const recordCustomMetric = useCallback((name: string, value: number, tags?: Record<string, string>) => {
    recordMetric({
      type: 'custom',
      name,
      value,
      tags
    })
  }, [recordMetric])
  
  /**
   * Start performance monitoring
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Record navigation timing after page load
    const recordTimingAfterLoad = () => {
      setTimeout(() => {
        recordNavigationTiming()
        recordResourceTiming()
      }, 1000) // Wait 1 second after load
    }
    
    if (document.readyState === 'complete') {
      recordTimingAfterLoad()
    } else {
      window.addEventListener('load', recordTimingAfterLoad)
    }
    
    // Monitor Web Vitals if available
    if (typeof window !== 'undefined') {
      // Try to import web-vitals dynamically
      import('web-vitals').then((webVitals) => {
        if (webVitals.onCLS) webVitals.onCLS(recordWebVital)
        if (webVitals.onFCP) webVitals.onFCP(recordWebVital)
        if (webVitals.onLCP) webVitals.onLCP(recordWebVital)
        if (webVitals.onTTFB) webVitals.onTTFB(recordWebVital)
        // Note: FID is deprecated in favor of INP in newer versions
        if (webVitals.onINP) webVitals.onINP(recordWebVital)
      }).catch(() => {
        // web-vitals not available, continue without it
      })
    }
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            recordMetric({
              type: 'custom',
              name: 'long_task',
              value: entry.duration,
              tags: {
                type: 'performance',
                entryType: entry.entryType
              }
            })
          })
        })
        
        longTaskObserver.observe({ entryTypes: ['longtask'] })
        
        return () => {
          longTaskObserver.disconnect()
        }
      } catch (error) {
        // PerformanceObserver not supported or failed
      }
    }
    
    return () => {
      window.removeEventListener('load', recordTimingAfterLoad)
    }
  }, [recordNavigationTiming, recordResourceTiming, recordWebVital, recordMetric])
  
  return {
    recordCustomMetric,
    recordMetric
  }
}

/**
 * Get resource type from URL
 */
function getResourceType(url: string): string {
  if (url.includes('.js')) return 'script'
  if (url.includes('.css')) return 'stylesheet'
  if (url.match(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/)) return 'image'
  if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font'
  if (url.includes('/api/')) return 'api'
  return 'other'
}

/**
 * Hook for monitoring API call performance
 */
export function useAPIPerformanceMonitoring() {
  const recordAPICall = useCallback(async (
    url: string,
    method: string,
    startTime: number,
    response?: Response
  ) => {
    const endTime = Date.now()
    const duration = endTime - startTime
    
    try {
      await fetch('/api/admin/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'custom',
          name: 'api_call',
          value: duration,
          tags: {
            endpoint: url,
            method,
            status: response?.status?.toString() || 'unknown',
            cached: response?.headers.get('x-cache') === 'HIT' ? 'true' : 'false'
          },
          url: window.location.pathname
        })
      })
    } catch (error) {
      // Silently fail
      console.debug('Failed to record API performance metric:', error)
    }
  }, [])
  
  /**
   * Wrapper for fetch with performance monitoring
   */
  const monitoredFetch = useCallback(async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const startTime = Date.now()
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method || 'GET'
    
    try {
      const response = await fetch(input, init)
      await recordAPICall(url, method, startTime, response)
      return response
    } catch (error) {
      await recordAPICall(url, method, startTime)
      throw error
    }
  }, [recordAPICall])
  
  return {
    monitoredFetch,
    recordAPICall
  }
}

/**
 * Hook for monitoring component render performance
 */
export function useRenderPerformanceMonitoring(componentName: string) {
  const { recordCustomMetric } = usePerformanceMonitoring()
  
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      recordCustomMetric(`component_render_${componentName}`, renderTime, {
        component: componentName,
        type: 'render'
      })
    }
  }, [componentName, recordCustomMetric])
}

export default usePerformanceMonitoring