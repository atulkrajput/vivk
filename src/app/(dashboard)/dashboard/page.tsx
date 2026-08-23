'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MessageSquare, 
  BarChart3, 
  MessageCircle, 
  Star,
  CreditCard,
  Settings,
  ArrowRight,
  Sparkles,
  FileText,
  Code2,
  Search
} from 'lucide-react'
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

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
        conversations: conversationsData.conversations?.slice(0, 5) || [],
        payments: paymentsData.payments?.slice(0, 5) || []
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
      <div className="min-h-screen bg-vivk-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-xl bg-vivk-gradient flex items-center justify-center animate-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  if (error) {
    return (
      <div className="min-h-screen bg-vivk-bg flex items-center justify-center">
        <div className="text-center vivk-card p-8 max-w-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-50 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-lg font-semibold text-vivk-navy mb-2">{error}</p>
          <button onClick={fetchDashboardData} className="vivk-btn-primary mt-4 text-sm">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!dashboardData) return null

  const userName = dashboardData.user.email.split('@')[0]
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen bg-vivk-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/chat" className="flex items-center">
                <Image src="/vivk_logo.png" alt="VIVK" width={32} height={32} />
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <Link href="/chat" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-vivk-navy hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Chat</span>
                </Link>
                <Link href="/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-vivk-blue bg-vivk-blue/[0.06]">
                  <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Dashboard</span>
                </Link>
                <Link href="/billing" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-vivk-navy hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Billing</span>
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-slate-500">
                {dashboardData.user.email}
              </span>
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                dashboardData.subscription.plan.popular 
                  ? 'bg-vivk-blue/10 text-vivk-blue' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {dashboardData.subscription.plan.name}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-vivk-navy">
            {greeting}, {userName}
          </h1>
          <p className="mt-1 text-slate-500">
            What would you like to accomplish today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Sparkles, title: 'Ask VIVK', desc: 'Start a conversation', href: '/chat', color: 'text-vivk-blue', bg: 'bg-vivk-blue/[0.06]' },
            { icon: FileText, title: 'Create Content', desc: 'Write with AI', href: '/chat', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Search, title: 'Analyze', desc: 'Get insights', href: '/chat', color: 'text-vivk-violet', bg: 'bg-vivk-violet/[0.06]' },
            { icon: Code2, title: 'Code', desc: 'Build & debug', href: '/chat', color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((action) => (
            <Link key={action.title} href={action.href} className="vivk-card p-4 vivk-card-hover group">
              <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center mb-3`}>
                <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
              </div>
              <p className="text-sm font-semibold text-vivk-navy group-hover:text-vivk-blue transition-colors">{action.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex gap-1 -mb-px">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'conversations', name: 'Conversations', icon: MessageCircle },
                { id: 'billing', name: 'Billing', icon: CreditCard },
                { id: 'settings', name: 'Settings', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-vivk-blue text-vivk-blue'
                      : 'border-transparent text-slate-500 hover:text-vivk-navy hover:border-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: MessageSquare, label: "Today's Messages", value: dashboardData.usage.todayUsage, suffix: dashboardData.usage.dailyLimit > 0 ? `/${dashboardData.usage.dailyLimit}` : '', color: 'text-vivk-blue', bg: 'bg-vivk-blue/[0.08]' },
                { icon: BarChart3, label: 'This Month', value: dashboardData.usage.monthlyUsage, suffix: '', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: MessageCircle, label: 'Total Conversations', value: dashboardData.user.totalConversations, suffix: '', color: 'text-vivk-violet', bg: 'bg-vivk-violet/[0.06]' },
                { icon: Star, label: 'Plan', value: dashboardData.subscription.plan.name, suffix: '', color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((stat) => (
                <div key={stat.label} className="vivk-card p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <p className="text-xl font-bold text-vivk-navy">
                        {stat.value}
                        {stat.suffix && <span className="text-sm text-slate-400 font-normal">{stat.suffix}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Usage Statistics */}
                <UsageStats />

                {/* Recent Conversations */}
                <div className="vivk-card overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-vivk-navy">Recent Conversations</h3>
                      <Link href="/chat" className="text-xs text-vivk-blue hover:text-blue-700 font-medium flex items-center gap-1 transition-colors">
                        View all <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                  <div className="p-5">
                    {dashboardData.conversations.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.conversations.map((conversation) => (
                          <div key={conversation.id} className="flex items-center justify-between p-3.5 rounded-xl bg-vivk-bg hover:bg-slate-100 transition-colors">
                            <div>
                              <h4 className="text-sm font-medium text-vivk-navy">{conversation.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{conversation.messageCount} messages</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400">
                                {new Date(conversation.lastActivity).toLocaleDateString()}
                              </p>
                              <Link href={`/chat?conversation=${conversation.id}`} className="text-xs text-vivk-blue hover:text-blue-700 font-medium transition-colors">
                                Continue
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-50 flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500 mb-2">No conversations yet</p>
                        <Link href="/chat" className="text-sm text-vivk-blue hover:text-blue-700 font-medium transition-colors">
                          Start your first conversation
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Subscription Card */}
                <SubscriptionCard
                  currentTier={dashboardData.subscription.tier}
                  currentStatus={dashboardData.subscription.status}
                  expiresAt={dashboardData.subscription.expiresAt}
                  currentPlan={dashboardData.subscription.plan}
                  onPaymentSuccess={handleSubscriptionUpdate}
                />

                {/* Quick Actions */}
                <div className="vivk-card p-5">
                  <h3 className="text-base font-semibold text-vivk-navy mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Link href="/chat" className="flex items-center gap-3 w-full text-left px-4 py-3 bg-vivk-blue/[0.04] text-vivk-blue rounded-xl hover:bg-vivk-blue/[0.08] transition-colors">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">Start New Chat</span>
                    </Link>
                    <Link href="/billing" className="flex items-center gap-3 w-full text-left px-4 py-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm font-medium">Manage Billing</span>
                    </Link>
                    <button onClick={() => setActiveTab('settings')} className="flex items-center gap-3 w-full text-left px-4 py-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">Account Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="animate-fade-in">
            <ConversationsList />
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6 animate-fade-in">
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
          <div className="animate-fade-in">
            <AccountSettings user={dashboardData.user} />
          </div>
        )}
      </div>
    </div>
  )
}
