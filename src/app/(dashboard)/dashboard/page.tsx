'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard'
import { UsageStats } from '@/components/dashboard/UsageStats'
import { AccountSettings } from '@/components/dashboard/AccountSettings'
import { ConversationsList } from '@/components/dashboard/ConversationsList'
import { PaymentHistory } from '@/components/dashboard/PaymentHistory'
import { 
  type SubscriptionPlan, 
  type SubscriptionTier
} from '@/lib/subscriptions'

interface DashboardData {
  user: {
    id: string
    email: string
    createdAt: string
    totalConversations: number
  }
  subscription: {
    tier: SubscriptionTier
    status: string
    expiresAt?: Date | string | null
    plan: SubscriptionPlan
  }
  usage: {
    todayUsage: number
    weeklyUsage: number
    monthlyUsage: number
    dailyLimit: number
    remainingToday: number
  }
  conversations: Array<{
    id: string
    title: string
    lastActivity: string
    messageCount: number
  }>
  payments: Array<{
    id: string
    amount: number
    amountDisplay: string
    status: string
    createdAt: string
  }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'billing' | 'settings'>('overview')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Load dashboard data
  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all dashboard data in parallel
      const [subscriptionRes, usageRes, conversationsRes, paymentsRes, userRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/usage'),
        fetch('/api/chat/conversations'),
        fetch('/api/payments/history'),
        fetch('/api/user/profile')
      ])

      if (!subscriptionRes.ok || !usageRes.ok || !conversationsRes.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const [subscriptionData, usageData, conversationsData, paymentsData, userData] = await Promise.all([
        subscriptionRes.json(),
        usageRes.json(),
        conversationsRes.json(),
        paymentsRes.ok ? paymentsRes.json() : { payments: [] },
        userRes.ok ? userRes.json() : { user: null }
      ])

      setDashboardData({
        user: {
          id: session!.user.id,
          email: session!.user.email,
          createdAt: userData.user?.created_at || new Date().toISOString(),
          totalConversations: conversationsData.conversations?.length || 0
        },
        subscription: subscriptionData.subscription,
        usage: usageData.usage,
        conversations: conversationsData.conversations?.slice(0, 5) || [], // Show recent 5
        payments: paymentsData.payments?.slice(0, 5) || [] // Show recent 5
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscriptionUpdate = async () => {
    await fetchDashboardData()
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/chat" className="text-2xl font-bold text-blue-600">
                VIVK
              </Link>
              <nav className="ml-8 flex space-x-8">
                <Link
                  href="/chat"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Chat
                </Link>
                <Link
                  href="/dashboard"
                  className="text-blue-600 px-3 py-2 rounded-md text-sm font-medium bg-blue-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/billing"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Billing
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {dashboardData.user.email}
              </span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                dashboardData.subscription.plan.popular 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {dashboardData.subscription.plan.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {dashboardData.user.email.split('@')[0]}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here's an overview of your VIVK account and usage
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'conversations', name: 'Conversations', icon: '💬' },
                { id: 'billing', name: 'Billing', icon: '💳' },
                { id: 'settings', name: 'Settings', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-sm">💬</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today's Messages</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {dashboardData.usage.todayUsage}
                      {dashboardData.usage.dailyLimit > 0 && (
                        <span className="text-sm text-gray-500">/{dashboardData.usage.dailyLimit}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-sm">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-semibold text-gray-900">{dashboardData.usage.monthlyUsage}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-sm">🗨️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                    <p className="text-2xl font-semibold text-gray-900">{dashboardData.user.totalConversations}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-sm">⭐</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Plan</p>
                    <p className="text-2xl font-semibold text-gray-900">{dashboardData.subscription.plan.name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Usage Statistics */}
                <UsageStats />

                {/* Recent Conversations */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Conversations</h3>
                      <Link
                        href="/chat"
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View all
                      </Link>
                    </div>
                  </div>
                  <div className="p-6">
                    {dashboardData.conversations.length > 0 ? (
                      <div className="space-y-4">
                        {dashboardData.conversations.map((conversation) => (
                          <div key={conversation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{conversation.title}</h4>
                              <p className="text-sm text-gray-600">{conversation.messageCount} messages</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                {new Date(conversation.lastActivity).toLocaleDateString()}
                              </p>
                              <Link
                                href={`/chat?conversation=${conversation.id}`}
                                className="text-sm text-blue-600 hover:text-blue-700"
                              >
                                Continue
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No conversations yet</p>
                        <Link
                          href="/chat"
                          className="mt-2 inline-block text-blue-600 hover:text-blue-700"
                        >
                          Start your first conversation
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Subscription Card */}
                <SubscriptionCard
                  currentTier={dashboardData.subscription.tier}
                  currentStatus={dashboardData.subscription.status}
                  expiresAt={dashboardData.subscription.expiresAt}
                  currentPlan={dashboardData.subscription.plan}
                  onPaymentSuccess={handleSubscriptionUpdate}
                />

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      href="/chat"
                      className="block w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                    >
                      🚀 Start New Chat
                    </Link>
                    <Link
                      href="/billing"
                      className="block w-full text-left px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      💳 Manage Billing
                    </Link>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="block w-full text-left px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      ⚙️ Account Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conversations' && (
          <ConversationsList />
        )}

        {activeTab === 'billing' && (
          <div className="space-y-8">
            <SubscriptionCard
              currentTier={dashboardData.subscription.tier}
              currentStatus={dashboardData.subscription.status}
              expiresAt={dashboardData.subscription.expiresAt}
              currentPlan={dashboardData.subscription.plan}
              onPaymentSuccess={handleSubscriptionUpdate}
            />
            <PaymentHistory payments={dashboardData.payments} />
          </div>
        )}

        {activeTab === 'settings' && (
          <AccountSettings user={dashboardData.user} />
        )}
      </div>
    </div>
  )
}