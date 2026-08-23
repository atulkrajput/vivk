'use client'

import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'

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
    if (limit === -1) return 0
    return Math.min((current / limit) * 100, 100)
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className={`vivk-card p-5 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-2 bg-slate-100 rounded"></div>
            <div className="h-2 bg-slate-100 rounded w-5/6"></div>
            <div className="h-2 bg-slate-100 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`vivk-card p-5 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchUsageStats} className="mt-2 text-xs text-vivk-blue hover:text-blue-700 font-medium transition-colors">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!usage || !limits) return null

  const isFreeTier = limits.dailyLimit !== -1
  const usagePercentage = getUsagePercentage(usage.todayUsage, usage.dailyLimit)

  return (
    <div className={`vivk-card p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-slate-400" />
        <h3 className="text-base font-semibold text-vivk-navy">Usage Statistics</h3>
      </div>
      
      {/* Today's Usage */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-600">Today&apos;s Messages</span>
          <span className="text-sm text-slate-500">
            {usage.todayUsage}{isFreeTier ? ` / ${usage.dailyLimit}` : ''}
          </span>
        </div>
        
        {isFreeTier ? (
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                usagePercentage >= 100 
                  ? 'bg-red-500' 
                  : usagePercentage >= 80 
                  ? 'bg-amber-500' 
                  : 'bg-vivk-blue'
              }`}
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        ) : (
          <div className="text-sm text-emerald-600 font-medium">Unlimited</div>
        )}
        
        {isFreeTier && limits.remainingMessages > 0 && (
          <p className="text-xs text-slate-400 mt-1.5">
            {limits.remainingMessages} messages remaining today
          </p>
        )}
      </div>

      {/* Usage Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="text-center p-3 bg-vivk-bg rounded-xl">
          <div className="text-xl font-bold text-vivk-navy">{usage.weeklyUsage}</div>
          <div className="text-xs text-slate-500 mt-0.5">This Week</div>
        </div>
        <div className="text-center p-3 bg-vivk-bg rounded-xl">
          <div className="text-xl font-bold text-vivk-navy">{usage.monthlyUsage}</div>
          <div className="text-xs text-slate-500 mt-0.5">This Month</div>
        </div>
      </div>

      {/* Usage History Chart */}
      {usage.usageHistory && usage.usageHistory.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-slate-500 mb-3">Last 7 Days</h4>
          <div className="flex items-end justify-between h-16 gap-1">
            {usage.usageHistory.map((day, index) => {
              const maxHeight = Math.max(...usage.usageHistory.map(d => d.count), 1)
              const height = (day.count / maxHeight) * 100
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-vivk-blue/80 rounded-t-sm transition-all duration-300 min-h-[2px]"
                    style={{ height: `${Math.max(height, 3)}%` }}
                    title={`${day.count} messages on ${formatDate(day.date)}`}
                  ></div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {formatDate(day.date).split(' ')[1]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {limits.warningMessage && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
          <p className="text-xs text-amber-800">{limits.warningMessage}</p>
        </div>
      )}

      {limits.limitMessage && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
          <p className="text-xs text-red-700">{limits.limitMessage}</p>
        </div>
      )}

      {/* Upgrade CTA for Free Users */}
      {isFreeTier && (
        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">Want unlimited messages?</p>
          <a href="/billing" className="inline-block vivk-btn-primary text-xs px-4 py-2">
            Upgrade to Pro — ₹999/mo
          </a>
        </div>
      )}
    </div>
  )
}
