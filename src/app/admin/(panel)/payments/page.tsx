'use client'

import { useState, useEffect } from 'react'
import { Receipt, CheckCircle2, Clock, XCircle, Search } from 'lucide-react'

interface Transaction {
  id: string
  order_id: string | null
  amount: number // paise
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
  user_id: string | null
  email: string | null
  full_name: string | null
}

interface PaymentsResponse {
  transactions: Transaction[]
  summary: Record<string, { count: number; amount: number }>
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-slate-100 text-slate-600',
}

function formatAmount(paise: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 }).format(paise / 100)
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchTransactions()
  }, [status, search, page])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ page: String(page) })
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      const response = await fetch(`/api/admin/payments?${params}`)
      if (response.ok) {
        setData(await response.json())
        setError(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to load transactions')
      }
    } catch (error) {
      console.error('Failed to load transactions:', error)
      setError('Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const summary = data?.summary
  const totalCount = summary ? Object.values(summary).reduce((n, s) => n + s.count, 0) : 0

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vivk-navy">Transaction History</h1>
        <p className="text-sm text-slate-500 mt-1">All Razorpay payments across every user</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-slate-600">Total Collected</span>
          </div>
          <p className="text-2xl font-bold text-vivk-navy">{formatAmount(summary?.completed.amount ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">{summary?.completed.count ?? 0} successful payments</p>
        </div>
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="w-4 h-4 text-vivk-blue" />
            <span className="text-sm font-medium text-slate-600">All Transactions</span>
          </div>
          <p className="text-2xl font-bold text-vivk-navy">{totalCount}</p>
        </div>
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-slate-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-vivk-navy">{summary?.pending.count ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Checkout opened, not paid</p>
        </div>
        <div className="vivk-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-slate-600">Failed / Refunded</span>
          </div>
          <p className="text-2xl font-bold text-vivk-navy">{(summary?.failed.count ?? 0) + (summary?.refunded.count ?? 0)}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="vivk-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatus(f.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === f.value ? 'bg-vivk-blue/[0.08] text-vivk-blue' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search email, name or order ID"
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full md:w-72 focus:outline-none focus:border-vivk-blue"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">User</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Order ID</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">Loading transactions...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-red-600">{error}</td>
                </tr>
              ) : data?.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No transactions found</td>
                </tr>
              ) : (
                data?.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50">
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-vivk-navy">{tx.full_name || tx.email || 'Deleted user'}</p>
                      {tx.email && <p className="text-xs text-slate-500">{tx.email}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{tx.order_id || '—'}</td>
                    <td className="px-5 py-3 text-right font-medium text-vivk-navy whitespace-nowrap">
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[tx.status] || STATUS_STYLES.refunded}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} transactions
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
