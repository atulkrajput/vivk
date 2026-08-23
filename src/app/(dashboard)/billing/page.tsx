'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare, BarChart3, CreditCard, Sparkles, HelpCircle } from 'lucide-react'
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard'
import { PricingPlans } from '@/components/dashboard/PricingPlans'
import { UsageStats } from '@/components/dashboard/UsageStats'
import { 
  type SubscriptionPlan, 
  type SubscriptionTier,
  getSubscriptionPlan 
} from '@/lib/subscriptions'

interface SubscriptionData {
  tier: SubscriptionTier
  status: string
  expiresAt?: Date | string | null
  plan: SubscriptionPlan
  subscriptionRecord?: any
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPricingPlans, setShowPricingPlans] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchSubscriptionData()
    }
  }, [session])

  const fetchSubscriptionData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/subscriptions')
      
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setAvailablePlans(data.availablePlans)
        setError(null)
      } else {
        setError('Failed to load subscription data')
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      setError('Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (targetTier: SubscriptionTier) => {
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upgrade', targetTier, immediate: true }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        await fetchSubscriptionData()
        setShowPricingPlans(false)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to upgrade subscription')
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Failed to upgrade subscription')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will maintain access until the end of your current billing period.')) {
      return
    }

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        await fetchSubscriptionData()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Failed to cancel subscription')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-vivk-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-xl bg-vivk-gradient flex items-center justify-center animate-pulse">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <p className="text-slate-500 text-sm">Loading subscription details...</p>
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
            <CreditCard className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-lg font-semibold text-vivk-navy mb-2">{error}</p>
          <button onClick={fetchSubscriptionData} className="vivk-btn-primary mt-4 text-sm">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vivk-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/chat" className="flex items-center">
                <Image src="/vivk_logo.png" alt="VIVK" width={247} height={85} className="h-[85px] w-auto" />
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <Link href="/chat" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-vivk-navy hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Chat</span>
                </Link>
                <Link href="/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-vivk-navy hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Dashboard</span>
                </Link>
                <Link href="/billing" className="px-3 py-2 rounded-lg text-sm font-medium text-vivk-blue bg-vivk-blue/[0.06]">
                  <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Billing</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-vivk-navy">Billing & Subscription</h1>
          <p className="mt-1 text-slate-500">
            Manage your VIVK subscription and billing information
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Subscription */}
          <div className="lg:col-span-2 space-y-6">
            {subscription && (
              <SubscriptionCard
                currentTier={subscription.tier}
                currentStatus={subscription.status}
                expiresAt={subscription.expiresAt}
                currentPlan={subscription.plan}
                onUpgrade={handleUpgrade}
                onCancel={handleCancel}
                onPaymentSuccess={fetchSubscriptionData}
                className="mb-6"
              />
            )}

            {/* Upgrade Options */}
            {subscription?.tier === 'free' && (
              <div className="vivk-card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-vivk-blue/[0.08] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-vivk-blue" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-vivk-navy mb-1">
                      Unlock Premium Features
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Upgrade to Pro or Business for unlimited messages, advanced AI, and more.
                    </p>
                    <button
                      onClick={() => setShowPricingPlans(!showPricingPlans)}
                      className="vivk-btn-primary text-sm"
                    >
                      {showPricingPlans ? 'Hide Plans' : 'View All Plans'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Plans */}
            {showPricingPlans && subscription && (
              <PricingPlans
                currentTier={subscription.tier}
                onSelectPlan={handleUpgrade}
                onPaymentSuccess={fetchSubscriptionData}
                showCurrentPlan={true}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Usage Statistics */}
            <UsageStats />

            {/* Billing Information */}
            <div className="vivk-card p-5">
              <h3 className="text-base font-semibold text-vivk-navy mb-4">
                Billing Information
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Plan:</span>
                  <span className="font-medium text-vivk-navy">{subscription?.plan.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-medium ${
                    subscription?.status === 'active' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {subscription?.status}
                  </span>
                </div>
                
                {subscription?.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {subscription.status === 'cancelled' ? 'Access Until:' : 'Next Billing:'}
                    </span>
                    <span className="font-medium text-vivk-navy">
                      {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-medium text-vivk-navy">Razorpay</span>
                </div>
              </div>

              {subscription?.tier !== 'free' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button className="text-sm text-vivk-blue hover:text-blue-700 font-medium transition-colors">
                    Update Payment Method
                  </button>
                </div>
              )}
            </div>

            {/* Support */}
            <div className="vivk-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <h3 className="text-base font-semibold text-vivk-navy">Need Help?</h3>
              </div>
              
              <div className="space-y-2.5">
                <a href="#" className="block text-sm text-vivk-blue hover:text-blue-700 font-medium transition-colors">
                  Contact Support
                </a>
                <a href="#" className="block text-sm text-vivk-blue hover:text-blue-700 font-medium transition-colors">
                  Billing FAQ
                </a>
                <a href="#" className="block text-sm text-vivk-blue hover:text-blue-700 font-medium transition-colors">
                  Refund Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
