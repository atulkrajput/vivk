'use client'

import { useState, useEffect } from 'react'

interface Payment {
  id: string
  amount: number
  amountDisplay: string
  status: string
  createdAt: string
  razorpayPaymentId?: string
  subscriptionTier?: string
  description?: string
}

interface PaymentHistoryProps {
  payments?: Payment[]
  className?: string
}

export function PaymentHistory({ payments: initialPayments, className = '' }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments || [])
  const [isLoading, setIsLoading] = useState(!initialPayments)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all')

  useEffect(() => {
    if (!initialPayments) {
      fetchPayments()
    }
  }, [initialPayments])

  const fetchPayments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/payments/history')
      
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
      } else {
        setError('Failed to load payment history')
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
      setError('Failed to load payment history')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'captured':
        return {
          text: 'Success',
          color: 'text-green-800',
          bgColor: 'bg-green-100'
        }
      case 'failed':
        return {
          text: 'Failed',
          color: 'text-red-800',
          bgColor: 'bg-red-100'
        }
      case 'pending':
        return {
          text: 'Pending',
          color: 'text-yellow-800',
          bgColor: 'bg-yellow-100'
        }
      case 'refunded':
        return {
          text: 'Refunded',
          color: 'text-blue-800',
          bgColor: 'bg-blue-100'
        }
      default:
        return {
          text: status,
          color: 'text-gray-800',
          bgColor: 'bg-gray-100'
        }
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSubscriptionTierDisplay = (tier?: string): string => {
    switch (tier) {
      case 'pro':
        return 'Pro Plan'
      case 'business':
        return 'Business Plan'
      default:
        return 'Subscription'
    }
  }

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true
    if (filter === 'success') return ['success', 'captured'].includes(payment.status.toLowerCase())
    if (filter === 'failed') return payment.status.toLowerCase() === 'failed'
    if (filter === 'pending') return payment.status.toLowerCase() === 'pending'
    return true
  })

  const downloadReceipt = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/receipt`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vivk-receipt-${paymentId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading receipt:', error)
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
              </div>
            ))}
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
            onClick={fetchPayments}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
          <button
            onClick={fetchPayments}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* Filter */}
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'success', label: 'Success' },
            { key: 'pending', label: 'Pending' },
            { key: 'failed', label: 'Failed' }
          ].map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key as any)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === filterOption.key
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List */}
      <div className="p-6">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">
              {filter === 'all' ? 'No payments yet' : `No ${filter} payments found`}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-blue-600 hover:underline text-sm"
              >
                View all payments
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => {
              const statusDisplay = getStatusDisplay(payment.status)
              
              return (
                <div
                  key={payment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {payment.description || getSubscriptionTierDisplay(payment.subscriptionTier)}
                        </h4>
                        <span className="text-lg font-semibold text-gray-900">
                          {payment.amountDisplay}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>{formatDate(payment.createdAt)}</span>
                          {payment.razorpayPaymentId && (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {payment.razorpayPaymentId}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                            {statusDisplay.text}
                          </span>
                          
                          {payment.status.toLowerCase() === 'success' && (
                            <button
                              onClick={() => downloadReceipt(payment.id)}
                              className="text-blue-600 hover:text-blue-700 text-xs"
                            >
                              Download Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {payments.length > 0 && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {payments.filter(p => ['success', 'captured'].includes(p.status.toLowerCase())).length}
              </div>
              <div className="text-sm text-gray-600">Successful Payments</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ₹{payments
                  .filter(p => ['success', 'captured'].includes(p.status.toLowerCase()))
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-gray-600">Total Paid</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status.toLowerCase() === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending Payments</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}