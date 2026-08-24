'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Activity, Clock, RefreshCw, Filter } from 'lucide-react'

interface ErrorLog {
  id: string
  type: string
  message: string
  endpoint: string
  userId: string | null
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface UsageLog {
  date: string
  totalMessages: number
  totalTokens: number
  uniqueUsers: number
  errors: number
}

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<'errors' | 'usage'>('errors')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/errors')
      if (response.ok) {
        const data = await response.json()
        setErrors(data.errors)
        setUsageLogs(data.usageLogs)
      }
    } catch (error) {
      console.error('Failed to load error data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredErrors = severityFilter === 'all' 
    ? errors 
    : errors.filter(e => e.severity === severityFilter)

  const severityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-amber-50 text-amber-700',
      high: 'bg-orange-50 text-orange-700',
      critical: 'bg-red-50 text-red-700',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[severity] || styles.low}`}>
        {severity}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3"></div>
          <div className="h-64 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-vivk-navy">Errors & Usage Tracking</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor API errors, AI usage, and system health</p>
        </div>
        <button onClick={fetchData} className="vivk-btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="vivk-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-slate-500">Total Errors (24h)</span>
          </div>
          <p className="text-xl font-bold text-vivk-navy">{errors.length}</p>
        </div>
        <div className="vivk-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-slate-500">Critical</span>
          </div>
          <p className="text-xl font-bold text-vivk-navy">{errors.filter(e => e.severity === 'critical').length}</p>
        </div>
        <div className="vivk-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-vivk-blue" />
            <span className="text-xs font-medium text-slate-500">Messages Today</span>
          </div>
          <p className="text-xl font-bold text-vivk-navy">{usageLogs[0]?.totalMessages ?? 0}</p>
        </div>
        <div className="vivk-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-vivk-violet" />
            <span className="text-xs font-medium text-slate-500">Tokens Today</span>
          </div>
          <p className="text-xl font-bold text-vivk-navy">{(usageLogs[0]?.totalTokens ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => setTab('errors')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'errors' ? 'border-vivk-blue text-vivk-blue' : 'border-transparent text-slate-500 hover:text-vivk-navy'
          }`}
        >
          Error Logs
        </button>
        <button
          onClick={() => setTab('usage')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'usage' ? 'border-vivk-blue text-vivk-blue' : 'border-transparent text-slate-500 hover:text-vivk-navy'
          }`}
        >
          Usage History
        </button>
      </div>

      {tab === 'errors' && (
        <>
          {/* Filter */}
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="vivk-input py-2 text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Error Table */}
          <div className="vivk-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Severity</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Type</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Message</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Endpoint</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No errors recorded in the last 24 hours
                      </td>
                    </tr>
                  ) : (
                    filteredErrors.map((error) => (
                      <tr key={error.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-5 py-3">{severityBadge(error.severity)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{error.type}</td>
                        <td className="px-5 py-3 text-slate-700 max-w-[300px] truncate">{error.message}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{error.endpoint}</td>
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {new Date(error.timestamp).toLocaleTimeString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'usage' && (
        <div className="vivk-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Messages</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Tokens</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Unique Users</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Errors</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      No usage data available
                    </td>
                  </tr>
                ) : (
                  usageLogs.map((log) => (
                    <tr key={log.date} className="border-b border-slate-50">
                      <td className="px-5 py-3 font-medium text-vivk-navy">
                        {new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{log.totalMessages.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-600">{log.totalTokens.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-600">{log.uniqueUsers}</td>
                      <td className="px-5 py-3">
                        <span className={`${log.errors > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                          {log.errors}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
