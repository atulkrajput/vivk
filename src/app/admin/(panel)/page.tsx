'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  TrendingUp,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface DashboardMetrics {
  totalUsers: number
  newUsersToday: number
  activeSubscriptions: number
  monthlyRevenue: number
  totalMessages: number
  messagesToday: number
  errorRate: number
  aiTokensUsed: number
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-100 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    { 
      label: 'Total Users', 
      value: metrics?.totalUsers ?? 0, 
      change: metrics?.newUsersToday ?? 0,
      changeLabel: 'new today',
      icon: Users, 
      color: 'text-vivk-blue', 
      bg: 'bg-vivk-blue/[0.08]',
      trend: 'up' 
    },
    { 
      label: 'Active Subscriptions', 
      value: metrics?.activeSubscriptions ?? 0, 
      change: 0,
      changeLabel: 'paid users',
      icon: CreditCard, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      trend: 'up' 
    },
    { 
      label: 'Messages Today', 
      value: metrics?.messagesToday ?? 0, 
      change: metrics?.totalMessages ?? 0,
      changeLabel: 'total all-time',
      icon: MessageSquare, 
      color: 'text-vivk-violet', 
      bg: 'bg-vivk-violet/[0.06]',
      trend: 'up' 
    },
    { 
      label: 'Monthly Revenue', 
      value: `₹${(metrics?.monthlyRevenue ?? 0).toLocaleString('en-IN')}`, 
      change: 0,
      changeLabel: 'this month',
      icon: TrendingUp, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50',
      trend: 'up' 
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-vivk-navy">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of VIVK platform metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="vivk-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className="text-2xl font-bold text-vivk-navy">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stat.change > 0 && <span className="text-emerald-600 font-medium">+{stat.change} </span>}
              {stat.changeLabel}
            </p>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-4 h-4 text-vivk-blue" />
            <span className="text-sm font-medium text-vivk-navy">AI Tokens Used</span>
          </div>
          <p className="text-xl font-bold text-vivk-navy">{(metrics?.aiTokensUsed ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Total tokens consumed</p>
        </div>

        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-vivk-navy">Error Rate</span>
          </div>
          <p className="text-xl font-bold text-vivk-navy">{(metrics?.errorRate ?? 0).toFixed(2)}%</p>
          <p className="text-xs text-slate-500 mt-1">API errors last 24h</p>
        </div>

        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-4 h-4 text-vivk-violet" />
            <span className="text-sm font-medium text-vivk-navy">Avg Messages/User</span>
          </div>
          <p className="text-xl font-bold text-vivk-navy">
            {metrics && metrics.totalUsers > 0 
              ? Math.round(metrics.totalMessages / metrics.totalUsers) 
              : 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Lifetime average</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="vivk-card p-5">
        <h3 className="text-sm font-semibold text-vivk-navy mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'View Users', href: '/admin/users' },
            { label: 'Manage Plans', href: '/admin/plans' },
            { label: 'Check Errors', href: '/admin/errors' },
            { label: 'AI Keys', href: '/admin/ai-keys' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="px-4 py-2.5 text-center text-sm font-medium text-vivk-blue bg-vivk-blue/[0.04] rounded-xl hover:bg-vivk-blue/[0.08] transition-colors"
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
