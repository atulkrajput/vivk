// Cron job utilities for usage tracking
// In production, these would be handled by Vercel Cron Jobs or similar services

import { dbUtils } from './db'

/**
 * Daily usage reset function
 * This should be called at midnight IST (18:30 UTC) every day
 * In production, this would be triggered by a cron job or scheduled function
 */
export async function resetDailyUsageCounters(): Promise<void> {
  try {
    console.log('Starting daily usage counter reset...')
    
    // The actual reset is automatic since we use date-based records
    // This function can be used for cleanup and verification
    await dbUtils.resetDailyCounters()
    
    console.log('Daily usage counter reset completed successfully')
  } catch (error) {
    console.error('Error during daily usage counter reset:', error)
    throw error
  }
}

/**
 * Weekly cleanup function
 * This should be called weekly to clean up old usage logs
 */
export async function weeklyCleanup(): Promise<void> {
  try {
    console.log('Starting weekly cleanup...')
    
    // Clean up old usage logs (keep last 90 days)
    await dbUtils.cleanupOldUsageLogs()
    
    console.log('Weekly cleanup completed successfully')
  } catch (error) {
    console.error('Error during weekly cleanup:', error)
    throw error
  }
}

/**
 * Get IST midnight time for scheduling
 * IST is UTC+5:30, so midnight IST is 18:30 UTC
 */
export function getISTMidnightUTC(): Date {
  const now = new Date()
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
  
  // Set to next midnight IST (18:30 UTC)
  const nextMidnight = new Date(utc)
  nextMidnight.setUTCHours(18, 30, 0, 0)
  
  // If we've already passed today's midnight IST, set for tomorrow
  if (nextMidnight <= utc) {
    nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1)
  }
  
  return nextMidnight
}

/**
 * Check if it's currently midnight IST (within a 1-minute window)
 */
export function isISTMidnight(): boolean {
  const now = new Date()
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
  
  const hours = utc.getUTCHours()
  const minutes = utc.getUTCMinutes()
  
  // Check if it's 18:30 UTC (midnight IST) within a 1-minute window
  return hours === 18 && minutes >= 30 && minutes < 31
}

/**
 * Format IST time for logging
 */
export function formatISTTime(date: Date = new Date()): string {
  const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
  const istTime = new Date(date.getTime() + istOffset)
  
  return istTime.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}