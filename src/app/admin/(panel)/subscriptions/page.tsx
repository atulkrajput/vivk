'use client'

import { useState, useEffect } from 'react'
import { CreditCard, TrendingUp, Users, Calendar } from 'lucide-react'

interface SubscriptionStats {
  totalActive: number
  proUsers: number
  businessUsers: number
  freeUsers: number
  monthlyRevenue: number
  recentSubscriptions: Array<{
    id: string
    email: string
    full_name: string
    tier: string
    status: string
    created_at: string
    expires_at: string | null
  }>
}

export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load subscription stats:', error)
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
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vivk-navy">Subscription Tracking</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor active subscriptions and revenue</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-4 h-4 text-vivk-blue" />
            <span className="text-sm font-medium text-slate-600">Active Paid</span>
          </div>
          <p className="text-2xl font-bold text-vivk-navy">{stats?.totalActive ?? 0}</p>
        </div>
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-slate-600">Monthly Revenue</span>
          </div>
          <p className="text-2xl font-bold text-vivk-navy">₹{(stats?.monthlyRevenue ?? 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-4 h-4 text-vivk-violet" />
            <span className="text-sm font-medium text-slate-600">Pro Users</span>
          </div>
          <p className="text-2xl font-bold text-vivk-navy">{stats?.proUsers ?? 0}</p>
        </div>
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-slate-600">Business Users</span>
          </div>
          <p className="text-2xl font-bold text-vivk-navy">{stats?.businessUsers ?? 0}</p>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="vivk-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-vivk-navy mb-4">Plan Distribution</h3>
        <div className="flex items-center gap-2 h-6 rounded-full overflow-hidden bg-slate-100">
          {stats && (stats.freeUsers + stats.proUsers + stats.businessUsers) > 0 && (
            <>
              <div 
                className="h-full bg-slate-400 rounded-l-full" 
                style={{ width: `${(stats.freeUsers / (stats.freeUsers + stats.proUsers + stats.businessUsers)) * 100}%` }}
                title={`Free: ${stats.freeUsers}`}
              />
              <div 
                className="h-full bg-vivk-blue" 
                style={{ width: `${(stats.proUsers / (stats.freeUsers + stats.proUsers + stats.businessUsers)) * 100}%` }}
                title={`Pro: ${stats.proUsers}`}
              />
              <div 
                className="h-full bg-vivk-violet rounded-r-full" 
                style={{ width: `${(stats.businessUsers / (stats.freeUsers + stats.proUsers + stats.businessUsers)) * 100}%` }}
                title={`Business: ${stats.businessUsers}`}
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Free ({stats?.freeUsers ?? 0})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-vivk-blue"></span> Pro ({stats?.proUsers ?? 0})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-vivk-violet"></span> Business ({stats?.businessUsers ?? 0})</span>
        </div>
      </div>

      {/* Recent Subscriptions */}
      <div className="vivk-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-vivk-navy">Recent Paid Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600">User</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Plan</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentSubscriptions?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">No paid subscriptions yet</td>
                </tr>
              ) : (
                stats?.recentSubscriptions?.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-vivk-navy">{sub.full_name || sub.email}</p>
                      <p className="text-xs text-slate-500">{sub.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sub.tier === 'business' ? 'bg-vivk-violet/10 text-vivk-violet' : 'bg-vivk-blue/10 text-vivk-blue'}`}>
                        {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(sub.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
