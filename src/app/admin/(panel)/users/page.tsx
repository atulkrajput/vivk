'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight, Mail, Calendar, CreditCard } from 'lucide-react'

interface UserRecord {
  id: string
  email: string
  full_name: string
  phone: string
  subscription_tier: string
  subscription_status: string
  created_at: string
  message_count: number
  session_count: number
  tokens_used: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [page, filterTier])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(filterTier !== 'all' && { tier: filterTier }),
      })
      const response = await fetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setTotalPages(data.totalPages)
        setTotalUsers(data.total)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const tierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      free: 'bg-slate-100 text-slate-600',
      pro: 'bg-vivk-blue/10 text-vivk-blue',
      business: 'bg-vivk-violet/10 text-vivk-violet',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[tier] || styles.free}`}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    )
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-50 text-emerald-700',
      cancelled: 'bg-amber-50 text-amber-700',
      expired: 'bg-red-50 text-red-700',
      pending: 'bg-slate-50 text-slate-600',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[status] || styles.pending}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vivk-navy">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">{totalUsers} registered users</p>
      </div>

      {/* Filters */}
      <div className="vivk-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full vivk-input pl-9 py-2.5 text-sm"
            />
          </form>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterTier}
              onChange={(e) => { setFilterTier(e.target.value); setPage(1) }}
              className="vivk-input py-2.5 text-sm"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="vivk-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">User</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Plan</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Sessions</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Messages</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Tokens</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-48 animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-16 animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-16 animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-12 animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-12 animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-16 animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-20 animate-pulse"></div></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-vivk-gradient flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-vivk-navy">{user.full_name || 'No name'}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{tierBadge(user.subscription_tier)}</td>
                    <td className="px-5 py-4">{statusBadge(user.subscription_status)}</td>
                    <td className="px-5 py-4 text-slate-600">{user.session_count.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-slate-600">{user.message_count.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-slate-600">{user.tokens_used.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
