// Database security utilities for preventing SQL injection and ensuring data integrity

import { supabase } from './db'
import { logSecureError, securitySchemas } from './security'
import { z } from 'zod'

// Sanitize database query parameters
export function sanitizeQueryParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      sanitized[key] = value
      continue
    }
    
    if (typeof value === 'string') {
      // Remove null bytes and control characters
      sanitized[key] = value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    } else if (typeof value === 'number') {
      // Ensure number is finite
      sanitized[key] = Number.isFinite(value) ? value : 0
    } else if (typeof value === 'boolean') {
      sanitized[key] = Boolean(value)
    } else if (Array.isArray(value)) {
      // Recursively sanitize array elements
      sanitized[key] = value.map(item => 
        typeof item === 'string' 
          ? item.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
          : item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

// Validate UUID parameters
export function validateUUID(id: string, fieldName: string = 'ID'): string {
  try {
    return securitySchemas.uuid.parse(id)
  } catch (error) {
    throw new Error(`Invalid ${fieldName} format`)
  }
}

// Validate pagination parameters
export function validatePagination(limit?: number, offset?: number) {
  try {
    return securitySchemas.pagination.parse({ limit, offset })
  } catch (error) {
    throw new Error('Invalid pagination parameters')
  }
}

// Secure database query wrapper with logging
export async function secureQuery<T>(
  queryName: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context: Record<string, any> = {}
): Promise<T | null> {
  try {
    const sanitizedContext = sanitizeQueryParams(context)
    const { data, error } = await queryFn()
    
    if (error) {
      logSecureError(new Error(`Database query failed: ${queryName}`), {
        query: queryName,
        error: error.message,
        context: sanitizedContext
      })
      return null
    }
    
    return data
  } catch (error) {
    logSecureError(error as Error, {
      query: queryName,
      context: sanitizeQueryParams(context)
    })
    return null
  }
}

// Secure database mutation wrapper with logging
export async function secureMutation<T>(
  mutationName: string,
  mutationFn: () => Promise<{ data: T | null; error: any }>,
  context: Record<string, any> = {}
): Promise<T | null> {
  try {
    const sanitizedContext = sanitizeQueryParams(context)
    const { data, error } = await mutationFn()
    
    if (error) {
      logSecureError(new Error(`Database mutation failed: ${mutationName}`), {
        mutation: mutationName,
        error: error.message,
        context: sanitizedContext
      })
      return null
    }
    
    return data
  } catch (error) {
    logSecureError(error as Error, {
      mutation: mutationName,
      context: sanitizeQueryParams(context)
    })
    return null
  }
}

// Validate user ownership of resources
export async function validateUserOwnership(
  userId: string,
  resourceType: 'conversation' | 'message' | 'payment' | 'subscription',
  resourceId: string
): Promise<boolean> {
  try {
    validateUUID(userId, 'User ID')
    validateUUID(resourceId, 'Resource ID')
    
    let query
    
    switch (resourceType) {
      case 'conversation':
        query = supabase
          .from('conversations')
          .select('user_id')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single()
        break
        
      case 'message':
        query = supabase
          .from('messages')
          .select('conversations!inner(user_id)')
          .eq('id', resourceId)
          .eq('conversations.user_id', userId)
          .single()
        break
        
      case 'payment':
        query = supabase
          .from('payments')
          .select('user_id')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single()
        break
        
      case 'subscription':
        query = supabase
          .from('subscriptions')
          .select('user_id')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single()
        break
        
      default:
        return false
    }
    
    const { data, error } = await query
    
    if (error || !data) {
      logSecureError(new Error('Ownership validation failed'), {
        userId,
        resourceType,
        resourceId,
        error: error?.message
      })
      return false
    }
    
    return true
    
  } catch (error) {
    logSecureError(error as Error, {
      userId,
      resourceType,
      resourceId
    })
    return false
  }
}

// Rate limiting for database operations
const dbRateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkDatabaseRateLimit(
  identifier: string,
  operation: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const key = `${identifier}:${operation}`
  const record = dbRateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    dbRateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    logSecureError(new Error('Database rate limit exceeded'), {
      identifier,
      operation,
      count: record.count,
      limit
    })
    return false
  }
  
  record.count++
  return true
}

// Validate search queries to prevent injection
export function validateSearchQuery(query: string): string {
  try {
    return securitySchemas.searchQuery.parse(query)
  } catch (error) {
    throw new Error('Invalid search query')
  }
}

// Secure text search with parameterized queries
export async function secureTextSearch(
  table: string,
  column: string,
  searchTerm: string,
  userId?: string,
  limit: number = 50
): Promise<any[] | null> {
  try {
    // Validate inputs
    const validatedSearch = validateSearchQuery(searchTerm)
    const validatedLimit = Math.min(Math.max(1, limit), 100) // Clamp between 1-100
    
    if (userId) {
      validateUUID(userId, 'User ID')
    }
    
    // Build secure query
    let query = supabase
      .from(table)
      .select('*')
      .ilike(column, `%${validatedSearch}%`)
      .limit(validatedLimit)
    
    // Add user filter if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query
    
    if (error) {
      logSecureError(new Error('Text search failed'), {
        table,
        column,
        searchTerm: validatedSearch,
        error: error.message
      })
      return null
    }
    
    return data
    
  } catch (error) {
    logSecureError(error as Error, {
      table,
      column,
      searchTerm
    })
    return null
  }
}

// Validate and sanitize bulk operations
export function validateBulkOperation(
  ids: string[],
  maxItems: number = 100
): string[] {
  if (!Array.isArray(ids)) {
    throw new Error('IDs must be an array')
  }
  
  if (ids.length === 0) {
    throw new Error('No IDs provided')
  }
  
  if (ids.length > maxItems) {
    throw new Error(`Too many items. Maximum ${maxItems} allowed`)
  }
  
  // Validate each ID
  const validatedIds = ids.map((id, index) => {
    try {
      return validateUUID(id, `ID at index ${index}`)
    } catch (error) {
      throw new Error(`Invalid ID at index ${index}`)
    }
  })
  
  // Remove duplicates
  return [...new Set(validatedIds)]
}

// Secure audit logging for sensitive operations
export async function auditLog(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    validateUUID(userId, 'User ID')
    validateUUID(resourceId, 'Resource ID')
    
    const sanitizedMetadata = sanitizeQueryParams(metadata)
    
    // In a production system, you would store audit logs in a separate table
    // For now, we'll just log securely
    logSecureError(new Error('Audit Log'), {
      type: 'AUDIT',
      userId,
      action,
      resourceType,
      resourceId,
      metadata: sanitizedMetadata,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logSecureError(error as Error, {
      type: 'AUDIT_FAILED',
      userId,
      action,
      resourceType,
      resourceId
    })
  }
}

// Database connection health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    return !error
  } catch (error) {
    logSecureError(error as Error, { type: 'DB_HEALTH_CHECK' })
    return false
  }
}