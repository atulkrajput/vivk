'use client'

import { useState, useEffect } from 'react'

interface UsageStatsProps {
  className?: string
}

interface UsageData {
  todayUsage: number
  weeklyUsage: number
  monthlyUsage: number
  dailyLimit: number
  remainingToday: number
  usageHistory: Array<{ date: string; count: number }>
}

interface LimitStatus {
  hasReachedLimit: boolean
  isApproachingLimit: boolean
  remainingMessages: number
  todayUsage: number
  dailyLimit: number
  warningMessage?: string
  limitMessage?: string
}

export function UsageStats({ className = '' }: UsageStatsProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [limits, setLimits] = useState<LimitStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsageStats()
  }, [])

  const fetchUsageStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/usage')
      
      if (response.ok) {
        const data = await response.json()
        setUsage(data.usage)
        setLimits(data.limits)
        setError(null)
      } else {
        setError('Failed to load usage statistics')
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error)
      setError('Failed to load usage statistics')
    } finally {
      setIsLoading(false)
    }
  }

  const getUsagePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((current / limit) * 100, 100)
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchUsageStats}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!usage || !limits) {
    return null
  }

  const isFreeTier = limits.dailyLimit !== -1
  const usagePercentage = getUsagePercentage(usage.todayUsage, usage.dailyLimit)

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h3>
      
      {/* Today's Usage */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Today's Messages</span>
          <span className="text-sm text-gray-500">
            {usage.todayUsage}{isFreeTier ? ` / ${usage.dailyLimit}` : ''}
          </span>
        </div>
        
        {isFreeTier ? (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                usagePercentage >= 100 
                  ? 'bg-red-500' 
                  : usagePercentage >= 80 
                  ? 'bg-yellow-500' 
                  : 'bg-blue-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        ) : (
          <div className="text-sm text-green-600 font-medium">Unlimited</div>
        )}
        
        {isFreeTier && limits.remainingMessages > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {limits.remainingMessages} messages remaining today
          </p>
        )}
      </div>

      {/* Usage Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{usage.weeklyUsage}</div>
          <div className="text-xs text-gray-500">This Week</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{usage.monthlyUsage}</div>
          <div className="text-xs text-gray-500">This Month</div>
        </div>
      </div>

      {/* Usage History Chart */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Last 7 Days</h4>
        <div className="flex items-end justify-between h-20 space-x-1">
          {usage.usageHistory.map((day, index) => {
            const maxHeight = Math.max(...usage.usageHistory.map(d => d.count), 1)
            const height = (day.count / maxHeight) * 100
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 min-h-[2px]"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${day.count} messages on ${formatDate(day.date)}`}
                ></div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(day.date).split(' ')[1]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Warning Messages */}
      {limits.warningMessage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">{limits.warningMessage}</p>
        </div>
      )}

      {limits.limitMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800">{limits.limitMessage}</p>
        </div>
      )}

      {/* Upgrade CTA for Free Users */}
      {isFreeTier && (
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Want unlimited messages?
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Upgrade to Pro - ₹499/month
          </button>
        </div>
      )}
    </div>
  )
}